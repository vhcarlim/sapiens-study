import { z } from "zod";

export const AI_MODELS = [
  { id: "openai/gpt-5.4-mini", name: "GPT-5.4 Mini", tier: "Econômico" },
  { id: "openai/gpt-5.4", name: "GPT-5.4", tier: "Avançado" },
  { id: "openai/gpt-6-astra", name: "GPT-6 Astra", tier: "Premium" },
] as const;
export const AI_EFFORTS = [{ id: "low", name: "Baixo" }, { id: "medium", name: "Médio" }, { id: "high", name: "Alto" }] as const;
export const ModelSchema = z.enum(["openai/gpt-5.4-mini", "openai/gpt-5.4", "openai/gpt-6-astra"]);
export const EffortSchema = z.enum(["low", "medium", "high"]);
export const PreferencesSchema = z.object({
  study_model: ModelSchema.default("openai/gpt-5.4-mini"), study_effort: EffortSchema.default("low"),
  document_model: ModelSchema.default("openai/gpt-5.4-mini"), document_effort: EffortSchema.default("low"),
  monthly_token_goal: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable().default(null),
});
export type AIPreferences = z.infer<typeof PreferencesSchema>;
export const DEFAULT_AI_PREFERENCES = PreferencesSchema.parse({});
export const DOCUMENT_FEATURES = ["syllabus", "exam_import", "summary", "activity_import"];
export const FEATURE_NAMES: Record<string, string> = {
  arena_objective: "Arena · questão", arena_open: "Arena · discursiva", arena_evaluate: "Arena · correção",
  arena_discuss: "Arena · conversa", exam_discuss: "Provas · conversa", exam_import: "Importação de prova",
  syllabus: "Importação de edital", summary: "Organização de resumo", activity_import: "Importação de atividades",
  review_question: "Arguição · pergunta", review_answer: "Arguição · avaliação",
};
export type UsageGroup = { feature: string; model: string; effort: string; calls: number; measured_calls: number; input_tokens: number | null; output_tokens: number | null; reasoning_tokens: number | null; avg_input: number | null; avg_output: number | null };
export type UsageOverview = { month_start: string; groups: UsageGroup[]; recent: { id: string; feature: string; model: string; effort: string; status: string; input_tokens: number | null; output_tokens: number | null; reasoning_tokens: number | null; created_at: string }[] };

export function resolveAIChoice(preferences: unknown, feature: string) {
  const prefs = PreferencesSchema.parse(preferences ?? {});
  const document = DOCUMENT_FEATURES.includes(feature);
  return { model: document ? prefs.document_model : prefs.study_model, effort: document ? prefs.document_effort : prefs.study_effort };
}
export function usageTotals(groups: UsageGroup[]) {
  const sum = (key: "input_tokens" | "output_tokens" | "reasoning_tokens") => {
    const measured = groups.filter(g => g[key] !== null);
    return measured.length ? measured.reduce((n, g) => n + Number(g[key]), 0) : null;
  };
  const input = sum("input_tokens"), output = sum("output_tokens");
  return { calls: groups.reduce((n, g) => n + g.calls, 0), measured: groups.reduce((n, g) => n + g.measured_calls, 0), input, output, reasoning: sum("reasoning_tokens"), total: input === null || output === null ? null : input + output };
}
// A heuristic, never a bill: reasoning is already included in output tokens.
export function estimateTokens(groups: UsageGroup[], feature: string, model: string, effort: string, contextChars = 0) {
  const group = groups.find(g => g.feature === feature && g.model === model && g.effort === effort && g.avg_input !== null && g.avg_output !== null);
  if (!group || group.avg_input === null || group.avg_output === null) return null;
  return Math.ceil(Math.max(group.avg_input, contextChars / 4) + group.avg_output);
}
export function tokenValue(value: number | null) { return value === null ? "Não informado" : Math.round(value).toLocaleString("pt-BR"); }

export function responseUsage(event: unknown) {
  const result = z.object({ response: z.object({ usage: z.object({
    input_tokens: z.number().nonnegative().nullable().optional(), output_tokens: z.number().nonnegative().nullable().optional(),
    input_tokens_details: z.object({ cached_tokens: z.number().nonnegative().nullable().optional() }).nullable().optional(),
    output_tokens_details: z.object({ reasoning_tokens: z.number().nonnegative().nullable().optional() }).nullable().optional(),
  }).nullable().optional() }).optional() }).safeParse(event);
  const usage = result.success ? result.data.response?.usage : null;
  return { input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null,
    reasoning_tokens: usage?.output_tokens_details?.reasoning_tokens ?? null, cached_input_tokens: usage?.input_tokens_details?.cached_tokens ?? null };
}