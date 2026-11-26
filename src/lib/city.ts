// Cidade Sapiens 3D — regras puras (sem React/three). O cenário só desenha este estado.
export type CityInput = {
  level: number; // 1..10
  xpToNext: number;
  streak: number;
  skills: { id: string; name: string; mastery: number; reviewed: boolean; fragile: boolean; updatedAt?: string | null }[];
  questionItems: number; // itens de atividades com material "questions"
  avgScore: number | null; // média last_score 0..100
  examDate: string | null;
  now: Date;
};

export const CITADEL_STAGES = ["Vila", "Torre", "Castelo", "Catedral", "Cidadela dourada"] as const;
export const STALE_REVIEW_DAYS = 7;

export function citadelStage(level: number) {
  return Math.min(4, Math.max(0, Math.floor((Math.max(1, level) - 1) / 2)));
}
export function towerHeight(mastery: number) {
  const m = Math.min(100, Math.max(0, mastery));
  return 0.4 + (m / 100) * 2.6;
}
export function arenaTier(items: number) {
  return items >= 500 ? 3 : items >= 150 ? 2 : items >= 30 ? 1 : 0;
}
export const ARENA_TIER_GOALS = [30, 150, 500];
export function overdueCount(skills: CityInput["skills"], now: Date) {
  return skills.filter((s) => s.reviewed && (s.fragile || (s.updatedAt != null && (now.getTime() - new Date(s.updatedAt).getTime()) / 86400000 > STALE_REVIEW_DAYS))).length;
}
/** 0 = apagado (sem data/passou), 1 = máximo (prova em ≤7 dias). */
export function lighthouseIntensity(examDate: string | null, now: Date) {
  if (!examDate) return 0;
  const days = (new Date(examDate + "T12:00:00").getTime() - now.getTime()) / 86400000;
  if (days < 0) return 0;
  if (days <= 7) return 1;
  if (days >= 180) return 0.15;
  return 0.15 + 0.85 * (1 - (days - 7) / 173);
}

export function buildCityState(i: CityInput) {
  const stage = citadelStage(i.level);
  const overdue = overdueCount(i.skills, i.now);
  const days = i.examDate ? Math.ceil((new Date(i.examDate + "T12:00:00").getTime() - i.now.getTime()) / 86400000) : null;
  const tier = arenaTier(i.questionItems);
  return {
    citadel: { stage, name: CITADEL_STAGES[stage], level: i.level, xpToNext: i.xpToNext, nextLevelForStage: stage < 4 ? (stage + 1) * 2 + 1 : null },
    towers: i.skills.slice(0, 16).map((s) => ({ id: s.id, name: s.name, mastery: Math.round(s.mastery), height: towerHeight(s.mastery) })),
    arena: { tier, items: i.questionItems, accuracy: i.avgScore, nextGoal: ARENA_TIER_GOALS[tier] ?? null },
    garden: { overdue, reviewed: i.skills.filter((s) => s.reviewed).length, fog: overdue > 0 },
    lighthouse: { intensity: lighthouseIntensity(i.examDate, i.now), days },
    streak: i.streak,
  };
}
export type CityState = ReturnType<typeof buildCityState>;
