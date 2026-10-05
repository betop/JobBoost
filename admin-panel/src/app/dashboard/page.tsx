"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toZonedTime } from "date-fns-tz";
import {
  Users,
  UserCheck,
  Key,
  Activity,
  AlertTriangle,
  Wallet,
  Clock,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import { dashboardService } from "@/services/dashboardService";
import { creditsService, type UsageAppKey } from "@/services/creditsService";
import * as logCache from "@/services/logCache";
import { toStartOfDayEST, toEndOfDayEST } from "@/services/logsService";
import { useAuthStore } from "@/store/authStore";

const EST = "America/New_York";
const DAY_MS = 86_400_000;
const LOW_BALANCE = 5;

function todayEST(): string {
  const est = toZonedTime(new Date(), EST);
  return `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}-${String(
    est.getDate()
  ).padStart(2, "0")}`;
}
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const DASH = "—";

const APP_ROWS: { key: UsageAppKey; label: string; bar: string }[] = [
  { key: "resume_generation", label: "Resume generations", bar: "bg-primary-600" },
  { key: "assistant", label: "Assistant", bar: "bg-purple-500" },
  { key: "mail_triage", label: "Mail triage", bar: "bg-amber-500" },
];

const OUTCOMES: { key: string; label: string; bar: string }[] = [
  { key: "matched_count", label: "Matched", bar: "bg-green-500" },
  { key: "mismatched_count", label: "Mismatched", bar: "bg-red-400" },
  { key: "skipped_count", label: "Skipped", bar: "bg-gray-400" },
  { key: "duplicated_count", label: "Duplicated", bar: "bg-blue-400" },
  { key: "not_jd_count", label: "Not JD", bar: "bg-amber-400" },
  { key: "reposted_count", label: "Reposted", bar: "bg-purple-400" },
  { key: "error_count", label: "Error", bar: "bg-red-600" },
];

interface Kpi {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color: string;
  href?: string;
  loading?: boolean;
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const card = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow h-full">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.title}</p>
          {kpi.loading ? (
            <div className="h-8 w-16 mt-1.5 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1.5">{kpi.value}</p>
          )}
          {kpi.sub && !kpi.loading && <p className="text-xs text-gray-500 mt-1">{kpi.sub}</p>}
        </div>
        <div className={`${kpi.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
  return kpi.href ? <Link href={kpi.href}>{card}</Link> : card;
}

function Panel({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {href && (
          <Link href={href} className="text-xs text-blue-600 hover:underline">
            {hrefLabel} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function Alert({
  href,
  tone,
  children,
  cta,
}: {
  href: string;
  tone: "red" | "yellow";
  children: React.ReactNode;
  cta: string;
}) {
  const t =
    tone === "red"
      ? { box: "bg-red-50 border-red-200 hover:bg-red-100", icon: "text-red-600", text: "text-red-800" }
      : { box: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100", icon: "text-yellow-600", text: "text-yellow-800" };
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${t.box}`}>
      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${t.icon}`} />
      <p className={`flex-1 text-sm font-medium ${t.text}`}>{children}</p>
      <span className="text-sm font-semibold text-primary-600 whitespace-nowrap">{cta} →</span>
    </Link>
  );
}

export default function DashboardPage() {
  const admin = useAuthStore((state) => state.admin);
  const isSuper = admin?.type === "super_admin";
  const isAdmin = admin?.type === "admin";
  const ready = isSuper || isAdmin;

  const today = todayEST();
  const from = addDays(today, -30);

  const statsQ = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardService.getStats,
    enabled: ready,
  });

  const balanceQ = useQuery({
    queryKey: ["dashboard-credits-balance"],
    queryFn: () => creditsService.getBalance(),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const adminsQ = useQuery({
    queryKey: ["dashboard-credits-admins"],
    queryFn: () => creditsService.listAdmins(),
    enabled: isSuper,
    staleTime: 30_000,
  });

  const usageQ = useQuery({
    queryKey: ["dashboard-usage-30d", from, today],
    queryFn: () =>
      creditsService.getUsageSummary({
        date_from: toStartOfDayEST(from),
        date_to: toEndOfDayEST(today),
      }),
    enabled: ready,
    staleTime: 30_000,
  });

  const logQ = useQuery({
    queryKey: ["logs-stats-dashboard", from, today],
    queryFn: () => logCache.computeStats(toStartOfDayEST(from), toEndOfDayEST(today)),
    enabled: ready,
    staleTime: 30_000,
  });

  const stats = statsQ.data;
  const logStats = logQ.data;
  const usage = usageQ.data;

  const activeAdmins = (adminsQ.data?.items ?? []).filter((a) => a.is_active);
  const lowAdmins = [...activeAdmins]
    .filter((a) => a.credit_balance < LOW_BALANCE)
    .sort((a, b) => a.credit_balance - b.credit_balance);
  const pending = stats?.pending_profiles ?? 0;
  const balance = balanceQ.data?.credit_balance;

  const pct = (n: number) =>
    logStats && logStats.total_generations > 0 ? Math.round((n / logStats.total_generations) * 100) : 0;

  const generationsKpi: Kpi = {
    title: "Generations (30d)",
    value: logQ.isError ? DASH : String(logStats?.total_generations ?? 0),
    sub: logStats
      ? `${pct(logStats.matched_count)}% matched · ${pct(logStats.applied_count)}% applied`
      : undefined,
    icon: Activity,
    color: "bg-indigo-500",
    href: "/dashboard/logs",
    loading: logQ.isLoading,
  };
  const keysKpi: Kpi = {
    title: "Active keys",
    value: statsQ.isError ? DASH : String(stats?.active_tokens ?? 0),
    icon: Key,
    color: "bg-yellow-500",
    href: "/dashboard/tokens",
    loading: statsQ.isLoading,
  };
  const spendValue = usageQ.isError ? DASH : usd(usage?.total_spent ?? 0);

  let kpis: Kpi[];
  if (isSuper) {
    kpis = [
      {
        title: "Total profiles",
        value: statsQ.isError ? DASH : String(stats?.total_profiles ?? 0),
        icon: Users,
        color: "bg-blue-500",
        href: "/dashboard/profiles",
        loading: statsQ.isLoading,
      },
      {
        title: "Pending approvals",
        value: statsQ.isError ? DASH : String(pending),
        icon: Clock,
        color: pending > 0 ? "bg-orange-500" : "bg-gray-400",
        href: "/dashboard/profiles",
        loading: statsQ.isLoading,
      },
      {
        title: "Admins · Bidders",
        value:
          adminsQ.isError || statsQ.isError
            ? DASH
            : `${activeAdmins.length} · ${stats?.total_bidders ?? 0}`,
        sub: "active admins · bidders",
        icon: UserCheck,
        color: "bg-green-500",
        href: "/dashboard/users",
        loading: adminsQ.isLoading || statsQ.isLoading,
      },
      keysKpi,
      generationsKpi,
      {
        title: "Admin spend (30d)",
        value: spendValue,
        sub: usage ? `${usage.total_count.toLocaleString()} billed events` : undefined,
        icon: DollarSign,
        color: "bg-emerald-500",
        href: "/dashboard/credits",
        loading: usageQ.isLoading,
      },
    ];
  } else {
    kpis = [
      {
        title: "Credit balance",
        value: balanceQ.isError ? DASH : usd(balance ?? 0),
        icon: Wallet,
        color: balance === undefined ? "bg-gray-400" : balance <= 0 ? "bg-red-500" : balance < LOW_BALANCE ? "bg-yellow-500" : "bg-emerald-500",
        href: "/dashboard/credits",
        loading: balanceQ.isLoading,
      },
      {
        title: "Spend (30d)",
        value: spendValue,
        icon: DollarSign,
        color: "bg-teal-500",
        href: "/dashboard/credits",
        loading: usageQ.isLoading,
      },
      {
        title: "My profiles",
        value: statsQ.isError ? DASH : String(stats?.total_profiles ?? 0),
        icon: Users,
        color: "bg-blue-500",
        href: "/dashboard/profiles",
        loading: statsQ.isLoading,
      },
      {
        title: "My bidders",
        value: statsQ.isError ? DASH : String(stats?.total_bidders ?? 0),
        icon: UserCheck,
        color: "bg-green-500",
        href: "/dashboard/users",
        loading: statsQ.isLoading,
      },
      keysKpi,
      generationsKpi,
    ];
  }

  // Spend by app
  const byKey = new Map((usage?.by_app ?? []).map((a) => [a.key, a]));
  const appRows = [...APP_ROWS];
  const other = byKey.get("other");
  if (other && other.amount > 0) appRows.push({ key: "other", label: other.label || "Other", bar: "bg-gray-400" });
  const totalSpent = usage?.total_spent ?? 0;

  const quickActions: { href: string; label: string }[] = isSuper
    ? [
        { href: "/dashboard/profiles", label: "Review pending profiles" },
        { href: "/dashboard/users/new", label: "+ Add new user" },
        { href: "/dashboard/tokens", label: "+ Generate key" },
        { href: "/dashboard/logs", label: "→ View generation logs" },
        { href: "/dashboard/credits", label: "→ Manage credits" },
      ]
    : [
        { href: "/dashboard/profiles/new", label: "+ Create profile" },
        { href: "/dashboard/users/new", label: "+ Add new user" },
        { href: "/dashboard/tokens", label: "+ Generate key" },
        { href: "/dashboard/logs", label: "→ View generation logs" },
        { href: "/dashboard/credits", label: "+ Add credit" },
      ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to HHQ</p>
      </div>

      {/* Alerts */}
      <div className="space-y-3 mb-6 empty:hidden">
        {isSuper && pending > 0 && (
          <Alert href="/dashboard/profiles" tone="yellow" cta="Review">
            {pending} profile{pending === 1 ? "" : "s"} pending approval
          </Alert>
        )}
        {isSuper && lowAdmins.length > 0 && (
          <Alert
            href="/dashboard/credits"
            tone={lowAdmins.some((a) => a.credit_balance <= 0) ? "red" : "yellow"}
            cta="Manage credits"
          >
            {lowAdmins.length} admin{lowAdmins.length === 1 ? "" : "s"} with empty or low balance (under {usd(LOW_BALANCE)})
          </Alert>
        )}
        {isAdmin && balance !== undefined && balance <= 0 && (
          <Alert href="/dashboard/credits" tone="red" cta="Deposit now">
            Insufficient credit: usage is blocked until you top up
          </Alert>
        )}
        {isAdmin && balance !== undefined && balance > 0 && balance < LOW_BALANCE && (
          <Alert href="/dashboard/credits" tone="yellow" cta="Deposit now">
            Credit is running low, top up soon
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {kpis.map((k) => (
          <KpiCard key={k.title} kpi={k} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Spend by app (30d)" href="/dashboard/credits" hrefLabel="Credits">
          {usageQ.isLoading ? (
            <Skeleton />
          ) : usageQ.isError ? (
            <p className="text-sm text-gray-500">{DASH}</p>
          ) : (
            <div className="space-y-4">
              {appRows.map((row) => {
                const a = byKey.get(row.key);
                const amount = a?.amount ?? 0;
                return (
                  <div key={row.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-900">
                        {usd(amount)}{" "}
                        <span className="text-xs text-gray-500 font-normal">
                          · {(a?.count ?? 0).toLocaleString()}
                        </span>
                      </span>
                    </div>
                    <Bar pct={totalSpent > 0 ? (amount / totalSpent) * 100 : 0} color={row.bar} />
                  </div>
                );
              })}
              <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                <span className="text-gray-600 font-medium">Total</span>
                <span className="font-bold text-gray-900">{usd(totalSpent)}</span>
              </div>
            </div>
          )}
        </Panel>

        {isSuper && (
          <Panel title="Admin balances" href="/dashboard/credits" hrefLabel="Credits">
            {adminsQ.isLoading ? (
              <Skeleton />
            ) : adminsQ.isError ? (
              <p className="text-sm text-gray-500">{DASH}</p>
            ) : activeAdmins.length === 0 ? (
              <p className="text-sm text-gray-500">No active admins.</p>
            ) : (
              <div className="space-y-2">
                {[...activeAdmins]
                  .sort((a, b) => a.credit_balance - b.credit_balance)
                  .slice(0, 5)
                  .map((a) => {
                    const chip =
                      a.credit_balance <= 0
                        ? "bg-red-100 text-red-700"
                        : a.credit_balance < LOW_BALANCE
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700";
                    return (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="text-gray-900 truncate">{a.full_name || a.email}</p>
                          {a.full_name && <p className="text-xs text-gray-500 truncate">{a.email}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${chip}`}>
                          {usd(a.credit_balance)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Panel>
        )}

        <Panel title="Generation outcomes (30d)" href="/dashboard/logs" hrefLabel="View logs">
          {logQ.isLoading ? (
            <Skeleton rows={5} />
          ) : logQ.isError || !logStats ? (
            <p className="text-sm text-gray-500">{DASH}</p>
          ) : (
            <div className="space-y-2.5">
              {OUTCOMES.map((o) => {
                const n = (logStats as unknown as Record<string, number>)[o.key] ?? 0;
                return (
                  <div key={o.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{o.label}</span>
                      <span className="font-medium text-gray-900">
                        {n.toLocaleString()}{" "}
                        <span className="text-xs text-gray-500 font-normal">· {pct(n)}%</span>
                      </span>
                    </div>
                    <Bar pct={pct(n)} color={o.bar} />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Quick actions">
          <div className="space-y-2">
            {quickActions.map((q) => (
              <Link
                key={q.label}
                href={q.href}
                className="block px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                {q.label}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
