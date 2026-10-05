"use client";

import { useQuery } from "@tanstack/react-query";
import { creditsService } from "@/services/creditsService";
import Select from "@/components/Select";

interface BillingAdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Current billing admin (id/name) so it still shows even if inactive/not listed */
  current?: { id?: string | null; name?: string | null };
}

/** super_admin-only selector for a profile's billing admin. */
export default function BillingAdminSelect({ value, onChange, error, current }: BillingAdminSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-admin-options"],
    queryFn: creditsService.listAdmins,
    staleTime: 60_000,
  });

  const options = (data?.items ?? [])
    .filter((a) => a.is_active)
    .map((a) => ({ value: a.id, label: a.full_name ? `${a.full_name} (${a.email})` : a.email }));

  if (current?.id && !options.some((o) => o.value === current.id)) {
    options.push({ value: current.id, label: current.name || current.id });
  }

  return (
    <Select
      label="Billing admin"
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      error={error}
      disabled={isLoading}
    />
  );
}
