import { describe, expect, it } from "vitest";
import { computeExamWeights } from "@/lib/exam-rules";

const basic = { id: "b1", total_questions: 40, weight: 1 };
const rule = (skill_id: string, extra: Partial<{ block_id: string | null; questions: number | null; weight: number | null; difficulty: number }> = {}) =>
  ({ skill_id, block_id: null, questions: null, weight: null, difficulty: 3, ...extra });

describe("computeExamWeights", () => {
  it("splits a 40-question block evenly among 4 subjects without detail (CGU style)", () => {
    const ids = ["a", "b", "c", "d"];
    const out = computeExamWeights(ids, [basic], ids.map((id) => rule(id, { block_id: "b1" })));
    expect(out.map((o) => o.questions)).toEqual([10, 10, 10, 10]);
    expect(out.every((o) => o.estimated && o.points === 10)).toBe(true);
  });

  it("keeps explicit questions and splits only the remainder", () => {
    const out = computeExamWeights(["a", "b", "c"], [basic], [rule("a", { block_id: "b1", questions: 20 }), rule("b", { block_id: "b1" }), rule("c", { block_id: "b1" })]);
    expect(out.map((o) => o.questions)).toEqual([20, 10, 10]);
  });

  it("applies block weight to points", () => {
    const out = computeExamWeights(["a", "b"], [{ id: "b2", total_questions: 40, weight: 1.5 }], [rule("a", { block_id: "b2" }), rule("b", { block_id: "b2" })]);
    expect(out[0]?.points).toBe(30);
  });

  it("uses a subject's own questions and weight outside blocks", () => {
    const out = computeExamWeights(["a", "z"], [], [rule("a", { questions: 12, weight: 2 })]);
    expect(out[0]?.points).toBe(24);
    expect(out[1]!).toMatchObject({ questions: 0, weight: 1, points: 0, difficulty: 3 });
  });
});
