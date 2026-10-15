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
    description: "Costs about 10× less per token than 4.5.",
    price: { input: 0.1, output: 0.5 },
  },
];

export function aiModelLabel(id?: string | null): string {
  return AI_MODELS.find((m) => m.id === id)?.label ?? AI_MODELS[0].label;
}
