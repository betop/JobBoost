"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logsService, LogsFilters, GenerationLog } from "@/services/logsService";
import { downloadResumePDF } from "@/utils/pdfDownload";
import { bidderService } from "@/services/bidderService";
import { profileService } from "@/services/profileService";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Activity,
  Cpu,
  TrendingUp,
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
  Building2,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  Ban,
} from "lucide-react";

type SortField = "created_at" | "bidder_name" | "profile_name" | "position_title" | "company_name";
type SortDir = "asc" | "desc";
type LogsPeriod = "today" | "week" | "month" | "custom";

// Pricing per 1M tokens (USD)
const PRICING = {
  claude: { input: 1.0, output: 5.0 },
  openai: { input: 0.15, output: 0.6 },
};

function calcCost(provider: string, inputTokens: number, outputTokens: number): number {
  const rates = provider === "claude" ? PRICING.claude : PRICING.openai;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
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
  onClose,
  onSuccess,
}: {
  log: GenerationLog;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [mismatchResult, setMismatchResult] = useState<{ resume_text: string; resume_filename: string } | null>(null);

  async function handleRegenerate() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await logsService.regenerate(log.id);
      if (result.skipped || result.is_matched === 2) {
        setSkipped(true);
        setDone(true);
        return;
      }
      if (result.is_matched === 0) {
        setMismatchWarning(result.match_reason || "This job may not match your profile.");
        setMismatchResult({ resume_text: result.resume_text, resume_filename: result.resume_filename });
        setIsLoading(false);
        return;
      }
      await downloadResumePDF(result.resume_text, result.resume_filename);
      setDone(true);
      onSuccess();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Regeneration failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownloadAnyway() {
    if (!mismatchResult) return;
    try {
      await downloadResumePDF(mismatchResult.resume_text, mismatchResult.resume_filename);
      setDone(true);
      onSuccess();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Download failed.";
      setError(msg);
    }
  }

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
              {skipped ? (
                <>
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <p className="font-semibold text-gray-900">Job Not Qualified</p>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    This job appears to be <span className="font-medium text-amber-700">hybrid or onsite</span> and requires office visits.
                    Only 100% remote jobs are supported — resume generation was skipped.
                  </p>
                  <button onClick={onClose} className="mt-5 px-6 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors">
                    OK, Got It
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <RefreshCw className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="font-semibold text-gray-900">Resume regenerated &amp; downloaded!</p>
                  <p className="text-sm text-gray-500 mt-1">The PDF has been saved to your downloads. A new log entry has been created and marked as regenerated.</p>
                </>
              )}
              {!skipped && (
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700">
                  Close
                </button>
              )}
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
              {mismatchWarning ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 text-sm">Job may not match your profile</p>
                      <p className="text-sm text-amber-700 mt-1">{mismatchWarning}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={onClose}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleDownloadAnyway}
                      className="flex-1 px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 flex items-center justify-center gap-2">
                      Download Anyway
                    </button>
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

export default function LogsPage() {
  const queryClient = useQueryClient();
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  const [filters, setFilters] = useState<LogsFilters>({ 
    period: "custom",
    date_from: today,
    date_to: today
  });
  const [statsPeriod, setStatsPeriod] = useState<LogsPeriod>("today");

  // Table state
  const [search, setSearch]         = useState("");
  const [sortField, setSortField]   = useState<SortField>("created_at");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(25);

  // Modal state
  const [jobDetailsLog, setJobDetailsLog]     = useState<GenerationLog | null>(null);
  const [regenerateLog, setRegenerateLog]     = useState<GenerationLog | null>(null);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["generation-logs", filters],
    queryFn: () => logsService.list(filters),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["logs-stats", statsPeriod, filters.profile_id, filters.bidder_id, filters.date_from, filters.date_to],
    queryFn: () => logsService.stats(statsPeriod, filters.profile_id, filters.bidder_id, filters.date_from, filters.date_to),
  });

  const { data: bidders } = useQuery({ queryKey: ["bidders"], queryFn: bidderService.getAll });
  const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: profileService.getAll });

  async function refreshData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["generation-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["logs-stats"] }),
    ]);
  }

  function applyPeriod(period: LogsPeriod) {
    setStatsPeriod(period);
    setPage(1);
    if (period !== "custom") {
      setFilters((f) => ({ ...f, period: period as LogsFilters["period"], date_from: undefined, date_to: undefined }));
    } else {
      setFilters((f) => ({ ...f, period: "custom" }));
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "created_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  // Processed (search → sort → paginate)
  const allRows: GenerationLog[] = useMemo(() => logsData?.items ?? [], [logsData?.items]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((log) => {
      if (q && ![log.bidder_name, log.profile_name, log.position_title, log.company_name, log.job_url]
        .some((v) => v?.toLowerCase().includes(q))) return false;
      if (filters.is_regenerated === "1" && log.is_regenerated !== 1) return false;
      if (filters.is_regenerated === "0" && log.is_regenerated !== 0) return false;
      return true;
    });
  }, [allRows, search, filters.is_regenerated]);

  const sorted = useMemo(() => {
    return [...searched].sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortField) {
        case "created_at":    av = a.created_at;          bv = b.created_at;          break;
        case "bidder_name":   av = a.bidder_name ?? "";   bv = b.bidder_name ?? "";   break;
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

  // Estimate cost from stats (treat all period tokens as Claude since we have claude_count/openai_count split)
  // For accuracy, compute per-row cost in the table; here we approximate using provider counts proportionally
  const claudeInputEst = stats?.total_input_tokens && stats?.claude_count && (stats.claude_count + (stats.openai_count ?? 0)) > 0
    ? Math.round(stats.total_input_tokens * stats.claude_count / (stats.claude_count + (stats.openai_count ?? 0)))
    : (stats?.total_input_tokens ?? 0);
  const claudeOutputEst = stats?.total_output_tokens && stats?.claude_count && (stats.claude_count + (stats.openai_count ?? 0)) > 0
    ? Math.round(stats.total_output_tokens * stats.claude_count / (stats.claude_count + (stats.openai_count ?? 0)))
    : (stats?.total_output_tokens ?? 0);
  const openaiInputEst = (stats?.total_input_tokens ?? 0) - claudeInputEst;
  const openaiOutputEst = (stats?.total_output_tokens ?? 0) - claudeOutputEst;
  const periodCost = calcCost("claude", claudeInputEst, claudeOutputEst) + calcCost("openai", openaiInputEst, openaiOutputEst);

  const allTimeCost = (() => {
    const atClaudeIn = stats?.all_time_input_tokens && stats?.claude_count && (stats.claude_count + (stats.openai_count ?? 0)) > 0
      ? Math.round((stats.all_time_input_tokens ?? 0) * stats.claude_count / (stats.claude_count + (stats.openai_count ?? 0)))
      : (stats?.all_time_input_tokens ?? 0);
    const atClaudeOut = stats?.all_time_output_tokens && stats?.claude_count && (stats.claude_count + (stats.openai_count ?? 0)) > 0
      ? Math.round((stats.all_time_output_tokens ?? 0) * stats.claude_count / (stats.claude_count + (stats.openai_count ?? 0)))
      : (stats?.all_time_output_tokens ?? 0);
    return calcCost("claude", atClaudeIn, atClaudeOut) + calcCost("openai", (stats?.all_time_input_tokens ?? 0) - atClaudeIn, (stats?.all_time_output_tokens ?? 0) - atClaudeOut);
  })();

  // Per-table-row cost (used in the footer via inline reduce)
  const totalTokens = (stats?.total_input_tokens ?? 0) + (stats?.total_output_tokens ?? 0);

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
          onClose={() => setRegenerateLog(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["generation-logs"] });
            queryClient.invalidateQueries({ queryKey: ["logs-stats"] });
          }}
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
        <button
          onClick={refreshData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => applyPeriod(opt.value)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              statsPeriod === opt.value
                ? "bg-white text-gray-900 font-medium shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {statsPeriod === "custom" && (
        <div className="flex gap-3 mb-6 items-center">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={filters.date_from || ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, date_from: e.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={filters.date_to || ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, date_to: e.target.value }));
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Stats cards */}
      {statsLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={Activity}
            label="Generations (period)"
            value={stats?.total_generations ?? 0}
            sub={`All time: ${stats?.all_time_total ?? 0}`}
            color="bg-blue-500"
          />
          <StatCard
            icon={CheckCircle}
            label="Matched Jobs (period)"
            value={stats?.matched_count ?? 0}
            sub={`${stats?.total_generations ? Math.round(((stats.matched_count ?? 0) / stats.total_generations) * 100) : 0}% match rate`}
            color="bg-emerald-500"
          />
          <StatCard
            icon={AlertTriangle}
            label="Mismatched Jobs (period)"
            value={stats?.mismatched_count ?? 0}
            sub={`${stats?.total_generations ? Math.round(((stats.mismatched_count ?? 0) / stats.total_generations) * 100) : 0}% mismatch rate`}
            color="bg-amber-500"
          />
          <StatCard
            icon={Ban}
            label="Skipped Jobs (period)"
            value={stats?.skipped_count ?? 0}
            sub="Not 100% remote"
            color="bg-gray-500"
          />
          <StatCard
            icon={DollarSign}
            label="Est. Cost (period)"
            value={formatCost(periodCost)}
            sub={`All time: ${formatCost(allTimeCost)}`}
            color="bg-purple-600"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <Filter className="w-4 h-4 text-gray-400 self-center" />

        <div>
          <label className="block text-xs text-gray-500 mb-1">Bidder</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
            value={filters.bidder_id || ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, bidder_id: e.target.value || undefined }))
            }
          >
            <option value="">All bidders</option>
            {bidders?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.full_name} ({b.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Profile</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
            value={filters.profile_id || ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, profile_id: e.target.value || undefined }))
            }
          >
            <option value="">All profiles</option>
            {profiles?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Match Status</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
            value={filters.is_matched ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, is_matched: (e.target.value as "1" | "0" | "2") || undefined }))
            }
          >
            <option value="">All jobs</option>
            <option value="1">✅ Matched only</option>
            <option value="0">⚠️ Mismatched only</option>
            <option value="2">🚫 Skipped only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[150px]"
            value={filters.is_regenerated ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, is_regenerated: (e.target.value as "1" | "0") || undefined }))
            }
          >
            <option value="">All types</option>
            <option value="0">Original only</option>
            <option value="1">🔄 Regenerated only</option>
          </select>
        </div>

        {(filters.bidder_id || filters.profile_id) && (
          <div className="text-xs text-blue-600 self-end pb-2">
            Showing filtered results —{" "}
            <button
              onClick={() =>
                setFilters((f) => ({ ...f, bidder_id: undefined, profile_id: undefined }))
              }
              className="underline"
            >
              clear
            </button>
          </div>
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
              placeholder="Search bidder, profile, position, company…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
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
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {logsLoading ? (
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {(
                      [
                        { field: "created_at",    label: "Date",        align: "left",  hidden: false },
                        { field: "bidder_name",   label: "Bidder",      align: "left",  hidden: !!filters.bidder_id },
                        { field: "profile_name",  label: "Profile",     align: "left",  hidden: !!filters.profile_id },
                        { field: null,            label: "Job URL",     align: "left",  hidden: false },
                        { field: "position_title",label: "Position",    align: "left",  hidden: false },
                        { field: "company_name",  label: "Company",     align: "left",  hidden: false },
                        { field: null,            label: "Est. Cost",   align: "right", hidden: false },
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
                          })}
                        </div>
                      </td>

                      {/* Bidder */}
                      {!filters.bidder_id && (
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {log.bidder_name || <span className="text-gray-400 italic">Unknown</span>}
                        </td>
                      )}

                      {/* Profile */}
                      {!filters.profile_id && (
                        <td className="px-4 py-3 text-gray-700">
                          {log.profile_name || <span className="text-gray-400 italic">—</span>}
                        </td>
                      )}

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
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title={log.match_reason || ""}>
                              Matched
                            </span>
                          )}
                          {log.is_matched === 0 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title={log.match_reason || ""}>
                              Mismatch
                            </span>
                          )}
                          {log.is_matched === 2 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                              Skipped
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
                      <td className="px-4 py-3 text-right font-mono text-xs text-emerald-700 font-semibold">
                        {formatCost(calcCost(log.ai_provider, log.input_tokens ?? 0, log.output_tokens ?? 0))}
                      </td>

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
                <span className="text-gray-300">·</span>
                <span className="font-semibold text-emerald-700">
                  {formatCost(
                    (logsData?.items ?? []).reduce(
                      (s, l) => s + calcCost(l.ai_provider, l.input_tokens ?? 0, l.output_tokens ?? 0), 0
                    )
                  )}
                </span>
              </div>

              {/* Right: pagination controls */}
              <div className="flex items-center gap-1 text-sm">
                <span className="text-xs text-gray-500 mr-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="First page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                        onClick={() => setPage(n as number)}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 rounded text-xs hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
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
