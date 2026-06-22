"use client";

import { useState } from "react";
import { Loader2, Tag } from "lucide-react";
import api from "@/services/api";

const STAGE_COLORS: Record<string, string> = {
  application: "bg-blue-100 text-blue-800 border-blue-300",
  failed:      "bg-red-100 text-red-800 border-red-300",
  assessment:  "bg-yellow-100 text-yellow-800 border-yellow-300",
  interview:   "bg-purple-100 text-purple-800 border-purple-300",
  offer:       "bg-green-100 text-green-800 border-green-300",
  other:       "bg-gray-100 text-gray-800 border-gray-300",
};

const STAGE_LABELS: Record<string, string> = {
  application: "📩 Application",
  failed:      "❌ Failed / Rejected",
  assessment:  "📝 Assessment",
  interview:   "🎙️ Interview",
  offer:       "🎉 Offer",
  other:       "📧 Other (not job-related)",
};

interface TriageResult {
  is_job: boolean;
  stage: string;
}

function buildSingleEmailPrompt(content: string) {
  const input = {
    emails: [
      {
        id: "test-1",
        from: "",
        subject: "",
        date: new Date().toISOString(),
        body: content,
      },
    ],
  };

  return {
    system_prompt:
      "You are a strict JSON generator. Output MUST be a single JSON value and nothing else (no markdown, no code fences, no commentary).",
    user_prompt:
      "You will be given a JSON object with an `emails` array. For each email, decide whether it is job-application related and assign a stage using `subject` + `body`.\n\n" +
      "Return ONLY this JSON object schema (no extra keys):\n" +
      "{\n" +
      '  "results": [\n' +
      '    {"id": string, "is_job": boolean, "stage": "application"|"failed"|"assessment"|"interview"|"offer"|"other"}\n' +
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
      "- failed: rejection / decline, 'we\\'ve decided to move forward with another candidate', 'not moving forward'\n" +
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
      JSON.stringify(input),
  };
}

function parseAiResponse(text: string): TriageResult | null {
  try {
    let parsed = JSON.parse(text);
    if (typeof parsed === "string") {
      parsed = JSON.parse(
        parsed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
      );
    }
    const results = parsed?.results;
    if (Array.isArray(results) && results.length > 0) {
      const r = results[0];
      return {
        is_job: r.is_job === true || r.is_job === "true",
        stage: String(r.stage || "other").toLowerCase().trim(),
      };
    }
  } catch {
    try {
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const start = cleaned.indexOf("{");
      if (start !== -1) {
        let depth = 0;
        for (let i = start; i < cleaned.length; i++) {
          if (cleaned[i] === "{") depth++;
          if (cleaned[i] === "}") depth--;
          if (depth === 0) {
            const parsed = JSON.parse(cleaned.slice(start, i + 1));
            const results = parsed?.results;
            if (Array.isArray(results) && results.length > 0) {
              return {
                is_job: results[0].is_job === true,
                stage: String(results[0].stage || "other").toLowerCase().trim(),
              };
            }
            break;
          }
        }
      }
    } catch { /* ignore */ }
  }
  return null;
}

export default function TestTab() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setRawResponse(null);
    try {
      const prompt = buildSingleEmailPrompt(content.trim());
      const res = await api.post("/public/gmail-analyze", prompt);
      const aiText = res.data?.ai_response || "";
      setRawResponse(aiText);
      const parsed = parseAiResponse(aiText);
      if (!parsed) { setError("Could not parse AI response."); return; }
      setResult(parsed);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const stageKey = result?.stage || "other";
  const colorClass = STAGE_COLORS[stageKey] || STAGE_COLORS.other;
  const label = STAGE_LABELS[stageKey] || stageKey;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label htmlFor="mail-content" className="block text-sm font-medium text-gray-700 mb-2">
          Paste email content below
        </label>
        <textarea
          id="mail-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste the full email body here..."
          rows={12}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
        />
        <button
          onClick={handleCheck}
          disabled={loading || !content.trim()}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
          ) : (
            <><Tag className="w-4 h-4" />Check Category</>
          )}
        </button>
      </div>

      {result && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Result</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Job-related:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${result.is_job ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
              {result.is_job ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${colorClass}`}>
              {label}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
          {rawResponse && (
            <pre className="mt-2 text-xs text-red-500 whitespace-pre-wrap break-words">{rawResponse}</pre>
          )}
        </div>
      )}
    </div>
  );
}
