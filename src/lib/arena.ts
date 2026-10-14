import type { Activity, Skill } from "@/lib/data";

export const EXAM_BOARDS = ["Cebraspe", "FGV", "FCC", "Vunesp", "Cesgranrio", "Quadrix", "IBFC", "Instituto AOCP", "FAFIPA", "Outra"] as const;

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

export type TopicGroup = { heading: string | null; items: { topic: string; label: string }[] };
const cap = (t: string) => t.charAt(0).toLocaleUpperCase("pt-BR") + t.slice(1);
/**
 * Groups flat syllabus topics: a topic starting uppercase opens a group and following
 * lowercase topics are its subtopics. "Seção: primeiro item" splits into heading + item.
 */
export function groupTopics(topics: string[]): TopicGroup[] {
  const groups: TopicGroup[] = [];
  for (const topic of topics) {
    const t = topic.trim();
    const prev = groups.at(-1);
    if (/^[a-zà-ú]/.test(t) && prev) { prev.items.push({ topic, label: cap(t) }); continue; }
    const m = t.match(/^([^:]{2,60}):\s*(.+)$/);
    groups.push(m ? { heading: (m[1] ?? "").trim(), items: [{ topic, label: cap((m[2] ?? "").trim()) }] } : { heading: null, items: [{ topic, label: cap(t) }] });
  }
  return groups;
}
