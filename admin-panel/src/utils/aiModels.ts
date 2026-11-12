// Claude models a profile can generate with. Haiku 5.5 / Sonnet 5.5 run at effort "max" for resume
// generation; Haiku 4.5 is a legacy option that does not support effort.
// Keep ids in sync with the backend allow-list (functions/ai/resolve_model.xs) and prices with
// functions/ai/claude_haiku_rates.xs. Profiles still storing a retired id resolve to DEFAULT_AI_MODEL.
export type AiModelId = "claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-haiku-4-5";

export interface AiModelOption {
  id: AiModelId;
  label: string;
  tag: string;
  tagTone: "speed_cost" | "balanced" | "legacy";
  description: string;
  // USD per 1M tokens (Haiku 5.5: prompts up to 100K tokens; larger prompts cost more)
  price: { input: number; output: number };
}

export const DEFAULT_AI_MODEL: AiModelId = "claude-haiku-5-5";

export const AI_MODELS: AiModelOption[] = [
  {
    id: "claude-haiku-5-5",
    label: "Claude Haiku 5.5",
    tag: "Best speed & cost",
    tagTone: "speed_cost",
    description: "Default model for tailored resumes and cover letters.",
    price: { input: 0.1, output: 0.5 },
  },
  {
    id: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    tag: "Balanced",
    tagTone: "balanced",
    description: "Higher-quality tailored resumes and cover letters.",
    price: { input: 2, output: 10 },
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    tag: "Legacy",
    tagTone: "legacy",
    description: "Previous default, kept for profiles that still need it.",
    price: { input: 1, output: 5 },
  },
];

// Every model that can appear on a generation log, including retired ones (log filters and labels).
export const LOGGED_MODELS: { id: string; label: string }[] = AI_MODELS.map((m) => ({ id: m.id, label: m.label }));

// Logs with no ai_model were generated before the column existed, on Haiku 4.5.
export function aiModelLabel(id?: string | null): string {
  return LOGGED_MODELS.find((m) => m.id === (id || "claude-haiku-4-5"))?.label ?? id ?? "";
}

export function aiModelBadgeClass(id?: string | null): string {
  if (id === "claude-sonnet-5-5") return "bg-purple-100 text-purple-700";
  if (id === "claude-haiku-5-5") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

// Same rule as the backend's ai/resolve_model: unknown or retired ids use the default model.
export function resolveAiModel(id?: string | null): AiModelId {
  return AI_MODELS.find((m) => m.id === id)?.id ?? DEFAULT_AI_MODEL;
}

// Shown in the model picker as disabled "Coming soon" cards. NOT selectable and NOT accepted by the
// backend (ai/resolve_model); ids are placeholders until the OpenAI integration ships.
export interface ComingSoonModel {
  id: string;
  label: string;
  provider: string;
  price: { input: number; output: number };
}

export const COMING_SOON_MODELS: ComingSoonModel[] = [
  { id: "gpt-6-1-terra", label: "GPT-6.1 Terra", provider: "OpenAI", price: { input: 1, output: 5 } },
  { id: "gpt-6-luna", label: "GPT-6 Luna", provider: "OpenAI", price: { input: 0.1, output: 0.5 } },
  { id: "gpt-6-sol", label: "GPT-6 Sol", provider: "OpenAI", price: { input: 2, output: 10 } },
  { id: "gpt-5-6-luna", label: "GPT-5.6 Luna", provider: "OpenAI", price: { input: 0.2, output: 1.2 } },
  { id: "gpt-5-6-terra", label: "GPT-5.6 Terra", provider: "OpenAI", price: { input: 2, output: 12 } },
];
