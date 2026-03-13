"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { tokenService, type Token } from "@/services/tokenService";
import { bidderService } from "@/services/bidderService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import Input from "@/components/Input";
import PasswordConfirmModal from "@/components/PasswordConfirmModal";
import { Plus, Copy, XCircle, Trash2, CalendarClock, Eye, EyeOff } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useForm } from "react-hook-form";

export default function TokensPage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'generate' | 'revoke' | 'delete' | 'extend'; id?: string; data?: any } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [extendToken, setExtendToken] = useState<Token | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [hiddenTokens, setHiddenTokens] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isPasswordVerified) {
      setShowPasswordConfirm(true);
    }
  }, [isPasswordVerified]);

  const { data: tokens = [], isLoading, refetch } = useQuery({
    queryKey: ["tokens"],
    queryFn: tokenService.getAll,
    enabled: isPasswordVerified,
  });

  const { data: bidders = [] } = useQuery({
    queryKey: ["bidders"],
    queryFn: bidderService.getAll,
  });

  const { register, handleSubmit, reset } = useForm();

  const generateMutation = useMutation({
    mutationFn: tokenService.generate,
    onSuccess: (data) => {
      showToast("Token generated successfully", "success");
      setGeneratedToken(data.token);
      refetch();
      reset();
    },
    onError: () => {
      showToast("Failed to generate token", "error");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: tokenService.revoke,
    onSuccess: () => {
      showToast("Token revoked successfully", "success");
      refetch();
    },
    onError: () => {
      showToast("Failed to revoke token", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tokenService.delete,
    onSuccess: () => {
      showToast("Token deleted successfully", "success");
      refetch();
    },
    onError: () => {
      showToast("Failed to delete token", "error");
    },
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, expiration_date }: { id: string; expiration_date?: string }) =>
      tokenService.extend(id, expiration_date),
    onSuccess: () => {
      showToast("Token extended successfully", "success");
      setExtendToken(null);
      setExtendDate("");
      refetch();
    },
    onError: () => {
      showToast("Failed to extend token", "error");
    },
  });

  const onSubmit = (data: any) => {
    const payload: any = { bidder_id: data.bidder_id };
    if (data.expiration_date) payload.expiration_date = data.expiration_date;
    setPendingAction({ type: 'generate', data: payload });
    setShowActionConfirm(true);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    
    if (pendingAction.type === 'generate') {
      generateMutation.mutate(pendingAction.data);
    } else if (pendingAction.type === 'revoke') {
      revokeMutation.mutate(pendingAction.id!);
    } else if (pendingAction.type === 'delete') {
      deleteMutation.mutate(pendingAction.id!);
    } else if (pendingAction.type === 'extend') {
      extendMutation.mutate({ id: pendingAction.id!, expiration_date: pendingAction.data });
    }
    
    setPendingAction(null);
    setShowActionConfirm(false);
  };

  const copyToClipboard = (token: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(token);
    } else {
      // Fallback for non-secure contexts (HTTP)
      const ta = document.createElement("textarea");
      ta.value = token;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showToast("Token copied to clipboard", "success");
  };

  const columns = [
    {
      key: "token",
      label: "Key",
      render: (value: string, row: Token) => {
        const isHidden = !hiddenTokens.has(row.id);
        return (
          <div className="flex items-center gap-2">
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              {isHidden ? '••••••••••••••••••••' : value.substring(0, 20) + '...'}
            </code>
            <button
              onClick={() => {
                const newHidden = new Set(hiddenTokens);
                if (isHidden) {
                  newHidden.add(row.id);
                } else {
                  newHidden.delete(row.id);
                }
                setHiddenTokens(newHidden);
              }}
              className="p-1 text-gray-600 hover:text-gray-900"
              title={isHidden ? "Show key" : "Hide key"}
            >
              {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(value)}
              className="p-1 text-gray-600 hover:text-gray-900"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
    { key: "bidder_name", label: "Bidder" },
    { key: "issued_date", label: "Issued", render: (value: string) => formatDate(value) },
    {
      key: "expiration_date",
      label: "Expires",
      render: (value: string) => {
        if (!value) return <span className="text-gray-400">Never</span>;
        const isExpired = new Date(value) < new Date();
        return (
          <span className={isExpired ? "text-red-600 font-semibold" : ""}>
            {formatDate(value)}{isExpired ? " (expired)" : ""}
          </span>
        );
      },
    },
    {
      key: "is_active",
      label: "Status",
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value ? "Active" : "Revoked"}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_: any, row: Token) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setExtendToken(row); setExtendDate(""); }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="Extend / Clear Expiration"
          >
            <CalendarClock className="w-4 h-4" />
          </button>
          {row.is_active && (
            <button
              onClick={() => {
                setPendingAction({ type: 'revoke', id: row.id });
                setShowActionConfirm(true);
              }}
              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
              title="Revoke"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setPendingAction({ type: 'delete', id: row.id });
              setShowActionConfirm(true);
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PasswordConfirmModal
        isOpen={showPasswordConfirm}
        onClose={() => {
          setShowPasswordConfirm(false);
        }}
        onConfirm={() => {
          setIsPasswordVerified(true);
          setShowPasswordConfirm(false);
        }}
        title="Access Keys"
        description="Please confirm your password to access the Keys page"
      />

      <PasswordConfirmModal
        isOpen={showActionConfirm}
        onClose={() => {
          setShowActionConfirm(false);
          setPendingAction(null);
        }}
        onConfirm={executePendingAction}
        title="Confirm Action"
        description={
          pendingAction?.type === 'delete'
            ? "Please confirm your password to delete this key"
            : pendingAction?.type === 'revoke'
            ? "Please confirm your password to revoke this key"
            : pendingAction?.type === 'extend'
            ? "Please confirm your password to extend this key"
            : "Please confirm your password to generate a new key"
        }
      />
      
      {!isPasswordVerified ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying password...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Access Keys</h1>
              <p className="text-gray-600 mt-2">Manage bidder access keys</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-5 h-5" />
          Generate Key
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DataTable
          data={tokens}
          columns={columns}
          searchable
          searchPlaceholder="Search keys..."
          loading={isLoading}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setGeneratedToken(null); }} title="Generate Access Key">
        {generatedToken ? (
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">Key generated successfully! Copy it now as it won&apos;t be shown again.</p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <code className="text-sm break-all">{generatedToken}</code>
            </div>
            <Button onClick={() => copyToClipboard(generatedToken)} className="w-full">
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <Select
              label="Select Bidder"
              options={bidders.map((b) => ({ value: b.id, label: b.full_name }))}
              {...register("bidder_id")}
              required
            />
            <Input label="Expiration Date (Optional)" type="date" {...register("expiration_date")} />
            <Button type="submit" loading={generateMutation.isPending} className="w-full">
              Generate Token
            </Button>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={extendToken !== null}
        onClose={() => { setExtendToken(null); setExtendDate(""); }}
        title="Extend Token Expiration"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Set a new expiration date for this token, or clear it to make it never expire.
            The token will also be re-activated if it was expired.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Expiration Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Leave empty to remove expiration (never expires)</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setPendingAction({ type: 'extend', id: extendToken!.id, data: extendDate || undefined });
                setShowActionConfirm(true);
              }}
              loading={extendMutation.isPending}
              className="flex-1"
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => { setExtendToken(null); setExtendDate(""); }} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
        </>
      )}
    </>
  );
}
