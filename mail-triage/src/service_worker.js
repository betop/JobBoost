import { getSettings } from "./storage.js";
import { getConfig } from "./config.js";
import {
  ensureLabelId,
  listLabels,
  listMessageIdsPaged,
  getMessageMetadata,
  getMessageBodyText,
  modifyMessageLabels,
  batchModifyMessages
} from "./gmail.js";
import { classifyEmailsBatch } from "./ai.js";
import { getProcessedIds, getProcessedWithStages, markProcessed, clearProcessedIds } from "./mailCache.js";

let currentRun = null;
const keepAlivePorts = new Set();

let uiWindowId = null;

async function openOrFocusUiWindow() {
  if (uiWindowId != null) {
    try {
      const existing = await chrome.windows.get(uiWindowId);
      if (existing?.id != null) {
        await chrome.windows.update(existing.id, { focused: true });
        return;
      }
    } catch {
      uiWindowId = null;
    }
  }

  const w = await chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 420,
    height: 640
  });
  uiWindowId = w?.id ?? null;
}

chrome.action.onClicked.addListener(() => {
  openOrFocusUiWindow().catch(() => {});
});

chrome.runtime.onConnect.addListener((port) => {
  if (port?.name !== "triage-keepalive") return;
  keepAlivePorts.add(port);
  port.onMessage.addListener(() => {});
  port.onDisconnect.addListener(() => {
    keepAlivePorts.delete(port);
  });
});

function isConfiguredClientId() {
  // The oauth2 client_id is only in manifest; we can detect placeholder by trying to fetch it via runtime.getManifest.
  const manifest = chrome.runtime.getManifest();
  const clientId = manifest?.oauth2?.client_id || "";
  return clientId && !clientId.includes("REPLACE_WITH_YOUR_GOOGLE_OAUTH_CLIENT_ID");
}

async function getGmailToken(interactive) {
  if (!isConfiguredClientId()) {
    throw new Error(
      "Google OAuth client_id is not set in manifest.json (replace the placeholder in manifest.json > oauth2.client_id)."
    );
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message || "Failed to get auth token"));
      if (!token) return reject(new Error("No auth token returned"));
      resolve(token);
    });
  });
}

function normalizeStage(stage) {
  const s = String(stage || "").toLowerCase().trim();
  if (
    s === "application" ||
    s === "failed" ||
    s === "assessment" ||
    s === "interview" ||
    s === "offer" ||
    s === "followup" ||
    s === "survey"
  )
    return s;
  return "other";
}

function truncateText(text, maxChars) {
  const s = String(text || "");
  if (!maxChars || maxChars <= 0) return s;
  return s.length <= maxChars ? s : s.slice(0, maxChars);
}

function decideOps({
  isJob,
  stage,
  jobsRootLabelId,
  jobsStageLabelIds,
  generalLabelId,
  legacyRemoveLabelIds = []
}) {
  const add = [];
  const remove = [];

  if (isJob) {
    add.push(jobsRootLabelId);
    const stageLabelId = jobsStageLabelIds[stage] || jobsStageLabelIds.other;
    if (stageLabelId) add.push(stageLabelId);

    // Keep exactly one Jobs/<Stage> label.
    for (const [s, id] of Object.entries(jobsStageLabelIds)) {
      if (!id) continue;
      if (s !== stage) remove.push(id);
    }
    remove.push(generalLabelId);
  } else {
    add.push(generalLabelId);
    remove.push(jobsRootLabelId);
    for (const id of Object.values(jobsStageLabelIds)) {
      if (id) remove.push(id);
    }
  }

  for (const id of legacyRemoveLabelIds) {
    if (id) remove.push(id);
  }

  // System labels: UNREAD, STARRED
  // Rules:
  // - Do not touch UNREAD — keep original read/unread state for all emails
  // - Job + success (assessment/interview/offer): star

  if (isJob && (stage === "assessment" || stage === "interview" || stage === "offer")) {
    add.push("STARRED");
  }

  return {
    addLabelIds: Array.from(new Set(add)).filter(Boolean),
    removeLabelIds: Array.from(new Set(remove)).filter((id) => id && !add.includes(id)),
  };
}

