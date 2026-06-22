"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  mailTriageAllowlistService,
  type AllowlistEntry,
} from "@/services/mailTriageAllowlistService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useUIStore } from "@/store/uiStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AllowlistTab() {
  const showToast = useUIStore((state) => state.showToast);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AllowlistEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["mail-triage-allowlist"],
    queryFn: mailTriageAllowlistService.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: mailTriageAllowlistService.create,
    onSuccess: () => {
      showToast("Email added to allowlist", "success");
      setIsModalOpen(false);
      reset();
      refetch();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Failed to add email";
      showToast(msg, "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) =>
      mailTriageAllowlistService.update(id, data),
    onSuccess: () => {
      showToast("Entry updated successfully", "success");
      setIsModalOpen(false);
      setEditingEntry(null);
      reset();
      refetch();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Failed to update entry";
      showToast(msg, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: mailTriageAllowlistService.delete,
    onSuccess: () => {
      showToast("Email removed from allowlist", "success");
      refetch();
    },
    onError: () => {
      showToast("Failed to remove email", "error");
    },
  });

  const handleOpenCreate = () => {
    setEditingEntry(null);
    reset({ email: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: AllowlistEntry) => {
    setEditingEntry(entry);
    reset({ email: entry.email, notes: entry.notes ?? "" });
    setIsModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (value: string) => (
        <span className="font-mono text-sm text-gray-900">{value}</span>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      render: (value: string) =>
        value ? (
          <span className="text-sm text-gray-600">{value}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "created_at",
      label: "Added",
      sortable: true,
      render: (value: string) => formatDate(value),
    },
    {
      key: "id",
      label: "Actions",
      render: (_: unknown, row: AllowlistEntry) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={handleOpenCreate}>
          <Plus className="w-5 h-5" />
          Add Email
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DataTable
          data={entries}
          columns={columns}
          searchable
          searchPlaceholder="Search emails..."
          loading={isLoading}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntry(null);
          reset();
        }}
        title={editingEntry ? "Edit Allowlist Entry" : "Add Email to Allowlist"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Gmail Address"
            type="email"
            placeholder="user@gmail.com"
            error={errors.email?.message}
            required
            {...register("email")}
          />
          <Input
            label="Notes (optional)"
            type="text"
            placeholder="e.g. John Doe – beta tester"
            error={errors.notes?.message}
            {...register("notes")}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                setEditingEntry(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSaving}>
              {editingEntry ? "Save Changes" : "Add Email"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
        title="Remove Email"
        message="Are you sure you want to remove this email from the allowlist? The user will no longer be able to use Mail Triage."
        confirmText="Remove"
        variant="danger"
      />
    </>
  );
}
