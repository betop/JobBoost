// SwiftCV Chat Bubble — Content Script
// Injects a floating chat assistant into every page

(function () {
  "use strict";

  // ── Prevent double injection ─────────────────────────────────────────────
  if (document.getElementById("swiftcv-chat-root")) return;

  // ── Constants ────────────────────────────────────────────────────────────
  const XANO_RESUME_URL = "https://api.shsws-solutions.com/api:caf8Eo15";
  const XANO_LOGS_URL = "https://api.shsws-solutions.com/api:fMYNj_1_";

  // ── State ────────────────────────────────────────────────────────────────
  let attachedFiles = []; // { name, base64, type }
  let isOpen = false;
  let conversationHistory = []; // { role, content (text only) }

  // ─────────────────────────────────────────────────────────────────────────
  // INJECT STYLES
  // ─────────────────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.id = "swiftcv-chat-styles";
  style.textContent = `
    /* ── Reset for all swiftcv elements ── */
    #swiftcv-chat-root * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
    }

    /* ── Bubble ── */
    #swiftcv-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      border: none;
      outline: none;
    }
    #swiftcv-bubble:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(102, 126, 234, 0.65);
    }
    #swiftcv-bubble svg { pointer-events: none; }
    #swiftcv-bubble .swiftcv-bubble-tip {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      background: rgba(0,0,0,0.78);
      color: #fff;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      padding: 5px 9px;
      border-radius: 6px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.18s;
    }
    #swiftcv-bubble:hover .swiftcv-bubble-tip { opacity: 1; }

    /* ── Popup ── */
    #swiftcv-popup {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      width: 390px;
      max-height: min(660px, 60dvh);
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: swiftcv-slide-up 0.22s ease;
    }
    @keyframes swiftcv-slide-up {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    #swiftcv-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    #swiftcv-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #swiftcv-header-title {
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    #swiftcv-header-subtitle {
      color: rgba(255,255,255,0.75);
      font-size: 11px;
      margin-top: 2px;
    }
    .swiftcv-icon-btn {
      background: rgba(255,255,255,0.15);
      border: none;
      border-radius: 7px;
      padding: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      transition: background 0.15s;
      position: relative;
    }
    .swiftcv-icon-btn:hover { background: rgba(255,255,255,0.28); }
    .swiftcv-icon-btn .swiftcv-tooltip {
      position: absolute;
      top: calc(100% + 6px);
      bottom: auto;
      right: 0;
      z-index: 10;
      background: rgba(0,0,0,0.78);
      color: #fff;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      padding: 5px 9px;
      border-radius: 5px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .swiftcv-icon-btn:hover .swiftcv-tooltip { opacity: 1; }
    /* Clear btn tooltip anchors left so it doesn’t clip off the right edge */
    #swiftcv-clear-btn .swiftcv-tooltip {
      right: auto;
      left: 0;
    }

    /* ── Compensation banner ── */
    #swiftcv-comp-banner {
      display: none;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #eef2ff;
      border-bottom: 1px solid #e0e7ff;
      font-size: 12px;
      font-weight: 600;
      color: #4338ca;
      flex-shrink: 0;
    }
    #swiftcv-comp-banner svg { flex-shrink: 0; }

    /* ── Messages area ── */
    #swiftcv-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f7f8fc;
      min-height: 140px;
      max-height: 380px;
    }
    #swiftcv-messages::-webkit-scrollbar { width: 4px; }
    #swiftcv-messages::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }

    .swiftcv-msg {
      max-width: 88%;
      padding: 9px 13px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .swiftcv-msg-assistant {
      background: #fff;
      border: 1px solid #e8e9f0;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      color: #222;
      position: relative;
    }
    .swiftcv-copy-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      background: #f0f1f8;
      border: 1px solid #e0e2ef;
      border-radius: 5px;
      padding: 3px 5px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s, background 0.15s;
      display: flex;
      align-items: center;
      color: #667eea;
      line-height: 1;
    }
    .swiftcv-msg-assistant:hover .swiftcv-copy-btn { opacity: 1; }
    .swiftcv-copy-btn:hover { background: #e0e2f5; }
    .swiftcv-copy-btn.swiftcv-copied { color: #28a745; border-color: #b7e4c0; background: #eaf7ec; }
    .swiftcv-msg-user {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .swiftcv-msg-system {
      background: #fff3cd;
      border: 1px solid #ffc107;
      color: #856404;
      align-self: center;
      font-size: 12px;
      border-radius: 8px;
      max-width: 100%;
      text-align: center;
      padding: 7px 12px;
    }
    .swiftcv-typing {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 9px 13px;
    }
    .swiftcv-typing span {
      width: 7px;
      height: 7px;
      background: #aaa;
      border-radius: 50%;
      animation: swiftcv-bounce 1.2s infinite;
    }
    .swiftcv-typing span:nth-child(2) { animation-delay: 0.2s; }
    .swiftcv-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes swiftcv-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    /* ── Attachments strip ── */
    #swiftcv-attachments {
      padding: 7px 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      background: #f7f8fc;
      border-top: 1px solid #eee;
      flex-shrink: 0;
    }
    #swiftcv-attachments:empty { display: none; }
    .swiftcv-file-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      background: #eef0ff;
      border: 1px solid #c5caf7;
      border-radius: 20px;
      padding: 4px 10px 4px 8px;
      font-size: 11px;
      color: #3d4bc7;
    }
    .swiftcv-file-chip button {
      background: none;
      border: none;
      cursor: pointer;
      color: #888;
      font-size: 13px;
      line-height: 1;
      padding: 0 0 0 2px;
      display: flex;
    }
    .swiftcv-file-chip button:hover { color: #e53e3e; }

    /* ── Footer / Input area ── */
    #swiftcv-footer {
      padding: 10px 14px 12px;
      border-top: 1px solid #eee;
      background: #fff;
      flex-shrink: 0;
    }
    #swiftcv-textarea {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 13px;
      resize: none;
      outline: none;
      min-height: 70px;
      max-height: 120px;
      background: #f9f9fc;
      color: #222;
      transition: border-color 0.15s;
      line-height: 1.55;
    }
    #swiftcv-textarea:focus { border-color: #667eea; background: #fff; }
    #swiftcv-textarea::placeholder { color: #aaa; }

    #swiftcv-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 7px;
    }
    #swiftcv-actions-left { display: flex; gap: 6px; }

    .swiftcv-action-btn {
      background: #f0f1f9;
      border: 1px solid #e0e1f0;
      border-radius: 8px;
      padding: 7px 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #555;
      transition: background 0.15s, color 0.15s;
      position: relative;
    }
    .swiftcv-action-btn:hover { background: #e0e2f5; color: #667eea; }


    #swiftcv-send-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 9px;
      padding: 8px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      transition: opacity 0.15s, transform 0.1s;
      position: relative;
    }
    #swiftcv-send-btn:hover { opacity: 0.9; transform: scale(1.02); }
    #swiftcv-send-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    #swiftcv-send-btn .swiftcv-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      top: auto;
      right: 0;
      background: rgba(0,0,0,0.78);
      color: #fff;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      padding: 5px 9px;
      border-radius: 5px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
      z-index: 10;
    }
    #swiftcv-send-btn:hover .swiftcv-tooltip { opacity: 1; }
    #swiftcv-send-btn:disabled:hover .swiftcv-tooltip { opacity: 0; }

    /* Hidden file input */
    #swiftcv-file-input { display: none; }
  `;
  document.head.appendChild(style);

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD DOM
  // ─────────────────────────────────────────────────────────────────────────
  const root = document.createElement("div");
  root.id = "swiftcv-chat-root";

  // Respect the show/hide toggle from the popup (default: shown)
  chrome.storage.local.get(["chatBubbleEnabled"], (result) => {
    if (result.chatBubbleEnabled === false) root.style.display = "none";
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.chatBubbleEnabled) {
      root.style.display = changes.chatBubbleEnabled.newValue === false ? "none" : "";
    }
  });

  // ── Bubble ──
  root.innerHTML = `
    <button id="swiftcv-bubble" title="Ask SwiftCV AI">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="swiftcv-bubble-tip">Ask SwiftCV AI</span>
    </button>

    <!-- Chat Popup -->
    <div id="swiftcv-popup" style="display:none;">

      <!-- Header -->
      <div id="swiftcv-header">
        <div id="swiftcv-header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <div>
            <div id="swiftcv-header-title">SwiftCV Assistant</div>
            <div id="swiftcv-header-subtitle">Powered by GPT-4o</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="swiftcv-icon-btn" id="swiftcv-clear-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
          <button class="swiftcv-icon-btn" id="swiftcv-close-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Compensation -->
      <div id="swiftcv-comp-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <span id="swiftcv-comp-text"></span>
      </div>

      <!-- Messages -->
      <div id="swiftcv-messages">
        <div class="swiftcv-msg swiftcv-msg-assistant" id="swiftcv-welcome-msg">👋 Hi! Attach your resume and cover letter (PDF) and ask me anything about them.</div>
      </div>

      <!-- File chips -->
      <div id="swiftcv-attachments"></div>

      <!-- Footer -->
      <div id="swiftcv-footer">
        <textarea id="swiftcv-textarea" placeholder="Ask a question about your resume or job…" rows="3"></textarea>
        <div id="swiftcv-actions">
          <div id="swiftcv-actions-left">
            <button class="swiftcv-action-btn" id="swiftcv-attach-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
          </div>
          <button id="swiftcv-send-btn" disabled>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Send
            <span class="swiftcv-tooltip">Send message</span>
          </button>
        </div>
      </div>

      <!-- Hidden file input -->
      <input type="file" id="swiftcv-file-input" accept=".pdf" multiple />
    </div>
  `;

  document.body.appendChild(root);

  // ─────────────────────────────────────────────────────────────────────────
  // ELEMENT REFS
  // ─────────────────────────────────────────────────────────────────────────
  const bubble      = document.getElementById("swiftcv-bubble");
  const popup       = document.getElementById("swiftcv-popup");
  const closeBtn    = document.getElementById("swiftcv-close-btn");
  const clearBtn    = document.getElementById("swiftcv-clear-btn");
  const messagesEl  = document.getElementById("swiftcv-messages");
  const attachmentsEl = document.getElementById("swiftcv-attachments");
  const textarea    = document.getElementById("swiftcv-textarea");
  const attachBtn   = document.getElementById("swiftcv-attach-btn");
  const fileInput   = document.getElementById("swiftcv-file-input");
  const sendBtn     = document.getElementById("swiftcv-send-btn");
  const compBanner  = document.getElementById("swiftcv-comp-banner");
  const compText    = document.getElementById("swiftcv-comp-text");

  function setCompensation(value) {
    if (!compBanner || !compText) return;
    if (value) {
      compText.textContent = value;
      compBanner.style.display = "flex";
    } else {
      compBanner.style.display = "none";
      compText.textContent = "";
    }
  }

  // Fetch last log entry from backend and update the welcome message
  async function refreshHeader() {
    const stored = await new Promise(r => chrome.storage.local.get(["token", "lastLogId", "profileName"], r));
    const welcomeEl = document.getElementById("swiftcv-welcome-msg");
    if (!welcomeEl) return;

    let intro = "";
    if (stored.profileName) intro = `Hi, ${stored.profileName}! `;

    if (!stored.token || !stored.lastLogId) {
      welcomeEl.textContent = `👋 ${intro}Attach your resume and cover letter (PDF) and ask me anything — including answers to application form questions!`;
      setCompensation(null);
      return;
    }
    try {
      const res = await fetch(`${XANO_LOGS_URL}/logs/entry?token=${encodeURIComponent(stored.token)}&log_id=${encodeURIComponent(stored.lastLogId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const parts = [data.position_title, data.company_name].filter(Boolean);
      const jobLine = parts.length ? ` for the <strong>${parts.join(" at ")}</strong>${parts.length > 1 ? " company" : ""}` : "";
      welcomeEl.innerHTML = `👋 ${intro}Your last resume was generated${jobLine}. Ask me anything — I can help you craft answers to application form questions for this role!`;
      setCompensation(data.compensation || null);
    } catch (_) { /* non-critical */ }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────────────────────────────────────────────────
  function openPopup() {
    isOpen = true;
    bubble.style.display = "none";
    popup.style.display  = "flex";
    textarea.focus();
    refreshHeader();
  }

  function closePopup() {
    isOpen = false;
    popup.style.display  = "none";
    bubble.style.display = "flex";
  }

  bubble.addEventListener("click", openPopup);
  closeBtn.addEventListener("click", closePopup);

  // ─────────────────────────────────────────────────────────────────────────
  // CLEAR CONVERSATION
  // ─────────────────────────────────────────────────────────────────────────
  clearBtn.addEventListener("click", () => {
    conversationHistory = [];
    attachedFiles = [];
    renderAttachments();
    messagesEl.innerHTML = '<div class="swiftcv-msg swiftcv-msg-assistant">👋 Hi! Attach your resume or cover letter (PDF) and ask me anything about it.</div>';
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEND BUTTON ENABLE STATE
  // ─────────────────────────────────────────────────────────────────────────
  textarea.addEventListener("input", updateSendBtn);

  function updateSendBtn() {
    sendBtn.disabled = textarea.value.trim().length === 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FILE ATTACHMENT
  // ─────────────────────────────────────────────────────────────────────────
  attachBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files);
    for (const file of files) {
      if (file.type !== "application/pdf") continue;
      // Check if already attached
      if (attachedFiles.find((f) => f.name === file.name)) continue;

      const base64 = await readFileAsBase64(file);
      attachedFiles.push({ name: file.name, base64, type: "application/pdf" });
    }
    fileInput.value = "";
    renderAttachments();
  });

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // result is data:application/pdf;base64,XXXX
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderAttachments() {
    attachmentsEl.innerHTML = "";
    for (const f of attachedFiles) {
      const chip = document.createElement("div");
      chip.className = "swiftcv-file-chip";
      chip.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>${f.name}</span>
        <button data-name="${f.name}" title="Remove">✕</button>
      `;
      chip.querySelector("button").addEventListener("click", (e) => {
        const name = e.currentTarget.dataset.name;
        attachedFiles = attachedFiles.filter((x) => x.name !== name);
        renderAttachments();
      });
      attachmentsEl.appendChild(chip);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MESSAGES
  // ─────────────────────────────────────────────────────────────────────────
  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `swiftcv-msg swiftcv-msg-${role}`;
    if (role === "assistant") {
      const textNode = document.createElement("span");
      textNode.className = "swiftcv-msg-text";
      textNode.textContent = text;
      const copyBtn = document.createElement("button");
      copyBtn.className = "swiftcv-copy-btn";
      copyBtn.title = "Copy";
      copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          copyBtn.classList.add("swiftcv-copied");
          setTimeout(() => {
            copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
            copyBtn.classList.remove("swiftcv-copied");
          }, 2000);
        });
      });
      div.appendChild(textNode);
      div.appendChild(copyBtn);
    } else {
      div.textContent = text;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "swiftcv-msg swiftcv-msg-assistant swiftcv-typing";
    div.id = "swiftcv-typing-indicator";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById("swiftcv-typing-indicator");
    if (el) el.remove();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND
  // ─────────────────────────────────────────────────────────────────────────
  sendBtn.addEventListener("click", handleSend);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
  });

  async function handleSend() {
    const question = textarea.value.trim();
    if (!question) return;

    // Load the user's SwiftCV token from storage
    const stored = await new Promise((resolve) =>
      chrome.storage.local.get(["token", "lastLogId"], resolve)
    );
    const token = stored.token;
    if (!token) {
      addMessage("system", "⚠️ No SwiftCV key found. Please set up the extension first.");
      return;
    }

    // Show user message
    addMessage("user", question);
    textarea.value = "";
    updateSendBtn();

    sendBtn.disabled = true;
    showTyping();

    // Build payload — send base64 PDFs only for the first message in the thread
    // (Xano/OpenAI will have context from history for follow-ups)
    const isFirstMessage = conversationHistory.length === 0;
    const resumeFile  = attachedFiles.find((f) => f.name.toLowerCase().includes("resume")) || attachedFiles[0];
    const coverFile   = attachedFiles.find((f) =>
      f.name.toLowerCase().includes("cover") || (resumeFile && f.name !== resumeFile.name)
    );

    const payload = {
      token,
      question,
      history: conversationHistory,
    };

    if (stored.lastLogId) payload.log_id = stored.lastLogId;

    if (isFirstMessage || attachedFiles.length > 0) {
      if (resumeFile)  payload.resume_base64        = resumeFile.base64;
      if (coverFile)   payload.cover_letter_base64  = coverFile.base64;
    }

    // Update history with plain text version before sending
    conversationHistory.push({ role: "user", content: question });

    try {
      const response = await fetch(`${XANO_RESUME_URL}/resume/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      hideTyping();

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errMsg = err?.message || err?.error || `Request failed (${response.status})`;
        addMessage("system", `❌ ${errMsg}`);
        conversationHistory.pop(); // revert
        return;
      }

      const data = await response.json();
      const reply = data?.answer || "(No response)";

      addMessage("assistant", reply);
      conversationHistory.push({ role: "assistant", content: reply });
    } catch (err) {
      hideTyping();
      addMessage("system", `❌ Network error: ${err.message}`);
      conversationHistory.pop(); // revert
    } finally {
      updateSendBtn();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KEYBOARD: close on Escape
  // ─────────────────────────────────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closePopup();
  });
})();
