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
    const rawIsJob = r?.is_job;
    const isJob =
      rawIsJob === true ||
      rawIsJob === "true" ||
      rawIsJob === 1 ||
      rawIsJob === "1" ||
      String(rawIsJob || "").toLowerCase() === "true";
    const stage = String(r?.stage || "other").toLowerCase().trim();
    seen.set(id, { id, is_job: isJob, stage });
  }

  // Fill any missing IDs with safe defaults.
  return list.map((id) => seen.get(id) || { id, is_job: false, stage: "other" });
}

function buildBatchTriagePrompt(emails) {
  const input = {
    emails: emails.map((e) => ({
      id: e.id,
      from: e.from,
      subject: e.subject,
      date: e.date,
      body: e.body || ""
    }))
  };

  return {
    system:
      "You are a strict JSON generator. Output MUST be a single JSON value and nothing else (no markdown, no code fences, no commentary).",
    user:
      "You will be given a JSON object with an `emails` array. For each email, decide whether it is job-application related and assign a stage using `subject` + `body`.\n\n" +
      "Return ONLY this JSON object schema (no extra keys):\n" +
      "{\n" +
      "  \"results\": [\n" +
      "    {\"id\": string, \"is_job\": boolean, \"stage\": \"application\"|\"failed\"|\"assessment\"|\"interview\"|\"offer\"|\"other\"}\n" +
      "  ]\n" +
      "}\n\n" +
      "Hard requirements:\n" +
      "- `results` length MUST equal `emails` length\n" +
      "- Every `id` in input MUST appear exactly once in `results`\n" +
      "- Preserve `id` exactly as provided\n" +
      "- If `is_job` is false, `stage` MUST be \"other\"\n\n" +
      "NOT a job email (is_job MUST be false):\n" +
      "- Security/verification codes, OTP, 2FA, 'enter this code', 'your code is', 'security code'\n" +
      "- Password reset or account activation emails\n" +
      "- Generic marketing, newsletters, promotions unrelated to a specific job\n" +
      "- Receipts, invoices, shipping notifications\n" +
      "- Any email whose primary purpose is account/identity verification, even if it mentions the word 'application'\n\n" +
      "Rules for stage (only when is_job=true):\n" +
      "- application: ONLY a true submission confirmation/receipt from an employer or ATS (e.g., 'we received your application', 'your application has been submitted', 'your application is under review', includes application/req ID or portal confirmation).\n" +
      "  - IMPORTANT: 'thank you for applying' alone is NOT enough. Verification/code emails are NEVER application.\n" +
      "- failed: rejection / decline, 'we've decided to move forward with another candidate', 'not moving forward'\n" +
      "- assessment: coding test, online assessment, take-home assignment, technical screen task\n" +
      "- interview: interview scheduling, phone screen, onsite, recruiter call\n" +
      "- offer: offer letter, compensation details, you received an offer\n" +
      "- other: job-related but not the above\n\n" +
      "Precedence rule:\n" +
      "- If the email contains rejection language (not moving forward / another candidate / other candidates / unfortunately / regret / position filled), stage MUST be \"failed\" even if it also says 'thank you for applying'.\n\n" +
      "Examples:\n" +
      "- 'Your security code is P7WYfA3i. Enter it to resubmit your application.' => is_job=false, stage=other\n" +
      "- 'Copy and paste this code into the security code field on your application' => is_job=false, stage=other\n" +
      "- 'Thank you for applying... we have decided to move forward with other candidates' => failed\n" +
      "- 'Thank you for your application... we are not moving forward at this time' => failed\n" +
      "- 'We received your application for X. We will review and get back to you' => application\n\n" +
      "If you are unsure, set `is_job=false` and `stage=\"other\"`.\n\n" +
      "Input JSON:\n" +
      JSON.stringify(input)
  };
}

export async function classifyEmailsBatch({ backendApiUrl, backendApiKey, emails }) {
  const prompt = buildBatchTriagePrompt(emails);
  const list = emails.map((e) => String(e.id));

  if (!backendApiUrl) {
    throw new Error("Missing backendApiUrl in config.json");
  }

  const res = await fetch(backendApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(backendApiKey ? { "x-gmail-analyze-key": backendApiKey } : {})
    },
    body: JSON.stringify({
      system_prompt: prompt.system,
      user_prompt: prompt.user
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Analyze API error ${res.status}: ${text || res.statusText}`);
  }

  const data = await res.json();
  const text = data?.ai_response || "";
  return { results: parseAndNormalizeResults(text, list) };
}
