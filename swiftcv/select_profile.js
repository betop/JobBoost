// Profile selector script — shown when a bidder has 2+ profiles assigned

document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("profileList");
  const confirmBtn = document.getElementById("confirmBtn");
  let selectedId = null;
  let selectedName = null;

  // Fetch available profiles from background state
  chrome.runtime.sendMessage({ action: "getState" }, (state) => {
    const ids = state?.profileIds || [];
    const names = state?.profileNames || [];

    if (ids.length === 0) {
      listEl.innerHTML = '<p style="color:#ef4444;font-size:13px;">No profiles found.</p>';
      return;
    }

    listEl.innerHTML = "";

    ids.forEach((id, i) => {
      const name = names[i] || `Profile ${i + 1}`;

      const item = document.createElement("label");
      item.className = "profile-option";
      item.innerHTML = `
        <input type="radio" name="profile" value="${id}" data-name="${name}" />
        <span class="profile-option-name">${name}</span>
      `;

      const radio = item.querySelector("input");
      radio.addEventListener("change", () => {
        // Clear all selected styles
        listEl.querySelectorAll(".profile-option").forEach((el) => el.classList.remove("selected"));
        item.classList.add("selected");

        selectedId = id;
        selectedName = name;
        confirmBtn.disabled = false;
      });

      listEl.appendChild(item);
    });

    // Auto-select previously chosen profile if any
    if (state?.profileId) {
      const existing = listEl.querySelector(`input[value="${state.profileId}"]`);
      if (existing) {
        existing.checked = true;
        existing.closest(".profile-option").classList.add("selected");
        selectedId = state.profileId;
        selectedName = state.profileName || names[ids.indexOf(state.profileId)] || "";
        confirmBtn.disabled = false;
      }
    }
  });

  confirmBtn.addEventListener("click", () => {
    if (!selectedId) return;

    chrome.runtime.sendMessage(
      { action: "selectProfile", profileId: selectedId, profileName: selectedName },
      (response) => {
        if (response?.success) {
          confirmBtn.textContent = "Activated!";
          confirmBtn.disabled = true;
          setTimeout(() => window.close(), 900);
        }
      }
    );
  });
});
