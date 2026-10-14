import { describe, expect, it } from "vitest";
import { skillProgressWithShared } from "@/lib/gamification";
import type { Activity, Skill } from "@/lib/data";

const skill = (id: string, shared: boolean): Skill => ({ id, user_id: "u", track_id: "A", name: id, color: "green", topics: [], shared, created_at: "2026-01-01" });
const act = (id: string, track: string, skillId: string, minutes: number): Activity => ({ id, user_id: "u", track_id: track, skill_id: undefined, activity_skills: [{ skill_id: skillId }], status: "approved", minutes, quantity: 0, knowledge_summary: null, date: "2026-01-01" } as unknown as Activity);

describe("competências compartilhadas", () => {
  it("somam minutos de todas as trilhas", () => {
    const [p] = skillProgressWithShared([skill("pt", true)], [act("1", "B", "pt", 60)], [], [], { activities: [act("1", "B", "pt", 60), act("2", "A", "pt", 120)], mastery: [], results: [] });
    expect(p.minutes).toBe(180);
  });
  it("competências comuns ficam só na trilha atual", () => {
    const [p] = skillProgressWithShared([skill("rd", false)], [act("1", "B", "rd", 60)], [], [], { activities: [act("1", "B", "rd", 60), act("2", "A", "rd", 120)], mastery: [], results: [] });
    expect(p.minutes).toBe(60);
  });
});
