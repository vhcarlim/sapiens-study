import { describe, expect, it } from "vitest";
import { DEFAULT_AI_PREFERENCES, PreferencesSchema, estimateTokens, resolveAIChoice, responseUsage, usageTotals, type UsageGroup } from "@/lib/ai-settings";

const group: UsageGroup = { feature: "arena_discuss", model: "openai/gpt-5.4-mini", effort: "low", calls: 2, measured_calls: 2, input_tokens: 1000, output_tokens: 600, reasoning_tokens: 200, avg_input: 500, avg_output: 300 };
describe("AI personalization rules", () => {
  it("keeps Mini and low reasoning as the economic defaults", () => {
    expect(resolveAIChoice(null, "arena_discuss")).toEqual({ model: "openai/gpt-5.4-mini", effort: "low" });
    expect(resolveAIChoice(null, "syllabus")).toEqual({ model: "openai/gpt-5.4-mini", effort: "low" });
  });
  it("rejects arbitrary model identifiers", () => {
    expect(PreferencesSchema.safeParse({ study_model: "attacker/model" }).success).toBe(false);
  });
  it("uses the separate document preference for all document tools", () => {
    const prefs = { ...DEFAULT_AI_PREFERENCES, document_model: "openai/gpt-6-astra", document_effort: "high" };
    for (const feature of ["syllabus", "exam_import", "summary", "activity_import"]) expect(resolveAIChoice(prefs, feature)).toEqual({ model: "openai/gpt-6-astra", effort: "high" });
    expect(resolveAIChoice(prefs, "review_answer").model).toBe("openai/gpt-5.4-mini");
  });
  it("has no arbitrary default quota and accepts an optional informational goal", () => {
    expect(DEFAULT_AI_PREFERENCES.monthly_token_goal).toBeNull();
    expect(PreferencesSchema.parse({ monthly_token_goal: 25000 }).monthly_token_goal).toBe(25000);
    expect(PreferencesSchema.safeParse({ monthly_token_goal: 0 }).success).toBe(false);
  });
  it("does not count reasoning twice, since it is part of output", () => {
    expect(usageTotals([group]).total).toBe(1600);
    expect(usageTotals([group]).reasoning).toBe(200);
  });
  it("leaves missing token usage unknown, rather than zero", () => {
    expect(usageTotals([]).total).toBeNull();
    expect(responseUsage({ response: {} }).input_tokens).toBeNull();
    expect(responseUsage({ response: { usage: { input_tokens: 12, output_tokens: 0 } } })).toEqual({ input_tokens: 12, output_tokens: 0, reasoning_tokens: null, cached_input_tokens: null });
  });
  it("estimates only from matching measured history and context size", () => {
    expect(estimateTokens([], "arena_discuss", group.model, "low", 2000)).toBeNull();
    expect(estimateTokens([group], "arena_discuss", group.model, "high", 2000)).toBeNull();
    expect(estimateTokens([group], "arena_discuss", group.model, "low", 4000)).toBe(1300);
  });
});