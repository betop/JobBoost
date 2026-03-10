"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ruleService, type Rule } from "@/services/ruleService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import ToggleSwitch from "@/components/ToggleSwitch";
import PasswordConfirmModal from "@/components/PasswordConfirmModal";
import { Plus, Edit, Trash2, Lock, Unlock } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useForm } from "react-hook-form";
import ConfirmDialog from "@/components/ConfirmDialog";

const targetSectionOptions = [
  { value: "summary", label: "Summary" },
  { value: "work_experience", label: "Work Experience" },
  { value: "education", label: "Education" },
  { value: "skills", label: "Skills" },
  { value: "global", label: "Global" },
];

export default function RulesPage() {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'update' | 'delete'; data?: any; id?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lockedRules, setLockedRules] = useState<Set<string>>(new Set());
  const [isModalContentLocked, setIsModalContentLocked] = useState(true);

  useEffect(() => {
    if (!isPasswordVerified) {
      setShowPasswordConfirm(true);
    }
  }, [isPasswordVerified]);

  const { data: rules = [], isLoading, refetch } = useQuery({
    queryKey: ["rules"],
    queryFn: ruleService.getAll,
    enabled: isPasswordVerified,
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      sentence: "",
      target_section: "global",
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  const createMutation = useMutation({
    mutationFn: ruleService.create,
    onSuccess: () => {
      showToast("Rule created successfully", "success");
      setIsModalOpen(false);
      reset();
      refetch();
    },
    onError: () => {
      showToast("Failed to create rule", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ruleService.update(id, data),
    onSuccess: () => {
      showToast("Rule updated successfully", "success");
      setIsModalOpen(false);
      setEditingRule(null);
      reset();
      refetch();
    },
    onError: () => {
      showToast("Failed to update rule", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ruleService.delete,
    onSuccess: () => {
      showToast("Rule deleted successfully", "success");
      refetch();
    },
    onError: () => {
      showToast("Failed to delete rule", "error");
    },
  });

  const onSubmit = (data: any) => {
    if (editingRule) {
      setPendingAction({ type: 'update', id: editingRule.id, data });
    } else {
      setPendingAction({ type: 'create', data });
    }
    setShowActionConfirm(true);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    
    if (pendingAction.type === 'create') {
      createMutation.mutate(pendingAction.data);
    } else if (pendingAction.type === 'update') {
      updateMutation.mutate({ id: pendingAction.id!, data: pendingAction.data });
    } else if (pendingAction.type === 'delete') {
      await deleteMutation.mutateAsync(pendingAction.id!);
    }
    
    setPendingAction(null);
    setShowActionConfirm(false);
  };

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setValue("sentence", rule.sentence);
    setValue("target_section", rule.target_section);
    setValue("is_active", rule.is_active);
    setIsModalContentLocked(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setPendingAction({ type: 'delete', id });
    setShowActionConfirm(true);
  };

  const columns = [
    {
      key: "sentence",
      label: "Rule Sentence",
      render: (value: string, row: Rule) => {
        const isLocked = !lockedRules.has(row.id);
        return (
          <div className="flex items-center gap-2 max-w-md">
            <button
              onClick={() => {
                const newLocked = new Set(lockedRules);
                if (isLocked) {
                  newLocked.add(row.id);
                } else {
                  newLocked.delete(row.id);
                }
                setLockedRules(newLocked);
              }}
              className="p-1 text-gray-600 hover:text-gray-900 flex-shrink-0"
              title={isLocked ? "Unlock to view" : "Lock to hide"}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
            <div className="truncate" title={isLocked ? "Locked" : value}>
              {isLocked ? (
                <span className="text-gray-400 italic">Locked</span>
              ) : (
                value
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "target_section",
      label: "Target Section",
      render: (value: string) => (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {value}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
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
      render: (_: any, row: Rule) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
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
      <PasswordConfirmModal
        isOpen={showPasswordConfirm}
        onClose={() => {
          setShowPasswordConfirm(false);
        }}
        onConfirm={() => {
          setIsPasswordVerified(true);
          setShowPasswordConfirm(false);
        }}
        title="Access Rules"
        description="Please confirm your password to access the Rules page"
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
            ? "Please confirm your password to delete this rule"
            : "Please confirm your password to save this rule"
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
              <h1 className="text-3xl font-bold text-gray-900">Rules</h1>
              <p className="text-gray-600 mt-2">Manage resume improvement rules</p>
            </div>
            <Button onClick={() => { setIsModalOpen(true); setEditingRule(null); setIsModalContentLocked(false); reset(); }}>
              <Plus className="w-5 h-5" />
              Create Rule
            </Button>
          </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DataTable
          data={rules}
          columns={columns}
          searchable
          searchPlaceholder="Search rules..."
          loading={isLoading}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRule(null); reset(); }}
        title={editingRule ? "Edit Rule" : "Create New Rule"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {editingRule && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setIsModalContentLocked(!isModalContentLocked)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {isModalContentLocked ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Unlock to edit</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Lock content</span>
                  </>
                )}
              </button>
            </div>
          )}
          
          {editingRule && isModalContentLocked ? (
            <div className="p-8 text-center">
              <Lock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 font-medium">Content is locked</p>
              <p className="text-sm text-gray-400 mt-1">Click the unlock button above to view and edit</p>
            </div>
          ) : (
            <>
              <Textarea
                label="Rule Sentence"
                rows={4}
                helperText="Max 20000 characters"
                {...register("sentence", { required: true, maxLength: 20000 })}
                required
              />
              <Select
                label="Target Section"
                options={targetSectionOptions}
                {...register("target_section")}
                required
              />
              <ToggleSwitch
                label="Active"
                checked={isActive}
                onChange={(checked) => setValue("is_active", checked)}
              />
            </>
          )}
          <div className="flex gap-4 pt-4">
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending} className="flex-1">
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setEditingRule(null); reset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Rule"
        message="Are you sure you want to delete this rule? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
        </>
      )}
    </>
  );
}
