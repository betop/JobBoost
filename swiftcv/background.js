// Background service worker for SwiftCV Extension
// PDF generation is handled by the offscreen document (offscreen.html/offscreen.js)

// Xano API base URLs per group
const XANO_PUBLIC_URL = "https://x8ki-letl-twmt.n7.xano.io/api:W5ffWHW-:v1";
const XANO_RESUME_URL = "https://x8ki-letl-twmt.n7.xano.io/api:caf8Eo15:v1";
const PROFILE_REFRESH_MAX_AGE_MS = 10 * 60 * 1000;

let extensionState = {
  token: null,
  profileId: null,
  profileName: null,
  profileIds: [],
  profileNames: [],
  isConfirmed: false,
  resumeTemplate: 1,
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
      height: 560,
    });
  } else {
    await refreshProfilesIfNeeded({ force: true });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await loadExtensionState();
  if (extensionState.token) {
    await refreshProfilesIfNeeded();
  }
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
    ]);

    if (stored.token)            extensionState.token          = stored.token;
    if (stored.profileId)        extensionState.profileId      = stored.profileId;
    if (stored.profileName)      extensionState.profileName    = stored.profileName;
    if (stored.profileIds)       extensionState.profileIds     = stored.profileIds;
    if (stored.profileNames)     extensionState.profileNames   = stored.profileNames;
    if (stored.isConfirmed)      extensionState.isConfirmed    = stored.isConfirmed;
    if (stored.resumeTemplate)   extensionState.resumeTemplate = stored.resumeTemplate;
    if (stored.lastProfilesSyncAt) lastProfilesSyncAt = stored.lastProfilesSyncAt;
  } catch (error) {
    console.error("Error loading extension state:", error);
  }
}

function isProfileDataStale(maxAgeMs = PROFILE_REFRESH_MAX_AGE_MS) {
  if (!lastProfilesSyncAt) return true;
  return (Date.now() - lastProfilesSyncAt) > maxAgeMs;
}

