"use client";

import { AI_MODELS, COMING_SOON_MODELS, resolveAiModel } from "@/utils/aiModels";
import { cn } from "@/utils/cn";

interface AiModelSelectProps {
  value?: string | null;
  onChange: (model: string) => void;
}

// Radio cards for choosing the model of a profile ("Best speed & cost" / "Balanced" / "Legacy" tags),
// followed by disabled "Coming soon" cards for models that are not available yet.
export default function AiModelSelect({ value, onChange }: AiModelSelectProps) {
  const selected = resolveAiModel(value);
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
                  m.tagTone === "speed_cost" ? "bg-green-100 text-green-700" : m.tagTone === "balanced" ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-700"
                )}
              >
                {m.tag}
              </span>
            </span>
            <span className="text-xs text-gray-500 pl-6">{m.description}</span>
          </label>
        );
      })}
      {COMING_SOON_MODELS.map((m) => (
        <div
          key={m.id}
          aria-disabled="true"
          title="Coming soon"
          className="flex flex-col gap-1 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 opacity-60 cursor-not-allowed"
        >
          <span className="flex items-center gap-2">
            <input type="radio" name="ai_model" value={m.id} disabled className="h-4 w-4 border-gray-300" />
            <span className="text-sm font-semibold text-gray-700">{m.label}</span>
            <span className="text-[11px] text-gray-500">{m.provider}</span>
            <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              Coming soon
            </span>
          </span>
          <span className="text-xs text-gray-500 pl-6">{m.description}</span>
        </div>
      ))}
    </div>
  );
}
