"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

// code → display label
export const CATEGORY_OPTIONS: { code: string; label: string }[] = [
  { code: "ai",                      label: "AI Engineering" },
  { code: "ai_product",              label: "AI Product Engineering" },
  { code: "ai_research",             label: "AI Research Engineering" },
  { code: "ai_security",             label: "AI Safety Engineering" },
  { code: "ai_software_engineering", label: "AI Software Engineering" },
  { code: "backend",                 label: "Backend Engineering" },
  { code: "computer_vision",         label: "Computer Vision Engineering" },
  { code: "data_analytics",          label: "Data Analytics" },
  { code: "data_engineering",        label: "Data Engineering" },
  { code: "data_research",           label: "Data Research / Research Science" },
  { code: "data_science",            label: "Data Science" },
  { code: "devops",                  label: "DevOps Engineering" },
  { code: "edge_ai",                 label: "Edge AI Engineering" },
  { code: "frontend",                label: "Frontend Engineering" },
  { code: "full_stack",              label: "Full Stack Engineering" },
  { code: "full_stack_ai",           label: "Full Stack AI Engineering" },
  { code: "generative_ai",           label: "Generative AI Engineering" },
  { code: "knowledge_systems",       label: "Knowledge Engineering" },
  { code: "machine_learning",        label: "ML / Machine Learning Engineering" },
  { code: "mlops",                   label: "MLOps Engineering" },
  { code: "recommendation_systems",  label: "Recommendation Systems Engineering" },
  { code: "software_engineering",    label: "Software Engineering" },
  { code: "speech_ai",               label: "Speech & Audio Engineering" },
  { code: "backend_ai",              label: "Backend AI Engineering" },
  { code: "frontend_ai",             label: "Frontend AI Engineering" },
];

export function labelForCode(code: string): string {
  // Match by code first, then fall back to matching by label (legacy stored labels)
  return (
    CATEGORY_OPTIONS.find((o) => o.code === code)?.label ??
    CATEGORY_OPTIONS.find((o) => o.label.toLowerCase() === code.toLowerCase())?.label ??
    code
  );
}

export function codeForLabel(label: string): string {
  return CATEGORY_OPTIONS.find((o) => o.label.toLowerCase() === label.toLowerCase())?.code ?? label;
}

interface Props {
  value: string;       // comma-separated codes, e.g. "machine_learning,ai"
  onChange: (val: string) => void;
  error?: string;
}

export default function JobCategoryInput({ value, onChange, error }: Props) {
  // Normalize: if stored value is a legacy full-text label, convert to code
  const selected = value
    ? value.split(",").map((c) => codeForLabel(c.trim())).filter(Boolean)
    : [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = CATEGORY_OPTIONS.filter(
    (o) =>
      !selected.includes(o.code) &&
      o.label.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(code: string) {
    const next = selected.includes(code)
      ? selected.filter((c) => c !== code)
      : [...selected, code];
    onChange(next.join(","));
  }

  function remove(code: string) {
    onChange(selected.filter((c) => c !== code).join(","));
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Job Categories
      </label>

      {/* Selected tags + trigger */}
      <div
        className={`min-h-[42px] w-full px-3 py-2 border rounded-lg text-sm flex flex-wrap gap-1.5 items-center cursor-pointer bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        onClick={() => { setOpen(true); }}
      >
        {selected.length === 0 && (
          <span className="text-gray-400 select-none">Select categories…</span>
        )}
        {selected.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium"
          >
            {labelForCode(code)}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(code); }}
              className="hover:text-blue-600"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <ChevronDown className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">No options</li>
            )}
            {filtered.map((o) => (
              <li
                key={o.code}
                className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                onMouseDown={(e) => { e.preventDefault(); toggle(o.code); setSearch(""); }}
              >
                {o.label}
              </li>
            ))}
          </ul>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <p className="text-xs text-gray-400">Selected: {selected.map(labelForCode).join(", ")}</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
