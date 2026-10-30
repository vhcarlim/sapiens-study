/** Study material, cycle phase and perceived retention options for activities. */
export const MATERIALS = [
  { value: "video", label: "🎥 Videoaula", color: "var(--material-video)" },
  { value: "pdf", label: "📄 PDF / Apostila", color: "var(--material-pdf)" },
  { value: "law", label: "⚖️ Lei seca", color: "var(--material-law)" },
  { value: "questions", label: "✍️ Questões", color: "var(--material-questions)" },
  { value: "summary", label: "📑 Resumo / Flashcards", color: "var(--material-summary)" },
  { value: "book", label: "📚 Livro / Doutrina", color: "var(--material-book)" },
  { value: "other", label: "📌 Outro", color: "var(--material-other)" },
] as const;

export const PHASES = [
  { value: "theory", label: "🟢 Teoria" },
  { value: "fixation", label: "🟡 Fixação" },
  { value: "review", label: "🔁 Revisão" },
  { value: "deep", label: "🎯 Aprofundamento" },
  { value: "mock", label: "⏱️ Simulado" },
] as const;

export const PERCEPTIONS = [
  { value: 1, label: "🟢 Fluido / Dominei" },
  { value: 2, label: "🟡 Normal / Entendi" },
  { value: 3, label: "🟠 Trabalhoso / Dúvidas" },
  { value: 4, label: "🔴 Muito difícil / Travei" },
] as const;

/** Activity type kept for XP/milestone logic, derived from the chosen phase. */
export const phaseToType = (phase: string) => (phase === "mock" ? "mock" : phase === "fixation" ? "practice" : "lesson");

export const materialOf = (m: string | null | undefined) => MATERIALS.find((x) => x.value === m) ?? MATERIALS[MATERIALS.length - 1];
export const phaseLabel = (p: string | null | undefined) => PHASES.find((x) => x.value === p)?.label ?? null;
export const perceptionLabel = (p: number | null | undefined) => PERCEPTIONS.find((x) => x.value === p)?.label ?? null;
