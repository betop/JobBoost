"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { toZonedTime, format } from "date-fns-tz";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logsService, LogsFilters, GenerationLog } from "@/services/logsService";
import * as logCache from "@/services/logCache";
import { toStartOfDayEST, toEndOfDayEST } from "@/services/logsService";
import { downloadResumePDF } from "@/utils/pdfDownload";
import { userService } from "@/services/userService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/authStore";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Activity,
  ExternalLink,
  Filter,
  RotateCcw,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  FileText,
  RefreshCw,
  Download,
  Building2,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  Ban,
  Eye,
  Copy,
  XCircle,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";

type SortField = "created_at" | "user_name" | "profile_name" | "position_title" | "company_name";
type SortDir = "asc" | "desc";
type LogsPeriod = "today" | "week" | "month" | "all" | "custom";

// ── Reusable checkbox-dropdown component ──
interface CheckboxOption { value: string; label: string; }
function CheckboxDropdown({
  label,
  options,
  selected,
  onChange,
  disabled,
}: {
  label: string;
  options: CheckboxOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.length;
  const summary = count === 0 ? `All ${label}s` : count === 1
    ? (options.find((o) => o.value === selected[0])?.label ?? "1 selected")
    : `${count} selected`;

  return (
    <div className="relative">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm min-w-[160px] bg-white hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${count > 0 ? "border-blue-400" : "border-gray-300"}`}
      >
        <span className={count > 0 ? "text-blue-600 font-medium" : "text-gray-400"}>{summary}</span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] max-h-64 overflow-y-auto py-1">
            {count > 0 && (
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-gray-100"
              >
                <X className="w-3 h-3" />
                Reset {label}
              </button>
            )}
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={(e) => {
                    const next = selected.filter((v) => v !== opt.value);
                    if (e.target.checked) next.push(opt.value);
                    onChange(next);
                  }}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-700 whitespace-nowrap">{opt.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Pricing per 1M tokens (USD)
const PRICING = {
  claude: { input: 1.0, output: 5.0 },
  openai: { input: 0.15, output: 0.6 },
};

function RefreshDropdown({
  disabled,
  isRefreshing,
  isLoading,
  onFastRefresh,
  onHardRefresh,
}: {
  disabled: boolean;
  isRefreshing: boolean;
  isLoading: boolean;
  onFastRefresh: () => void;
  onHardRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = isRefreshing ? "Refreshing..." : isLoading ? "Loading..." : "Refresh";

  return (
    <div className="relative flex">
      {/* Main label button — triggers fast refresh */}
      <button
        onClick={() => { setOpen(false); onFastRefresh(); }}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-l-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        <RotateCcw className={`w-4 h-4 ${isRefreshing || isLoading ? "animate-spin" : ""}`} />
        {label}
      </button>
      {/* Chevron to open dropdown */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center px-2 py-2 text-sm text-gray-600 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        aria-label="Refresh options"
      >
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] py-1">
            <button
              onClick={() => { setOpen(false); onFastRefresh(); }}
              className="w-full flex flex-col items-start px-4 py-2 hover:bg-gray-50 text-left"
            >
              <span className="text-sm text-gray-700 font-medium">Fast Refresh</span>
              <span className="text-xs text-gray-400">Sync new changes only</span>
            </button>
            <button
              onClick={() => { setOpen(false); onHardRefresh(); }}
              className="w-full flex flex-col items-start px-4 py-2 hover:bg-gray-50 text-left"
            >
              <span className="text-sm text-gray-700 font-medium">Hard Refresh</span>
              <span className="text-xs text-gray-400">Clear cache &amp; reload all</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000000";

function calcCost(provider: string, inputTokens: number, outputTokens: number): number {
  // const rates = provider === "claude" ? PRICING.claude : PRICING.openai;
  const rates = PRICING.claude;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

const PERIOD_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "All time", value: "all" },
  { label: "Custom range", value: "custom" },
] as const satisfies ReadonlyArray<{ label: string; value: LogsPeriod }>;

// Job Details Modal
function JobDetailsModal({
  log,
  onClose,
}: {
  log: GenerationLog;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Job Description</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {log.position_title && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                  <Briefcase className="w-4 h-4" />
                  {log.position_title}
                </div>
              )}
              {log.company_name && (
                <div className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                  <Building2 className="w-4 h-4" />
                  {log.company_name}
                </div>
              )}
              {log.seniority && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                  {log.seniority}
                </div>
              )}
              {log.tech_scope && (
                <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                  {log.tech_scope}
                </div>
              )}
              {log.job_url && (
                <a href={log.job_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm underline">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View original posting
                </a>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {log.job_description || log.job_description_snippet || "No job description available."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Regenerate Confirm Modal
function RegenerateModal({
  log,
  resumeTemplate,
  onClose,
  onSuccess,
}: {
  log: GenerationLog;
  resumeTemplate: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    is_matched: number;
    match_reason: string;
    resume_text: string;
    resume_filename: string;
  } | null>(null);

  function getStatusMeta(isMatched: number) {
    switch (isMatched) {
      case 0:
        return {
          title: "Job may not match your profile",
          description: "This regeneration completed with a mismatch warning. As an admin, you can still continue.",
          tone: "amber" as const,
          allowGoAnyway: true,
          allowRetry: false,
        };
      case 2:
        return {
          title: "Job Not Qualified",
          description: "This job appears to be hybrid, onsite, or otherwise outside the remote rules.",
          tone: "amber" as const,
          allowGoAnyway: true,
          allowRetry: false,
        };
      case 3:
        return {
          title: "Not a Job Description",
          description: "The stored content looks like a non-job page. As an admin, you can still force regeneration.",
          tone: "amber" as const,
          allowGoAnyway: true,
          allowRetry: false,
        };
      case 4:
        return {
          title: "Duplicate URL",
          description: "This job URL has already been applied to. As an admin, you can still force regeneration.",
          tone: "red" as const,
          allowGoAnyway: true,
          allowRetry: false,
        };
      case 5:
        return {
          title: "Reposted Job",
          description: "This job appears to be a repost of a previous application. As an admin, you can still force regeneration.",
          tone: "amber" as const,
          allowGoAnyway: true,
          allowRetry: false,
        };
      case 6:
        return {
          title: "AI Processing Error",
          description: "The model response could not be processed. Please try again.",
          tone: "red" as const,
          allowGoAnyway: false,
          allowRetry: true,
        };
      default:
        return {
          title: "Status Review",
          description: "Review the result before continuing.",
          tone: "amber" as const,
          allowGoAnyway: false,
          allowRetry: false,
        };
    }
  }

  async function handleRegenerate(forceGenerate = false) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await logsService.regenerate(log.id, forceGenerate);
      if (result.match_status === 1) {
        const regenFilename = [log.profile_name, log.company_name, log.position_title].filter(Boolean).join(" - ") || result.resume_filename;
        await downloadResumePDF(result.resume_text, regenFilename, resumeTemplate);
        setDone(true);
        setStatusResult(null);
        onSuccess();
        return;
      }

      if (result.match_status === 0 || result.match_status === 2 || result.match_status === 3 || result.match_status === 4 || result.match_status === 5 || result.match_status === 6) {
        setStatusResult({
          is_matched: result.match_status,
          match_reason: result.error_msg || "No reason provided.",
          resume_text: result.resume_text,
          resume_filename: result.resume_filename,
        });
        return;
      }

      setError("Unexpected regeneration status returned.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Regeneration failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoAnyway() {
    if (!statusResult) return;

    if (statusResult.is_matched === 0 && statusResult.resume_text) {
      try {
        const goAnywayFilename = [log.profile_name, log.company_name, log.position_title].filter(Boolean).join(" - ") || statusResult.resume_filename;
        await downloadResumePDF(statusResult.resume_text, goAnywayFilename, resumeTemplate);
        setDone(true);
        setStatusResult(null);
        onSuccess();
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Download failed.";
        setError(msg);
      }
      return;
    }

    try {
      await handleRegenerate(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Forced regeneration failed.";
      setError(msg);
    }
  }

  async function handleTryAgain() {
    setStatusResult(null);
    await handleRegenerate(false);
  }

  const statusMeta = statusResult ? getStatusMeta(statusResult.is_matched) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Regenerate Resume</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          {done ? (
            <div className="text-center py-4">
              <>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RefreshCw className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="font-semibold text-gray-900">Resume regenerated &amp; downloaded!</p>
                <p className="text-sm text-gray-500 mt-1">The PDF has been saved to your downloads. A new log entry has been created and marked as regenerated.</p>
              </>
              <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700">
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-4">
                This will re-run resume generation using the original job description stored in the log.
                The new result will be saved as a separate log entry marked as{" "}
                <span className="font-medium text-emerald-700">Regenerated</span>, and the PDF will be downloaded automatically.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5 border border-gray-200">
                {log.position_title && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{log.position_title}</span>
                  </div>
                )}
                {log.company_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{log.company_name}</span>
                  </div>
                )}
                {(log.seniority || log.tech_scope) && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {log.seniority && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{log.seniority}</span>}
                    {log.tech_scope && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">{log.tech_scope}</span>}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Profile:</span>
                  <span>{log.profile_name || "—"}</span>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
                  {error}
                </div>
              )}
              {statusResult && statusMeta ? (
                <div className={`rounded-lg p-4 border ${statusMeta.tone === "red" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusMeta.tone === "red" ? "text-red-600" : "text-amber-600"}`} />
                    <div>
                      <p className={`font-semibold text-sm ${statusMeta.tone === "red" ? "text-red-900" : "text-amber-900"}`}>{statusMeta.title}</p>
                      <p className={`text-sm mt-1 ${statusMeta.tone === "red" ? "text-red-700" : "text-amber-700"}`}>{statusMeta.description}</p>
                      <p className={`text-sm mt-2 ${statusMeta.tone === "red" ? "text-red-700" : "text-amber-700"}`}>{statusResult.match_reason || "No reason provided."}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={onClose}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                      Close
                    </button>
                    {statusMeta.allowRetry && (
                      <button onClick={handleTryAgain} disabled={isLoading}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading ? <><LoadingSpinner size="sm" />Retrying…</> : <>Try Again</>}
                      </button>
                    )}
                    {statusMeta.allowGoAnyway && (
                      <button onClick={handleGoAnyway} disabled={isLoading}
                        className="flex-1 px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading ? <><LoadingSpinner size="sm" />Processing…</> : <>Go Anyway</>}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={onClose} disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={() => handleRegenerate()} disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <><LoadingSpinner size="sm" />Regenerating…</>
                    ) : (
                      <><RefreshCw className="w-4 h-4" />Regenerate</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Reason Modal (for skip/mismatch)
function ReasonModal({
  log,
  onClose,
}: {
  log: GenerationLog;
  onClose: () => void;
}) {
  const statusConfig: Record<number, { icon: React.ReactNode; title: string; bgClass: string; textClass: string; btnClass: string }> = {
    0: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      title: "Job Mismatched",
      bgClass: "bg-amber-50 border border-amber-200",
      textClass: "text-amber-800",
      btnClass: "bg-amber-600 hover:bg-amber-700",
    },
    2: {
      icon: <Ban className="w-5 h-5 text-gray-500" />,
      title: "Job Unfit",
      bgClass: "bg-gray-50 border border-gray-200",
      textClass: "text-gray-700",
      btnClass: "bg-gray-600 hover:bg-gray-700",
    },
    3: {
      icon: <Ban className="w-5 h-5 text-slate-500" />,
      title: "Not a Job Description",
      bgClass: "bg-slate-50 border border-slate-200",
      textClass: "text-slate-700",
      btnClass: "bg-slate-600 hover:bg-slate-700",
    },
    4: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      title: "Duplicate URL",
      bgClass: "bg-red-50 border border-red-200",
      textClass: "text-red-700",
      btnClass: "bg-red-600 hover:bg-red-700",
    },
    5: {
      icon: <AlertTriangle className="w-5 h-5 text-indigo-500" />,
      title: "Reposted Job",
      bgClass: "bg-indigo-50 border border-indigo-200",
      textClass: "text-indigo-700",
      btnClass: "bg-indigo-600 hover:bg-indigo-700",
    },
    6: {
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      title: "AI Error",
      bgClass: "bg-red-50 border border-red-200",
      textClass: "text-red-700",
      btnClass: "bg-red-600 hover:bg-red-700",
    },
  };

  const config = statusConfig[log.is_matched as number] ?? {
    icon: <AlertTriangle className="w-5 h-5 text-gray-500" />,
    title: "Status Details",
    bgClass: "bg-gray-50 border border-gray-200",
    textClass: "text-gray-700",
    btnClass: "bg-gray-600 hover:bg-gray-700",
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          <div className={`rounded-lg p-4 mb-4 ${config.bgClass}`}>
            <p className={`text-sm leading-relaxed ${config.textClass}`}>
              {log.match_reason || "No reason provided."}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors ${config.btnClass}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex items-start gap-4">
      <div className={`${color} w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// Helper: get last week's Sunday–Saturday in YYYY-MM-DD
function getLastWeekRange(): { from: string; to: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  // This week's Sunday = today - dayOfWeek days
  const thisWeekSun = new Date(now);
  thisWeekSun.setDate(now.getDate() - dayOfWeek);
  // Last week's Sunday = thisWeekSun - 7
  const lastWeekSun = new Date(thisWeekSun);
  lastWeekSun.setDate(thisWeekSun.getDate() - 7);
  // Last week's Saturday = lastWeekSun + 6
  const lastWeekSat = new Date(lastWeekSun);
  lastWeekSat.setDate(lastWeekSun.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(lastWeekSun), to: fmt(lastWeekSat) };
}

// ── EST date helpers (used throughout LogsPage) ──
const EST_TZ = "America/New_York";

function todayInEST(): string {
  const est = toZonedTime(new Date(), EST_TZ);
  return `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}-${String(est.getDate()).padStart(2, "0")}`;
}

function formatESTLocalDate(date: Date): string {
  const est = toZonedTime(date, EST_TZ);
  return `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}-${String(est.getDate()).padStart(2, "0")}`;
}

/** Returns the YYYY-MM-DD range for each period, all in EST. */
function getESTDateRange(period: LogsPeriod, customFrom?: string, customTo?: string): { from: string; to: string } | null {
  const today = todayInEST();
  const nowEST = toZonedTime(new Date(), EST_TZ);

  if (period === "today") {
    return { from: today, to: today };
  }
  if (period === "week") {
    // Sun 00:00 – Sat 23:59 EST (current week)
    const dayOfWeek = nowEST.getDay(); // 0=Sun
    const sun = new Date(nowEST);
    sun.setDate(nowEST.getDate() - dayOfWeek);
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    return { from: formatESTLocalDate(sun), to: formatESTLocalDate(sat) };
  }
  if (period === "month") {
    // 1st of current month – last day of current month
    const first = new Date(nowEST.getFullYear(), nowEST.getMonth(), 1);
    const last  = new Date(nowEST.getFullYear(), nowEST.getMonth() + 1, 0);
    return { from: formatESTLocalDate(first), to: formatESTLocalDate(last) };
  }
  if (period === "all") {
    return null; // caller will send no date_from / date_to
  }
  if (period === "custom") {
    const lastWeek = getLastWeekRange();
    return { from: customFrom ?? lastWeek.from, to: customTo ?? lastWeek.to };
  }
  return { from: today, to: today };
}

export default function LogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const admin = useAuthStore((state) => state.admin);
  
  // Get today's date as YYYY-MM-DD in EST
  const today = todayInEST();
  
  // Date range state — only these trigger API calls
  const [statsPeriod, setStatsPeriod] = useState<LogsPeriod>("today");
  const [dateFrom, setDateFrom] = useState<number | undefined>(() => new Date(toStartOfDayEST(today)).getTime());
  const [dateTo, setDateTo] = useState<number | undefined>(() => new Date(toEndOfDayEST(today)).getTime());
  // Pending dates: updated as user types, applied only on Check button click
  const [pendingFrom, setPendingFrom] = useState(today);
  const [pendingTo, setPendingTo] = useState(today);

  // Client-side filters — these do NOT trigger API calls
  const [filters, setFilters] = useState<LogsFilters>({});

  // Table state
  const [search, setSearch]         = useState("");
  const [sortField, setSortField]   = useState<SortField>("created_at");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(25);

  // Modal state
  const [jobDetailsLog, setJobDetailsLog]     = useState<GenerationLog | null>(null);
  const [regenerateLog, setRegenerateLog]     = useState<GenerationLog | null>(null);
  const [downloadingLogId, setDownloadingLogId] = useState<string | null>(null);
  const [reasonLog, setReasonLog]             = useState<GenerationLog | null>(null);
  const [isRefreshing, setIsRefreshing]       = useState(false);
  // const [isRecovering, setIsRecovering]       = useState(false);

  const isSuperAdmin = admin?.type === "super_admin";

  // Load state from URL on mount, falling back to IndexedDB-persisted filter
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (params.get("search")) setSearch(params.get("search") || "");
    if (params.get("sortField")) setSortField((params.get("sortField") as SortField) || "created_at");
    if (params.get("sortDir")) setSortDir((params.get("sortDir") as SortDir) || "desc");
    if (params.get("page")) setPage(Number(params.get("page")) || 1);
    if (params.get("pageSize")) setPageSize(Number(params.get("pageSize")) || 25);
    
    const urlPeriod = params.get("statsPeriod") as LogsPeriod | null;

    // Load client-side filters
    const filterObj: LogsFilters = {};
    const userParam = params.get("user_id");
    if (userParam) filterObj.user_id = userParam.split(",");
    const profileParam = params.get("profile_id");
    if (profileParam) filterObj.profile_id = profileParam.split(",");
    const matchedParam = params.get("is_matched");
    if (matchedParam) {
      filterObj.is_matched = (matchedParam.split(",") as any) as ("1"|"0"|"2"|"3"|"4"|"5"|"6")[];
    }
    const regeneratedParam = params.get("is_regenerated");
    if (regeneratedParam) {
      filterObj.is_regenerated = (regeneratedParam.split(",") as any) as ("0"|"1")[];
    }
    setFilters(filterObj);

    if (urlPeriod) {
      // URL has an explicit period — use it
      setStatsPeriod(urlPeriod);
      const customFrom = params.get("date_from") ?? undefined;
      const customTo   = params.get("date_to")   ?? undefined;
      const range = getESTDateRange(urlPeriod, customFrom, customTo);
      if (range) {
        setDateFrom(new Date(toStartOfDayEST(range.from)).getTime());
        setDateTo(new Date(toEndOfDayEST(range.to)).getTime());
      } else {
        setDateFrom(undefined);
        setDateTo(undefined);
      }
      setDatesReady(true);
    } else {
      // No URL period — restore from IndexedDB
      logCache.getDateFilter().then((saved) => {
        const period = (saved?.period as LogsPeriod) ?? "today";
        setStatsPeriod(period);
        if (saved?.dateFrom !== undefined) {
          setDateFrom(saved.dateFrom ? new Date(toStartOfDayEST(saved.dateFrom)).getTime() : undefined);
          setDateTo(saved.dateTo ? new Date(toEndOfDayEST(saved.dateTo)).getTime() : undefined);
          setPendingFrom(saved.dateFrom);
          setPendingTo(saved.dateTo);
        } else {
          const range = getESTDateRange(period);
          if (range) { setDateFrom(new Date(toStartOfDayEST(range.from)).getTime()); setDateTo(new Date(toEndOfDayEST(range.to)).getTime()); setPendingFrom(range.from); setPendingTo(range.to); }
          else { setDateFrom(undefined); setDateTo(undefined); }
        }
        setDatesReady(true);
      });
    }
  }, []);

  // Update URL when state changes
  const updateQueryParams = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    router.push(`?${params.toString()}`, { scroll: false } as any);
  };

  // ── Cache-driven log state ──
  // `cachedRows` is the slice of the global cache visible for the current date range.
  // It updates whenever the cache is refreshed by the fetch effect below.
  const [cachedRows, setCachedRows]     = useState<GenerationLog[]>([]);
  const [logsLoading, setLogsLoading]   = useState(false);
  const [datesReady, setDatesReady]     = useState(false);
  const hasFetchedRef                   = useRef(false);

  /**
   * Reads the current cache slice for the active date window into state.
   * Called after every successful fetch/merge.
   */
  const flushCacheToState = useCallback(async (from: number | undefined, to: number | undefined) => {
    const fromISO = from ? new Date(from).toISOString() : undefined;
    const toISO   = to   ? new Date(to).toISOString()   : undefined;
    const records = await logCache.getCachedRecords(fromISO, toISO);
    setCachedRows(records);
  }, []);

  async function doFetch(from?: number, to?: number) {
    const effectiveFrom = from !== undefined ? from : dateFrom;
    const effectiveTo   = to   !== undefined ? to   : dateTo;
    setLogsLoading(true);
    const lastSync = await logCache.getLastSyncAt();

    try {
      if (lastSync) {
        // Delta: listDelta handles mergeRecords + setLastSyncAt internally
        await logsService.listDelta(lastSync);
      } else {
        // Full load: listAllPages handles IndexedDB writes AND setLastSyncAt per batch;
        // After the first batch, drop the loading spinner so the UI becomes interactive
        await logsService.listAllPages();
      }

      await flushCacheToState(effectiveFrom, effectiveTo);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error("[LogsPage] fetch error", err);
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    if (!datesReady) return;
    if (!hasFetchedRef.current) {
      // First load — run once
      hasFetchedRef.current = true;
      doFetch(dateFrom, dateTo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datesReady]);


  // All active users — used for building the user_name lookup map AND filter dropdown
  const { data: allUsers } = useQuery({
    queryKey: ["users", "bidder"],
    queryFn: () => userService.getAll("bidder"),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  console.log(allUsers)
  // Extra name map for user IDs that appear in logs but are missing from allUsers
  // (i.e. deleted users). Populated lazily once cachedRows + allUsers are both ready.
  const [extraUserNames, setExtraUserNames] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (!cachedRows.length || !allUsers) return;

    // Build set of known IDs
    const knownIds = new Set(allUsers.map((u) => u.id));
    knownIds.add(ADMIN_USER_ID);

    // Collect IDs present in logs but not in allUsers (and not already fetched)
    const missing = new Set<string>();
    for (const log of cachedRows) {
      const uid = (log.user_id ?? (log as any).bidder_id ?? "").trim();
      if (uid && !knownIds.has(uid) && !extraUserNames.has(uid)) {
        missing.add(uid);
      }
    }
    if (missing.size === 0) return;

    // Fetch each missing user individually; mark null on 404 (deleted)
    Promise.all(
      Array.from(missing).map((uid) =>
        userService.getById(uid)
          .then((u): [string, string | null] => [uid, u.full_name])
          .catch((): [string, string | null] => [uid, null]),
      ),
    ).then((results) => {
      setExtraUserNames((prev) => {
        const next = new Map(prev);
        for (const [uid, name] of results) next.set(uid, name);
        return next;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedRows, allUsers]);

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: profileService.getAll,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  async function hardRefresh() {
    setIsRefreshing(true);
    try {
      await logCache.clearCache();
      await logsService.listAllPages();
      await flushCacheToState(dateFrom, dateTo);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function fastRefresh() {
    setIsRefreshing(true);
    try {
      await doFetch(dateFrom, dateTo);
    } finally {
      setIsRefreshing(false);
    }
  }

  // async function recoverUserIds() {
  //   if (!confirm("This will update user_id on ALL generation logs by matching profile_id to user assignments. Continue?")) return;
  //   setIsRecovering(true);
  //   try {
  //     const result = await logsService.recoverUserIds();
  //     alert(`Recovery complete:\n• Total logs: ${result.total_logs}\n• Updated: ${result.updated_count}\n• Skipped: ${result.skipped_count} (no matching user for profile)`);
  //     // Refresh data to pull updated records
  //     await hardRefresh();
  //   } catch (err: any) {
  //     alert(`Recovery failed: ${err?.response?.data?.message || err.message}`);
  //   } finally {
  //     setIsRecovering(false);
  //   }
  // }

  function applyPeriod(period: LogsPeriod) {
    setStatsPeriod(period);
    setPage(1);
    
    const range = getESTDateRange(period);
    if (period === "custom") {
      const lastWeek = getLastWeekRange();
      setDateFrom(new Date(toStartOfDayEST(lastWeek.from)).getTime());
      setDateTo(new Date(toEndOfDayEST(lastWeek.to)).getTime());
      setPendingFrom(lastWeek.from);
      setPendingTo(lastWeek.to);
      updateQueryParams({ statsPeriod: period, date_from: lastWeek.from, date_to: lastWeek.to, page: 1 });
      logCache.setDateFilter({ period, dateFrom: lastWeek.from, dateTo: lastWeek.to });
      // Don't auto-fetch for custom — user must click Check
    } else if (period === "all") {
      setDateFrom(undefined);
      setDateTo(undefined);
      updateQueryParams({ statsPeriod: period, date_from: undefined, date_to: undefined, page: 1 });
      logCache.setDateFilter({ period, dateFrom: "", dateTo: "" });
      doFetch(undefined, undefined);
    } else if (range) {
      const fromMs = new Date(toStartOfDayEST(range.from)).getTime();
      const toMs = new Date(toEndOfDayEST(range.to)).getTime();
      setDateFrom(fromMs);
      setDateTo(toMs);
      updateQueryParams({ statsPeriod: period, date_from: undefined, date_to: undefined, page: 1 });
      logCache.setDateFilter({ period, dateFrom: range.from, dateTo: range.to });
      doFetch(fromMs, toMs);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      updateQueryParams({ sortDir: sortField === field && sortDir === "asc" ? "desc" : "asc", page: 1 });
    } else {
      setSortField(field);
      setSortDir(field === "created_at" ? "desc" : "asc");
      updateQueryParams({ sortField: field, sortDir: field === "created_at" ? "desc" : "asc", page: 1 });
    }
    setPage(1);
  }

  // ── All rows from cache, enriched with names ──
  const allRows: GenerationLog[] = useMemo(() => {
    const items = cachedRows;

    // Build name lookup maps
    const profileMap = new Map<string, string>();
    const userMap = new Map<string, string>();
    if (profiles) for (const p of profiles) profileMap.set(p.id, p.full_name);
    // allUsers covers all active users (bidders + admins)
    if (allUsers) for (const u of allUsers) userMap.set(u.id, u.full_name);

    const result: GenerationLog[] = [];
    for (const log of items) {
      // Fall back to bidder_id for any stale cached records from before the rename
      const userId = (log.user_id ?? (log as any).bidder_id ?? "").trim();
      const isAdminUser = userId === "" || userId === ADMIN_USER_ID;

      let resolvedName = log.user_name || "";
      if (!resolvedName) {
        if (isAdminUser) {
          resolvedName = "Admin";
        } else if (userMap.has(userId)) {
          resolvedName = userMap.get(userId) || "";
        } else if (extraUserNames.has(userId)) {
          // null means the fetch returned 404 → user was deleted
          resolvedName = extraUserNames.get(userId) ?? "";
        }
        // else: still loading the extra fetch — leave empty for now
      }

      result.push({
        ...log,
        user_id: userId || "",
        profile_name: log.profile_name || profileMap.get(log.profile_id) || "",
        user_name: resolvedName,
      });
    }

    // Access control: admins see only logs for their assigned/created profiles
    if (admin?.type !== "super_admin" && profiles && profiles.length > 0) {
      const allowedProfileIds = new Set(profiles.map((p) => p.id));
      return result.filter((log) => allowedProfileIds.has(log.profile_id));
    }
    // If admin is not super_admin and no profiles loaded yet, show nothing
    if (admin?.type !== "super_admin" && (!profiles || profiles.length === 0)) {
      return [];
    }

    return result;
  }, [cachedRows, profiles, allUsers, extraUserNames, admin]);

  const userOptions = useMemo(() => {
    const options = (allUsers ?? []).map((u) => ({ value: u.id, label: u.full_name }));
    const hasAdminRows = allRows.some((log) => {
      const userId = (log.user_id ?? "").trim();
      return userId === "" || userId === ADMIN_USER_ID;
    });
    if (!hasAdminRows) return options;
    return [{ value: ADMIN_USER_ID, label: "Admin" }, ...options];
  }, [allUsers, allRows]);

  // ── Client-side filtering: user, profile, match status, type, search ──
  const filtered = useMemo(() => {
    return allRows.filter((log) => {
      if (filters.user_id && filters.user_id.length > 0) {
        const userId = (log.user_id ?? "").trim();
        const normalizedUserId = userId === "" ? ADMIN_USER_ID : userId;
        if (!filters.user_id.includes(normalizedUserId)) return false;
      }
      if (filters.profile_id && filters.profile_id.length > 0 && !filters.profile_id.includes(log.profile_id)) return false;
      if (filters.is_matched && filters.is_matched.length > 0 && !filters.is_matched.includes(String(log.is_matched) as any)) return false;
      if (filters.is_regenerated && filters.is_regenerated.length > 0 && !filters.is_regenerated.includes(String(log.is_regenerated) as any)) return false;
      return true;
    });
  }, [allRows, filters.user_id, filters.profile_id, filters.is_matched, filters.is_regenerated]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((log) =>
      [log.user_name, log.profile_name, log.position_title, log.company_name, log.job_url]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [filtered, search]);

  const sorted = useMemo(() => {
    return [...searched].sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortField) {
        case "created_at":    av = a.created_at;          bv = b.created_at;          break;
        case "user_name":     av = a.user_name ?? "";     bv = b.user_name ?? "";     break;
        case "profile_name":  av = a.profile_name ?? "";  bv = b.profile_name ?? "";  break;
        case "position_title":av = a.position_title ?? ""; bv = b.position_title ?? ""; break;
        case "company_name":  av = a.company_name ?? "";  bv = b.company_name ?? "";  break;
        default: av = ""; bv = "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [searched, sortField, sortDir]);

  const totalPages    = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage      = Math.min(page, totalPages);
  const pageRows      = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ── Client-side stats computed from filtered rows (reflects active filters) ──
  const stats = useMemo(() => {
    const rows = filtered;
    let total_input_tokens = 0, total_output_tokens = 0;
    let claude_count = 0, openai_count = 0;
    let matched_count = 0, mismatched_count = 0, skipped_count = 0;
    let duplicated_count = 0, not_jd_count = 0, reposted_count = 0;
    let error_count = 0, applied_count = 0;

    for (const log of rows) {
      total_input_tokens += log.input_tokens ?? 0;
      total_output_tokens += log.output_tokens ?? 0;
      if (log.ai_provider === "claude") claude_count++;
      else openai_count++;
      if (log.is_matched === 1) matched_count++;
      else if (log.is_matched === 0) mismatched_count++;
      else if (log.is_matched === 2) skipped_count++;
      else if (log.is_matched === 3) not_jd_count++;
      else if (log.is_matched === 4) duplicated_count++;
      else if (log.is_matched === 5) reposted_count++;
      else if (log.is_matched === 6) error_count++;
      if (log.is_applied || log.is_matched === 1) applied_count++;
    }

    return {
      total_generations: rows.length,
      total_input_tokens,
      total_output_tokens,
      claude_count,
      openai_count,
      matched_count,
      mismatched_count,
      skipped_count,
      duplicated_count,
      not_jd_count,
      reposted_count,
      error_count,
      applied_count,
    };
  }, [filtered]);

  // ── Cost estimation from client-side stats ──
  const totalProviders = stats.claude_count + stats.openai_count;
  const claudeInputEst = totalProviders > 0
    ? Math.round(stats.total_input_tokens * stats.claude_count / totalProviders)
    : stats.total_input_tokens;
  const claudeOutputEst = totalProviders > 0
    ? Math.round(stats.total_output_tokens * stats.claude_count / totalProviders)
    : stats.total_output_tokens;
  const openaiInputEst = stats.total_input_tokens - claudeInputEst;
  const openaiOutputEst = stats.total_output_tokens - claudeOutputEst;
  const periodCost = calcCost("claude", claudeInputEst, claudeOutputEst) + calcCost("openai", openaiInputEst, openaiOutputEst);

  const totalTokens = stats.total_input_tokens + stats.total_output_tokens;

  return (
    <div>
      {/* Modals */}
      {jobDetailsLog && (
        <JobDetailsModal
          log={jobDetailsLog}
          onClose={() => setJobDetailsLog(null)}
        />
      )}
      {regenerateLog && (
        <RegenerateModal
          log={regenerateLog}
          resumeTemplate={profiles?.find((p) => p.id === regenerateLog.profile_id)?.resume_template ?? 1}
          onClose={() => setRegenerateLog(null)}
          onSuccess={async () => {
            // Delta-sync so the new regenerated log appears immediately
            // listDelta handles mergeRecords + setLastSyncAt internally
            const lastSync = await logCache.getLastSyncAt();
            await logsService.listDelta(lastSync ?? new Date(0).toISOString());
            await flushCacheToState(dateFrom, dateTo);
            queryClient.invalidateQueries({ queryKey: ["logs-stats"] });
          }}
        />
      )}
      {reasonLog && (
        <ReasonModal
          log={reasonLog}
          onClose={() => setReasonLog(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Generation Logs</h1>
          <p className="text-gray-500 mt-1">
            Track resume generations and job applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Recovery button — uncomment if needed again
          {isSuperAdmin && (
            <button
              onClick={recoverUserIds}
              disabled={isRecovering || isRefreshing || logsLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isRecovering ? "Recovering..." : "Recover User IDs"}
            </button>
          )}
          */}
          <RefreshDropdown
            disabled={isRefreshing || logsLoading}
            isRefreshing={isRefreshing}
            isLoading={logsLoading}
            onFastRefresh={fastRefresh}
            onHardRefresh={hardRefresh}
          />
        </div>
      </div>

      {/* Period tabs */}
      <div className={`flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit ${logsLoading ? "opacity-50 pointer-events-none" : ""}`}>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => applyPeriod(opt.value)}
            disabled={logsLoading}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              statsPeriod === opt.value
                ? "bg-white text-gray-900 font-medium shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            } disabled:cursor-not-allowed`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {statsPeriod === "custom" && (
        <div className="flex gap-3 mb-6 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              value={pendingFrom}
              disabled={logsLoading}
              onChange={(e) => setPendingFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              value={pendingTo}
              disabled={logsLoading}
              onChange={(e) => setPendingTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={logsLoading}
            onClick={() => {
              const fromMs = new Date(toStartOfDayEST(pendingFrom)).getTime();
              const toMs = new Date(toEndOfDayEST(pendingTo)).getTime();
              setDateFrom(fromMs);
              setDateTo(toMs);
              setPage(1);
              updateQueryParams({ date_from: pendingFrom, date_to: pendingTo, page: 1 });
              console.log(fromMs, toMs);
              logCache.setDateFilter({ period: "custom", dateFrom: pendingFrom, dateTo: pendingTo });
              doFetch(fromMs, toMs);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-4 h-4" />
            Check
          </button>
        </div>
      )}

      {/* Stats cards */}
      {logsLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className={`space-y-3 mb-8 transition-opacity duration-200 ${logsLoading ? "opacity-50" : "opacity-100"}`}>
          {/* Row 1: Total, Applied, Est. Cost */}
          <div className={`grid gap-3 ${isSuperAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="bg-blue-500 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total_generations.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="bg-green-500 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Applied</p>
                <p className="text-xl font-bold text-gray-900">{stats.applied_count.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">{stats.total_generations ? Math.round((stats.applied_count / stats.total_generations) * 100) : 0}% of total</p>
              </div>
            </div>
            {isSuperAdmin && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="bg-purple-600 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Est. Cost</p>
                <p className="text-xl font-bold text-gray-900">{formatCost(periodCost)}</p>
              </div>
            </div>
            )}
          </div>
          {/* Row 2: Matched, Mismatched, Duplicated, Reposted, Not a JD, Skipped, Error */}
          <div className="grid grid-cols-7 gap-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 flex items-center gap-2">
              <div className="bg-emerald-500 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Matched</p>
                <p className="text-lg font-bold text-gray-900">{stats.matched_count.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 flex items-center gap-2">
              <div className="bg-amber-500 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Mismatched</p>
                <p className="text-lg font-bold text-gray-900">{stats.mismatched_count.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 flex items-center gap-2">
              <div className="bg-red-500 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0">
                <Copy className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Duplicate Bid</p>
                <p className="text-lg font-bold text-gray-900">{stats.duplicated_count.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 flex items-center gap-2">
              <div className="bg-indigo-500 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Reposted</p>
                <p className="text-lg font-bold text-gray-900">{stats.reposted_count.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 flex items-center gap-2">
              <div className="bg-slate-500 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Not JD</p>
                <p className="text-lg font-bold text-gray-900">{stats.not_jd_count.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 flex items-center gap-2 group relative">
              <div className="bg-gray-500 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0">
                <Ban className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium cursor-help">Unfit</p>
                <p className="text-lg font-bold text-gray-900">{stats.skipped_count.toLocaleString()}</p>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Not Remote, Security Clearance
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2.5 py-2 flex items-center gap-2">
              <div className="bg-red-600 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0">
                <XCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Error</p>
                <p className="text-lg font-bold text-gray-900">{stats.error_count.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end ${logsLoading ? "opacity-50 pointer-events-none" : ""}`}>
        <Filter className="w-4 h-4 text-gray-400 self-center mb-1" />

        <CheckboxDropdown
          label="User"
          options={userOptions}
          selected={filters.user_id ?? []}
          disabled={logsLoading}
          onChange={(next) => {
            setFilters((f) => ({ ...f, user_id: next.length > 0 ? next : undefined } as LogsFilters));
            setPage(1);
            updateQueryParams({ user_id: next.length > 0 ? next.join(",") : undefined, page: 1 });
          }}
        />

        <CheckboxDropdown
          label="Profile"
          options={(profiles ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
          selected={filters.profile_id ?? []}
          disabled={logsLoading}
          onChange={(next) => {
            setFilters((f) => ({ ...f, profile_id: next.length > 0 ? next : undefined } as LogsFilters));
            setPage(1);
            updateQueryParams({ profile_id: next.length > 0 ? next.join(",") : undefined, page: 1 });
          }}
        />

        <CheckboxDropdown
          label="Status"
          options={[
            { value: "1", label: "✅ Matched" },
            { value: "0", label: "⚠️ Mismatched" },
            { value: "2", label: "🚫 Unfit" },
            { value: "3", label: "📄 Not JD" },
            { value: "4", label: "🔁 Duplicate URL" },
            { value: "5", label: "🔄 Reposted" },
            { value: "6", label: "❌ AI Error" },
          ]}
          selected={(filters.is_matched ?? []) as string[]}
          disabled={logsLoading}
          onChange={(next) => {
            setFilters((f) => ({ ...f, is_matched: next.length > 0 ? next : undefined } as LogsFilters));
            setPage(1);
            updateQueryParams({ is_matched: next.length > 0 ? next.join(",") : undefined, page: 1 });
          }}
        />

        <CheckboxDropdown
          label="Type"
          options={[
            { value: "0", label: "Original" },
            { value: "1", label: "🔄 Regenerated" },
          ]}
          selected={(filters.is_regenerated ?? []) as string[]}
          disabled={logsLoading}
          onChange={(next) => {
            setFilters((f) => ({ ...f, is_regenerated: next.length > 0 ? next : undefined } as LogsFilters));
            setPage(1);
            updateQueryParams({ is_regenerated: next.length > 0 ? next.join(",") : undefined, page: 1 });
          }}
        />

        {((filters.user_id?.length ?? 0) + (filters.profile_id?.length ?? 0) + (filters.is_matched?.length ?? 0) + (filters.is_regenerated?.length ?? 0) > 0) && (
          <button
            onClick={() => {
              setFilters({});
              updateQueryParams({ user_id: undefined, profile_id: undefined, is_matched: undefined, is_regenerated: undefined, page: 1 });
              setPage(1);
            }}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg px-2.5 py-2 self-end transition-colors"
          >
            <X className="w-3 h-3" />
            Reset filters
          </button>
        )}
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

        {/* Table toolbar: search + page-size */}
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap gap-3 items-center justify-between bg-white">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user, profile, position, company…"
              value={search}
              onChange={(e) => { 
                setSearch(e.target.value);
                setPage(1);
                updateQueryParams({ search: e.target.value || undefined, page: 1 });
              }}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => { 
                  setSearch("");
                  setPage(1);
                  updateQueryParams({ search: undefined, page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { 
                const newSize = Number(e.target.value);
                setPageSize(newSize);
                setPage(1);
                updateQueryParams({ pageSize: newSize, page: 1 });
              }}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {logsLoading && !cachedRows.length ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : !allRows.length ? (
          <div className="text-center py-16 text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No generations found</p>
            <p className="text-sm mt-1">Try adjusting your filters or date range</p>
          </div>
        ) : !sorted.length ? (
          <div className="text-center py-16 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No results for &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch("")} className="text-sm text-blue-600 mt-1 hover:underline">Clear search</button>
          </div>
        ) : (
          <>
            {/* Top pagination */}
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-end gap-1 text-sm bg-white">
              <span className="text-xs text-gray-500 mr-2">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => { setPage(1); updateQueryParams({ page: 1 }); }}
                disabled={safePage === 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="First page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { const newPage = Math.max(1, safePage - 1); setPage(newPage); updateQueryParams({ page: newPage }); }}
                disabled={safePage === 1}
                className="px-2.5 py-1.5 rounded text-xs hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, idx) =>
                  n === "…" ? (
                    <span key={`top-ellipsis-${idx}`} className="px-1 text-gray-400 text-xs">…</span>
                  ) : (
                    <button
                      key={`top-${n}`}
                      onClick={() => { setPage(n as number); updateQueryParams({ page: n as number }); }}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        safePage === n ? "bg-blue-600 text-white" : "hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
              <button
                onClick={() => { const newPage = Math.min(totalPages, safePage + 1); setPage(newPage); updateQueryParams({ page: newPage }); }}
                disabled={safePage === totalPages}
                className="px-2.5 py-1.5 rounded text-xs hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => { setPage(totalPages); updateQueryParams({ page: totalPages }); }}
                disabled={safePage === totalPages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Last page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {(
                      [
                        { field: "created_at",    label: "Date",        align: "left",  hidden: false },
                        { field: "user_name",     label: "User",        align: "left",  hidden: false },
                        { field: "profile_name",  label: "Profile",     align: "left",  hidden: false },
                        { field: null,            label: "Job URL",     align: "left",  hidden: false },
                        { field: "position_title",label: "Position",    align: "left",  hidden: false },
                        { field: "company_name",  label: "Company",     align: "left",  hidden: false },
                        { field: null,            label: "Est. Cost",   align: "right", hidden: !isSuperAdmin },
                        { field: null,            label: "Actions",     align: "left",  hidden: false },
                      ] as { field: SortField | null; label: string; align: string; hidden: boolean }[]
                    ).filter((col) => !col.hidden).map(({ field, label, align }) => (
                      <th
                        key={label}
                        onClick={() => field && handleSort(field)}
                        className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none ${
                          align === "right" ? "text-right" : "text-left"
                        } ${field ? "cursor-pointer hover:bg-gray-100 transition-colors" : ""}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {field && (
                            sortField === field ? (
                              sortDir === "asc"
                                ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                                : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />
                            )
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        <div>
                          {new Date(log.created_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                            timeZone: "America/New_York",
                          })}
                        </div>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {(() => {
                          const uid = (log.user_id ?? "").trim();
                          if (log.user_name) return log.user_name;
                          if (uid && extraUserNames.get(uid) === null)
                            return <span className="text-red-400 italic text-xs">Deleted user</span>;
                          return <span className="text-gray-400 italic">—</span>;
                        })()}
                      </td>

                      {/* Profile */}
                      <td className="px-4 py-3 text-gray-700">
                        {log.profile_name || <span className="text-gray-400 italic">—</span>}
                      </td>

                      {/* Job URL */}
                      <td className="px-4 py-3 max-w-[160px]">
                        {log.job_url ? (
                          <a href={log.job_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 truncate" title={log.job_url}>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {(() => { try { return new URL(log.job_url).hostname.replace("www.", ""); } catch { return log.job_url.slice(0, 25); } })()}
                            </span>
                          </a>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No URL</span>
                        )}
                      </td>

                      {/* Position */}
                      <td className="px-4 py-3 max-w-[200px]">
                        {log.position_title ? (
                          <span className="font-medium text-gray-900 truncate block" title={log.position_title}>
                            {log.position_title}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {log.is_regenerated === 1 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Regen
                            </span>
                          )}
                          {log.is_matched === 1 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Matched
                            </span>
                          )}
                          {log.is_matched === 0 && (
                            <div className="flex items-center gap-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Mismatch
                              </span>
                              {log.match_reason && (
                                <button
                                  onClick={() => setReasonLog(log)}
                                  className="p-0.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                                  title="View reason"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {log.is_matched === 2 && (
                            <div className="flex items-center gap-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                Unfit
                              </span>
                              {log.match_reason && (
                                <button
                                  onClick={() => setReasonLog(log)}
                                  className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  title="View reason"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {log.is_matched === 3 && (
                            <div className="flex items-center gap-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Not JD
                              </span>
                              {log.match_reason && (
                                <button
                                  onClick={() => setReasonLog(log)}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                  title="View reason"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {log.is_matched === 4 && (
                            <div className="flex items-center gap-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                Duplicate
                              </span>
                              {log.match_reason && (
                                <button
                                  onClick={() => setReasonLog(log)}
                                  className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="View reason"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {log.is_matched === 5 && (
                            <div className="flex items-center gap-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Reposted
                              </span>
                              {log.match_reason && (
                                <button
                                  onClick={() => setReasonLog(log)}
                                  className="p-0.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="View reason"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {log.is_matched === 6 && (
                            <div className="flex items-center gap-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                                AI Error
                              </span>
                              {log.match_reason && (
                                <button
                                  onClick={() => setReasonLog(log)}
                                  className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="View reason"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {log.is_applied && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                              Applied
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3 max-w-[160px]">
                        {log.company_name ? (
                          <span className="text-gray-700 truncate block" title={log.company_name}>
                            {log.company_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Est. Cost */}
                      {isSuperAdmin && (
                      <td className="px-4 py-3 text-right font-mono text-xs text-emerald-700 font-semibold">
                        {formatCost(calcCost(log.ai_provider, log.input_tokens ?? 0, log.output_tokens ?? 0))}
                      </td>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => log.job_description ? setJobDetailsLog(log) : undefined}
                            disabled={!log.job_description}
                            title={log.job_description ? "View job description" : "No job description stored for this log"}
                            className={`p-1.5 rounded-md border transition-colors ${
                              log.job_description
                                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer"
                                : "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => log.job_description ? setRegenerateLog(log) : undefined}
                            disabled={!log.job_description}
                            title={log.job_description ? "Regenerate resume" : "No job description stored for this log"}
                            className={`p-1.5 rounded-md border transition-colors ${
                              log.job_description
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                                : "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!log.content_id) return;
                              setDownloadingLogId(log.id);
                              try {
                                const data = await logsService.getContent(log.content_id);
                                const filename = [log.profile_name, log.company_name, log.position_title].filter(Boolean).join(" - ") || "Resume";
                                const tpl = profiles?.find((p) => p.id === log.profile_id)?.resume_template ?? 1;
                                await downloadResumePDF(data.raw_response, filename, tpl);
                              } catch (err) {
                                console.error("Failed to download resume:", err);
                                alert("Failed to download resume PDF.");
                              } finally {
                                setDownloadingLogId(null);
                              }
                            }}
                            disabled={!log.content_id || downloadingLogId === log.id}
                            title={log.content_id ? "Download resume PDF" : "No saved resume content"}
                            className={`p-1.5 rounded-md border transition-colors ${
                              log.content_id
                                ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer"
                                : "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                            }`}
                          >
                            {downloadingLogId === log.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer: totals + pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
              {/* Left: record counts */}
              <div className="text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                {search ? (
                  <span>
                    <span className="font-semibold text-gray-700">{sorted.length}</span> of{" "}
                    <span className="font-semibold text-gray-700">{allRows.length}</span> logs
                  </span>
                ) : (
                  <span><span className="font-semibold text-gray-700">{allRows.length}</span> logs</span>
                )}
                {isSuperAdmin && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="font-semibold text-emerald-700">
                      {formatCost(
                        allRows.reduce(
                          (s: number, l: GenerationLog) => s + calcCost(l.ai_provider, l.input_tokens ?? 0, l.output_tokens ?? 0), 0
                        )
                      )}
                    </span>
                  </>
                )}
              </div>

              {/* Right: pagination controls */}
              <div className="flex items-center gap-1 text-sm">
                <span className="text-xs text-gray-500 mr-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    setPage(1);
                    updateQueryParams({ page: 1 });
                  }}
                  disabled={safePage === 1}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="First page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const newPage = Math.max(1, safePage - 1);
                    setPage(newPage);
                    updateQueryParams({ page: newPage });
                  }}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 rounded text-xs hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Prev
                </button>

                {/* Page number buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                  .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                    if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n === "…" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-xs">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => {
                          setPage(n as number);
                          updateQueryParams({ page: n as number });
                        }}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                          safePage === n
                            ? "bg-blue-600 text-white"
                            : "hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}

                <button
                  onClick={() => {
                    const newPage = Math.min(totalPages, safePage + 1);
                    setPage(newPage);
                    updateQueryParams({ page: newPage });
                  }}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 rounded text-xs hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    setPage(totalPages);
                    updateQueryParams({ page: totalPages });
                  }}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
