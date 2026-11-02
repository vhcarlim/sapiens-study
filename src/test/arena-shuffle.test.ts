import { describe, expect, it } from "vitest";
import { shuffleObjective } from "@/lib/arena-shuffle";
import type { ArenaObjective } from "@/lib/arena";

const L = ["A", "B", "C", "D", "E"];
const base: ArenaObjective = {
  format: "multipla", context: "", statement: "?", trap: "", basis: "", answer: "A",
  options: L.map((l) => ({ letter: l, text: `texto ${l}` })),
  explanations: L.map((l) => ({ letter: l, why: `porque ${l}` })),
};

describe("shuffleObjective", () => {
  it("keeps the correct text and its explanation tied to the answer", () => {
    for (let i = 0; i < 50; i++) {
      const q = shuffleObjective(base);
      expect(q.options.map((o) => o.letter)).toEqual(L);
      expect(q.options.find((o) => o.letter === q.answer)?.text).toBe("texto A");
      expect(q.explanations.find((e) => e.letter === q.answer)?.why).toBe("porque A");
    }
  });
  it("spreads the answer over every letter", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(shuffleObjective(base).answer);
    expect([...seen].sort()).toEqual(L);
  });
  it("leaves Certo/Errado untouched", () => {
    const ce = { ...base, format: "certo_errado" as const, answer: "C", options: [{ letter: "C", text: "Certo" }, { letter: "E", text: "Errado" }] };
    expect(shuffleObjective(ce)).toBe(ce);
  });
});
