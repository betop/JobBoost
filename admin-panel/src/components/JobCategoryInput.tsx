"use client";

import { useQuery } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";

const DEFAULT_CATEGORIES = [
  "AI Engineering",
  "Backend Engineering",
  "Data Engineering",
  "DevOps Engineering",
  "Embedded Engineering",
  "Frontend Engineering",
  "Full Stack Engineering",
  "ML Engineering",
  "Mobile Engineering",
  "QA Engineering",
  "Security Engineering",
  "Software Engineering",
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

export default function JobCategoryInput({ value, onChange, error }: Props) {
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: profileService.getAll,
    staleTime: 60_000,
  });

  const existing = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...profiles.map((p) => p.job_category).filter((c): c is string => Boolean(c)),
    ])
  ).sort();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Job Category
      </label>
      <input
        list="job-category-list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. AI Engineering"
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      <datalist id="job-category-list">
        {existing.map((cat) => (
          <option key={cat} value={cat} />
        ))}
      </datalist>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
