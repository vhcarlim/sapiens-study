import { format, subDays } from "date-fns";
import type { Activity, Skill } from "@/lib/data";
import type { Tables } from "@/integrations/supabase/types";

export const SUMMARY_XP = 20;
export const DEFAULT_DAILY_GOAL = 100;
export const MASTERY_TITLES = ["Iniciante", "Aprendiz", "Explorador", "Praticante", "Estrategista", "Especialista", "Mentor", "Mestre", "Grão-mestre", "Sapiens"];
export const XP_THRESHOLDS = [0, 120, 300, 600, 1200, 2100, 3300, 4800, 7200, 10200];

/** Derived from approved records: editing never creates duplicate rewards. */
export function activityXp(activity: Pick<Activity, "minutes" | "quantity" | "knowledge_summary" | "status">) {
  if (activity.status !== "approved") return 0;
  return Math.max(0, activity.minutes) + Math.max(0, activity.quantity) * 10 + (activity.knowledge_summary?.trim() ? SUMMARY_XP : 0);
}
export function masteryLevel(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp));
  let index = 0;
  XP_THRESHOLDS.forEach((threshold, i) => { if (safeXp >= threshold) index = i; });
  const current = XP_THRESHOLDS[index] ?? 0;
  const next = XP_THRESHOLDS[index + 1];
  return { level: index + 1, name: MASTERY_TITLES[index], xp: safeXp, progress: next === undefined ? 1 : (safeXp - current) / (next - current), xpToNext: next === undefined ? 0 : next - safeXp, maxed: next === undefined };
}
export function skillProgress(skills: Skill[], activities: Activity[], mastery: Tables<"skill_mastery">[], results: Tables<"review_results">[]) {
  return skills.map(skill => {
    const list = activities.filter(a => a.status === "approved" && a.activity_skills.some(link => link.skill_id === skill.id));
    const ids = new Set(list.map(a => a.id));
    const reviewed = mastery.find(m => m.skill_id === skill.id);
    const xp = list.reduce((sum, a) => sum + activityXp(a), 0) + results.filter(r => ids.has(r.activity_id)).reduce((sum, r) => sum + r.xp, 0);
    return { id: skill.id, name: skill.name, minutes: list.reduce((sum, a) => sum + a.minutes, 0), quantity: list.reduce((sum, a) => sum + a.quantity, 0), mastery: reviewed?.mastery ?? 0, reviewed: !!reviewed, fragile: reviewed?.last_score != null && reviewed.last_score < 70, ...masteryLevel(xp) };
  });
}
export type SkillProgress = ReturnType<typeof skillProgress>[number];
export function dailyXp(activities: Activity[], results: Tables<"review_results">[], date: string) {
  return activities.filter(a => a.date === date).reduce((sum, a) => sum + activityXp(a), 0) + results.filter(r => format(new Date(r.created_at), "yyyy-MM-dd") === date).reduce((sum, r) => sum + r.xp, 0);
}
export function studyStreak(activities: Activity[], results: Tables<"review_results">[], now = new Date()) {
  const dates = new Set([...activities.filter(a => activityXp(a) > 0).map(a => a.date), ...results.map(r => format(new Date(r.created_at), "yyyy-MM-dd"))]);
  let day = dates.has(format(now, "yyyy-MM-dd")) ? now : subDays(now, 1);
  let streak = 0;
  while (dates.has(format(day, "yyyy-MM-dd"))) { streak++; day = subDays(day, 1); }
  return streak;
}
export function missionStates(skills: SkillProgress[]) {
  return skills.map((skill, i) => ({ ...skill, unlocked: i === 0 || (skills[i - 1]?.mastery ?? 0) >= 70, completed: skill.mastery >= 70 }));
}
export function celebrateReward(trackId: string, xp: number, title: string) {
  if (xp > 0) window.dispatchEvent(new CustomEvent("sapiens:reward", { detail: { trackId, xp, title } }));
}