"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { tokenService, type Token, type TokenRequest } from "@/services/tokenService";
import { userService } from "@/services/userService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import PasswordConfirmModal from "@/components/PasswordConfirmModal";
import {
  Plus,
  Copy,
  XCircle,
  Trash2,
  CalendarClock,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  X,
  Send,
  MessageSquare,
} from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useForm } from "react-hook-form";

// ── Custom UserSelect dropdown with styled role tags ────────────────
interface UserOption {
  value: string;
  label: string;
  type: string;
  disabled?: boolean;
  disabledReason?: string;
}

const ROLE_TAG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  admin:       { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", label: "Admin" },
  super_admin: { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200",  label: "Super Admin" },
};

function RoleTag({ type }: { type: string }) {
  const tag = ROLE_TAG[type];
  if (!tag) return null;
  return (
    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${tag.bg} ${tag.text} border ${tag.border}`}>
      {tag.label}
    </span>
  );
}

const UserSelect = forwardRef<HTMLInputElement, {
  label?: string;
  options: UserOption[];
  required?: boolean;
  name?: string;
  onChange?: (e: any) => void;
  onBlur?: (e: any) => void;
}>(({ label, options, required, name, onChange, onBlur }, ref) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input type="hidden" ref={ref} name={name} value={selected?.value ?? ""} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
      >
        {selected ? (
          <span className="flex items-center justify-between w-full">
            <span className="text-gray-900">{selected.label}</span>
            <RoleTag type={selected.type} />
          </span>
        ) : (
          <span className="text-gray-400">Select a user</span>
        )}
        <svg className={`w-4 h-4 text-gray-400 ml-2 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-50 mt-1 left-0 right-0 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => {
                if (opt.disabled) return;
                setSelected(opt);
                setOpen(false);
                if (onChange) {
                  const syntheticEvent = { target: { name, value: opt.value } };
                  onChange(syntheticEvent);
                }
              }}
              title={opt.disabled ? opt.disabledReason : undefined}
              className={`flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                opt.disabled
                  ? "text-gray-400 cursor-not-allowed bg-gray-50"
                  : selected?.value === opt.value
                    ? "bg-primary-50 text-primary-700 cursor-pointer"
                    : "text-gray-900 cursor-pointer hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{opt.label}</span>
                {opt.disabled && (
                  <span className="text-[10px] text-gray-400 italic">{opt.disabledReason}</span>
                )}
              </span>
              <RoleTag type={opt.type} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

UserSelect.displayName = "UserSelect";

export default function TokensPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);
  const admin = useAuthStore((state) => state.admin);
  const isSuperAdmin = admin?.type === "super_admin";

  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "generate" | "revoke" | "delete" | "extend" | "approve" | "decline";
    id?: string;
    data?: any;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [extendToken, setExtendToken] = useState<Token | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [hiddenTokens, setHiddenTokens] = useState<Set<string>>(new Set());
  const [reviewModalRequest, setReviewModalRequest] = useState<TokenRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [requestTab, setRequestTab] = useState<"pending" | "all">("pending");
  const [activeTab, setActiveTab] = useState<"keys" | "requests">("keys");

  useEffect(() => {
    if (!isPasswordVerified) {
      if (isSuperAdmin) {
        setShowPasswordConfirm(true);
      } else {
        // Admins skip password verification
        setIsPasswordVerified(true);
      }
    }
  }, [isPasswordVerified, isSuperAdmin]);

  // ── Data Queries ──────────────────────────────────────────────────
  const {
    data: tokens = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["tokens"],
    queryFn: tokenService.getAll,
    enabled: isPasswordVerified,
  });

  // Super admin: all users; Admin: all bidders + self
  const { data: allEligibleUsers = [] } = useQuery({
    queryKey: ["users", "token-eligible", isSuperAdmin ? "all" : "bidder"],
    queryFn: async () => {
      if (isSuperAdmin) {
        return await userService.getAll();
      }
      const bidders = await userService.getAll("bidder");
      // Add self (admin) if not already in the list
      if (admin && !bidders.find((b) => b.id === admin.id)) {
        bidders.unshift({ id: admin.id, full_name: admin.name, email: admin.email, type: "admin" as const } as any);
      }
      return bidders;
    },
  });

  // Track which users already have an active key
  const usersWithActiveKey = useMemo(() => {
    const set = new Set<string>();
    tokens.forEach((t) => {
      if (t.is_active) set.add(t.user_id);
    });
    return set;
  }, [tokens]);

  // Build select options with type info, disabled state for users with active keys
  const userSelectOptions = useMemo(() => {
    return allEligibleUsers.map((u) => {
      const hasKey = usersWithActiveKey.has(u.id);
      return {
        value: u.id,
        label: u.full_name,
        type: u.type,
        disabled: hasKey,
        disabledReason: hasKey ? "already has a key" : undefined,
      };
    });
  }, [allEligibleUsers, usersWithActiveKey]);

  const { data: requests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["token-requests"],
    queryFn: () => tokenService.getRequests(),
    enabled: isPasswordVerified || !isSuperAdmin,
  });

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests]
  );

  // ── Forms ─────────────────────────────────────────────────────────
  const { register, handleSubmit, reset } = useForm();
  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    reset: resetRequest,
  } = useForm();

  // ── Mutations (super_admin) ───────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: tokenService.generate,
    onSuccess: (data) => {
      showToast("Token generated successfully", "success");
      setGeneratedToken(data.token);
      refetch();
      reset();
    },
    onError: () => showToast("Failed to generate token", "error"),
  });

  const revokeMutation = useMutation({
    mutationFn: tokenService.revoke,
    onSuccess: () => {
      showToast("Token revoked successfully", "success");
      refetch();
    },
    onError: () => showToast("Failed to revoke token", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: tokenService.delete,
    onSuccess: () => {
      showToast("Token deleted successfully", "success");
      refetch();
    },
    onError: () => showToast("Failed to delete token", "error"),
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
    onError: () => showToast("Failed to extend token", "error"),
  });

  // ── Mutations (admin request) ─────────────────────────────────────
  const createRequestMutation = useMutation({
    mutationFn: tokenService.createRequest,
    onSuccess: () => {
      showToast("Key request submitted successfully", "success");
      setIsModalOpen(false);
      resetRequest();
      refetchRequests();
    },
    onError: () => showToast("Failed to submit key request", "error"),
  });

  // ── Mutations (super_admin review) ────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ id, review_notes }: { id: string; review_notes?: string }) =>
      tokenService.approveRequest(id, review_notes),
    onSuccess: () => {
      showToast("Request approved — key generated", "success");
      setReviewModalRequest(null);
      setReviewNotes("");
      refetch();
      refetchRequests();
    },
    onError: () => showToast("Failed to approve request", "error"),
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, review_notes }: { id: string; review_notes?: string }) =>
      tokenService.declineRequest(id, review_notes),
    onSuccess: () => {
      showToast("Request declined", "success");
      setReviewModalRequest(null);
      setReviewNotes("");
      refetchRequests();
    },
    onError: () => showToast("Failed to decline request", "error"),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  const onSubmitGenerate = (data: any) => {
    const payload: any = { user_id: data.user_id };
    if (data.expiration_date) payload.expiration_date = data.expiration_date;
    if (isSuperAdmin) {
      setPendingAction({ type: "generate", data: payload });
      setShowActionConfirm(true);
    } else {
      generateMutation.mutate(payload);
    }
  };

  const onSubmitRequest = (data: any) => {
    if (!data.user_id) {
      showToast("Please select a user", "error");
      return;
    }
    const payload: any = {
      user_id: data.user_id,
    };
    if (data.expiration_date) payload.expiration_date = data.expiration_date;
    if (data.notes) payload.notes = data.notes;
    createRequestMutation.mutate(payload);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    switch (pendingAction.type) {
      case "generate":
        generateMutation.mutate(pendingAction.data);
        break;
      case "revoke":
        revokeMutation.mutate(pendingAction.id!);
        break;
      case "delete":
        deleteMutation.mutate(pendingAction.id!);
        break;
      case "extend":
        extendMutation.mutate({ id: pendingAction.id!, expiration_date: pendingAction.data });
        break;
      case "approve":
        approveMutation.mutate({ id: pendingAction.id!, review_notes: pendingAction.data });
        break;
      case "decline":
        declineMutation.mutate({ id: pendingAction.id!, review_notes: pendingAction.data });
        break;
    }
    setPendingAction(null);
    setShowActionConfirm(false);
  };

  const copyToClipboard = (token: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(token);
    } else {
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

  // ── Token table columns ───────────────────────────────────────────
  const tokenColumns = [
    {
      key: "token",
      label: "Key",
      render: (value: string, row: Token) => {
        const isHidden = !hiddenTokens.has(row.id);
        return (
          <div className="flex items-center gap-2">
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              {isHidden ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : value.substring(0, 20) + "..."}
            </code>
            <button
              onClick={() => {
                const newHidden = new Set(hiddenTokens);
                if (isHidden) newHidden.add(row.id);
                else newHidden.delete(row.id);
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
    { key: "user_name", label: "User", sortable: true },
    { key: "issued_date", label: "Issued", sortable: true, render: (value: string) => formatDate(value) },
    {
      key: "expiration_date",
      label: "Expires",
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-gray-400">Never</span>;
        const isExpired = new Date(value) < new Date();
        return (
          <span className={isExpired ? "text-red-600 font-semibold" : ""}>
            {formatDate(value)}
            {isExpired ? " (expired)" : ""}
          </span>
        );
      },
    },
    {
      key: "is_active",
      label: "Status",
      filterOptions: [
        { value: "true", label: "Active" },
        { value: "false", label: "Revoked" },
      ],
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
    ...(isSuperAdmin
      ? [
          {
            key: "id",
            label: "Actions",
            render: (_: any, row: Token) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setExtendToken(row);
                    setExtendDate("");
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                  title="Extend / Clear Expiration"
                >
                  <CalendarClock className="w-4 h-4" />
                </button>
                {row.is_active && (
                  <button
                    onClick={() => {
                      setPendingAction({ type: "revoke", id: row.id });
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
                    setPendingAction({ type: "delete", id: row.id });
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
        ]
      : []),
  ];

  // ── Request table columns ─────────────────────────────────────────
  const requestColumns = [
    ...(isSuperAdmin ? [{ key: "requester_name", label: "Requested By", sortable: true }] : []),
    { key: "user_name", label: "User", sortable: true },
    {
      key: "expiration_date",
      label: "Expiration",
      sortable: true,
      render: (value: string) =>
        value ? formatDate(value) : <span className="text-gray-400">Never</span>,
    },
    {
      key: "status",
      label: "Status",
      filterOptions: [
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "declined", label: "Declined" },
      ],
      render: (value: string) => {
        const styles: Record<string, string> = {
          pending: "bg-yellow-100 text-yellow-800",
          approved: "bg-green-100 text-green-800",
          declined: "bg-red-100 text-red-800",
        };
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[value] || ""}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      },
    },
    {
      key: "admin_notes",
      label: "Notes",
      render: (value: string) =>
        value ? (
          <span className="text-sm text-gray-600 truncate max-w-[200px] block">{value}</span>
        ) : (
          <span className="text-gray-400">&mdash;</span>
        ),
    },
    { key: "created_at", label: "Submitted", sortable: true, render: (value: string) => formatDate(value) },
    ...(isSuperAdmin
      ? [
          {
            key: "id",
            label: "Actions",
            render: (_: any, row: TokenRequest) =>
              row.status === "pending" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setReviewModalRequest(row);
                      setReviewNotes("");
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100"
                  >
                    Review
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-500">
                  {row.reviewer_name && `by ${row.reviewer_name}`}
                </span>
              ),
          },
        ]
      : [
          {
            key: "review_notes",
            label: "Review Notes",
            render: (value: string, row: TokenRequest) =>
              row.status !== "pending" && value ? (
                <span className="text-sm text-gray-600">{value}</span>
              ) : (
                <span className="text-gray-400">&mdash;</span>
              ),
          },
        ]),
  ];

  // ── Confirmation modal description ────────────────────────────────
  const getConfirmDescription = () => {
    if (!pendingAction) return "";
    switch (pendingAction.type) {
      case "delete":
        return "Please confirm your password to delete this key";
      case "revoke":
        return "Please confirm your password to revoke this key";
      case "extend":
        return "Please confirm your password to extend this key";
      case "approve":
        return "Please confirm your password to approve this request";
      case "decline":
        return "Please confirm your password to decline this request";
      default:
        return "Please confirm your password to generate a new key";
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {isSuperAdmin && (
        <PasswordConfirmModal
          isOpen={showPasswordConfirm}
          onClose={() => setShowPasswordConfirm(false)}
          onCancel={() => router.push("/dashboard")}
          onConfirm={() => {
            setIsPasswordVerified(true);
            setShowPasswordConfirm(false);
          }}
          title="Access Keys"
          description="Please confirm your password to access the Keys page"
        />
      )}

      {isSuperAdmin && (
        <PasswordConfirmModal
          isOpen={showActionConfirm}
          onClose={() => {
            setShowActionConfirm(false);
            setPendingAction(null);
          }}
          onConfirm={executePendingAction}
          title="Confirm Action"
          description={getConfirmDescription()}
        />
      )}

      {!isPasswordVerified ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying password...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Page header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Access Keys</h1>
              <p className="text-gray-600 mt-2">
                {isSuperAdmin ? "Manage user access keys" : "Request and view access keys"}
              </p>
            </div>
            <Button onClick={() => { setIsModalOpen(true); setGeneratedToken(null); }}>
              <Plus className="w-5 h-5" />
              {isSuperAdmin ? "Generate Key" : "Request Key"}
            </Button>
          </div>

          {/* Pending requests banner for super_admin */}
          {isSuperAdmin && pendingRequests.length > 0 && activeTab === "keys" && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => setActiveTab("requests")}>
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm font-medium text-yellow-800">
                {pendingRequests.length} pending key request{pendingRequests.length > 1 ? "s" : ""} awaiting review
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 pt-4">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab("keys")}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "keys"
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {isSuperAdmin ? "All Keys" : "My Keys"}
                </button>
                <button
                  onClick={() => setActiveTab("requests")}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === "requests"
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {isSuperAdmin ? "Key Requests" : "My Requests"}
                  {pendingRequests.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === "keys" && (
                <DataTable
                  data={tokens}
                  columns={tokenColumns}
                  searchable
                  searchPlaceholder="Search keys..."
                  loading={isLoading}
                />
              )}

              {activeTab === "requests" && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setRequestTab("pending")}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        requestTab === "pending"
                          ? "bg-primary-100 text-primary-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      Pending{pendingRequests.length > 0 && ` (${pendingRequests.length})`}
                    </button>
                    <button
                      onClick={() => setRequestTab("all")}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        requestTab === "all"
                          ? "bg-primary-100 text-primary-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      All
                    </button>
                  </div>
                  <DataTable
                    data={requestTab === "pending" ? pendingRequests : requests}
                    columns={requestColumns}
                    searchable
                    searchPlaceholder="Search requests..."
                  />
                </>
              )}
            </div>
          </div>

          {/* Generate / Request modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setGeneratedToken(null); }}
            title={isSuperAdmin ? "Generate Access Key" : "Request Access Key"}
          >
            {isSuperAdmin ? (
              generatedToken ? (
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Key generated successfully! Copy it now as it won&apos;t be shown again.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                    <code className="text-sm break-all">{generatedToken}</code>
                  </div>
                  <Button onClick={() => copyToClipboard(generatedToken)} className="w-full">
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmitGenerate)} className="p-6 space-y-4">
                  <UserSelect
                    label="Select User"
                    options={userSelectOptions}
                    required
                    {...register("user_id")}
                  />
                  <Input label="Expiration Date (Optional)" type="date" {...register("expiration_date")} />
                  <Button type="submit" loading={generateMutation.isPending} className="w-full">
                    Generate Token
                  </Button>
                </form>
              )
            ) : (
              <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="p-6 space-y-4">
                <UserSelect
                  label="Select User"
                  options={userSelectOptions}
                  required
                  {...registerRequest("user_id")}
                />
                <Input label="Expiration Date (Optional)" type="date" {...registerRequest("expiration_date")} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    {...registerRequest("notes")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    rows={3}
                    placeholder="Reason for this key request..."
                  />
                </div>
                <Button type="submit" loading={createRequestMutation.isPending} className="w-full">
                  <Send className="w-4 h-4" />
                  Submit Request
                </Button>
              </form>
            )}
          </Modal>

          {/* Extend modal (super_admin) */}
          {isSuperAdmin && (
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
                      setPendingAction({ type: "extend", id: extendToken!.id, data: extendDate || undefined });
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
          )}

          {/* Review request modal (super_admin) */}
          {isSuperAdmin && (
            <Modal
              isOpen={reviewModalRequest !== null}
              onClose={() => { setReviewModalRequest(null); setReviewNotes(""); }}
              title="Review Key Request"
              size="md"
            >
              {reviewModalRequest && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Requested By</span>
                      <p className="font-medium">{reviewModalRequest.requester_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">User</span>
                      <p className="font-medium">{reviewModalRequest.user_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Expiration</span>
                      <p className="font-medium">
                        {reviewModalRequest.expiration_date
                          ? formatDate(reviewModalRequest.expiration_date)
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Submitted</span>
                      <p className="font-medium">{formatDate(reviewModalRequest.created_at)}</p>
                    </div>
                  </div>

                  {reviewModalRequest.admin_notes && (
                    <div>
                      <span className="text-sm text-gray-500">Admin Notes</span>
                      <p className="text-sm mt-1 bg-gray-50 p-3 rounded-lg">{reviewModalRequest.admin_notes}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MessageSquare className="w-4 h-4 inline mr-1" />
                      Review Notes (Optional)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      rows={2}
                      placeholder="Add a note to the admin..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => {
                        setPendingAction({ type: "approve", id: reviewModalRequest.id, data: reviewNotes || undefined });
                        setShowActionConfirm(true);
                      }}
                      loading={approveMutation.isPending}
                      className="flex-1 !bg-green-600 hover:!bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        setPendingAction({ type: "decline", id: reviewModalRequest.id, data: reviewNotes || undefined });
                        setShowActionConfirm(true);
                      }}
                      loading={declineMutation.isPending}
                      variant="ghost"
                      className="flex-1 !text-red-600 hover:!bg-red-50"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              )}
            </Modal>
          )}
        </>
      )}
    </>
  );
}
