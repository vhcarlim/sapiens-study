import { describe, expect, it } from "vitest";
import { completeness, decide, IngestQuestion, safeEqual, toPayload } from "@/lib/question-ingest";

const base = {
  board: "FGV", subject: "Direito Administrativo", topic: "Licitações", format: "multipla" as const,
  statement: "Segundo a Lei 14.133/2021, a modalidade de licitação adequada para contratação de serviços comuns é:",
  options: ["Pregão", "Concorrência", "Leilão", "Concurso", "Diálogo competitivo"].map((text, i) => ({ letter: "ABCDE"[i]!, text })),
  answer: "A", explanations: "ABCDE".split("").map((letter) => ({ letter, why: `Justificativa da alternativa ${letter}.` })),
  trap: "", basis: "", fingerprint: "Modalidade para serviços comuns na Lei 14.133",
};

describe("question ingest", () => {
  it("rejects answer outside the options", () => {
    expect(IngestQuestion.safeParse({ ...base, answer: "E", options: base.options.slice(0, 4), explanations: base.explanations.slice(0, 4) }).success).toBe(false);
  });
  it("rejects missing explanation", () => {
    expect(IngestQuestion.safeParse({ ...base, explanations: base.explanations.slice(0, 4) }).success).toBe(false);
  });
  it("accepts a valid question", () => {
    expect(IngestQuestion.safeParse(base).success).toBe(true);
  });
  it("skips a near-identical question that is less complete", () => {
    const rich = toPayload(IngestQuestion.parse({ ...base, trap: "Confundir pregão com concorrência.", basis: "Art. 6º, XLI" }));
    const poor = toPayload(IngestQuestion.parse({ ...base, statement: base.statement + " " }));
    expect(decide(poor, [{ id: "x", payload: rich }])).toEqual({ action: "skip", id: "x" });
  });
  it("replaces the stored one when the new version is more complete", () => {
    const poor = toPayload(IngestQuestion.parse(base));
    const rich = toPayload(IngestQuestion.parse({ ...base, trap: "Confundir pregão com concorrência.", basis: "Art. 6º, XLI" }));
    expect(completeness(rich)).toBeGreaterThan(completeness(poor));
    expect(decide(rich, [{ id: "y", payload: poor }])).toEqual({ action: "replace", id: "y" });
  });
  it("inserts a different question", () => {
    const other = toPayload(IngestQuestion.parse({ ...base, statement: "Sobre improbidade administrativa, o dolo específico é exigido para a configuração do ato ilícito?", options: base.options.map((o, i) => ({ ...o, text: `Opção diferente número ${i} sobre improbidade` })) }));
    expect(decide(other, [{ id: "z", payload: toPayload(IngestQuestion.parse(base)) }])).toEqual({ action: "insert" });
  });
  it("compares tokens safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
