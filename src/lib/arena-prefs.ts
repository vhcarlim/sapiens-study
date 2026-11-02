export const QUESTION_STYLES = {
  conceitual: "Conceitual",
  caso: "Caso prático",
  lei: "Literalidade da lei",
  jurisprudencia: "Jurisprudência",
  calculo: "Cálculo/Dados",
  pegadinha: "Pegadinhas da banca",
} as const;
export type QuestionStyle = keyof typeof QUESTION_STYLES;
export const STYLE_KEYS = Object.keys(QUESTION_STYLES) as QuestionStyle[];

export const DIFFICULTIES = { facil: "Fácil", banca: "Banca", dificil: "Difícil" } as const;
export type Difficulty = keyof typeof DIFFICULTIES;

export const AUTO_ANGLES = ["conceito central", "caso prático", "literalidade da lei", "exceção à regra", "comparação entre institutos", "consequência/efeito jurídico"] as const;

/** Chooses the angle for the next question: rotates through the chosen styles (or automatic angles), skipping the most recent ones. */
export function pickAngle(styles: QuestionStyle[], recentAngles: string[]): string {
  const pool: string[] = styles.length ? styles.map((s) => QUESTION_STYLES[s]) : [...AUTO_ANGLES];
  const recent = recentAngles.slice(0, Math.max(0, pool.length - 1));
  const fresh = pool.find((a) => !recent.includes(a));
  return fresh ?? pool[0]!;
}

export type ArenaPrefs = { focus: string; styles: QuestionStyle[]; difficulty: Difficulty };
export const DEFAULT_PREFS: ArenaPrefs = { focus: "", styles: [], difficulty: "banca" };
