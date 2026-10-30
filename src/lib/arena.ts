import type { Activity, Skill } from "@/lib/data";
import { studyDay } from "@/lib/study-day";

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

export type TopicPick = { skillId: string; skillName: string; topic: string; reason: "novo" | "antigo"; lastStudied: string | null; why: string[] };

export type RecommendContext = {
  /** Exam points per skill (questions × weight). */
  points?: Map<string, number>;
  /** Declared difficulty 1 (very hard) – 5 (very easy). */
  difficulty?: Map<string, number>;
  /** Evaluated mastery per skill, 0–100. */
  mastery?: Map<string, number>;
  /** Today's date as YYYY-MM-DD. */
  today?: string;
};

type RecAct = Pick<Activity, "syllabus_topic" | "date"> & { skill_ids?: string[]; created_at?: string; perception?: number | null };
/** Latest perceived difficulty (1 fluent – 4 stuck) scales priority. */
const PERC_FACTOR: Record<number, number> = { 1: 0.85, 2: 1, 3: 1.25, 4: 1.5 };
const DIFF_FACTOR: Record<number, number> = { 1: 1.4, 2: 1.2, 3: 1, 4: 0.8, 5: 0.6 };
const norm = (t: string) => t.trim().toLowerCase();
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/**
 * Weighted rotating cycle. Picks the subject with the highest priority — exam points ×
 * declared difficulty × weak mastery × days without practice — and sends the subject
 * practised most recently (or today) to the end of the queue, so one activity is enough
 * to rotate. Inside the subject: first never-studied topic, else the one studied longest ago.
 */
export function recommendTopic(skills: Pick<Skill, "id" | "name" | "topics">[], activities: RecAct[], ctx: RecommendContext = {}): TopicPick | null {
  const lastTopic = new Map<string, string>();
  for (const a of activities) {
    const t = a.syllabus_topic ? norm(a.syllabus_topic) : "";
    if (!t) continue;
    const prev = lastTopic.get(t);
    if (!prev || a.date > prev) lastTopic.set(t, a.date);
  }
  const cands = skills.filter((s) => s.topics?.length);
  if (!cands.length) return null;
  const topicOwner = new Map<string, string>();
  for (const s of cands) for (const t of s.topics) topicOwner.set(norm(t), s.id);
  const skillsOf = (a: RecAct) => {
    const ids = new Set(a.skill_ids ?? []);
    const o = a.syllabus_topic ? topicOwner.get(norm(a.syllabus_topic)) : undefined;
    if (o) ids.add(o);
    return ids;
  };
  const lastSkill = new Map<string, string>();
  const lastPerc = new Map<string, { date: string; v: number }>();
  let latest: RecAct | null = null;
  for (const a of activities) {
    const ids = skillsOf(a);
    if (!ids.size) continue;
    for (const id of ids) {
      const p = lastSkill.get(id); if (!p || a.date > p) lastSkill.set(id, a.date);
      if (a.perception) { const q = lastPerc.get(id); if (!q || a.date >= q.date) lastPerc.set(id, { date: a.date, v: a.perception }); }
    }
    if (!latest || a.date > latest.date || (a.date === latest.date && (a.created_at ?? "") > (latest.created_at ?? ""))) latest = a;
  }
  const justDone = latest ? skillsOf(latest) : new Set<string>();
  const today = ctx.today ?? studyDay();
  const pts = cands.map((s) => ctx.points?.get(s.id) ?? 0);
  const avgPts = pts.some((p) => p > 0) ? pts.reduce((a, b) => a + b, 0) / pts.filter((p) => p > 0).length : 1;

  let best: { s: (typeof cands)[number]; score: number; why: string[] } | null = null;
  for (const s of cands) {
    const why: string[] = [];
    const p = ctx.points?.get(s.id);
    const pf = p ? Math.max(0.3, p / avgPts) : 1;
    if (p && pf >= 1.3) why.push("Maior peso no edital");
    const d = ctx.difficulty?.get(s.id) ?? 3;
    const df = DIFF_FACTOR[d] ?? 1;
    if (d <= 2) why.push("Ponto fraco a reforçar");
    const m = ctx.mastery?.get(s.id);
    const mf = m == null ? 1 : 1.3 - Math.min(100, Math.max(0, m)) / 100;
    if (m != null && m < 70) why.push("Domínio abaixo de 70%");
    const pv = lastPerc.get(s.id)?.v;
    const qf = pv ? PERC_FACTOR[pv] ?? 1 : 1;
    if (pv && pv >= 3) why.push("Última sessão foi difícil");
    const last = lastSkill.get(s.id);
    const days = last ? Math.max(0, daysBetween(last, today)) : 14;
    if (!last) why.push("Ainda não praticada");
    else if (days >= 3) why.push(`${days} dias sem praticar`);
    const rf = Math.min(days, 14) + 1;
    const rot = justDone.has(s.id) || last === today ? 0.05 : 1;
    const score = pf * df * mf * qf * rf * rot;
    if (!best || score > best.score) best = { s, score, why };
  }
  const { s, why } = best!;
  let oldest: TopicPick | null = null;
  for (const topic of s.topics) {
    const d = lastTopic.get(norm(topic));
    if (!d) return { skillId: s.id, skillName: s.name, topic, reason: "novo", lastStudied: null, why: ["Ciclo de estudos", ...why] };
    if (!oldest || d < (oldest.lastStudied ?? "")) oldest = { skillId: s.id, skillName: s.name, topic, reason: "antigo", lastStudied: d, why: ["Ciclo de estudos", ...why] };
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
