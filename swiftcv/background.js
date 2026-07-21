// Background service worker for SwiftCV Extension
// PDF generation is handled by the offscreen document (offscreen.html/offscreen.js)

// Extension environment: "staging" (no version checks) or "prod" (version checks enforced)
// The build script will replace "staging" with "prod" for production builds
const EXTENSION_ENV = "staging";

// Xano API base URLs per group
const XANO_PUBLIC_URL = "https://api.shsws-solutions.com/api:W5ffWHW-";
const XANO_RESUME_URL = "https://api.shsws-solutions.com/api:caf8Eo15";

let extensionState = {
  token: null,
  profileId: null,
  profileName: null,
  profileIds: [],
  profileNames: [],
  isConfirmed: false,
  resumeTemplate: 11,
  isAdmin: false,
  versionOk: true,
  versionError: "",
};

let lastProfilesSyncAt = 0;
let profileRefreshInFlight = null;

// Load extension state on startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log("SwiftCV Extension installed");
  await loadExtensionState();

  if (!extensionState.token) {
    // First install — open setup page to enter token
    chrome.windows.create({
      url: "setup.html",
      type: "popup",
      width: 480,
      height: 550,
    });
  } else {
    await refreshProfilesIfNeeded({ force: true });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await loadExtensionState();
});

// Load state from storage
async function loadExtensionState() {
  try {
    const stored = await chrome.storage.local.get([
      "token",
      "profileId",
      "profileName",
      "profileIds",
      "profileNames",
      "isConfirmed",
      "resumeTemplate",
      "resumeTemplates",
      "lastProfilesSyncAt",
      "isAdmin",
      "versionOk",
      "versionError",
    ]);

    if (stored.token)            extensionState.token          = stored.token;
    if (stored.profileId)        extensionState.profileId      = stored.profileId;
    if (stored.profileName)      extensionState.profileName    = stored.profileName;
    if (stored.profileIds)       extensionState.profileIds     = stored.profileIds;
    if (stored.profileNames)     extensionState.profileNames   = stored.profileNames;
    if (stored.isConfirmed)      extensionState.isConfirmed    = stored.isConfirmed;
    if (stored.resumeTemplate)   extensionState.resumeTemplate = stored.resumeTemplate;
    if (stored.lastProfilesSyncAt) lastProfilesSyncAt = stored.lastProfilesSyncAt;
    extensionState.isAdmin   = stored.isAdmin === true;
    extensionState.versionOk    = stored.versionOk !== false;
    extensionState.versionError = stored.versionError || "";
  } catch (error) {
    console.error("Error loading extension state:", error);
  }
}

