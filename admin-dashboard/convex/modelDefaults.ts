// Keep default chat models in a low-cost paid tier so OpenRouter usage stays predictable.
export const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash-lite:nitro";

const DEPRECATED_OPENROUTER_MODELS = new Set([
  "arcee-ai/trinity-mini:free",
]);

export const DEFAULT_OPENROUTER_FALLBACK_MODELS = [
  DEFAULT_OPENROUTER_MODEL,
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash-001",
  "openai/gpt-4.1-mini",
] as const;

export function normalizeOpenRouterModel(model: string | undefined | null): string {
  const trimmed = model?.trim();
  if (!trimmed) return DEFAULT_OPENROUTER_MODEL;
  if (DEPRECATED_OPENROUTER_MODELS.has(trimmed)) return DEFAULT_OPENROUTER_MODEL;
  return trimmed;
}
