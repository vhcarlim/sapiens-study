import { describe, expect, it } from "vitest";
import { canonicalSubject, subjectKey, topicScore } from "@/lib/subjects";
import { rankBankRows } from "@/lib/bank-rank";
import { bankKeys, IngestQuestion } from "@/lib/question-ingest";

describe("canonical subjects", () => {
  it("matches aliases to the same subject", () => {
    expect(canonicalSubject("Dir. Constitucional")).toBe("direito constitucional");
    expect(canonicalSubject("Noções de Direito Constitucional")).toBe("direito constitucional");
    expect(canonicalSubject("Português")).toBe("lingua portuguesa");
    expect(subjectKey("RLM")).toBe("raciocinio logico");
  });
  it("returns null for unknown subjects", () => {
    expect(canonicalSubject("Culinária Molecular")).toBeNull();
  });
  it("scores topic overlap", () => {
    expect(topicScore("Direitos e garantias fundamentais", "direitos fundamentais")).toBe(1);
    expect(topicScore("Crase", "Licitações")).toBe(0);
  });
});

describe("bank ranking", () => {
  const keys = { board_key: "fgv", topic_key: "direitos fundamentais" };
  it("prefers same board, then other boards", () => {
    const rows = [{ id: "x", board_key: "cebraspe", topic_key: "direitos fundamentais" }, { id: "y", board_key: "fgv", topic_key: "controle de constitucionalidade" }];
    expect(rankBankRows(rows, keys, () => 0).map((r) => r.id)).toEqual(["y", "x"]);
  });
  it("falls back to another board when the track board has none", () => {
    expect(rankBankRows([{ id: "x", board_key: "fcc", topic_key: "crase" }], keys)[0]?.id).toBe("x");
  });
});

describe("ingest subject validation", () => {
  const base = { board: "FGV", topic: "Crase", format: "multipla", context: "", statement: "Assinale a alternativa correta quanto à crase.", options: [{ letter: "A", text: "um" }, { letter: "B", text: "dois" }], answer: "A", explanations: [{ letter: "A", why: "correta porque sim" }, { letter: "B", why: "errada porque não" }], fingerprint: "crase obrigatória" };
  it("rejects subjects outside the canonical list", () => {
    expect(bankKeys(IngestQuestion.parse({ ...base, subject: "Culinária" }))).toBeNull();
  });
  it("stores canonical subject keys", () => {
    expect(bankKeys(IngestQuestion.parse({ ...base, subject: "Português" }))?.subject_key).toBe("lingua portuguesa");
  });
});
