const STEPS = ["ai", "resume", "cover", "download"];

const STATUS_MAP = {
  ai:       "Generating with AI...",
  resume:   "Creating Resume PDF...",
  cover:    "Creating Cover Letter PDF...",
  download: "Downloading files...",
  done:     "Complete!",
  error:    "Something went wrong.",
};

function setStep(activeStep) {
  let passed = true;
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (!el) continue;
    if (s === activeStep) {
      el.className = "step active";
      passed = false;
    } else if (passed) {
      el.className = "step done";
    } else {
      el.className = "step pending";
    }
  }
  const statusText = STATUS_MAP[activeStep] || activeStep;
  document.getElementById("statusText").textContent = statusText;
}

function showDone() {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = STATUS_MAP.done;
  // Mark all steps done
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.className = "step done";
  }
  document.getElementById("doneBanner").style.display = "block";
  setTimeout(() => window.close(), 3000);
}

function showError(msg, canRetry = false) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = STATUS_MAP.error;
  const banner = document.getElementById("errorBanner");
  document.getElementById("errorText").textContent = msg || "An unexpected error occurred.";
  const retryBtn = document.getElementById("errorRetry");
  const closeBtn = document.getElementById("errorClose");
  if (retryBtn) retryBtn.style.display = canRetry ? "" : "none";
  if (closeBtn) closeBtn.textContent = canRetry ? "Cancel" : "Close";
  if (retryBtn) {
    retryBtn.onclick = () => {
      chrome.runtime.sendMessage({ action: "retryGeneration" });
      banner.style.display = "none";
      document.getElementById("spinner").style.display = "block";
      for (const s of STEPS) {
        const el = document.getElementById("step-" + s);
        if (el) { el.style.display = "flex"; el.className = "step pending"; }
      }
      document.getElementById("step-ai").className = "step active";
      document.getElementById("statusText").textContent = STATUS_MAP.ai;
    };
  }
  if (closeBtn) {
    closeBtn.onclick = () => {
      if (canRetry) {
        chrome.runtime.sendMessage({ action: "retryCancelled" });
      }
      window.close();
    };
  }
  banner.style.display = "block";
}

function showSkipped() {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = "Generation skipped.";
  // Hide all steps
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.style.display = "none";
  }
  document.getElementById("skippedBanner").style.display = "block";
  document.getElementById("skippedClose").addEventListener("click", () => window.close());
}

function showNotJobDescription(reason) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = "Not a job description.";
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.style.display = "none";
  }
  if (reason) document.getElementById("notJdReason").textContent = reason;
  document.getElementById("notJdBanner").style.display = "block";
  document.getElementById("notJdClose").addEventListener("click", () => window.close());
}

function showMismatch(reason, canContinue = true) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = canContinue
    ? "Profile mismatch detected."
    : "Apply blocked: profile mismatch.";
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.style.display = "none";
  }
  if (reason) document.getElementById("mismatchReason").textContent = reason;
  document.getElementById("mismatchBanner").style.display = "block";

  const continueBtn = document.getElementById("mismatchContinue");
  const cancelBtn = document.getElementById("mismatchCancel");

  if (!canContinue) {
    if (continueBtn) continueBtn.style.display = "none";
    if (cancelBtn) cancelBtn.textContent = "Close";
  } else {
    if (continueBtn) continueBtn.style.display = "";
    if (cancelBtn) cancelBtn.textContent = "Cancel";
  }

  if (canContinue) {
    document.getElementById("mismatchContinue").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "mismatchConfirmed" });
      document.getElementById("mismatchBanner").style.display = "none";
      document.getElementById("spinner").style.display = "block";
      for (const s of STEPS) {
        const el = document.getElementById("step-" + s);
        if (el) { el.style.display = "flex"; el.className = "step pending"; }
      }
      document.getElementById("step-ai").className = "step active";
      document.getElementById("statusText").textContent = STATUS_MAP.ai;
    });
  }

  document.getElementById("mismatchCancel").addEventListener("click", () => {
    if (canContinue) {
      chrome.runtime.sendMessage({ action: "mismatchCancelled" });
    }
    window.close();
  });
}

function showDuplicate(detail) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = "Already applied.";
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.style.display = "none";
  }
  if (detail) document.getElementById("duplicateDetail").textContent = detail;
  document.getElementById("duplicateBanner").style.display = "block";
  document.getElementById("duplicateClose").addEventListener("click", () => window.close());
}

