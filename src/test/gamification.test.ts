import { describe, expect, it } from "vitest";
import { activityXp, dailyXp, masteryLevel, missionStates, skillProgress, studyStreak } from "@/lib/gamification";
import type { Activity, Skill } from "@/lib/data";
import type { Tables } from "@/integrations/supabase/types";

const activity = (patch: Partial<Activity> = {}): Activity => ({ id: "a", user_id: "u", track_id: "t", title: "Estudo", date: "2026-10-10", minutes: 60, quantity: 1, knowledge_summary: "Aprendi a parametrizar consultas", status: "approved", xp: 0, type: "lesson", source_id: null, notes: null, external_key: null, created_at: "2026-10-10T10:00:00Z", activity_skills: [{ skill_id: "s" }], ...patch });
const result = (patch: Partial<Tables<"review_results">> = {}): Tables<"review_results"> => ({ id: "r", user_id: "u", track_id: "t", activity_id: "a", thread_id: "thread", round_id: "round", score: 90, mastery_delta: 8, xp: 25, feedback: "Muito bem", created_at: "2026-10-10T12:00:00Z", ...patch });
describe("gamification", () => {
  it("awards time, items and one summary bonus, excluding pending rows", () => {
    expect(activityXp(activity())).toBe(90);
    expect(activityXp(activity({ knowledge_summary: " " }))).toBe(70);
    expect(activityXp(activity({ status: "pending" }))).toBe(0);
    expect(activityXp(activity({ knowledge_summary: "Texto editado" }))).toBe(90);
  });
  it("uses XP thresholds and caps progression at ten levels", () => {
    expect(masteryLevel(119)).toMatchObject({ level: 1, xpToNext: 1 });
    expect(masteryLevel(120)).toMatchObject({ level: 2, progress: 0 });
    expect(masteryLevel(10200)).toMatchObject({ level: 10, maxed: true, progress: 1 });
    expect(masteryLevel(-1).level).toBe(1);
  });
  it("keeps skill names and uses authoritative result XP without adding study time", () => {
    const skills: Skill[] = [{ id: "s", user_id: "u", track_id: "t", name: "SQL", color: "green", created_at: "2026-10-10" }];
    expect(skillProgress(skills, [activity()], [], [result()])[0]).toMatchObject({ name: "SQL", title: "Iniciante", xp: 115, minutes: 60 });
    expect(skillProgress(skills, [], [], [result()])[0]?.xp).toBe(0);
  });
  it("counts local daily XP and includes reviews in a streak", () => {
    expect(dailyXp([activity(), activity({ status: "pending" })], [result()], "2026-10-10")).toBe(115);
    expect(studyStreak([activity({ date: "2026-10-09" })], [result()], new Date(2026, 9, 10, 14))).toBe(2);
    expect(studyStreak([activity({ date: "2026-10-08" })], [], new Date(2026, 9, 10, 14))).toBe(0);
    expect(dailyXp([activity()], [], "2026-10-11")).toBe(0);
  });
  it("unlocks the next mission only at demonstrated 70% mastery", () => {
    const skills = skillProgress([{ id: "s", user_id: "u", track_id: "t", name: "SQL", color: "green", created_at: "2026-10-10" }], [], [], []);
    const first = skills[0];
    if (!first) throw new Error("Missing test skill");
    expect(missionStates([first, { ...first, id: "second" }])[1]?.unlocked).toBe(false);
    expect(missionStates([{ ...first, mastery: 70 }, { ...first, id: "second" }])[1]?.unlocked).toBe(true);
  });
});