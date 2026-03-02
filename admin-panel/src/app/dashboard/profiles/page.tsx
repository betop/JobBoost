"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { profileService, type Profile } from "@/services/profileService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import { Edit, Trash2, Eye, Plus } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUIStore } from "@/store/uiStore";

export default function ProfilesPage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["profiles"],
    queryFn: profileService.getAll,
  });

  const handleDelete = async (id: string) => {
    try {
      await profileService.delete(id);
      showToast("Profile deleted successfully", "success");
      refetch();
    } catch (error) {
      showToast("Failed to delete profile", "error");
    }
  };

  const columns = [
    { key: "full_name", label: "Full Name" },
    { key: "email", label: "Email" },
    { key: "job_category", label: "Category", render: (value: string) => value || "—" },
    { key: "location", label: "Location", render: (value: string) => value || "-" },
    {
      key: "created_at",
      label: "Created Date",
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
    </>
  );
}
