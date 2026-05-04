function extractFirstJsonValue(text) {
  const trimmed = (text || "").trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const objStart = withoutFences.indexOf("{");
  const arrStart = withoutFences.indexOf("[");
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
  if (start === -1) return null;

  const openCh = withoutFences[start];
  const closeCh = openCh === "[" ? "]" : "}";

  let depth = 0;
  for (let i = start; i < withoutFences.length; i++) {
    const ch = withoutFences[i];
    if (ch === openCh) depth++;
    if (ch === closeCh) depth--;
    if (depth === 0) {
      const candidate = withoutFences.slice(start, i + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mapResultToStage(r) {
  // New prompt returns is_job + stage directly
  if (typeof r.is_job === "boolean" || r.is_job === "true" || r.is_job === "false") {
    const isJob = r.is_job === true || r.is_job === "true";
    const validStages = ["application","failed","assessment","interview","offer","followup","survey","other"];
    const stage = validStages.includes(r.stage) ? r.stage : "other";
    return { is_job: isJob, stage: isJob ? stage : "other" };
  }
  return { is_job: false, stage: "other" };
}

function parseAndNormalizeResults(text, list) {
  const parsed = extractFirstJsonValue(text) || tryParseJson(text);
  if (!parsed) throw new Error(`AI returned non-JSON: ${String(text).slice(0, 300)}`);

  const raw = Array.isArray(parsed?.results)
    ? parsed.results
    : Array.isArray(parsed)
    ? parsed
    : null;
  if (!raw) throw new Error(`AI returned invalid schema: ${String(text).slice(0, 300)}`);

  const seen = new Map();
  for (const r of raw) {
    const id = String(r?.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    const { is_job, stage } = mapResultToStage(r);
    seen.set(id, { id, is_job, stage });
  }

  // Fill any missing IDs with safe defaults.
  return list.map((id) => seen.get(id) || { id, is_job: false, stage: "other" });
}

function buildMailContents(emails) {
  const input = {
    emails: emails.map((e) => ({
      id: e.id,
      from: e.from,
      subject: e.subject,
      date: e.date,
      labels: (e.labelIds || []).filter((l) =>
        l.startsWith("CATEGORY_") || l === "INBOX" || l === "SPAM"
      ),
      body: e.body || ""
    }))
  };

  return JSON.stringify(input);
}

export async function classifyEmailsBatch({ backendApiUrl, backendApiKey, emails }) {
  const mailContents = buildMailContents(emails);
  const list = emails.map((e) => String(e.id));

  if (!backendApiUrl) {
    throw new Error("Missing backendApiUrl in config.json");
  }

  const version = chrome.runtime.getManifest().version;

  const res = await fetch(backendApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(backendApiKey ? { "x-gmail-analyze-key": backendApiKey } : {})
    },
    body: JSON.stringify({
      mail_contents: mailContents,
      version,
    })
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let message = raw || res.statusText;
    try {
      const json = JSON.parse(raw);
      if (json?.message) message = json.message;
      else if (json?.error) message = json.error;
    } catch { /* not JSON */ }
    const err = new Error(message);
    err.fatal = res.status === 400;
    throw err;
  }

  const data = await res.json();
  const text = data?.ai_response || "";
  return { results: parseAndNormalizeResults(text, list) };
}
