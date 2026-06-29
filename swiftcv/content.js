// Content script for SwiftCV Extension
console.log("SwiftCV content script loaded");

// Cache the last selection HTML on mouseup, before context menu fires
// This prevents losing the selection when the background script queries it
let _cachedSelectionHtml = "";
let _cachedSelectionText = "";

document.addEventListener("mouseup", () => {
  try {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === "") {
      return; // don't clear cache — user may be opening context menu
    }
    const range = selection.getRangeAt(0);
    const container = document.createElement("div");
    container.appendChild(range.cloneContents());
    _cachedSelectionHtml = container.innerHTML.trim();
    _cachedSelectionText = selection.toString().trim();
    // Expose on window so chrome.scripting.executeScript can read it directly
    window._swiftcvCachedHtml = _cachedSelectionHtml;
    window._swiftcvCachedText = _cachedSelectionText;
  } catch (e) {
    // ignore
  }
});

// Listen for request from background to capture selected HTML
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectionHtml") {
    try {
      // Try live selection first, fall back to cached value
      const selection = window.getSelection();
      let html = "";
      let text = "";

      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const container = document.createElement("div");
        container.appendChild(range.cloneContents());
        html = container.innerHTML.trim();
        text = selection.toString().trim();
      } else if (_cachedSelectionHtml) {
        html = _cachedSelectionHtml;
        text = _cachedSelectionText;
      }

      sendResponse({ html: html || text, text });
    } catch (e) {
      sendResponse({ html: _cachedSelectionText, text: _cachedSelectionText });
    }
    return true; // keep message channel open for async response
  }
});
