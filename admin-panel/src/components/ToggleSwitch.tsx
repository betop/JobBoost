"use client";

import { cn } from "@/utils/cn";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          checked ? "bg-primary-600" : "bg-gray-300",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && onChange(!checked)}
      >
        <div
          className={cn(
            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
            checked && "translate-x-5"
          )}
        />
      </div>
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
    </label>
  );
}