function showReposted(detail, canContinue = true) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = canContinue
    ? "Possible repost detected."
    : "Apply blocked: reposted job.";
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.style.display = "none";
  }
  if (detail) document.getElementById("repostedDetail").textContent = detail;
  document.getElementById("repostedBanner").style.display = "block";

  const continueBtn = document.getElementById("repostContinue");
  const cancelBtn = document.getElementById("repostCancel");
  if (!canContinue) {
    if (continueBtn) continueBtn.style.display = "none";
    if (cancelBtn) cancelBtn.textContent = "Close";
  } else {
    if (continueBtn) continueBtn.style.display = "";
    if (cancelBtn) cancelBtn.textContent = "Cancel";
  }
  if (canContinue) {
    document.getElementById("repostContinue").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "repostConfirmed" });
      document.getElementById("repostedBanner").style.display = "none";
      document.getElementById("spinner").style.display = "block";
      for (const s of STEPS) {
        const el = document.getElementById("step-" + s);
        if (el) { el.style.display = "flex"; el.className = "step pending"; }
      }
      document.getElementById("step-resume").className = "step active";
      document.getElementById("statusText").textContent = STATUS_MAP.resume;
    });
  }

  document.getElementById("repostCancel").addEventListener("click", () => {
    if (canContinue) {
      chrome.runtime.sendMessage({ action: "repostCancelled" });
    }
    window.close();
  });
}

function showReady() {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = "Ready to download!";
  // Mark all generation steps as done
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.className = "step done";
  }
  document.getElementById("readyBanner").style.display = "block";

  document.getElementById("readyDownload").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "downloadConfirmed" });
    document.getElementById("readyBanner").style.display = "none";
    document.getElementById("spinner").style.display = "block";
    document.getElementById("statusText").textContent = STATUS_MAP.download;
  });
}

// Admin override: show warning with "Generate Anyway" option
// statusType is one of: "error", "not_jd", "skipped"
function showAdminOverride(reason, statusType) {
  document.getElementById("spinner").style.display = "none";
  const titles = {
    error:   "❌ AI Processing Error",
    not_jd:  "⚠️ Not a Job Description",
    skipped: "⚠️ Not 100% Remote — Skipped",
  };
  document.getElementById("statusText").textContent = titles[statusType] || "Status Warning";
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.style.display = "none";
  }
  document.getElementById("adminOverrideTitle").textContent = titles[statusType] || "⚠️ Status Warning";
  document.getElementById("adminOverrideDetail").textContent = reason || "The AI returned a non-standard status for this job.";
  document.getElementById("adminOverrideBanner").style.display = "block";

  const continueBtn = document.getElementById("adminOverrideContinue");
  const cancelBtn = document.getElementById("adminOverrideCancel");
  const canContinue = statusType !== "error";
  if (continueBtn) continueBtn.style.display = canContinue ? "" : "none";
  if (cancelBtn) cancelBtn.textContent = canContinue ? "Cancel" : "Close";

  if (continueBtn) {
    continueBtn.onclick = () => {
      chrome.runtime.sendMessage({ action: "adminOverrideConfirmed" });
      document.getElementById("adminOverrideBanner").style.display = "none";
      document.getElementById("spinner").style.display = "block";
      for (const s of STEPS) {
        const el = document.getElementById("step-" + s);
        if (el) { el.style.display = "flex"; el.className = "step pending"; }
      }
      document.getElementById("step-ai").className = "step active";
      document.getElementById("statusText").textContent = STATUS_MAP.ai;
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      if (canContinue) {
        chrome.runtime.sendMessage({ action: "adminOverrideCancelled" });
      }
      window.close();
    };
  }
}

// Admin warning: info-only banner (e.g. duplicate detected but resume was generated)
function showAdminWarning(title, detail) {
  document.getElementById("adminWarningText").textContent = title + " — " + detail;
  document.getElementById("adminWarningBanner").style.display = "block";
  // Auto-hide after 5 seconds
  setTimeout(() => {
    document.getElementById("adminWarningBanner").style.display = "none";
  }, 5000);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "progressUpdate") {
    const { step, error, reason } = message;
    if (step === "done") {
      showDone();
    } else if (step === "ai_error") {
      showError(error || reason || "AI processing error. Please try again.", true);
    } else if (step === "error") {
      showError(error);
    } else if (step === "skipped") {
      showSkipped();
    } else if (step === "not_job_description") {
      showNotJobDescription(reason);
    } else if (step === "duplicate") {
      showDuplicate(reason);
    } else if (step === "reposted") {
      showReposted(reason);
    } else if (step === "reposted_blocked") {
      showReposted(reason, false);
    } else if (step === "mismatch") {
      showMismatch(reason);
    } else if (step === "mismatch_blocked") {
      showMismatch(reason, false);
    } else if (step === "ready") {
      showReady();
    } else if (step === "admin_override") {
      // error = reason text, reason = statusType (error/not_jd/skipped)
      showAdminOverride(error, reason);
    } else if (step === "admin_warning") {
      // error = title, reason = detail
      showAdminWarning(error, reason);
    } else {
      setStep(step);
    }
  }
});

// Let background know this window is ready
chrome.runtime.sendMessage({ action: "progressWindowReady" });