async function triageRun({ maxEmailsPerRun, startDate, endDate }, sendProgress) {
  const stored = await getSettings();
  const config = await getConfig().catch(() => ({}));
  const settings = {
    ...stored,
    ...config
  };

  const token = await getGmailToken(true);

  let gmailEmail = "";
  try {
    const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resp.ok) {
      const info = await resp.json();
      gmailEmail = info.email || "";
    }
  } catch {
    // Non-fatal; gmailEmail stays ""
  }

  const max = Number(maxEmailsPerRun ?? settings.maxEmailsPerRun ?? 0);

  sendProgress({ type: "status", message: "Ensuring labels…" });

  // Fetch all existing labels once — passed to every ensureLabelId call so
  // we never make redundant list requests and avoid 409 races.
  let existingLabels = [];
  try {
    existingLabels = await listLabels({ token });
  } catch {
    existingLabels = [];
  }

  const ensure = (name) => ensureLabelId({ token, name, labels: existingLabels });

  const jobsRootLabelId = await ensure("Jobs");
  const generalLabelId  = await ensure("General");

  // Migration support: if an older label name exists, strip it from messages.
  const legacyFailedLabelId =
    existingLabels.find((l) => (l.name || "").toLowerCase() === "jobs/failed")?.id || null;

  const jobsStageLabelIds = {
    application: await ensure("Jobs/Applications"),
    failed:      await ensure("Jobs/Failures"),
    assessment:  await ensure("Jobs/Assessments"),
    interview:   await ensure("Jobs/Interviews"),
    offer:       await ensure("Jobs/Offers"),
    followup:    await ensure("Jobs/Follow-Up"),
    survey:      await ensure("Jobs/Surveys"),
    other:       await ensure("Jobs/Other"),
  };

  const start = String(startDate || "").trim();
  const end = String(endDate || "").trim();

  const localMidnightEpochSeconds = (yyyyMmDd, addDays = 0) => {
    // Interpret YYYY-MM-DD in the *computer's local timezone*.
    const [y, m, d] = yyyyMmDd.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    dt.setDate(dt.getDate() + addDays);
    return Math.floor(dt.getTime() / 1000);
  };

  let query = "";
  if (start) query += `after:${localMidnightEpochSeconds(start, 0)} `;
  if (end) {
    // Gmail `before:` is exclusive; add 1 day to include the selected end date.
    query += `before:${localMidnightEpochSeconds(end, 1)} `;
  }
  query = query.trim();

  sendProgress({ type: "status", message: "Listing messages in date range…" });
  const ids = await listMessageIdsPaged({ token, query, maxResults: max });

  // Also fetch spam messages in the same date range
  const spamQuery = query ? `in:spam ${query}` : "in:spam";
  sendProgress({ type: "status", message: "Checking spam folder…" });
  let spamIds = [];
  try {
    spamIds = await listMessageIdsPaged({ token, query: spamQuery, maxResults: max });
  } catch (e) {
    sendProgress({ type: "error", message: `Failed to list spam: ${e?.message || String(e)}` });
  }

  // Un-spam: remove SPAM label and move to INBOX so labels can be applied
  if (spamIds.length > 0) {
    sendProgress({ type: "status", message: `Moving ${spamIds.length} message(s) out of spam…` });
    try {
      await batchModifyMessages({ token, ids: spamIds, addLabelIds: ["INBOX"], removeLabelIds: ["SPAM"] });
    } catch (e) {
      sendProgress({ type: "error", message: `Failed to un-spam messages: ${e?.message || String(e)}` });
    }

    // Merge spam IDs into main list (deduplicate)
    const existing = new Set(ids);
    for (const id of spamIds) {
      if (!existing.has(id)) ids.push(id);
    }
  }

  const summary = {
    mode: "stages",
    total: ids.length,
    application: 0,
    failed: 0,
    assessment: 0,
    interview: 0,
    offer: 0,
    followup: 0,
    survey: 0,
    general: 0,
    other: 0,
    errors: 0
  };

  sendProgress({ type: "summary", summary });

  sendProgress({ type: "status", message: "Fetching message metadata…" });

  // Filter out messages already processed in a previous run
  const processedIds = await getProcessedIds();
  const newIds = ids.filter((id) => !processedIds.has(String(id)));
  const skippedCount = ids.length - newIds.length;
  if (skippedCount > 0) {
    sendProgress({ type: "status", message: `Skipping ${skippedCount} already-processed message(s)…` });
    // Count cached emails into their stage counters
    const cachedEntries = await getProcessedWithStages();
    const cachedIdSet = new Set(ids.filter((id) => processedIds.has(String(id))).map(String));
    for (const entry of cachedEntries) {
      if (!cachedIdSet.has(String(entry.id))) continue;
      if (entry.is_job) {
        const s = entry.stage || "other";
        if (s in summary) summary[s]++;
        else summary.other++;
      } else {
        summary.general++;
      }
    }
  }
  sendProgress({ type: "summary", summary });

  const emails = [];
  
  // Fetch emails in parallel batches (up to 10 at a time) for better performance
  const batchSize = 10;
  for (let batchStart = 0; batchStart < newIds.length; batchStart += batchSize) {
    if (currentRun?.cancelled) {
      sendProgress({ type: "status", message: "Cancelled." });
      break;
    }
    
    const batchEnd = Math.min(batchStart + batchSize, newIds.length);
    const batchIds = newIds.slice(batchStart, batchEnd);
    
    // Fetch multiple emails in parallel
    const batchPromises = batchIds.map(async (messageId, index) => {
      try {
        const email = await getMessageMetadata({ token, messageId });
        const bodyText = await getMessageBodyText({ token, messageId }).catch(() => "");
        email.body = truncateText(bodyText, 1200);
        return { success: true, email, index: batchStart + index, messageId };
      } catch (e) {
        return { success: false, error: e?.message || String(e), index: batchStart + index, messageId };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      if (result.success) {
        emails.push(result.email);
      } else {
        summary.errors++;
        sendProgress({ type: "error", index: result.index, messageId: result.messageId, message: result.error });
      }
    }
  }

  if (emails.length === 0) {
    sendProgress({ type: "done", summary });
    return summary;
  }

  const results = [];

  sendProgress({ type: "status", message: `Classifying ${emails.length} emails…` });

  const classifyChunk = async (chunk) =>
    classifyEmailsBatch({
      backendApiUrl: settings.backendApiUrl,
      backendApiKey: settings.backendApiKey,
      emails: chunk,
      gmailEmail,
    });

  const chunkSize = 50;
  const totalGroups = Math.max(1, Math.ceil(emails.length / chunkSize));

  for (let i = 0; i < emails.length; i += chunkSize) {
    if (currentRun?.cancelled) break;
    const group = emails.slice(i, i + chunkSize);
    const label = `Batch ${Math.floor(i / chunkSize) + 1}/${totalGroups}`;
    sendProgress({ type: "status", message: `${label}: classifying ${group.length} emails…` });
    let batchResults;
    try {
      const batch = await classifyChunk(group);
      batchResults = Array.isArray(batch?.results) ? batch.results : [];
    } catch (e) {
      sendProgress({ type: "error", message: e?.message || String(e) });
      if (e?.fatal) {
        sendProgress({ type: "done", summary });
        return summary;
      }
      batchResults = group.map((em) => ({ id: em.id, is_job: false, stage: "other" }));
    }
    results.push(...batchResults);
  }

  const byId = new Map(results.map((r) => [String(r.id), r]));

  // Group messages by their ops fingerprint so we can batch-modify in one API call per group.
  const opsGroups = new Map(); // fingerprint -> { addLabelIds, removeLabelIds, emails[] }

  for (let index = 0; index < emails.length; index++) {
    const email = emails[index];
    const result = byId.get(String(email.id)) || { is_job: false, stage: "other" };
    const isJob = Boolean(result.is_job);
    const stage = normalizeStage(result.stage);

    if (isJob) {
      if (stage === "application") summary.application++;
      else if (stage === "failed") summary.failed++;
      else if (stage === "assessment") summary.assessment++;
      else if (stage === "interview") summary.interview++;
      else if (stage === "offer") summary.offer++;
      else if (stage === "followup") summary.followup++;
      else if (stage === "survey") summary.survey++;
      else if (stage === "other") summary.other++;
    } else {
      summary.general++;
    }

    const ops = decideOps({
      isJob,
      stage,
      jobsRootLabelId,
      jobsStageLabelIds,
      generalLabelId,
      legacyRemoveLabelIds: legacyFailedLabelId ? [legacyFailedLabelId] : []
    });

    sendProgress({
      type: "item",
      stage: "apply",
      index,
      messageId: email.id,
      subject: email.subject,
      isJob,
      jobStage: stage
    });

    const fingerprint = JSON.stringify([
      [...ops.addLabelIds].sort(),
      [...ops.removeLabelIds].sort()
    ]);
    if (!opsGroups.has(fingerprint)) {
      opsGroups.set(fingerprint, { addLabelIds: ops.addLabelIds, removeLabelIds: ops.removeLabelIds, ids: [] });
    }
    opsGroups.get(fingerprint).ids.push(email.id);
  }

  sendProgress({ type: "summary", summary });
  sendProgress({ type: "status", message: `Applying labels to ${emails.length} emails in ${opsGroups.size} batch(es)…` });

  for (const { addLabelIds, removeLabelIds, ids } of opsGroups.values()) {
    if (currentRun?.cancelled) {
      sendProgress({ type: "status", message: "Cancelled." });
      break;
    }
    if (addLabelIds.length === 0 && removeLabelIds.length === 0) continue;
    console.log(`[triage] batchModify ${ids.length} msg(s) add=${JSON.stringify(addLabelIds)} remove=${JSON.stringify(removeLabelIds)}`);
    try {
      await batchModifyMessages({ token, ids, addLabelIds, removeLabelIds });
      // Build entries with stage info for cache
      const entries = ids.map((id) => {
        const r = byId.get(String(id));
        return { id, stage: r?.stage || "other", is_job: r?.is_job ?? true };
      });
      await markProcessed(entries);
    } catch (e) {
      console.error("[triage] batchModify failed:", e);
      summary.errors += ids.length;
      sendProgress({
        type: "error",
        message: `Batch label apply failed for ${ids.length} message(s): ${e?.message || String(e)}`
      });
    }
  }

  sendProgress({ type: "done", summary });
  return summary;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "AUTH_CHECK") {
      try {
        const token = await getGmailToken(false);
        let email = null;
        try {
          const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            const info = await resp.json();
            email = info.email || null;
          }
        } catch {
          // Non-fatal; email stays null
        }
        sendResponse({ ok: true, tokenPresent: Boolean(token), email });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
      return;
    }

    if (msg?.type === "AUTH_INTERACTIVE") {
      try {
        await getGmailToken(true);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
      return;
    }

    if (msg?.type === "START_TRIAGE") {
      if (currentRun) {
        sendResponse({ ok: false, error: "A run is already in progress." });
        return;
      }

      currentRun = { cancelled: false };
      sendResponse({ ok: true });

      const sendProgress = (payload) => {
        chrome.runtime.sendMessage({ type: "PROGRESS", payload }).catch(() => {});
      };

      try {
        await triageRun(
          {
            maxEmailsPerRun: msg?.maxEmailsPerRun,
            startDate: msg?.startDate,
            endDate: msg?.endDate
          },
          sendProgress
        );
      } catch (e) {
        sendProgress({ type: "error", message: e?.message || String(e) });
        sendProgress({
          type: "done",
          summary: {
            mode: "stages",
            total: 0,
            application: 0,
            failed: 0,
            assessment: 0,
            interview: 0,
            offer: 0,
            errors: 1
          }
        });
      } finally {
        currentRun = null;
      }
      return;
    }

    if (msg?.type === "CANCEL_TRIAGE") {
      if (currentRun) currentRun.cancelled = true;
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === "CLEAR_MAIL_CACHE") {
      try {
        await clearProcessedIds();
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
      return;
    }

    sendResponse({ ok: false, error: "Unknown message" });
  })();

  return true;
});
