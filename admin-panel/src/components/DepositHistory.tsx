"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { creditsService, type CryptoDeposit, type DepositStatus } from "@/services/creditsService";
import LoadingSpinner from "@/components/LoadingSpinner";
import { cn } from "@/utils/cn";

/**
 * Crypto deposit history. super_admin: every user's deposits, filterable by user and status.
 * admin: the server only ever returns their own deposits (any admin filter is ignored).
 */

const PER_PAGE = 20;

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  expired: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

const STATUS_OPTIONS: { value: "" | DepositStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
];

const usd = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

function fmtWhen(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const d = new Date(typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v);
  return Number.isNaN(d.getTime()) ? "—" : format(d, "MMM d, yyyy h:mm a");
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset", STATUS_STYLES[s] ?? STATUS_STYLES.expired)}>
      {s || "unknown"}
    </span>
  );
}

export default function DepositHistory({
  isSuperAdmin,
  admins,
}: {
  isSuperAdmin: boolean;
  /** super_admin only: users to filter by */
  admins?: { id: string; full_name: string; email?: string }[];
}) {
  const [adminId, setAdminId] = useState("");
  const [status, setStatus] = useState<"" | DepositStatus>("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["credits-deposits", isSuperAdmin ? adminId : "me", status, page],
    queryFn: () =>
      creditsService.getDeposits({
        admin_id: isSuperAdmin && adminId ? adminId : undefined,
        status: status || undefined,
        page,
        per_page: PER_PAGE,
      }),
    placeholderData: keepPreviousData,
  });

  const items: CryptoDeposit[] = data?.items ?? [];
  const total = data?.total ?? items.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const showUser = isSuperAdmin && !adminId;

  const selectClass = "px-3 py-2 border border-gray-300 rounded-md text-sm bg-white";

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-end justify-between gap-4 p-6 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Deposit history</h2>
          <p className="text-sm text-gray-600 mt-1">
            {isSuperAdmin ? "Crypto deposits from all users." : "Your crypto deposits."}
            {data?.total_confirmed_usd != null && (
              <>
                {" "}Confirmed total{isSuperAdmin && adminId ? " for this user" : ""}:{" "}
                <span className="font-semibold text-gray-900">{usd(data.total_confirmed_usd)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
            <div>
              <label className="text-sm font-medium block mb-1">User</label>
              <select
                value={adminId}
                onChange={(e) => { setAdminId(e.target.value); setPage(1); }}
                className={cn(selectClass, "max-w-[16rem]")}
              >
                <option value="">All users</option>
                {(admins ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}{a.email ? ` (${a.email})` : ""}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as "" | DepositStatus); setPage(1); }}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-6 py-3">Date</th>
              {showUser && <th className="px-6 py-3">User</th>}
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3">Paid with</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Confirmed</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-gray-100", isFetching && !isLoading && "opacity-60")}>
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center"><LoadingSpinner size="sm" /></td></tr>
            ) : isError ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-red-600">Couldn&apos;t load deposits. Please try again.</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No deposits yet.</td></tr>
            ) : (
              items.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 whitespace-nowrap text-gray-700">{fmtWhen(d.created_at)}</td>
                  {showUser && (
                    <td className="px-6 py-3">
                      <button
                        type="button"
                        onClick={() => { setAdminId(d.admin_id); setPage(1); }}
                        className="text-left hover:underline"
                        title="Show only this user's deposits"
                      >
                        <span className="block font-medium text-gray-900">{d.admin_name || "—"}</span>
                        {d.admin_email && <span className="block text-xs text-gray-500">{d.admin_email}</span>}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-3 text-right font-medium tabular-nums text-gray-900">{usd(d.amount_usd)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-gray-700">
                    {d.currency ? d.currency.toUpperCase() : "—"}
                    {d.amount_crypto != null && Number(d.amount_crypto) > 0 && (
                      <span className="ml-1 text-xs text-gray-500 tabular-nums">{Number(d.amount_crypto)}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      {d.status === "pending" && d.payment_url && !isSuperAdmin && (
                        <a href={d.payment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800">
                          Pay <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-gray-700">{d.status === "confirmed" ? fmtWhen(d.confirmed_at) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > PER_PAGE && (
        <div className="flex items-center justify-between gap-4 border-t border-gray-200 px-6 py-3 text-sm text-gray-600">
          <span>
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 tabular-nums">{page} / {pageCount}</span>
            <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
