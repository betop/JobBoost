"use client";

import { useState, useMemo } from "react";
import { toZonedTime } from "date-fns-tz";
import { useQuery } from "@tanstack/react-query";
import {
  mailTriageLogsService,
  calcMailTriageCost,
  type MailTriageLog,
} from "@/services/mailTriageLogsService";
import {
  RotateCcw,
  DollarSign,
  Activity,
  Mail,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon2,
} from "lucide-react";

type Period = "today" | "week" | "month" | "all" | "custom";
type SortField = "created_at" | "gmail_email" | "profile_name" | "email_count" | "cost";
type SortDir = "asc" | "desc";

const EST_TZ = "America/New_York";

function todayInEST(): string {
  const est = toZonedTime(new Date(), EST_TZ);
  return `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}-${String(est.getDate()).padStart(2, "0")}`;
}

function formatESTLocalDate(date: Date): string {
  const est = toZonedTime(date, EST_TZ);
  return `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}-${String(est.getDate()).padStart(2, "0")}`;
}

function getDateRange(period: Period, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  const today = todayInEST();
  const nowEST = toZonedTime(new Date(), EST_TZ);
  if (period === "today") return { from: today, to: today };
  if (period === "week") {
    const dow = nowEST.getDay();
    const sun = new Date(nowEST); sun.setDate(nowEST.getDate() - dow);
    const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
    return { from: formatESTLocalDate(sun), to: formatESTLocalDate(sat) };
  }
  if (period === "month") {
    return { from: formatESTLocalDate(new Date(nowEST.getFullYear(), nowEST.getMonth(), 1)), to: today };
  }
  if (period === "custom") return { from: customFrom, to: customTo };
  return {};
}

function formatLogDate(iso: string): string {
  try {
    const est = toZonedTime(new Date(iso), EST_TZ);
    return est.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: EST_TZ,
    });
  } catch { return iso; }
}

function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
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

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "All time", value: "all" },
  { label: "Custom range", value: "custom" },
];

const PAGE_SIZE = 50;

export default function LogsTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const dateRange = getDateRange(period, customFrom, customTo);
  const queryKey = ["mail-triage-logs", period, customFrom, customTo];

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => mailTriageLogsService.list(dateRange.from, dateRange.to),
    staleTime: 2 * 60 * 1000,
  });

  const rows: MailTriageLog[] = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.gmail_email ?? "").toLowerCase().includes(q) ||
      (r.profile_name ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      if (sortField === "created_at") { av = a.created_at; bv = b.created_at; }
      else if (sortField === "gmail_email") { av = a.gmail_email ?? ""; bv = b.gmail_email ?? ""; }
      else if (sortField === "profile_name") { av = a.profile_name ?? ""; bv = b.profile_name ?? ""; }
      else if (sortField === "email_count") { av = a.email_count ?? 0; bv = b.email_count ?? 0; }
      else if (sortField === "cost") {
        av = calcMailTriageCost(a.input_tokens, a.output_tokens);
        bv = calcMailTriageCost(b.input_tokens, b.output_tokens);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalRuns = rows.length;
  const totalEmails = rows.reduce((s, r) => s + (r.email_count ?? 0), 0);
  const totalInputTokens = rows.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const totalOutputTokens = rows.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  const totalCost = calcMailTriageCost(totalInputTokens, totalOutputTokens);
  const uniqueAccounts = new Set(rows.map((r) => r.gmail_email).filter(Boolean)).size;

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 ml-1" />;
    return sortDir === "asc"
      ? <ChevronUpIcon className="w-3.5 h-3.5 text-blue-500 ml-1" />
      : <ChevronDownIcon2 className="w-3.5 h-3.5 text-blue-500 ml-1" />;
  }

  const isLoaderVisible = isLoading || isFetching;

  return (
    <div className="space-y-6">
      {/* Period filter + search + refresh */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Period</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setPeriod(opt.value); setPage(0); }}
                className={`px-3 py-2 text-sm border-r last:border-r-0 border-gray-300 transition-colors ${
                  period === opt.value
                    ? "bg-blue-600 text-white font-medium"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {period === "custom" && (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setPage(0); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setPage(0); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Email or profile…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoaderVisible}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-opacity"
        >
          <RotateCcw className={`w-4 h-4 ${isLoaderVisible ? "animate-spin" : ""}`} />
          {isLoaderVisible ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Runs" value={totalRuns} color="bg-blue-500" />
        <StatCard icon={Mail} label="Emails Analyzed" value={totalEmails} color="bg-purple-500" />
        <StatCard icon={Activity} label="Unique Accounts" value={uniqueAccounts} color="bg-emerald-500" />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCost(totalCost)}
          sub={`${(totalInputTokens / 1000).toFixed(1)}K in / ${(totalOutputTokens / 1000).toFixed(1)}K out`}
          color="bg-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {isLoading ? "Loading…" : `${filtered.length.toLocaleString()} logs`}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-500 px-2">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center">Date <SortIcon field="created_at" /></span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("gmail_email")}>
                  <span className="flex items-center">Gmail Account <SortIcon field="gmail_email" /></span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("profile_name")}>
                  <span className="flex items-center">Profile <SortIcon field="profile_name" /></span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("email_count")}>
                  <span className="flex items-center justify-end">Emails <SortIcon field="email_count" /></span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Tokens (in/out)</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("cost")}>
                  <span className="flex items-center justify-end">Cost <SortIcon field="cost" /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No logs found for this period.</td></tr>
              ) : (
                paginated.map((row) => {
                  const cost = calcMailTriageCost(row.input_tokens, row.output_tokens);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatLogDate(row.created_at)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium text-xs">{row.gmail_email || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{row.profile_name || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">{(row.email_count ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">{(row.input_tokens ?? 0).toLocaleString()} / {(row.output_tokens ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700 text-xs">{formatCost(cost)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500 px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
