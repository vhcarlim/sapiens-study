import { describe, expect, it } from "vitest";
import { afterFeedback, eligibleForPromotion } from "@/lib/question-quality";
import { chunkDocument, retrieveChunks, validatedCitation } from "@/lib/document-grounding";
const base = { source_origin: "ai_ephemeral" as const, likes_count: 2, reports_count: 0, quarantined: false };
describe("Question provenance and quality", () => {
  it("promotes an AI question at three likes with no reports", () => {
    expect(afterFeedback(base, "like").source_origin).toBe("ai_community");
    expect(eligibleForPromotion({ ...base, likes_count: 2 })).toBe(false);
  });
  it("never promotes a quarantined question", () => {
    expect(eligibleForPromotion({ ...base, likes_count: 3, quarantined: true })).toBe(false);
  });
  it("never promotes an AI question with even one report", () => {
    expect(eligibleForPromotion({ ...base, likes_count: 3, reports_count: 1 })).toBe(false);
  });
  it("quarantines immediately on the first report", () => {
    const q = afterFeedback(base, "report");
    expect(q.quarantined).toBe(true);
    expect(q.reports_count).toBe(1);
    expect(q.source_origin).toBe("ai_ephemeral");
  });
  it("keeps official and AI community origins separate", () => {
    expect(afterFeedback({ ...base, source_origin: "official" }, "like").source_origin).toBe("official");
    expect(afterFeedback({ ...base, source_origin: "ai_community" }, "like").source_origin).toBe("ai_community");
    expect(afterFeedback({ ...base, source_origin: "official" }, "report").source_origin).toBe("official");
  });
});
describe("Document retrieval without AI expense", () => {
  it("accepts only literal citations from the selected document", () => {
    const chunks = [{ ref: "Lei · Art. 5", text: "A licitação deve observar os princípios da legalidade e da impessoalidade." }];
    expect(validatedCitation(chunks, 0, "os princípios da legalidade e da impessoalidade.")).toContain("Lei · Art. 5");
    expect(validatedCitation(chunks, 0, "A licitação pode ignorar os princípios da legalidade.")).toBeNull();
    expect(validatedCitation(chunks, 1, chunks[0]?.text ?? "")).toBeNull();
  });
  it("retrieves only relevant bounded passages with article references", () => {
    const chunks = chunkDocument("Art. 1º A licitação observa princípios administrativos.\nArt. 2º O servidor possui direito a férias.");
    const found = retrieveChunks(chunks, "licitação");
    expect(found).toHaveLength(1);
    expect(found[0]?.ref).toContain("Art. 1");
    expect(found[0]?.text).toContain("licitação");
    expect(retrieveChunks(chunks, "criptografia")).toHaveLength(0);
  });
});