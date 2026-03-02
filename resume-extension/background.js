// Background service worker for Resume Generator Extension
// PDF generation is handled by the offscreen document (offscreen.html/offscreen.js)

// Xano API base URLs per group
const XANO_PUBLIC_URL = "https://x8ki-letl-twmt.n7.xano.io/api:W5ffWHW-:v1";
const XANO_RESUME_URL = "https://x8ki-letl-twmt.n7.xano.io/api:caf8Eo15:v1";

let extensionState = {
  token: null,
  profileId: null,
  profileName: null,
  profileIds: [],
  profileNames: [],
  isConfirmed: false,
  aiProvider: "claude",
  resumeTemplate: 1,
};

// Load extension state on startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Resume Generator Extension installed");
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
    await validateToken();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await loadExtensionState();
  if (extensionState.token && !extensionState.isConfirmed) {
    await validateToken();
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
      "aiProvider",
      "resumeTemplate",
      "resumeTemplates",
    ]);

    if (stored.token)            extensionState.token          = stored.token;
    if (stored.profileId)        extensionState.profileId      = stored.profileId;
    if (stored.profileName)      extensionState.profileName    = stored.profileName;
    if (stored.profileIds)       extensionState.profileIds     = stored.profileIds;
    if (stored.profileNames)     extensionState.profileNames   = stored.profileNames;
    if (stored.isConfirmed)      extensionState.isConfirmed    = stored.isConfirmed;
    if (stored.aiProvider)       extensionState.aiProvider     = stored.aiProvider;
    if (stored.resumeTemplate)   extensionState.resumeTemplate = stored.resumeTemplate;
  } catch (error) {
    console.error("Error loading extension state:", error);
  }
}

// Validate token with backend
async function validateToken() {
  if (!extensionState.token) {
    console.log("No token found");
    return;
  }

  try {
    const response = await fetch(`${XANO_PUBLIC_URL}/public/validate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: extensionState.token }),
    });

    if (response.ok) {
      const data = await response.json();
      const ids = data.profile_ids || [];
      const names = data.profile_names || [];
      const templates = data.resume_templates || [];

      // Store the full list
      extensionState.profileIds = ids;
      extensionState.profileNames = names;

      await chrome.storage.local.set({
        profileIds: ids,
        profileNames: names,
        resumeTemplates: templates,
      });

      if (ids.length === 1) {
        // Auto-select the only profile
        extensionState.profileId = ids[0];
        extensionState.profileName = names[0] || "";
        const template = templates[0] || 1;
        extensionState.resumeTemplate = template;
        await chrome.storage.local.set({
          profileId: ids[0],
          profileName: names[0] || "",
          resumeTemplate: template,
        });
        console.log("[BG] Resume template loaded from profile:", template);

        // Show confirmation window
        if (!extensionState.isConfirmed) {
          chrome.windows.create({
            url: "confirm.html",
            type: "popup",
            width: 400,
            height: 300,
          });
        } else {
          setupContextMenu();
        }
      } else {
        // Multiple profiles — always show picker so user can choose / switch
        extensionState.isConfirmed = false;
        await chrome.storage.local.set({ isConfirmed: false });
        chrome.windows.create({
          url: "select_profile.html",
          type: "popup",
          width: 420,
          height: 420,
        });
      }
    } else {
      let message = response.statusText;
      try {
        const data = await response.json();
        message = data?.message || data?.error || message;
      } catch (_) {
        // ignore
      }
      console.error("Token validation failed:", message);
      showNotification(message || "Token validation failed. Please check your token.");
    }
  } catch (error) {
    console.error("Error validating token:", error);
    showNotification("Error connecting to server.");
  }
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
        ai_provider: extensionState.aiProvider,
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
    title: "Resume Generator",
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
  } else if (request.action === "setAiProvider") {
    extensionState.aiProvider = request.provider;
    chrome.storage.local.set({ aiProvider: request.provider });
    sendResponse({ success: true });
  } else if (request.action === "tokenSaved") {
    // Called by setup.js after token is validated and stored
    extensionState.token = request.token;
    validateToken().then(() => sendResponse({ success: true }));
    return true;
  } else if (request.action === "switchProfile") {
    // Called from popup when user wants to switch profile
    extensionState.isConfirmed = false;
    chrome.storage.local.set({ isConfirmed: false });
    chrome.windows.create({
      url: "select_profile.html",
      type: "popup",
      width: 420,
      height: 420,
    });
    sendResponse({ success: true });
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
