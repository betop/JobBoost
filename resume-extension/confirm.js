// Profile confirmation script

document.addEventListener("DOMContentLoaded", async () => {
  const profileNameEl = document.getElementById("profileName");
  const confirmBtn = document.getElementById("confirmBtn");

  // Get profile info from background script
  chrome.runtime.sendMessage({ action: "getState" }, (response) => {
    if (response && response.profileName) {
      profileNameEl.textContent = response.profileName;
    } else {
      profileNameEl.textContent = "Unknown Profile";
    }
  });

  // Handle confirmation
  confirmBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "confirmProfile" }, (response) => {
      if (response.success) {
        // Show success message
        confirmBtn.textContent = "Activated!";
        confirmBtn.disabled = true;
        
        // Close window after 1 second
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    });
  });
});
