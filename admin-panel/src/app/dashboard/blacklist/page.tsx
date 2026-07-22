"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blacklistService, type BlacklistEntry } from "@/services/blacklistService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import { Trash2, Ban } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useUIStore } from "@/store/uiStore";

export default function BlacklistPage() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);
  const [bulkText, setBulkText] = useState("");

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["blacklist"],
    queryFn: blacklistService.getAll,
  });

  const addMutation = useMutation({
    mutationFn: blacklistService.addMany,
    onSuccess: (result) => {
      const parts: string[] = [];
      if (result.added.length) parts.push(`${result.added.length} added`);
      if (result.skipped.length) parts.push(`${result.skipped.length} already on the list`);
      showToast(parts.join(", ") || "Nothing to add", result.added.length ? "success" : "error");
      setBulkText("");
      refetch();
    },
    onError: () => showToast("Failed to add companies to the blacklist", "error"),
  });

  const removeMutation = useMutation({
    mutationFn: blacklistService.remove,
    onSuccess: () => {
      showToast("Company removed from the blacklist", "success");
      refetch();
    },
    onError: () => showToast("Failed to remove company", "error"),
  });

  const handleAdd = () => {
    const names = bulkText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) {
      showToast("Enter at least one company name", "error");
      return;
    }
    addMutation.mutate(names);
  };

  const columns = [
    { key: "name", label: "Company" },
    { key: "created_at", label: "Added", sortable: true, render: (value: string) => formatDate(value) },
    {
      key: "id",
      label: "Actions",
      render: (_: any, row: BlacklistEntry) => (
        <button
          onClick={() => removeMutation.mutate(row.id)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
          title="Remove from blacklist"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Ban className="w-7 h-7 text-red-600" />
          Company Blacklist
        </h1>
        <p className="text-gray-600 mt-2">
          Jobs at these companies are automatically skipped — no resume or cover letter is generated for them.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Add companies</h2>
        <p className="text-sm text-gray-500 mb-4">One company name per line. Matching is case-insensitive.</p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={6}
          placeholder={"Acme Corp\nExample Inc\n..."}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
        <div className="mt-4">
          <Button onClick={handleAdd} loading={addMutation.isPending}>
            Add to Blacklist
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DataTable
          data={entries}
          columns={columns}
          searchable
          searchPlaceholder="Search blacklisted companies..."
          loading={isLoading}
        />
      </div>
    </>
  );
}
