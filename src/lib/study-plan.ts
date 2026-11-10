import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { recommendTopic, type RecommendContext } from "@/lib/arena";
import { shiftStudyDay } from "@/lib/study-day";

export type PlanPhase = "base" | "deep" | "final";
export const PHASE_INFO: Record<PlanPhase, { label: string; hint: string; blockPhase: "theory" | "fixation" | "review"; blockLabel: string }> = {
  base: { label: "Base", hint: "Teoria + fixação de todo o edital", blockPhase: "theory", blockLabel: "Teoria" },
  deep: { label: "Aprofundamento", hint: "Questões no estilo da banca", blockPhase: "fixation", blockLabel: "Questões" },
  final: { label: "Reta final", hint: "Simulados e revisão", blockPhase: "review", blockLabel: "Revisão" },
};
export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DEFAULT_WEEKLY = [120, 120, 120, 120, 120, 240, 0];
export const DEFAULT_BLOCK = 50;

/** Days of reta final / aprofundamento before the exam. */
const FINAL_DAYS = 14;
const DEEP_DAYS = 60;

export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

export function phaseFor(daysLeft: number | null): PlanPhase {
  if (daysLeft == null) return "base";
  if (daysLeft <= FINAL_DAYS) return "final";
  if (daysLeft <= DEEP_DAYS) return "deep";
  return "base";
}

/** Timeline segments from today to the exam, as fractions summing to 1. */
export function phaseTimeline(daysLeft: number): { phase: PlanPhase; days: number }[] {
  const d = Math.max(0, daysLeft);
  const final = Math.min(d, FINAL_DAYS);
  const deep = Math.min(d - final, DEEP_DAYS - FINAL_DAYS);
  const base = d - final - deep;
  return ([["base", base], ["deep", deep], ["final", final]] as [PlanPhase, number][]).filter(([, n]) => n > 0).map(([phase, days]) => ({ phase, days }));
}

/** Monday of the study week containing `day` (YYYY-MM-DD). */
export function weekStartOf(day: string) {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 Sun
  return shiftStudyDay(day, -((dow + 6) % 7));
}

