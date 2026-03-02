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

function showError(msg) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = STATUS_MAP.error;
  const banner = document.getElementById("errorBanner");
  document.getElementById("errorText").textContent = msg || "An unexpected error occurred.";
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
}

function showMismatch(reason) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("statusText").textContent = "Profile mismatch detected.";
  for (const s of STEPS) {
    const el = document.getElementById("step-" + s);
    if (el) el.style.display = "none";
  }
  if (reason) document.getElementById("mismatchReason").textContent = reason;
  document.getElementById("mismatchBanner").style.display = "block";

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

  document.getElementById("mismatchCancel").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "mismatchCancelled" });
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

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "progressUpdate") {
    const { step, error, reason } = message;
    if (step === "done") {
      showDone();
    } else if (step === "error") {
      showError(error);
    } else if (step === "skipped") {
      showSkipped();
    } else if (step === "mismatch") {
      showMismatch(reason);
    } else if (step === "ready") {
      showReady();
    } else {
      setStep(step);
    }
  }
});

// Let background know this window is ready
chrome.runtime.sendMessage({ action: "progressWindowReady" });
