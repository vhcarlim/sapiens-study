import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createTrackedAiFetch } from "@/lib/ai/tracked-fetch.server";
const { insert, update } = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({
  insert: (row: unknown) => { insert(row); return { select: () => ({ single: async () => ({ data: { id: "usage-1" }, error: null }) }) }; },
  update: (row: unknown) => { update(row); return { eq: () => ({ eq: async () => ({ error: null }) }) }; },
}) } }));
const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { study_model: "openai/gpt-6-astra", study_effort: "high" }, error: null }) }) }) }) } as unknown as SupabaseClient<Database>;
describe("tracked AI request", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("resolves the authenticated account choice, preserves streaming and records only metadata", async () => {
    const upstream = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("openai/gpt-6-astra");
      expect(body.reasoning.effort).toBe("high");
      return new Response('data: {"type":"response.completed","response":{"usage":{"input_tokens":100,"output_tokens":40,"output_tokens_details":{"reasoning_tokens":10}}}}\n\n', { headers: { "X-Lovable-AIG-Run-ID": "upstream-run" } });
    });
    const tracked = await createTrackedAiFetch({ userId: "account-1", supabase: client }, "arena_discuss", upstream as typeof fetch);
    const result = await tracked("https://ai.gateway.lovable.dev/v1/responses", { body: JSON.stringify({ input: "private question", model: "forged", reasoning: { effort: "low" } }) });
    expect(update).not.toHaveBeenCalled();
    await result.text();
    expect(insert).toHaveBeenCalledWith({ user_id: "account-1", feature: "arena_discuss", model: "openai/gpt-6-astra", effort: "high" });
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0]?.[0]).toMatchObject({ input_tokens: 100, output_tokens: 40, reasoning_tokens: 10, cached_input_tokens: null, status: "completed", run_id: "upstream-run" });
    expect(JSON.stringify(insert.mock.calls)).not.toContain("private question");
  });
  it("records failed calls with unknown consumption, not invented zeros", async () => {
    const upstream = vi.fn(async () => new Response('{"message":"blocked"}', { status: 403 }));
    const tracked = await createTrackedAiFetch({ userId: "account-1", supabase: client }, "summary", upstream as typeof fetch);
    const result = await tracked("https://ai.gateway.lovable.dev/v1/responses", { body: "{}" });
    expect(result.status).toBe(403);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ status: "failed", input_tokens: null, output_tokens: null });
    expect(upstream).toHaveBeenCalledOnce();
  });
});