import type { Activity, Skill } from "@/lib/data";

export const EXAM_BOARDS = ["Cebraspe", "FGV", "FCC", "Vunesp", "Cesgranrio", "Quadrix", "IBFC", "Instituto AOCP", "Outra"] as const;

export type ArenaObjective = {
  format: "multipla" | "certo_errado";
  context: string;
  statement: string;
  options: { letter: string; text: string }[];
  answer: string;
  explanations: { letter: string; why: string }[];
  trap: string;
  basis: string;
};
export type ArenaOpen = { prompt: string; expected_points: string[] };
export type ArenaVerdict = { verdict: "correto" | "parcial" | "incorreto"; score: number; correct: string; missing: string; risk: string; model_answer: string };

export type TopicPick = { skillId: string; skillName: string; topic: string; reason: "novo" | "antigo"; lastStudied: string | null };

/**
 * Recommends the next syllabus topic: never-studied topics first (in syllabus order),
 * otherwise the topic studied longest ago.
 */
export function recommendTopic(skills: Pick<Skill, "id" | "name" | "topics">[], activities: Pick<Activity, "syllabus_topic" | "date">[]): TopicPick | null {
  const last = new Map<string, string>();
  for (const a of activities) {
    const t = a.syllabus_topic?.trim().toLowerCase();
    if (!t) continue;
    const prev = last.get(t);
    if (!prev || a.date > prev) last.set(t, a.date);
  }
  let oldest: TopicPick | null = null;
  for (const s of skills) {
    for (const topic of s.topics ?? []) {
      const d = last.get(topic.trim().toLowerCase());
      if (!d) return { skillId: s.id, skillName: s.name, topic, reason: "novo", lastStudied: null };
      if (!oldest || d < (oldest.lastStudied ?? "")) oldest = { skillId: s.id, skillName: s.name, topic, reason: "antigo", lastStudied: d };
    }
  }
  return oldest;
}

/** Session minutes credited as study time (at least 1 minute, at most 6 hours). */
export function sessionMinutes(startedAt: number, endedAt: number) {
  return Math.min(360, Math.max(1, Math.round((endedAt - startedAt) / 60000)));
}
