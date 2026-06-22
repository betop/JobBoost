"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { profileService, type Profile } from "@/services/profileService";
import { userService, type User } from "@/services/userService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import { Edit, Trash2, Eye, Plus, Tags, X } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useState, useMemo } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { labelForCode } from "@/components/JobCategoryInput";

export default function ProfilesPage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const admin = useAuthStore((state) => state.admin);
  const isSuperAdmin = admin?.type === "super_admin";
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ name: string; categories: string[] } | null>(null);

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["profiles"],
    queryFn: profileService.getAll,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => userService.getAll(undefined),
  });

  // Parse PostgreSQL array strings like "{uuid1,uuid2}" into JS arrays
  const parseProfileIds = (ids: any): string[] => {
    if (!ids) return [];
    if (Array.isArray(ids)) return ids;
    if (typeof ids === "string") {
      return ids.replace(/^\{|\}$/g, "").split(",").filter(Boolean);
    }
    return [];
  };

  // Build a map: profile_id → list of admin full_names assigned to it
  const adminsByProfile = useMemo(() => {
    const map = new Map<string, string[]>();
    allUsers
      .filter((u: User) => u.type === "admin" || u.type === "super_admin")
      .forEach((u: User) => {
        parseProfileIds(u.profile_ids).forEach((pid) => {
          if (!map.has(pid)) map.set(pid, []);
          map.get(pid)!.push(u.full_name);
        });
      });
    return map;
  }, [allUsers]);

  const handleDelete = async (id: string) => {
    try {
      await profileService.delete(id);
      showToast("Profile deleted successfully", "success");
      refetch();
    } catch (error) {
      showToast("Failed to delete profile", "error");
    }
  };

  // Extract unique filter options — expand comma-separated codes into individual entries
  const jobCategoryCodes = [
    ...new Set(
      profiles
        .flatMap((p: Profile) => (p.job_category ? p.job_category.split(",").map((c) => c.trim()) : []))
        .filter(Boolean)
    ),
  ];
  const locations = [...new Set(profiles.map((p: Profile) => p.location).filter((v): v is string => !!v))];

  const columns = [
    { key: "full_name", label: "Full Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    {
      key: "job_category",
      label: "Category",
      sortable: false,
      filterOptions: jobCategoryCodes.map((c: string) => ({ value: c, label: labelForCode(c) })),
      render: (value: string, row: Profile) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const codes = value.split(",").map((c) => c.trim()).filter(Boolean);
        return (
          <button
            onClick={() => setCategoryModal({ name: row.full_name, categories: codes })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-xs font-medium transition-colors"
          >
            <Tags className="w-3 h-3" />
            {codes.length} {codes.length === 1 ? "category" : "categories"}
          </button>
        );
      },
    },
    {
      key: "location",
      label: "Location",
      sortable: true,
      filterOptions: locations.map((l: string) => ({ value: l, label: l })),
      render: (value: string) => value || "-",
    },
    ...(isSuperAdmin ? [{
      key: "id",
      label: "Admin",
      sortable: false,
      render: (_: any, row: Profile) => {
        const names = adminsByProfile.get(row.id) ?? [];
        if (names.length === 0) return <span className="text-gray-400 text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {names.map((name) => (
              <span key={name} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">
                {name}
              </span>
            ))}
          </div>
        );
      },
    }] : []),
    {
      key: "created_at",
      label: "Created Date",
      sortable: true,
      render: (value: string) => formatDate(value),
    },
    {
      key: "id",
      label: "Actions",
      render: (_: any, row: Profile) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/profiles/${row.id}`)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(`/dashboard/profiles/${row.id}/edit`)}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
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
          <h1 className="text-3xl font-bold text-gray-900">Profiles</h1>
          <p className="text-gray-600 mt-2">Manage professional profiles</p>
        </div>
        <Button onClick={() => router.push("/dashboard/profiles/new")}>
          <Plus className="w-5 h-5" />
          Create Profile
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DataTable
          data={profiles}
          columns={columns}
          searchable
          searchPlaceholder="Search profiles..."
          loading={isLoading}
        />
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Profile"
        message="Are you sure you want to delete this profile? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Category modal */}
      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base">
                {categoryModal.name} — Categories
              </h3>
              <button
                onClick={() => setCategoryModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="px-5 py-4 space-y-2">
              {categoryModal.categories.map((code) => (
                <li key={code} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  {labelForCode(code)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
