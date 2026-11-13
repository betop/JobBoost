// Claude models a profile can generate with. Keep ids in sync with the backend allow-list
// (functions/ai/resolve_model.xs) and prices with functions/ai/claude_haiku_rates.xs.
// Claude Haiku 3.5 is priced on the backend but intentionally NOT offered: Anthropic retired it (2026-02-19).
export type AiModelId = "claude-haiku-4-5" | "claude-haiku-5-5";

export interface AiModelOption {
  id: AiModelId;
  label: string;
  tag: string;
  tagTone: "recommended" | "cheaper";
  description: string;
  // USD per 1M tokens (Haiku 5.5: prompts up to 100K tokens; larger prompts cost more)
  price: { input: number; output: number };
}

export const DEFAULT_AI_MODEL: AiModelId = "claude-haiku-4-5";

export const AI_MODELS: AiModelOption[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    tag: "Recommended",
    tagTone: "recommended",
    description: "Best quality for tailored resumes and cover letters.",
    price: { input: 1, output: 5 },
  },
  {
    id: "claude-haiku-5-5",
    label: "Claude Haiku 5.5",
    tag: "Lower price",
    tagTone: "cheaper",
    description: "Newer Haiku model for tailored resumes and cover letters.",
    price: { input: 0.1, output: 0.5 },
  },
  // Future: Claude Sonnet 5.5 (re-enable together with the backend allow-list in ai/resolve_model,
  // credits/get_usage_rate and dashboard/credits/settings; its calls need an effort setting, see resume/generate).
  // {
  //   id: "claude-sonnet-5-5",
  //   label: "Claude Sonnet 5.5",
  //   tag: "Balanced",
  //   tagTone: "cheaper",
  //   description: "Higher-quality tailored resumes and cover letters.",
  //   price: { input: 2, output: 10 },
  // },
];

// Future: OpenAI models to offer once an OpenAI integration exists (ids are placeholders, not real API names).
// Shown as disabled "Coming soon" cards when enabled; see the commented block in components/AiModelSelect.tsx.
// export const COMING_SOON_MODELS = [
//   { id: "gpt-6-1-terra", label: "GPT-6.1 Terra", provider: "OpenAI" },
//   { id: "gpt-6-luna", label: "GPT-6 Luna", provider: "OpenAI" },
//   { id: "gpt-6-sol", label: "GPT-6 Sol", provider: "OpenAI" },
//   { id: "gpt-5-6-luna", label: "GPT-5.6 Luna", provider: "OpenAI" },
//   { id: "gpt-5-6-terra", label: "GPT-5.6 Terra", provider: "OpenAI" },
// ];

export function aiModelLabel(id?: string | null): string {
  return AI_MODELS.find((m) => m.id === id)?.label ?? AI_MODELS[0].label;
}
