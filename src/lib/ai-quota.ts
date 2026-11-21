import { z } from "zod";

/** Built-in AI calls allowed per São Paulo day, by plan. Own-key calls never count. */
export const DAILY_AI_LIMITS = { free: 20, basico: 200, avancado: 800, ilimitado: Infinity } as const;
export type AIPlan = keyof typeof DAILY_AI_LIMITS;
export const PLAN_NAMES: Record<AIPlan, string> = { free: "Gratuito", basico: "Básico", avancado: "Avançado", ilimitado: "Sem limite" };

export function dailyLimit(plan: string | null | undefined) {
  return DAILY_AI_LIMITS[(plan ?? "free") as AIPlan] ?? DAILY_AI_LIMITS.free;
}
export function quotaExceeded(plan: string | null | undefined, used: number) {
  return used >= dailyLimit(plan);
}

export const BYOK_PROVIDERS = [
  { id: "openai", name: "OpenAI (ChatGPT)", defaultModel: "gpt-5-mini", placeholder: "sk-...", where: "platform.openai.com → API keys", full: true },
  { id: "gemini", name: "Google Gemini", defaultModel: "gemini-2.5-flash", placeholder: "AIza...", where: "aistudio.google.com → Get API key", full: false },
  { id: "anthropic", name: "Anthropic (Claude)", defaultModel: "claude-haiku-4-5", placeholder: "sk-ant-...", where: "console.anthropic.com → API Keys", full: false },
  { id: "openrouter", name: "OpenRouter (vários modelos)", defaultModel: "google/gemini-2.5-flash", placeholder: "sk-or-v1-...", where: "openrouter.ai → Keys", full: true },
] as const;
export type BYOKProvider = (typeof BYOK_PROVIDERS)[number]["id"];

export const SaveKeySchema = z.object({
  provider: z.enum(["openai", "gemini", "anthropic", "openrouter"]),
  model: z.string().trim().min(2).max(100).regex(/^[A-Za-z0-9._:/-]+$/, "Nome de modelo inválido"),
  apiKey: z.string().trim().min(10).max(400).regex(/^\S+$/, "Chave inválida"),
});

/** Normalizes board/subject/topic so the shared question bank matches across students. */
export function bankKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 200);
}
