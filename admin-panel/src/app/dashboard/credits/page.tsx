"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toZonedTime } from "date-fns-tz";
import { Wallet, Plus, Minus, ExternalLink } from "lucide-react";
import {
  creditsService,
  type UsageAppKey,
  type UsageTokens,
  type UsageRawCost,
  type UsagePricing,
} from "@/services/creditsService";
import { toStartOfDayEST, toEndOfDayEST } from "@/services/logsService";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";

function formatCurrency(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatUsage(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

function formatCost(num: number): string {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(num)}`;
}

const BREAKDOWN_ROWS: {
  key: keyof UsageTokens;
  label: string;
  priceKey: keyof UsagePricing;
}[] = [
  { key: "input", label: "Input tokens", priceKey: "input_per_million" },
  { key: "output", label: "Output tokens", priceKey: "output_per_million" },
  { key: "cache_write", label: "Cache write tokens", priceKey: "cache_write_per_million" },
  { key: "cache_read", label: "Cache read tokens", priceKey: "cache_read_per_million" },
];

function hasTracked(tokens?: UsageTokens, rawCost?: UsageRawCost, trackedCount?: number): boolean {
  if (trackedCount !== undefined) return trackedCount > 0;
  const t = tokens ? tokens.input + tokens.output + tokens.cache_write + tokens.cache_read : 0;
  return t > 0 || (rawCost?.total ?? 0) > 0;
}

function BreakdownTable({
  tokens,
  rawCost,
  pricing,
  usageRate,
  total,
  showPrice,
}: {
  tokens?: UsageTokens;
  rawCost?: UsageRawCost;
  pricing?: UsagePricing;
  usageRate?: number;
  total: number;
  showPrice: boolean;
}) {
  if (usageRate === undefined || !rawCost) return null;
  const cell = "py-1.5";
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
          <th className={`${cell} font-medium`}>Type</th>
          <th className={`${cell} font-medium text-right`}>Tokens</th>
          {showPrice && <th className={`${cell} font-medium text-right`}>Price / 1M ($)</th>}
          <th className={`${cell} font-medium text-right`}>Cost ($)</th>
        </tr>
      </thead>
      <tbody>
        {BREAKDOWN_ROWS.map((r) => {
          const rawPrice = pricing?.[r.priceKey];
          const rawTypeCost = rawCost[r.key];
          return (
            <tr key={r.key} className="border-b border-gray-100">
              <td className={`${cell} text-gray-700`}>{r.label}</td>
              <td className={`${cell} text-right tabular-nums`}>
                {(tokens?.[r.key] ?? 0).toLocaleString("en-US")}
              </td>
              {showPrice && (
                <td className={`${cell} text-right tabular-nums`}>
                  {rawPrice !== undefined ? formatCost(rawPrice * usageRate) : "—"}
                </td>
              )}
              <td className={`${cell} text-right tabular-nums`}>
                {rawTypeCost !== undefined ? formatCost(rawTypeCost * usageRate) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t border-gray-200">
          <td className={`${cell} text-gray-900 font-semibold`} colSpan={showPrice ? 3 : 2}>
            Total
          </td>
          <td className={`${cell} text-right tabular-nums font-semibold`}>
            {formatCost(total)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

// Total shown under the breakdown: the tracked (billed) total so per-type costs add up.
// Falls back to the billed amount when every charge is tracked.
function breakdownTotal(billed: number, rawCost?: UsageRawCost, usageRate?: number, untracked?: number): number {
  if ((untracked ?? 0) > 0 && rawCost && usageRate !== undefined) return rawCost.total * usageRate;
  return billed;
}

const EST = "America/New_York";
const MAX_RANGE_DAYS = 93;
const DAY_MS = 86400000;

type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_7"
  | "last_30"
  | "last_3_months"
  | "custom";

const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_7", label: "Last 7 days" },
  { value: "last_30", label: "Last 30 days" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "custom", label: "Custom range" },
];

const APP_CARDS: { key: UsageAppKey; label: string; bar: string }[] = [
  { key: "resume_generation", label: "Resume generations", bar: "bg-primary-600" },
  { key: "assistant", label: "Assistant", bar: "bg-purple-500" },
  { key: "mail_triage", label: "Mail triage", bar: "bg-amber-500" },
];

// Calendar helpers on YYYY-MM-DD strings (pure UTC math, no DST drift).
function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(ymd: string, n: number): string {
  return dateToYmd(new Date(ymdToDate(ymd).getTime() + n * DAY_MS));
}
function todayEST(): string {
  const est = toZonedTime(new Date(), EST);
  return `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}-${String(
    est.getDate()
  ).padStart(2, "0")}`;
}
function addMonths(ymd: string, n: number): string {
  const d = ymdToDate(ymd);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return dateToYmd(target);
}

/** Resolves a preset to inclusive YYYY-MM-DD bounds in EST. Weeks are Sunday-Saturday. */
function getPresetRange(preset: Exclude<RangePreset, "custom">): { from: string; to: string } {
  const today = todayEST();
  const dow = ymdToDate(today).getUTCDay(); // 0 = Sunday
  const weekStart = addDays(today, -dow);
  const monthStart = `${today.slice(0, 7)}-01`;
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "this_week":
      return { from: weekStart, to: today };
    case "last_week":
      return { from: addDays(weekStart, -7), to: addDays(weekStart, -1) };
    case "this_month":
      return { from: monthStart, to: today };
    case "last_month": {
      const prevStart = addMonths(monthStart, -1);
      return { from: prevStart, to: addDays(monthStart, -1) };
    }
    case "last_7":
      return { from: addDays(today, -6), to: today };
    case "last_30":
      return { from: addDays(today, -29), to: today };
    case "last_3_months":
      return { from: addDays(addMonths(today, -3), 1), to: today };
  }
}

function UsageSection({
  adminSelector,
  adminId,
}: {
  adminSelector?: React.ReactNode;
  adminId?: string;
}) {
  const [preset, setPreset] = useState<RangePreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);

  let customError: string | null = null;
  if (preset === "custom" && customFrom && customTo) {
    const span = (ymdToDate(customTo).getTime() - ymdToDate(customFrom).getTime()) / DAY_MS + 1;
    if (span < 1) customError = "Start date must be on or before the end date.";
    else if (span > MAX_RANGE_DAYS) customError = "Range can be at most 3 months (93 days).";
  }
  const canApply = !!customFrom && !!customTo && !customError;

  const range =
    preset === "custom" ? applied : getPresetRange(preset as Exclude<RangePreset, "custom">);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["credits-usage-summary", range?.from, range?.to, adminId ?? "all"],
    queryFn: () =>
      creditsService.getUsageSummary({
        date_from: toStartOfDayEST(range!.from),
        date_to: toEndOfDayEST(range!.to),
        admin_id: adminId || undefined,
      }),
    enabled: !!range,
  });

  const total = data?.total_spent ?? 0;
  const byKey = new Map((data?.by_app ?? []).map((a) => [a.key, a]));
  const cards = [...APP_CARDS];
  const other = byKey.get("other");
  if (other && other.amount > 0) {
    cards.push({ key: "other", label: other.label || "Other", bar: "bg-gray-400" });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold">Credit usage</h2>
        <div className="flex items-end gap-3 flex-wrap">
          {adminSelector}
          <div>
            <label className="text-sm font-medium block mb-1">Date range</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as RangePreset)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-sm font-medium block mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <Button
            onClick={() => setApplied({ from: customFrom, to: customTo })}
            disabled={!canApply}
          >
            Apply
          </Button>
          {customError && <p className="text-sm text-red-600">{customError}</p>}
        </div>
      )}

      {!range ? (
        <p className="text-sm text-gray-500">Choose a start and end date, then apply.</p>
      ) : isLoading ? (
        <div className="py-6 text-center">
          <LoadingSpinner size="md" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          {(error as any)?.response?.data?.message ||
            (error as any)?.response?.data?.error ||
            "Failed to load credit usage"}
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm text-gray-600">Spent in this period</p>
            <p className="text-3xl font-bold text-gray-900">{formatUsage(total)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(data?.total_count ?? 0).toLocaleString()} requests · {range.from} to {range.to} (EST)
            </p>
          </div>
          {data?.usage_rate !== undefined &&
            hasTracked(data?.tokens, data?.raw_cost, data?.tracked_count) &&
            (data?.tokens || data?.raw_cost) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Cost breakdown</h3>
                <div className="border border-gray-200 rounded-lg px-4 py-2 overflow-x-auto">
                  <BreakdownTable
                    tokens={data?.tokens}
                    rawCost={data?.raw_cost}
                    pricing={data?.pricing}
                    usageRate={data?.usage_rate}
                    total={breakdownTotal(total, data?.raw_cost, data?.usage_rate, data?.untracked_count)}
                    showPrice
                  />
                </div>
              </div>
            )}
          {(data?.untracked_count ?? 0) > 0 && (
            <p className="text-xs text-gray-500">
              {data!.untracked_count!.toLocaleString()}{" "}
              {data!.untracked_count === 1 ? "charge" : "charges"} made before token tracking{" "}
              {data!.untracked_count === 1 ? "is" : "are"} included in the billed amount but not in
              the token breakdown.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {cards.map((c) => {
              const item = byKey.get(c.key);
              const amount = item?.amount ?? 0;
              const count = item?.count ?? 0;
              const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
              return (
                <div key={c.key} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">{c.label}</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{formatUsage(amount)}</p>
                  <p className="text-xs text-gray-500">
                    {count.toLocaleString()} {count === 1 ? "request" : "requests"}
                  </p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full ${c.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{pct.toFixed(1)}% of total</p>
                  {item && data?.usage_rate !== undefined && (item.tokens || item.raw_cost) &&
                    hasTracked(item.tokens, item.raw_cost, item.tracked_count) && (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-primary-600 text-xs font-medium">
                          Details
                        </summary>
                        <div className="mt-2">
                          <BreakdownTable
                            tokens={item.tokens}
                            rawCost={item.raw_cost}
                            pricing={data?.pricing}
                            usageRate={data?.usage_rate}
                            total={breakdownTotal(amount, item.raw_cost, data?.usage_rate, item.untracked_count)}
                            showPrice={false}
                          />
                        </div>
                      </details>
                    )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function CreditsPage() {
  const admin = useAuthStore((state) => state.admin);
  const showToast = useUIStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const isSuperAdmin = admin?.type === "super_admin";

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("25");
  const [depositResult, setDepositResult] = useState<Awaited<
    ReturnType<typeof creditsService.deposit>
  > | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<{ id: string; name: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["credits-balance"],
    queryFn: () => creditsService.getBalance(),
    enabled: !isSuperAdmin,
  });

  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ["credits-admins"],
    queryFn: () => creditsService.listAdmins(),
    enabled: isSuperAdmin,
  });

  const { data: settings } = useQuery({
    queryKey: ["credits-settings"],
    queryFn: () => creditsService.getSettings(),
  });

  const [usageAdminId, setUsageAdminId] = useState("");

  const [rateInput, setRateInput] = useState("");
  const [rateSaving, setRateSaving] = useState(false);

  const handleSaveRate = async () => {
    const rate = parseFloat(rateInput);
    if (!isFinite(rate) || rate < 1 || rate > 10) {
      showToast("Usage rate must be between 1 and 10", "error");
      return;
    }
    setRateSaving(true);
    try {
      const updated = await creditsService.updateSettings(rate);
      queryClient.setQueryData(["credits-settings"], updated);
      setRateInput("");
      showToast(`Usage rate updated to ${updated.usage_rate}x`, "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.error || "Failed to update usage rate", "error");
    } finally {
      setRateSaving(false);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 15) {
      showToast("Minimum deposit amount is $15", "error");
      return;
    }
    setDepositLoading(true);
    try {
      const result = await creditsService.deposit(amount);
      setDepositResult(result);
      if (result.payment_url) {
        window.open(result.payment_url, "_blank", "noreferrer");
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to create deposit", "error");
    } finally {
      setDepositLoading(false);
    }
  };

  const closeDepositModal = () => {
    setDepositModalOpen(false);
    setDepositResult(null);
    setDepositAmount("25");
    queryClient.invalidateQueries({ queryKey: ["credits-balance"] });
  };

  const handleAdjust = async () => {
    if (!adjustTarget) return;
    const amount = parseFloat(adjustAmount);
    if (!amount) {
      showToast("Enter a non-zero amount", "error");
      return;
    }
    setAdjustLoading(true);
    try {
      await creditsService.adjust(adjustTarget.id, amount, adjustNote || undefined);
      showToast(`Balance ${amount > 0 ? "credited" : "debited"} for ${adjustTarget.name}`, "success");
      setAdjustTarget(null);
      setAdjustAmount("");
      setAdjustNote("");
      queryClient.invalidateQueries({ queryKey: ["credits-admins"] });
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to adjust balance", "error");
    } finally {
      setAdjustLoading(false);
    }
  };

  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Credits</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage admin credit balances. Admins are billed{" "}
            {settings ? `${settings.usage_rate}x` : "a multiple of"} the raw AI provider cost for
            resume generation and chat assistant usage.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold">Usage rate</h2>
          <p className="text-sm text-gray-600 mt-1">
            Admins are billed raw AI provider cost × this rate. Current rate:{" "}
            <span className="font-semibold text-gray-900">
              {settings ? `${settings.usage_rate}x` : "—"}
            </span>
          </p>
          <div className="flex items-end gap-3 mt-4 flex-wrap">
            <div>
              <label className="text-sm font-medium block mb-1">New rate (1 – 10)</label>
              <input
                type="number"
                min={1}
                max={10}
                step="0.01"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder={settings ? String(settings.usage_rate) : "e.g. 1.5"}
                className="w-40 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <Button onClick={handleSaveRate} loading={rateSaving} disabled={!rateInput}>
              Save
            </Button>
          </div>
        </div>

        <UsageSection
          adminId={usageAdminId || undefined}
          adminSelector={
            <div>
              <label className="text-sm font-medium block mb-1">Admin</label>
              <select
                value={usageAdminId}
                onChange={(e) => setUsageAdminId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">All admins</option>
                {adminsData?.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {adminsLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              )}
              {!adminsLoading && adminsData?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No admin accounts found
                  </td>
                </tr>
              )}
              {adminsData?.items.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{a.email}</td>
                  <td className="px-6 py-4 text-sm">
                    {a.is_active ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Inactive</span>
                    )}
                  </td>
                  <td
                    className={`px-6 py-4 text-sm text-right font-semibold ${
                      a.credit_balance < 0 ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {formatCurrency(a.credit_balance)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setAdjustTarget({ id: a.id, name: a.full_name })}
                      className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Modal
          isOpen={!!adjustTarget}
          onClose={() => setAdjustTarget(null)}
          title={`Adjust balance — ${adjustTarget?.name ?? ""}`}
          size="sm"
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Amount (use negative to debit)
              </label>
              <input
                type="number"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 50 or -10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Note (optional)</label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason for adjustment"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setAdjustTarget(null)}>
                Cancel
              </Button>
              <Button onClick={handleAdjust} loading={adjustLoading}>
                {parseFloat(adjustAmount || "0") >= 0 ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
                Apply
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Credits</h1>
      </div>

      {!balanceLoading && balance && (balance.credit_balance ?? 0) <= 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          Insufficient credit: usage is blocked until you top up.
        </div>
      )}
      {!balanceLoading &&
        balance &&
        settings &&
        balance.credit_balance > 0 &&
        balance.credit_balance < settings.low_balance_threshold && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
            Your credit is running low ({formatCurrency(balance.credit_balance)} remaining). Please
            top up soon.
          </div>
        )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Current balance</p>
              {balanceLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <p
                  className={`text-2xl font-bold ${
                    (balance?.credit_balance ?? 0) < 0 ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {formatCurrency(balance?.credit_balance ?? 0)}
                </p>
              )}
            </div>
          </div>
          <Button onClick={() => setDepositModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Deposit Crypto
          </Button>
        </div>
      </div>

      <UsageSection />

      <Modal isOpen={depositModalOpen} onClose={closeDepositModal} title="Deposit crypto" size="sm">
        <div className="p-6 space-y-4">
          {!depositResult ? (
            <>
              <div>
                <label className="text-sm font-medium block mb-1">Amount (USD)</label>
                <input
                  type="number"
                  min={15}
                  step="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum deposit: $15</p>
              </div>
              <p className="text-xs text-gray-500">
                You&apos;ll be redirected to NOWPayments&apos; secure invoice page, where you can choose
                from all available coins and networks to complete the payment.
              </p>
              <Button onClick={handleDeposit} loading={depositLoading} className="w-full">
                Continue to NOWPayments
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Deposit request created</p>
                <p className="text-lg font-bold">{formatCurrency(depositResult.amount_usd)}</p>
              </div>
              {depositResult.payment_url && (
                <a
                  href={depositResult.payment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Open payment page <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <p className="text-xs text-gray-500 text-center">
                Your balance updates automatically once the payment is confirmed.
              </p>
              <Button variant="secondary" onClick={closeDepositModal} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