/** Total available minutes from `from` (inclusive) to `to` (exclusive). */
export function capacityMinutes(weekly: number[], from: string, to: string) {
  let total = 0;
  for (let d = from; d < to; d = shiftStudyDay(d, 1)) total += weekly[(new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7] ?? 0;
  return total;
}

type PlanSkill = { id: string; name: string; topics: string[] };
export type PlanActivity = { date: string; syllabus_topic: string | null; skill_ids: string[]; created_at?: string; perception?: number | null; minutes?: number };

export type PlanBlock = {
  kind: "study" | "review" | "mock";
  skillId: string | null;
  skillName: string;
  topic: string | null;
  minutes: number;
  phase: string;
  phaseLabel: string;
  done: boolean;
  why: string[];
};
export type PlanDay = { date: string; weekday: string; capacity: number; blocks: PlanBlock[]; isPast: boolean; isToday: boolean; studied: number };

export type WeekInput = {
  weekStart: string;
  today: string;
  weekly: number[];
  blockMinutes: number;
  skills: PlanSkill[];
  activities: PlanActivity[];
  ctx: Omit<RecommendContext, "today">;
  examDate: string | null;
  pinned?: string[];
  skipped?: string[];
  /** Due review dates (YYYY-MM-DD) — one short review block per day with due items. */
  reviewDue?: string[];
  hasPastExams?: boolean;
};

/**
 * Builds a 7-day plan. Past days reflect what really happened; today and future days
 * are simulated with the weighted rotating cycle (recommendTopic), so missed days are
 * redistributed automatically. Skipped skills are removed and pinned skills get the
 * first block of every planned day.
 */
export function buildWeek(input: WeekInput): PlanDay[] {
  const skipped = new Set(input.skipped ?? []);
  const skills = input.skills.filter((s) => !skipped.has(s.id) && s.topics?.length);
  const byName = new Map(input.skills.map((s) => [s.id, s]));
  const sim: PlanActivity[] = input.activities.filter((a) => a.date < input.today || a.date <= input.today);
  const days: PlanDay[] = [];
  const dueSet = new Set(input.reviewDue ?? []);
  const lastDue = (input.reviewDue ?? []).filter((d) => d <= input.today).length > 0;
  for (let i = 0; i < 7; i++) {
    const date = shiftStudyDay(input.weekStart, i);
    const capacity = input.weekly[i] ?? 0;
    const isPast = date < input.today;
    const isToday = date === input.today;
    const real = input.activities.filter((a) => a.date === date);
    const studiedSkills = new Set(real.flatMap((a) => a.skill_ids));
    const studied = real.reduce((n, a) => n + (a.minutes ?? 0), 0);
    const daysLeft = input.examDate ? daysBetween(date, input.examDate) : null;
    const phase = phaseFor(daysLeft);
    const info = PHASE_INFO[phase];
    const blocks: PlanBlock[] = [];
    if (isPast) {
      for (const id of studiedSkills) {
        const s = byName.get(id);
        if (s) blocks.push({ kind: "study", skillId: id, skillName: s.name, topic: real.find((a) => a.skill_ids.includes(id))?.syllabus_topic ?? null, minutes: real.filter((a) => a.skill_ids.includes(id)).reduce((n, a) => n + (a.minutes ?? 0), 0), phase: info.blockPhase, phaseLabel: info.blockLabel, done: true, why: [] });
      }
      days.push({ date, weekday: WEEKDAYS[i], capacity, blocks, isPast, isToday, studied });
      continue;
    }
    let left = capacity;
    if (left > 0 && (dueSet.has(date) || (isToday && lastDue))) {
      const m = Math.min(20, left);
      blocks.push({ kind: "review", skillId: null, skillName: "Revisões vencidas", topic: null, minutes: m, phase: "review", phaseLabel: "Arguição", done: false, why: ["Revisão espaçada"] });
      left -= m;
    }
    const isMockDay = phase === "final" && input.hasPastExams && capacity >= 180 && capacity === Math.max(...input.weekly);
    if (isMockDay && left > 0) {
      blocks.push({ kind: "mock", skillId: null, skillName: "Simulado com prova anterior", topic: null, minutes: left, phase: "mock", phaseLabel: "Simulado", done: false, why: ["Reta final"] });
      left = 0;
    }
    const used = new Set<string>();
    let first = true;
    while (left >= Math.min(20, input.blockMinutes) && skills.length) {
      const m = Math.min(input.blockMinutes, left);
      const pinnedId = first ? (input.pinned ?? []).find((id) => skills.some((s) => s.id === id) && !used.has(id)) : undefined;
      const pool = pinnedId ? skills.filter((s) => s.id === pinnedId) : skills.filter((s) => !used.has(s.id));
      const pick = recommendTopic(pool.length ? pool : skills, sim, { ...input.ctx, today: date });
      first = false;
      if (!pick) break;
      used.add(pick.skillId);
      const done = studiedSkills.has(pick.skillId);
      blocks.push({ kind: "study", skillId: pick.skillId, skillName: pick.skillName, topic: pick.topic, minutes: m, phase: info.blockPhase, phaseLabel: info.blockLabel, done, why: pinnedId ? ["Fixada por você", ...pick.why] : pick.why });
      sim.push({ date, syllabus_topic: pick.topic, skill_ids: [pick.skillId], created_at: `${date}T23:${String(blocks.length).padStart(2, "0")}` });
      left -= m;
    }
    days.push({ date, weekday: WEEKDAYS[i], capacity, blocks, isPast, isToday, studied });
  }
  return days;
}

export type Coverage = { skillId: string; name: string; total: number; seen: number; points: number };

export function syllabusCoverage(skills: PlanSkill[], activities: PlanActivity[], points: Map<string, number>): Coverage[] {
  const seen = new Set(activities.map((a) => a.syllabus_topic?.trim().toLowerCase()).filter(Boolean) as string[]);
  return skills.filter((s) => s.topics?.length).map((s) => ({ skillId: s.id, name: s.name, total: s.topics.length, seen: s.topics.filter((t) => seen.has(t.trim().toLowerCase())).length, points: points.get(s.id) ?? 0 }));
}

/** Projects final coverage (0–1) from the pace of newly seen topics in the last 28 days. */
export function projectCoverage(skills: PlanSkill[], activities: PlanActivity[], today: string, daysLeft: number) {
  const all = new Map<string, string>();
  for (const s of skills) for (const t of s.topics ?? []) all.set(t.trim().toLowerCase(), "");
  const first = new Map<string, string>();
  for (const a of activities) {
    const t = a.syllabus_topic?.trim().toLowerCase();
    if (!t || !all.has(t)) continue;
    const p = first.get(t); if (!p || a.date < p) first.set(t, a.date);
  }
  const total = all.size;
  if (!total) return { now: 0, projected: 0, pacePerWeek: 0 };
  const since = shiftStudyDay(today, -28);
  const recent = [...first.values()].filter((d) => d >= since).length;
  const pacePerDay = recent / 28;
  const projected = Math.min(total, first.size + pacePerDay * Math.max(0, daysLeft));
  return { now: first.size / total, projected: projected / total, pacePerWeek: pacePerDay * 7 };
}

/** Rough hours still needed: 90 min per unseen topic, 30 min review per seen topic. */
export function neededMinutes(cov: Coverage[]) {
  return cov.reduce((n, c) => n + (c.total - c.seen) * 90 + c.seen * 30, 0);
}

export const planSettingsQuery = (trackId: string) => queryOptions({
  queryKey: ["plan-settings", trackId],
  enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("study_plan_settings").select("*").eq("track_id", trackId).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const planOverridesQuery = (trackId: string, weekStart: string) => queryOptions({
  queryKey: ["plan-overrides", trackId, weekStart],
  enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("study_plan_overrides").select("*").eq("track_id", trackId).eq("week_start", weekStart).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const dueReviewsQuery = (trackId: string) => queryOptions({
  queryKey: ["plan-due-reviews", trackId],
  enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("review_threads").select("next_review_at").eq("track_id", trackId);
    if (error) throw error;
    return (data ?? []).map((r) => r.next_review_at);
  },
});
