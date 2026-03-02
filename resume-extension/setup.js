// setup.js — Token entry page for first-time setup

const XANO_PUBLIC_URL = "https://x8ki-letl-twmt.n7.xano.io/api:W5ffWHW-:v1";

const tokenInput = document.getElementById("tokenInput");
const saveBtn    = document.getElementById("saveBtn");
const errorMsg   = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add("visible");
  successMsg.classList.remove("visible");
}

function showSuccess(msg) {
  successMsg.textContent = msg;
  successMsg.classList.add("visible");
  errorMsg.classList.remove("visible");
}

function clearMessages() {
  errorMsg.classList.remove("visible");
  successMsg.classList.remove("visible");
}

saveBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();

  if (!token) {
    showError("Please enter a token.");
    return;
  }

  clearMessages();
  saveBtn.disabled = true;
  saveBtn.textContent = "Validating…";

  try {
    const response = await fetch(`${XANO_PUBLIC_URL}/public/validate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      let msg = "Invalid token. Please check and try again.";
      try {
        const data = await response.json();
        msg = data?.message || data?.error || msg;
      } catch (_) {}
      showError(msg);
      saveBtn.disabled = false;
      saveBtn.textContent = "Validate & Save";
      return;
    }

    const data = await response.json();

    // Save token and profile data to chrome.storage
    await chrome.storage.local.set({
      token,
      profileIds:   data.profile_ids   || [],
      profileNames: data.profile_names || [],
      isConfirmed:  false,
      profileId:    null,
      profileName:  null,
    });

    showSuccess("Token validated! Setting up your profile…");
    saveBtn.textContent = "Saved ✓";

    // Let background script finish setup (profile selection / confirm)
    await chrome.runtime.sendMessage({ action: "tokenSaved", token });

    // Close this setup window after a short delay
    setTimeout(() => window.close(), 1200);

  } catch (err) {
    showError("Could not connect to server. Check your internet connection.");
    saveBtn.disabled = false;
    saveBtn.textContent = "Validate & Save";
  }
});

// Allow Enter key to submit
tokenInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});
