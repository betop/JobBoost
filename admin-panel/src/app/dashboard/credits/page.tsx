"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Wallet, Copy, Check, Plus, Minus } from "lucide-react";
import { creditsService, type DepositCurrency } from "@/services/creditsService";
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

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  deposit: { label: "Deposit", className: "bg-green-100 text-green-800" },
  usage: { label: "Usage", className: "bg-red-100 text-red-800" },
  adjustment: { label: "Adjustment", className: "bg-blue-100 text-blue-800" },
};

export default function CreditsPage() {
  const admin = useAuthStore((state) => state.admin);
  const showToast = useUIStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const isSuperAdmin = admin?.type === "super_admin";

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("25");
  const [depositCurrency, setDepositCurrency] = useState<DepositCurrency>("USDT_BEP20");
  const [depositResult, setDepositResult] = useState<Awaited<
    ReturnType<typeof creditsService.deposit>
  > | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 10) {
      showToast("Minimum deposit amount is $10", "error");
      return;
    }
    setDepositLoading(true);
    try {
      const result = await creditsService.deposit(amount, depositCurrency);
      setDepositResult(result);
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

  const copyAddress = async () => {
    if (!depositResult) return;
    await navigator.clipboard.writeText(depositResult.pay_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Monitor and manage admin credit balances. Admins are billed 1.5x the raw AI
            provider cost for resume generation and chat assistant usage.
          </p>
        </div>

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
        <p className="text-gray-600 mt-2">
          Top up your balance with USDT to keep generating resumes and using the chat
          assistant. Every AI call costs 1.5x the provider's raw price.
        </p>
      </div>

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
            Deposit USDT
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {balanceLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <LoadingSpinner size="md" />
                </td>
              </tr>
            )}
            {!balanceLoading && (balance?.recent_transactions.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No transactions yet
                </td>
              </tr>
            )}
            {balance?.recent_transactions.map((t) => {
              const badge = TYPE_BADGE[t.type] ?? { label: t.type, className: "bg-gray-100 text-gray-800" };
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(t.created_at), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${badge.className}`}>{badge.label}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.note || "—"}</td>
                  <td
                    className={`px-6 py-4 text-sm text-right font-semibold ${
                      t.amount < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {t.amount < 0 ? "-" : "+"}
                    {formatCurrency(Math.abs(t.amount))}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    {formatCurrency(t.balance_after)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={depositModalOpen} onClose={closeDepositModal} title="Deposit USDT" size="sm">
        <div className="p-6 space-y-4">
          {!depositResult ? (
            <>
              <div>
                <label className="text-sm font-medium block mb-1">Amount (USD)</label>
                <input
                  type="number"
                  min={10}
                  step="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum deposit: $10</p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Network</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDepositCurrency("USDT_BEP20")}
                    className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                      depositCurrency === "USDT_BEP20"
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    USDT (BEP20)
                  </button>
                  <button
                    onClick={() => setDepositCurrency("USDT_TRC20")}
                    className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                      depositCurrency === "USDT_TRC20"
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    USDT (TRC20)
                  </button>
                </div>
              </div>
              <Button onClick={handleDeposit} loading={depositLoading} className="w-full">
                Generate Payment Address
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Send exactly</p>
                <p className="text-lg font-bold">
                  {depositResult.amount_crypto} USDT ({depositResult.currency.replace("USDT_", "")})
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Deposit Address</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-3">
                  <code className="text-xs break-all flex-1">{depositResult.pay_address}</code>
                  <button onClick={copyAddress} className="shrink-0 text-gray-500 hover:text-gray-800">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {depositResult.payment_url && (
                <a
                  href={depositResult.payment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Open payment page →
                </a>
              )}
              <p className="text-xs text-gray-500 text-center">
                Your balance updates automatically once the network confirms the payment.
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
