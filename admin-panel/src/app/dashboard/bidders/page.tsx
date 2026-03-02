"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { bidderService, type Bidder } from "@/services/bidderService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import { Edit, Trash2, Plus, UserX } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUIStore } from "@/store/uiStore";

export default function BiddersPage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const { data: bidders = [], isLoading, refetch } = useQuery({
    queryKey: ["bidders"],
    queryFn: bidderService.getAll,
  });

  const handleDelete = async (id: string) => {
    try {
      await bidderService.delete(id);
      showToast("Bidder deleted successfully", "success");
      refetch();
    } catch (error) {
      showToast("Failed to delete bidder", "error");
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await bidderService.deactivate(id);
      showToast("Bidder deactivated successfully", "success");
      refetch();
    } catch (error) {
      showToast("Failed to deactivate bidder", "error");
    }
  };

  const columns = [
    { key: "full_name", label: "Full Name" },
    { key: "email", label: "Email" },
    {
      key: "profile_names",
      label: "Profiles",
      render: (value: string[]) =>
        value && value.length > 0 ? value.join(", ") : "Not Assigned",
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
          {value ? "Active" : "Inactive"}
        </span>
      ),
    },
    { key: "created_at", label: "Created", render: (value: string) => formatDate(value) },
    {
      key: "id",
      label: "Actions",
      render: (_: any, row: Bidder) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/bidders/${row.id}/edit`)}
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
          <h1 className="text-3xl font-bold text-gray-900">Bidders</h1>
          <p className="text-gray-600 mt-2">Manage bidder accounts</p>
        </div>
        <Button onClick={() => router.push("/dashboard/bidders/new")}>
          <Plus className="w-5 h-5" />
          Create Bidder
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DataTable
          data={bidders}
          columns={columns}
          searchable
          searchPlaceholder="Search bidders..."
          loading={isLoading}
        />
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Bidder"
        message="Are you sure you want to delete this bidder? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={deactivateId !== null}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId && handleDeactivate(deactivateId)}
        title="Deactivate Bidder"
        message="Are you sure you want to deactivate this bidder?"
        confirmText="Deactivate"
        variant="warning"
      />
    </>
  );
}
