import { describe, expect, it } from "vitest";
import { buildWeek, capacityMinutes, phaseFor, phaseTimeline, weekStartOf } from "@/lib/study-plan";

const skills = [
  { id: "a", name: "Português", topics: ["Crase", "Concordância"] },
  { id: "b", name: "Constitucional", topics: ["Remédios", "Direitos sociais"] },
];
const base = { weekStart: "2026-11-09", today: "2026-11-09", weekly: [100, 0, 0, 0, 0, 0, 0], blockMinutes: 50, skills, activities: [], examDate: null };

describe("study plan", () => {
  it("phases by days left", () => {
    expect(phaseFor(120)).toBe("base");
    expect(phaseFor(40)).toBe("deep");
    expect(phaseFor(10)).toBe("final");
    expect(phaseTimeline(20).map((s) => s.phase)).toEqual(["deep", "final"]);
  });
  it("weeks start on Monday", () => {
    expect(weekStartOf("2026-11-12")).toBe("2026-11-09");
    expect(weekStartOf("2026-11-15")).toBe("2026-11-09");
  });
  it("counts capacity by weekday", () => {
    expect(capacityMinutes([60, 0, 0, 0, 0, 120, 0], "2026-11-09", "2026-11-16")).toBe(180);
  });
  it("gives more blocks to the subject worth more points", () => {
    const w = buildWeek({ ...base, ctx: { points: new Map([["a", 5], ["b", 40]]) } });
    expect(w[0].blocks[0].skillId).toBe("b");
    expect(w[0].blocks.map((b) => b.skillId)).toEqual(["b", "a"]);
  });
  it("skipped subjects never appear and pinned open the day", () => {
    const w = buildWeek({ ...base, ctx: { points: new Map([["a", 5], ["b", 40]]) }, pinned: ["a"] });
    expect(w[0].blocks[0].skillId).toBe("a");
    const s = buildWeek({ ...base, ctx: {}, skipped: ["b"] });
    expect(s[0].blocks.every((b) => b.skillId === "a")).toBe(true);
  });
  it("marks a block done when the subject was studied that day", () => {
    const w = buildWeek({ ...base, ctx: { points: new Map([["b", 40]]) }, activities: [{ date: "2026-11-09", syllabus_topic: "Remédios", skill_ids: ["b"], minutes: 30 }] });
    expect(w[0].blocks.some((b) => b.skillId === "b" && b.done)).toBe(true);
  });
});
