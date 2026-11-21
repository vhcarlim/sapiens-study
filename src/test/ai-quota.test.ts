import { describe, expect, it } from "vitest";
import { bankKey, dailyLimit, quotaExceeded } from "@/lib/ai-quota";
import { chatToResponsesStream, toChat } from "@/lib/ai/byok.server";

describe("cota diária de IA", () => {
  it("plano gratuito permite 20 usos por dia", () => {
    expect(dailyLimit("free")).toBe(20);
    expect(quotaExceeded("free", 19)).toBe(false);
    expect(quotaExceeded("free", 20)).toBe(true);
  });
  it("plano desconhecido cai no gratuito", () => expect(dailyLimit("xyz")).toBe(20));
  it("liberação individual não bloqueia uso diário elevado", () => {
    expect(dailyLimit("ilimitado")).toBe(Infinity);
    expect(quotaExceeded("ilimitado", 1000000)).toBe(false);
    expect(quotaExceeded("free", 20)).toBe(true);
  });
  it("planos pagos têm limites maiores", () => { expect(dailyLimit("basico")).toBe(200); expect(dailyLimit("avancado")).toBe(800); });
});

describe("banco de questões", () => {
  it("normaliza acentos e caixa para casar entre alunos", () => expect(bankKey("Direito Constitucional — Poder Executivo")).toBe(bankKey("direito constitucional poder executivo")));
});

describe("chave própria (Gemini/Claude)", () => {
  it("converte pedido com schema em chat com instrução de JSON", () => {
    const out = toChat({ instructions: "Sistema", input: "Oi", text: { format: { type: "json_schema", name: "x", schema: { type: "object" } } } }, { provider: "gemini", model: "gemini-2.5-flash", apiKey: "k" }) as { messages: { role: string; content: string }[]; response_format?: unknown };
    expect(out.messages[0]?.role).toBe("system");
    expect(out.messages[0]?.content).toContain("JSON");
    expect(out.messages[1]).toEqual({ role: "user", content: "Oi" });
    expect(out.response_format).toBeTruthy();
  });
  it("traduz o streaming em deltas de texto e uso final", async () => {
    const src = new Response('data: {"choices":[{"delta":{"content":"Olá"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":5,"completion_tokens":2}}\n\ndata: [DONE]\n\n').body;
    if (!src) throw new Error("Missing response body");
    const text = await new Response(chatToResponsesStream(src)).text();
    expect(text).toContain('"response.output_text.delta","delta":"Olá"');
    expect(text).toContain('"input_tokens":5');
  });
});
