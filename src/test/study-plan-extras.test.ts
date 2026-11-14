import { describe, expect, it } from "vitest";
import { buildWeek, extraMinutesPerWeek, studyBalance, weekAdherence, weekToIcs } from "@/lib/study-plan";

const skills = [
  { id: "a", name: "Português", topics: ["Crase"] },
  { id: "b", name: "Constitucional", topics: ["Remédios"] },
];
const base = { weekStart: "2026-11-09", today: "2026-11-09", weekly: [100, 100, 0, 0, 0, 0, 0], blockMinutes: 50, skills, activities: [], examDate: null, ctx: { points: new Map([["a", 5], ["b", 40]]) } };

describe("plan extras", () => {
  it("skipping a subject for one day removes it only that day", () => {
    const w = buildWeek({ ...base, dayAdjust: { "2026-11-09": { skip: ["b"] } } });
    expect(w[0]!.blocks.map((b) => b.skillId)).toEqual(["a"]);
    expect(w[1]!.blocks.map((b) => b.skillId)).toContain("b");
  });
  it("a busy day reduces capacity only that day, never above the default", () => {
    const w = buildWeek({ ...base, dayAdjust: { "2026-11-09": { minutes: 50 }, "2026-11-10": { minutes: 500 } } });
    expect(w[0]!.capacity).toBe(50);
    expect(w[0]!.blocks).toHaveLength(1);
    expect(w[1]!.capacity).toBe(100);
  });
  it("adherence compares studied with planned for elapsed days", () => {
    const w = buildWeek({ ...base, today: "2026-11-10", activities: [{ date: "2026-11-09", syllabus_topic: "Crase", skill_ids: ["a"], minutes: 50 }] });
    const r = weekAdherence(w);
    expect(r.planned).toBe(200);
    expect(r.studied).toBe(50);
    expect(r.activeDays).toBe(1);
  });
  it("extra weekly minutes close the gap until the exam", () => {
    expect(extraMinutesPerWeek(1000, 1200, 70)).toBe(0);
    expect(extraMinutesPerWeek(2000, 1000, 70)).toBe(100);
  });
  it("balance compares exam points share with studied minutes share", () => {
    const b = studyBalance(skills, [{ date: "2026-11-08", syllabus_topic: null, skill_ids: ["a"], minutes: 60 }], new Map([["a", 25], ["b", 75]]), "2026-11-09");
    expect(b.find((x) => x.skillId === "b")).toMatchObject({ plannedShare: 0.75, actualShare: 0 });
    expect(b.find((x) => x.skillId === "a")!.actualShare).toBe(1);
  });
  it("calendar export contains one event per upcoming block", () => {
    const ics = weekToIcs(buildWeek(base), "CGU");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
  });
});
