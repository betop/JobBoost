import { getSettings } from "./src/storage.js";

const $ = (id) => document.getElementById(id);

const authStatus = $("authStatus");
const authError = $("authError");
const btnAuth = $("btnAuth");

const btnCheck = $("btnCheck");
const fromDate = $("fromDate");
const toDate = $("toDate");
const runStatus = $("runStatus");
const summaryEl = $("summary");
const openOptions = $("openOptions");
let keepAlivePort = null;
let keepAliveTimer = null;

function startKeepAlive() {
  if (keepAlivePort) return;
  keepAlivePort = chrome.runtime.connect({ name: "triage-keepalive" });

  keepAlivePort.onDisconnect.addListener(() => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    keepAlivePort = null;
  });

  keepAliveTimer = setInterval(() => {
    try {
      keepAlivePort?.postMessage({ type: "ping", at: Date.now() });
    } catch {
      // Ignore; onDisconnect will cleanup.
    }
  }, 20000);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  if (keepAlivePort) {
    try {
      keepAlivePort.disconnect();
    } catch {
      // Ignore disconnect errors.
    }
    keepAlivePort = null;
  }
}

function renderSummary(s) {
  if (!s) {
    summaryEl.textContent = "";
    return;
  }

  if (s.mode === "stages") {
    summaryEl.textContent =
      `application: ${s.application || 0}  ` +
      `failed: ${s.failed || 0}  ` +
      `assessment: ${s.assessment || 0}  ` +
      `interview: ${s.interview || 0}  ` +
      `offer: ${s.offer || 0}`;
    return;
  }

  summaryEl.textContent = `Total: ${s.total || 0}  Errors: ${s.errors || 0}`;
}

async function sendMessage(msg) {
  return chrome.runtime.sendMessage(msg);
}

async function refreshAuthStatus() {
  authError.textContent = "";
  const res = await sendMessage({ type: "AUTH_CHECK" });
  if (res.ok) {
    authStatus.textContent = "Ready";
  } else {
    authStatus.textContent = "Not configured";
    authError.textContent = res.error || "Auth check failed";
  }
}

btnAuth.addEventListener("click", async () => {
  authError.textContent = "";
  try {
    btnAuth.disabled = true;
    const res = await sendMessage({ type: "AUTH_INTERACTIVE" });
    if (!res.ok) throw new Error(res.error);
    await refreshAuthStatus();
  } catch (e) {
    authError.textContent = e?.message || String(e);
  } finally {
    btnAuth.disabled = false;
  }
});

btnCheck.addEventListener("click", async () => {
  btnCheck.disabled = true;
  runStatus.textContent = "Checking…";
  renderSummary(null);

  const startDate = fromDate.value;
  const endDate = toDate.value;
  if (!startDate || !endDate) {
    runStatus.textContent = "Please select a From/To date.";
    btnCheck.disabled = false;
    return;
  }
  if (startDate > endDate) {
    runStatus.textContent = "From date must be before To date.";
    btnCheck.disabled = false;
    return;
  }

  await chrome.storage.local.set({ startDate, endDate });
  startKeepAlive();

  const res = await sendMessage({ type: "START_TRIAGE", startDate, endDate });
  if (!res.ok) {
    runStatus.textContent = res.error || "Failed to start";
    btnCheck.disabled = false;
    stopKeepAlive();
    return;
  }
});

openOptions.addEventListener("click", async (e) => {
  e.preventDefault();
  await chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "PROGRESS") return;
  const p = msg.payload;

  if (p.type === "status") {
    runStatus.textContent = p.message;
  }

  if (p.type === "summary") {
    renderSummary(p.summary);
  }

  if (p.type === "error") {
    runStatus.textContent = p.message || "Run error";
  }

  if (p.type === "done") {
    runStatus.textContent = "Done";
    renderSummary(p.summary);
    btnCheck.disabled = false;
    stopKeepAlive();
  }
});

window.addEventListener("beforeunload", () => {
  stopKeepAlive();
});

(async () => {
  await getSettings();
  await refreshAuthStatus();

  const today = new Date();
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const stored = await chrome.storage.local.get(["startDate", "endDate"]);
  fromDate.value = stored.startDate || fmt(sevenDaysAgo);
  toDate.value = stored.endDate || fmt(today);
})();
