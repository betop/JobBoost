"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export default function MultiSelect({ label, placeholder = "Select…", options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selectedOptions = options.filter((o) => selected.includes(o.value));
  const filtered = options.filter(
    (o) => !selected.includes(o.value) && o.label.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function remove(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="text-sm font-medium block mb-1">{label}</label>}

      <div
        className="min-h-[38px] w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm flex flex-wrap gap-1.5 items-center cursor-pointer bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => setOpen(true)}
      >
        {selectedOptions.length === 0 && (
          <span className="text-gray-400 select-none">{placeholder}</span>
        )}
        {selectedOptions.map((o) => (
          <span
            key={o.value}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {o.label}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(o.value);
              }}
              className="hover:text-blue-600"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <ChevronDown className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
      </div>

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
                key={o.value}
                className="px-3 py-2 text-sm cursor-pointer text-gray-700 hover:bg-blue-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(o.value);
                  setSearch("");
                }}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
