import { describe, expect, it } from "vitest";
import { distillRound } from "@/lib/learnings";
const q = { format: "multipla" as const, context: "", statement: "S", options: [{ letter: "A", text: "x" }, { letter: "B", text: "y" }], answer: "B", explanations: [{ letter: "A", why: "porque não" }], trap: "troca prazo", basis: "Art. 1" };
describe("distillRound", () => {
  it("unanswered yields nothing", () => expect(distillRound({ q, picked: null, chat: [] })).toEqual([]));
  it("correct answer yields rule and trap only", () => expect(distillRound({ q, picked: "B", chat: [] }).map((d) => d.kind)).toEqual(["rule", "trap"]));
  it("wrong answer adds mistake with its explanation", () => {
    const m = distillRound({ q, picked: "A", chat: [] }).find((d) => d.kind === "mistake");
    expect(m?.detail).toBe("porque não");
  });
  it("chat adds insight from last reply", () => {
    const c = distillRound({ q, picked: "B", chat: [{ role: "user", content: "por que?" }, { role: "assistant", content: "resp" }] }).find((d) => d.kind === "chat");
    expect(c).toEqual({ kind: "chat", title: "por que?", detail: "resp" });
  });
});
