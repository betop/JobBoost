"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { userService, type User, type UserType } from "@/services/userService";
import { useAuthStore } from "@/store/authStore";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUIStore } from "@/store/uiStore";
import { Edit, Trash2, UserX, Plus, Shield, User as UserIcon, CheckCircle } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

// Tabs only shown to super_admin
const SUPER_ADMIN_TABS: { label: string; value: UserType | "all" }[] = [
  { label: "All Users", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Bidders", value: "bidder" },
];

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-purple-100 text-purple-800" },
  super_admin: { label: "Super Admin", className: "bg-indigo-100 text-indigo-800" },
  bidder: { label: "Bidder", className: "bg-blue-100 text-blue-800" },
};

export default function UsersPage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const admin = useAuthStore((state) => state.admin);
  const isSuperAdmin = admin?.type === "super_admin";

  const [activeTab, setActiveTab] = useState<UserType | "all">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);

  // Admins always see only bidders; super_admins use the tab filter
  const queryType = isSuperAdmin ? (activeTab === "all" ? undefined : activeTab) : "bidder";

  const { data: rawUsers = [], isLoading, refetch } = useQuery({
    queryKey: ["users", isSuperAdmin ? activeTab : "bidder"],
    queryFn: () => userService.getAll(queryType),
  });

  // Never show super_admin in the users list
  const users = rawUsers.filter((u) => u.type !== "super_admin");

  const handleDelete = async (id: string) => {
    try {
      await userService.delete(id);
      showToast("User deleted successfully", "success");
      refetch();
    } catch {
      showToast("Failed to delete user", "error");
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await userService.deactivate(id);
      showToast("User deactivated successfully", "success");
      refetch();
    } catch {
      showToast("Failed to deactivate user", "error");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await userService.approve(id);
      showToast("Admin approved successfully", "success");
      refetch();
    } catch {
      showToast("Failed to approve admin", "error");
    }
  };

  const columns = [
    {
      key: "full_name",
      label: "Full Name",
      render: (value: string, row: User) => (
        <div className="flex items-center gap-2">
          {row.type === "admin" || row.type === "super_admin" ? (
            <Shield className="w-4 h-4 text-purple-500 flex-shrink-0" />
          ) : (
            <UserIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
          )}
          <span>{value}</span>
        </div>
      ),
    },
    { key: "email", label: "Email" },
    // Role column only shown to super_admins (admins always see bidders only)
    ...(isSuperAdmin ? [{
      key: "type",
      label: "Role",
      render: (value: string) => {
        const badge = TYPE_BADGE[value] ?? { label: value, className: "bg-gray-100 text-gray-800" };
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        );
      },
    }] : []),
    {
      key: "profile_names",
      label: "Profiles",
      render: (value: string[]) =>
        value && value.length > 0 ? value.join(", ") : <span className="text-gray-400 text-xs">None</span>,
    },
    {
      key: "is_active",
      label: "Status",
      render: (value: boolean, row: User) => {
        if (row.type === "admin" && !row.is_approved) {
          return (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Pending Approval
            </span>
          );
        }
        return (
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {value ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    { key: "created_at", label: "Created", render: (value: string) => formatDate(value) },
    {
      key: "id",
      label: "Actions",
      render: (_: unknown, row: User) => (
        <div className="flex items-center gap-2">
          {isSuperAdmin && row.type === "admin" && !row.is_approved && (
            <button
              onClick={() => setApproveId(row.id)}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
              title="Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => router.push(`/dashboard/users/${row.id}/edit`)}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeactivateId(row.id)}
            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
            title="Deactivate"
          >
            <UserX className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-2">
            {isSuperAdmin ? "Manage admins and bidders" : "Manage bidders"}
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/users/new")}>
          <Plus className="w-5 h-5" />
          Create User
        </Button>
      </div>

      {/* Tabs — only visible to super_admin */}
      {isSuperAdmin && (
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {SUPER_ADMIN_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.value
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DataTable
          data={users}
          columns={columns}
          searchable
          searchPlaceholder="Search users..."
          loading={isLoading}
        />
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="No, Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={deactivateId !== null}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId && handleDeactivate(deactivateId)}
        title="Deactivate User"
        message="Are you sure you want to deactivate this user?"
        confirmText="Yes, Deactivate"
        cancelText="No, Cancel"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={approveId !== null}
        onClose={() => setApproveId(null)}
        onConfirm={() => approveId && handleApprove(approveId)}
        title="Approve Admin"
        message="Are you sure you want to approve this admin? They will be able to log in and access the dashboard."
        confirmText="Yes, Approve"
        cancelText="No, Cancel"
        variant="info"
      />
    </>
  );
}
