// Popup script

document.addEventListener("DOMContentLoaded", async () => {
  const statusInfoEl = document.getElementById("statusInfo");
  const refreshBtn = document.getElementById("refreshBtn");

  // Load and display status
  async function updateStatus() {
    chrome.runtime.sendMessage({ action: "getState" }, (response) => {
      if (response) {
        if (response.isConfirmed) {
          const multiProfile = response.profileIds && response.profileIds.length > 1;
          statusInfoEl.innerHTML = `
            <div class="status-active">
              <span class="status-dot active"></span>
              <div>
                <p class="status-title">Active</p>
                <p class="status-profile">Profile: ${response.profileName || "Unknown"}</p>
              </div>
            </div>
            ${multiProfile ? `<button id="switchProfileBtn" class="btn-secondary" style="margin-top:10px;width:100%;">Switch Profile</button>` : ""}
          `;
          if (multiProfile) {
            document.getElementById("switchProfileBtn").addEventListener("click", () => {
              chrome.runtime.sendMessage({ action: "switchProfile" });
              window.close();
            });
          }
        } else if (response.token) {
          statusInfoEl.innerHTML = `
            <div class="status-pending">
              <span class="status-dot pending"></span>
              <div>
                <p class="status-title">Pending Confirmation</p>
                <p class="status-message">Please confirm your profile</p>
              </div>
            </div>
          `;
        } else {
          statusInfoEl.innerHTML = `
            <div class="status-inactive">
              <span class="status-dot inactive"></span>
              <div>
                <p class="status-title">Not Configured</p>
                <p class="status-message">No token found</p>
              </div>
            </div>
            <button id="enterTokenBtn" class="btn-primary" style="margin-top:12px;width:100%;">Enter Token</button>
          `;
          document.getElementById("enterTokenBtn").addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "enterToken" });
          });
        }
      }
    });
  }

  // Provider toggle
  const providerOpenAI = document.getElementById("providerOpenAI");
  const providerClaude = document.getElementById("providerClaude");
  const providerLabel = document.getElementById("providerLabel");

  function setProvider(provider) {
    providerOpenAI.classList.toggle("active", provider === "openai");
    providerClaude.classList.toggle("active", provider === "claude");
    providerLabel.textContent = provider === "claude" ? "Using: Claude 4.5 Haiku" : "Using: GPT-4o mini";
    chrome.runtime.sendMessage({ action: "setAiProvider", provider });
  }

  // Load current provider from state
  chrome.runtime.sendMessage({ action: "getState" }, (response) => {
    if (response?.aiProvider) setProvider(response.aiProvider);
  });

  providerOpenAI.addEventListener("click", () => setProvider("openai"));
  providerClaude.addEventListener("click", () => setProvider("claude"));

  // Initial load
  updateStatus();

  // Refresh button
  refreshBtn.addEventListener("click", updateStatus);
});