async function fetchTokenProfiles(endpoint = "token-profiles") {
  if (!extensionState.token) {
    console.log("No token found");
    return null;
  }

  let body = { token: extensionState.token };
  if (endpoint === "token-profiles") {
    try {
      const v = chrome.runtime.getManifest()?.version;
      if (v) body.extension_version = v;
    } catch (_) {}
  }

  const response = await fetch(`${XANO_PUBLIC_URL}/public/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch (_) {
      // ignore
    }
    throw new Error(message || "Token validation failed");
  }

  return response.json();
}

function getTemplateForProfile(profileId, ids, templates) {
  const profileIdx = ids.indexOf(profileId);
  return profileIdx >= 0 && templates[profileIdx] ? templates[profileIdx] : 11;
}

async function applyProfilesData(data, { openDialogs = true } = {}) {
  const ids = data.profile_ids || [];
  const names = data.profile_names || [];
  const templates = data.resume_templates || [];

  extensionState.profileIds = ids;
  extensionState.profileNames = names;
  extensionState.isAdmin = data.is_admin === true;
  extensionState.versionOk = data.version_ok !== false;
  extensionState.versionError = data.version_error || "";

  const previousProfileId = extensionState.profileId;
  const previousSelectionStillValid = previousProfileId && ids.includes(previousProfileId);

  if (ids.length === 1) {
    extensionState.profileId = ids[0];
    extensionState.profileName = names[0] || "";
    extensionState.resumeTemplate = templates[0] || 11;
  } else if (previousSelectionStillValid) {
    extensionState.profileId = previousProfileId;
    extensionState.profileName = names[ids.indexOf(previousProfileId)] || extensionState.profileName || "";
    extensionState.resumeTemplate = getTemplateForProfile(previousProfileId, ids, templates);
  } else {
    extensionState.profileId = null;
    extensionState.profileName = null;
    extensionState.resumeTemplate = 11;
    extensionState.isConfirmed = false;
  }

  await chrome.storage.local.set({
    profileIds: ids,
    profileNames: names,
    resumeTemplates: templates,
    profileId: extensionState.profileId,
    profileName: extensionState.profileName,
    resumeTemplate: extensionState.resumeTemplate,
    isConfirmed: extensionState.isConfirmed,
    isAdmin: extensionState.isAdmin,
    versionOk: extensionState.versionOk,
    versionError: extensionState.versionError,
  });

  if (extensionState.profileId && extensionState.isConfirmed) {
    setupContextMenu();
  }

  if (!openDialogs) {
    return;
  }

  openProfileConfirmationFlow();
}

function openProfileConfirmationFlow() {
  if (!extensionState.token || extensionState.isConfirmed) {
    return;
  }

  if (extensionState.profileIds.length === 1) {
    chrome.windows.create({
      url: "confirm.html",
      type: "popup",
      width: 480,
      height: 550,
    });
    return;
  }

  if (extensionState.profileIds.length > 1) {
    chrome.windows.create({
      url: "select_profile.html",
      type: "popup",
      width: 420,
      height: 550,
    });
  }
}

async function refreshProfilesFromBackend(options = {}) {
  try {
    const data = await fetchTokenProfiles("token-profiles");
    if (!data) return null;
    await applyProfilesData(data, options);
    lastProfilesSyncAt = Date.now();
    await chrome.storage.local.set({ lastProfilesSyncAt });
    return data;
  } catch (error) {
    console.error("Error refreshing token profiles:", error);
    if (options.notify !== false) {
      showNotification(error.message || "Could not refresh profiles.");
    }
    throw error;
  }
}

async function refreshProfilesIfNeeded(options = {}) {
  const {
    force = false,
    openDialogs = false,
    notify = false,
  } = options;

  if (!extensionState.token) {
    return null;
  }

  if (profileRefreshInFlight) {
    return profileRefreshInFlight;
  }

  profileRefreshInFlight = refreshProfilesFromBackend({ openDialogs, notify })
    .finally(() => {
      profileRefreshInFlight = null;
    });

  return profileRefreshInFlight;
}

async function syncProfilesFromGenerateResponse(data) {
  if (!data || typeof data !== "object") {
    return;
  }

  const hasProfileArrays = Array.isArray(data.profile_ids) && data.profile_ids.length > 0;

  if (hasProfileArrays) {
    await applyProfilesData(
      {
        profile_ids: data.profile_ids,
        profile_names: Array.isArray(data.profile_names) ? data.profile_names : extensionState.profileNames,
        resume_templates: Array.isArray(data.resume_templates) ? data.resume_templates : [],
      },
      { openDialogs: false }
    );

    lastProfilesSyncAt = Date.now();
    await chrome.storage.local.set({ lastProfilesSyncAt });
    return;
  }

  const maybeProfileId = data.profile_id ?? data.current_profile_id;
  const maybeProfileName = data.profile_name ?? data.current_profile_name;
  const maybeResumeTemplate = data.resume_template ?? data.current_resume_template;

  if (
    maybeProfileId == null &&
    maybeProfileName == null &&
    maybeResumeTemplate == null
  ) {
    return;
  }

  if (maybeProfileId != null) {
    extensionState.profileId = maybeProfileId;
  }
  if (maybeProfileName != null) {
    extensionState.profileName = maybeProfileName;
  }
  if (maybeResumeTemplate != null) {
    extensionState.resumeTemplate = maybeResumeTemplate;
  }

  lastProfilesSyncAt = Date.now();
  await chrome.storage.local.set({
    profileId: extensionState.profileId,
    profileName: extensionState.profileName,
    resumeTemplate: extensionState.resumeTemplate,
    lastProfilesSyncAt,
  });
}

// Setup context menu
function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "generate_resume",
      title: "Generate Resume and Cover Letter",
      contexts: ["selection"],
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "generate_resume") {
    const selectedText = info.selectionText;

    if (!selectedText || selectedText.trim().length === 0) {
      showNotification("Please select job description text first.");
      return;
    }

    // Capture HTML FIRST — before any async network calls that can clear the selection.
    // executeScript runs directly in the tab context (no message passing, no timing issues).
    let jobDescription = selectedText;
    try {
      const [injected] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // ── Sanitizer: keep semantic tags, strip scripts/styles/events ──
          function sanitizeHtml(rootEl) {
            const ALLOWED_TAGS = new Set([
              "p","br","ul","ol","li","h1","h2","h3","h4","h5","h6",
              "strong","em","b","i","u","span","div","a","blockquote",
              "table","thead","tbody","tr","td","th","section","article",
              "header","main","dl","dt","dd","pre","code","figure","figcaption",
            ]);
            const STRIP_TAGS = new Set([
              "script","style","iframe","frame","frameset","form","input",
              "button","select","textarea","svg","link","meta","object",
              "embed","noscript","canvas","video","audio","img","picture",
            ]);

            function clean(node) {
              if (node.nodeType === Node.TEXT_NODE) return node.cloneNode();
              if (node.nodeType !== Node.ELEMENT_NODE) return null;

              const tag = node.tagName.toLowerCase();

              // Strip entire subtree for dangerous tags
              if (STRIP_TAGS.has(tag)) return null;

              // For unknown/unwanted wrapper tags just pass through children
              const out = ALLOWED_TAGS.has(tag)
                ? document.createElement(tag)
                : document.createElement("span");

              // Allow only safe attributes
              if (tag === "a") {
                const href = node.getAttribute("href");
                if (href && !href.trim().toLowerCase().startsWith("javascript:")) {
                  out.setAttribute("href", href);
                }
              }

              // Strip all event handlers and style attributes
              for (const child of node.childNodes) {
                const cleaned = clean(child);
                if (cleaned) out.appendChild(cleaned);
              }
              return out;
            }

            const wrapper = document.createElement("div");
            for (const child of rootEl.childNodes) {
              const cleaned = clean(child);
              if (cleaned) wrapper.appendChild(cleaned);
            }
            return wrapper.innerHTML.trim();
          }

          // Prefer the window-level cache set by content.js on mouseup
          let rawHtml = "";
          let rawText = "";

          if (window._swiftcvCachedHtml && window._swiftcvCachedHtml.trim()) {
            rawHtml = window._swiftcvCachedHtml;
            rawText = window._swiftcvCachedText || "";
          } else {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || !sel.toString().trim()) return { html: "", text: "" };
            const range = sel.getRangeAt(0);
            const div = document.createElement("div");
            div.appendChild(range.cloneContents());
            rawHtml = div.innerHTML.trim();
            rawText = sel.toString().trim();
          }

          if (!rawHtml) return { html: "", text: rawText };

          // Parse and sanitize
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawHtml, "text/html");
          const sanitized = sanitizeHtml(doc.body);

          return { html: sanitized || rawText, text: rawText };
        },
      });
      if (injected?.result?.html && injected.result.html.trim().length > 0) {
        jobDescription = injected.result.html;
        console.log("[SwiftCV] Captured sanitized HTML, length:", jobDescription.length);
      }
    } catch (err) {
      console.warn("[SwiftCV] executeScript failed, using plain text:", err.message);
    }

    // Service worker may have gone idle — reload state from storage before checking
    await loadExtensionState();
    // Always force a fresh profile + version check before generating
    await refreshProfilesIfNeeded({ force: true, openDialogs: false, notify: true });

    if (!extensionState.isConfirmed) {
      showNotification("Please confirm your profile first.");
      return;
    }

    // Capture the URL of the tab where the user right-clicked
    const jobUrl = tab?.url || "";

    await generateResume(jobDescription, jobUrl);
  }
});

// Ensure offscreen document is open (only one can exist at a time)
async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["BLOBS"],
    justification: "Generate PDFs with jsPDF and trigger blob downloads",
  });
}

// Generate resume and cover letter
async function generateResume(jobDescription, jobUrl = "") {
  // Open progress window (one window for the entire flow)
  const progressWin = await new Promise((resolve) =>
    chrome.windows.create(
      { url: "progress.html", type: "popup", width: 380, height: 550 },
      (win) => resolve(win)
    )
  );

  // Wait briefly so the progress window can register its listener
  await new Promise((r) => setTimeout(r, 600));

  function sendProgress(step, error, reason) {
    chrome.runtime.sendMessage({ action: "progressUpdate", step, error, reason }).catch(() => {});
  }

  // Wait for admin to click "Generate Anyway" or "Cancel"
  function waitForAdminDecision() {
    return new Promise((resolve) => {
      function handler(message) {
        if (message.action === "adminOverrideConfirmed") {
          chrome.runtime.onMessage.removeListener(handler);
          resolve(true);
        } else if (message.action === "adminOverrideCancelled") {
          chrome.runtime.onMessage.removeListener(handler);
          resolve(false);
        }
      }
      chrome.runtime.onMessage.addListener(handler);
      setTimeout(() => { chrome.runtime.onMessage.removeListener(handler); resolve(false); }, 300000);
    });
  }

  function waitForRetryDecision() {
    return new Promise((resolve) => {
      function handler(message) {
        if (message.action === "retryGeneration") {
          chrome.runtime.onMessage.removeListener(handler);
          resolve(true);
        } else if (message.action === "retryCancelled") {
          chrome.runtime.onMessage.removeListener(handler);
          resolve(false);
        }
      }
      chrome.runtime.onMessage.addListener(handler);
      setTimeout(() => { chrome.runtime.onMessage.removeListener(handler); resolve(false); }, 300000);
    });
  }

  async function callGenerateApi(requestBody) {
    const response = await fetch(`${XANO_RESUME_URL}/resume/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let message = "Failed to generate resume";
      try {
        const errorData = await response.json();

        if (errorData?.message === "DUPLICATE_URL" && errorData?.payload) {
          const p = errorData.payload;
          const appliedDate = p.applied_date
            ? new Date(p.applied_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : "unknown date";
          const detail = (p.position_title || "") + (p.company_name ? " at " + p.company_name : "") + " — applied on " + appliedDate;
          sendProgress("duplicate", undefined, detail);
          return null;
        }

        message = errorData?.message || errorData?.error || message;
      } catch (_) {}
      throw new Error(message);
    }

    return response.json();
  }

  function getGenerateStatus(data) {
    if (!data || typeof data !== "object") return null;
    return data.match_status ?? data.is_matched ?? null;
  }

  function getGenerateReason(data) {
    if (!data || typeof data !== "object") return "";
    return data.error_msg ?? data.match_reason ?? "";
  }

  function getResumePayload(data) {
    if (!data || typeof data !== "object") {
      return { resumeText: "", coverLetterText: "", resumeFilename: "Resume.pdf", coverLetterFilename: "Cover_Letter.pdf" };
    }
    return {
      resumeText: data.resume_text || "",
      coverLetterText: data.cover_letter_text || "",
      resumeFilename: data.resume_filename || "Resume.pdf",
      coverLetterFilename: data.cover_letter_filename || "Cover_Letter.pdf",
    };
  }

  function getExtensionVersion() {
    try { return chrome.runtime.getManifest()?.version || ""; } catch (_) { return ""; }
  }

  // Re-call generate API with force_generate=true (admin only)
  async function retryWithForce(jd, url, logId) {
    const extensionVersion = getExtensionVersion();
    sendProgress("ai");
    const forceBody = {
      profile_id: extensionState.profileId,
      job_description: jd,
      token: extensionState.token,
      ai_provider: "claude",
      job_url: url,
      force_generate: true,
      log_id: logId || undefined,
      extension_version: extensionVersion || undefined,
    };

    const forceData = await callGenerateApi(forceBody);
    if (!forceData) return;
    console.log("[BG] Force generate response:", JSON.stringify(forceData));

    await syncProfilesFromGenerateResponse(forceData);
    const forceStatus = getGenerateStatus(forceData);
    const forceReason = getGenerateReason(forceData);

    if (forceStatus === 6) {
      sendProgress("ai_error", forceReason || "AI processing error. Please try again.");
      const retry = await waitForRetryDecision();
      if (retry) await retryWithForce(jd, url, logId);
      return;
    }

    await processResumeResponse(forceData);
  }

  // Process a successful generate response into PDFs
  async function processResumeResponse(data) {
    const payload = getResumePayload(data);
    const rawData = payload.resumeText;
    const rawDataStr = typeof rawData === "object" ? JSON.stringify(rawData) : String(rawData);
    if (!rawDataStr || rawDataStr === "{}" || rawDataStr === "") {
      throw new Error("No resume content returned from server.");
    }

    sendProgress("resume");
    await ensureOffscreenDocument();
    sendProgress("cover");

    const pdfResult = await chrome.runtime.sendMessage({
      action: "generateAndDownloadPDFs",
      rawData: rawData,
      coverLetterText: payload.coverLetterText,
      resumeFilename: payload.resumeFilename,
      coverLetterFilename: payload.coverLetterFilename,
      templateId: extensionState.resumeTemplate || 11,
    });

    if (!pdfResult?.success) {
      throw new Error(pdfResult?.error || "PDF generation failed");
    }

    // Save last successful log_id to storage for the chat bubble
    if (data.log_id) {
      chrome.storage.local.set({ lastLogId: data.log_id });
    }

    sendProgress("download");
    sendProgress("done");
  }

  // ── Version check ────────────────────────────────────────────────────────────
  // Check version status from the profile refresh done before this call
  if (!extensionState.versionOk) {
    sendProgress("version_mismatch", extensionState.versionError);
    if (!extensionState.isAdmin) return;

    const confirmed = await waitForAdminDecision();
    if (!confirmed) return;
    // Admin confirmed → continue with generate in this same window
  }

  try {
    const extensionVersion = getExtensionVersion();
    const isAdmin = extensionState.isAdmin;

    const generateBody = {
      profile_id: extensionState.profileId,
      job_description: jobDescription,
      token: extensionState.token,
      ai_provider: "claude",
      job_url: jobUrl,
      extension_version: extensionVersion || undefined,
    };

    // ── Initial generate call (loop only for status=6 admin retry) ────────────
    let data;
    while (true) {
      sendProgress("ai");
      data = await callGenerateApi(generateBody);
      if (!data) return;

      console.log("Xano response:", JSON.stringify(data));
      await syncProfilesFromGenerateResponse(data);

      const status = getGenerateStatus(data);
      const reason = getGenerateReason(data);

      // AI error — admins can retry, bidders see close-only error
      if (status === 6) {
        if (isAdmin) {
          sendProgress("ai_error", reason || "AI processing error. Please try again.");
          const retry = await waitForRetryDecision();
          if (retry) continue;
        } else {
          sendProgress("error", reason || "AI processing error. Please try again later.");
        }
        return;
      }

      break;
    }

    const status = getGenerateStatus(data);
    const reason = getGenerateReason(data);

    // ── Non-match statuses (0, 2, 3, 4, 5) ───────────────────────────────────
    // Bidders: show blocked banner (OK/close only)
    // Admins:  show admin_override banner (Force Generate) → retryWithForce

    // Status 4: duplicate URL
    if (status === 4 || data.duplicate_info) {
      const d = data.duplicate_info;
      const appliedDate = d?.created_at
        ? new Date(d.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : "";
      const detail = d
        ? (d.position_title || "") + (d.company_name ? " at " + d.company_name : "") + (appliedDate ? " — applied on " + appliedDate : "")
        : (reason || "This job has been applied before.");
      if (!isAdmin) { sendProgress("duplicate", undefined, detail); return; }
      sendProgress("admin_override", detail, "duplicate");
      if (!await waitForAdminDecision()) return;
      await retryWithForce(jobDescription, jobUrl, data.log_id);
      return;
    }

    // Status 3: not a job description
    if (status === 3) {
      if (!isAdmin) { sendProgress("not_job_description", undefined, reason || ""); return; }
      sendProgress("admin_override", reason || "Not a job description", "not_jd");
      if (!await waitForAdminDecision()) return;
      await retryWithForce(jobDescription, jobUrl, data.log_id);
      return;
    }

    // Status 2: job unfit (not remote, clearance, freelance platform, etc.)
    if (status === 2 || data.skipped === true) {
      if (!isAdmin) { sendProgress("skipped", undefined, reason || ""); return; }
      sendProgress("admin_override", reason || "Job does not meet requirements", "skipped");
      if (!await waitForAdminDecision()) return;
      await retryWithForce(jobDescription, jobUrl, data.log_id);
      return;
    }

    // Status 5: reposted job
    if (status === 5) {
      const appliedDate = data.applied_date
        ? new Date(data.applied_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : "";
      const detail = (reason || "Same company and position found in previous applications")
        + (appliedDate ? " (applied on " + appliedDate + ")" : "");
      if (!isAdmin) { sendProgress("reposted_blocked", undefined, detail); return; }
      sendProgress("admin_override", detail, "reposted");
      if (!await waitForAdminDecision()) return;
      await retryWithForce(jobDescription, jobUrl, data.log_id);
      return;
    }

    // Status 0: job does not match the profile
    if (status === 0 || data.is_matched === false) {
      if (!isAdmin) { sendProgress("mismatch_blocked", undefined, reason || ""); return; }
      sendProgress("admin_override", reason || "Job does not match profile", "mismatch");
      if (!await waitForAdminDecision()) return;
      await retryWithForce(jobDescription, jobUrl, data.log_id);
      return;
    }

    // ── Status 1: successful match → generate PDFs ────────────────────────────
    await processResumeResponse(data);

  } catch (error) {
    console.error("Error generating resume:", error);
    sendProgress("error", error.message);
    showNotification("Error: " + error.message);
  }
}

// Show notification
function showNotification(message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "SwiftCV",
    message: message,
  });
}

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "selectProfile") {
    // User chose a specific profile from the picker
    const { profileId, profileName } = request;
    extensionState.profileId = profileId;
    extensionState.profileName = profileName;
    extensionState.isConfirmed = true;
    // Look up the resume template for this profile from the stored list
    const profileIdx = extensionState.profileIds.indexOf(profileId);
    chrome.storage.local.get("resumeTemplates", (storedTemplates) => {
      const templateArr = storedTemplates.resumeTemplates || [];
      const selectedTemplate = (profileIdx >= 0 && templateArr[profileIdx]) ? templateArr[profileIdx] : 1;
      extensionState.resumeTemplate = selectedTemplate;
      chrome.storage.local.set({ profileId, profileName, isConfirmed: true, resumeTemplate: selectedTemplate });
      console.log("[BG] Resume template set for selected profile:", selectedTemplate);
      setupContextMenu();
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === "confirmProfile") {
    extensionState.isConfirmed = true;
    chrome.storage.local.set({ isConfirmed: true });
    setupContextMenu();
    sendResponse({ success: true });
  } else if (request.action === "tokenSaved") {
    // Called by setup.js after token is validated and stored
    extensionState.token = request.token;
    refreshProfilesIfNeeded({ force: true, openDialogs: true, notify: true }).then(() => sendResponse({ success: true }));
    return true;
  } else if (request.action === "switchProfile") {
    // Called from popup when user wants to switch profile
    extensionState.isConfirmed = false;
    chrome.storage.local.set({ isConfirmed: false });
    refreshProfilesIfNeeded({ force: true, openDialogs: true, notify: true })
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message || String(error) }));
    return true;
  } else if (request.action === "enterToken") {
    // Called from popup when user clicks "Enter Token"
    chrome.windows.create({
      url: "setup.html",
      type: "popup",
      width: 480,
      height: 550,
    });
    sendResponse({ success: true });
  } else if (request.action === "openProfileConfirmation") {
    loadExtensionState()
      .then(() => refreshProfilesIfNeeded({ force: true, openDialogs: false, notify: false }))
      .catch(() => null)
      .finally(() => {
        openProfileConfirmationFlow();
        sendResponse({ success: true });
      });
    return true;
  } else if (request.action === "getState") {
    // Re-load state if token was lost (service worker went idle)
    if (!extensionState.token) {
      loadExtensionState().then(() => {
        sendResponse(extensionState);
      });
      return true;
    }
    sendResponse(extensionState);
  }
  return true;
});

// Add permissions check
chrome.permissions.contains(
  {
    permissions: ["contextMenus", "storage", "downloads", "notifications"],
  },
  (result) => {
    if (!result) {
      console.warn("Some permissions are missing");
    }
  }
);