async function fetchTokenProfiles(endpoint = "token-profiles") {
  if (!extensionState.token) {
    console.log("No token found");
    return null;
  }

  const response = await fetch(`${XANO_PUBLIC_URL}/public/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: extensionState.token }),
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
  return profileIdx >= 0 && templates[profileIdx] ? templates[profileIdx] : 1;
}

async function applyProfilesData(data, { openDialogs = true } = {}) {
  const ids = data.profile_ids || [];
  const names = data.profile_names || [];
  const templates = data.resume_templates || [];

  extensionState.profileIds = ids;
  extensionState.profileNames = names;

  const previousProfileId = extensionState.profileId;
  const previousSelectionStillValid = previousProfileId && ids.includes(previousProfileId);

  if (ids.length === 1) {
    extensionState.profileId = ids[0];
    extensionState.profileName = names[0] || "";
    extensionState.resumeTemplate = templates[0] || 1;
  } else if (previousSelectionStillValid) {
    extensionState.profileId = previousProfileId;
    extensionState.profileName = names[ids.indexOf(previousProfileId)] || extensionState.profileName || "";
    extensionState.resumeTemplate = getTemplateForProfile(previousProfileId, ids, templates);
  } else {
    extensionState.profileId = null;
    extensionState.profileName = null;
    extensionState.resumeTemplate = 1;
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
  });

  if (extensionState.profileId && extensionState.isConfirmed) {
    setupContextMenu();
  }

  if (!openDialogs) {
    return;
  }

  if (ids.length === 1 && !extensionState.isConfirmed) {
    chrome.windows.create({
      url: "confirm.html",
      type: "popup",
      width: 400,
      height: 300,
    });
  } else if (ids.length > 1 && !extensionState.profileId) {
    chrome.windows.create({
      url: "select_profile.html",
      type: "popup",
      width: 420,
      height: 420,
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
    maxAgeMs = PROFILE_REFRESH_MAX_AGE_MS,
    openDialogs = false,
    notify = false,
  } = options;

  if (!extensionState.token) {
    return null;
  }

  if (!force && !isProfileDataStale(maxAgeMs)) {
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

    // Service worker may have gone idle — reload state from storage before checking
    await loadExtensionState();
    await refreshProfilesIfNeeded({ openDialogs: false, notify: true, maxAgeMs: 2 * 60 * 1000 });

    if (!extensionState.isConfirmed) {
      showNotification("Please confirm your profile first.");
      return;
    }

    // Capture the URL of the tab where the user right-clicked
    const jobUrl = tab?.url || "";

    await generateResume(selectedText, jobUrl);
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
  // Open progress window
  const progressWin = await new Promise((resolve) =>
    chrome.windows.create(
      { url: "progress.html", type: "popup", width: 380, height: 420 },
      (win) => resolve(win)
    )
  );

  // Wait briefly so the progress window can register its listener
  await new Promise((r) => setTimeout(r, 600));

  function sendProgress(step, error, reason) {
    chrome.runtime.sendMessage({ action: "progressUpdate", step, error, reason }).catch(() => {});
  }

  try {
    sendProgress("ai");

    const response = await fetch(`${XANO_RESUME_URL}/resume/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_id: extensionState.profileId,
        job_description: jobDescription,
        token: extensionState.token,
        ai_provider: "claude",
        job_url: jobUrl,
      }),
    });

    if (!response.ok) {
      let message = "Failed to generate resume";
      try {
        const errorData = await response.json();
        message = errorData?.message || errorData?.error || message;
      } catch (_) {}
      throw new Error(message);
    }

    const data = await response.json();
    console.log("Xano response:", JSON.stringify(data));

    await syncProfilesFromGenerateResponse(data);

    // If job is not 100% remote (is_matched === 2), inform the user via the progress window
    if (data.skipped === true || data.is_matched === 2) {
      console.log("[BG] Job skipped: not a 100% remote position.");
      sendProgress("skipped");
      return;
    }

    // If job does not match the profile, warn the user and wait for confirmation
    let wasMismatched = false;
    if (data.is_matched === false || data.is_matched === 0) {
      console.log("[BG] Job mismatch detected:", data.match_reason);
      sendProgress("mismatch", undefined, data.match_reason || "");

      // Wait for user decision (confirmed or cancelled)
      const confirmed = await new Promise((resolve) => {
        function handler(message) {
          if (message.action === "mismatchConfirmed") {
            chrome.runtime.onMessage.removeListener(handler);
            resolve(true);
          } else if (message.action === "mismatchCancelled") {
            chrome.runtime.onMessage.removeListener(handler);
            resolve(false);
          }
        }
        chrome.runtime.onMessage.addListener(handler);
        // Auto-cancel after 5 minutes
        setTimeout(() => { chrome.runtime.onMessage.removeListener(handler); resolve(false); }, 300000);
      });

      if (!confirmed) {
        console.log("[BG] User cancelled after mismatch warning.");
        return;
      }

      wasMismatched = true;
      sendProgress("ai");
    }

    // resume_text is now a JSON object from the new schema (or a string for legacy)
    const rawData = data.resume_text || "";
    const rawDataStr = typeof rawData === "object" ? JSON.stringify(rawData) : String(rawData);
    if (!rawDataStr || rawDataStr === "{}" || rawDataStr === "") {
      throw new Error("No resume content returned from server. Check Xano debug logs for AI errors.");
    }

    console.log("[BG] resume_text type:", typeof rawData, "| length:", rawDataStr.length, "| first 200 chars:", rawDataStr.slice(0, 200));

    sendProgress("resume");

    // Use offscreen document for PDF generation + download (required in MV3 service workers)
    await ensureOffscreenDocument();

    sendProgress("cover");

    const pdfResult = await chrome.runtime.sendMessage({
      action: "generateAndDownloadPDFs",
      rawData: rawData,
      coverLetterText: data.cover_letter_text || "",
      resumeFilename: data.resume_filename || "Resume.pdf",
      coverLetterFilename: data.cover_letter_filename || "Cover_Letter.pdf",
      templateId: extensionState.resumeTemplate || 1,
    });

    if (!pdfResult?.success) {
      console.error("[BG] PDF generation failed, full result:", JSON.stringify(pdfResult));
      throw new Error(pdfResult?.error || "PDF generation failed");
    }

    // For mismatched jobs the user chose to continue — show a confirmation before downloading
    if (wasMismatched) {
      sendProgress("ready");
      await new Promise((resolve) => {
        function handler(message) {
          if (message.action === "downloadConfirmed") {
            chrome.runtime.onMessage.removeListener(handler);
            resolve();
          }
        }
        chrome.runtime.onMessage.addListener(handler);
        // Auto-proceed after 10 minutes if user doesn't click
        setTimeout(() => { chrome.runtime.onMessage.removeListener(handler); resolve(); }, 600000);
      });
    }

    sendProgress("download");
    // Wait long enough for both PDFs to download before closing the offscreen doc
    await new Promise((r) => setTimeout(r, 8000));
    await chrome.offscreen.closeDocument().catch(() => {});

    sendProgress("done");
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
    refreshProfilesIfNeeded({ force: true }).then(() => sendResponse({ success: true }));
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
      height: 560,
    });
    sendResponse({ success: true });
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
