"use client";

import { AI_MODELS, DEFAULT_AI_MODEL } from "@/utils/aiModels";
import { cn } from "@/utils/cn";

interface AiModelSelectProps {
  value?: string | null;
  onChange: (model: string) => void;
}

// Radio cards for choosing the Claude model of a profile ("Recommended" / "Lower price" tags).
export default function AiModelSelect({ value, onChange }: AiModelSelectProps) {
  const selected = value || DEFAULT_AI_MODEL;
  return (
    <div role="radiogroup" aria-label="AI model" className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {AI_MODELS.map((m) => {
        const active = selected === m.id;
        return (
          <label
            key={m.id}
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-4 cursor-pointer transition-colors",
              active ? "border-primary-600 bg-primary-50 ring-1 ring-primary-600" : "border-gray-200 hover:bg-gray-50"
            )}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="ai_model"
                value={m.id}
                checked={active}
                onChange={() => onChange(m.id)}
                className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm font-semibold text-gray-900">{m.label}</span>
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  m.tagTone === "recommended" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                )}
              >
                {m.tag}
              </span>
            </span>
            <span className="text-xs text-gray-500 pl-6">{m.description}</span>
          </label>
        );
      })}
    </div>
  );
}
