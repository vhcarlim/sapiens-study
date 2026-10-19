import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ExamQuestion = { number: number; statement: string; options: { letter: string; text: string }[]; answer: string };
export type PastExam = Omit<Tables<"past_exams">, "questions"> & { questions: ExamQuestion[] };

export const pastExamsQuery = (trackId: string) => queryOptions({
  queryKey: ["past-exams", trackId],
  enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("past_exams").select("*").eq("track_id", trackId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PastExam[];
  },
});

export type ExamBadge = { id: string; name: string; min: number; detail: string };
/** Ordered from highest to lowest; an exam earns the best tier its percentage reaches. */
export const EXAM_BADGES: ExamBadge[] = [
  { id: "gabarito", name: "Gabaritou", min: 100, detail: "100% de acertos" },
  { id: "elite", name: "Domínio de Elite", min: 90, detail: "90% ou mais" },
  { id: "alto", name: "Alto Rendimento", min: 80, detail: "80% ou mais" },
  { id: "corte", name: "Nota de Corte", min: 70, detail: "70% ou mais" },
  { id: "combatente", name: "Combatente de Prova", min: 0, detail: "Prova concluída" },
];

export function examPercent(correct: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((Math.min(correct, total) / total) * 1000) / 10;
}
export function examBadge(correct: number | null, total: number | null): ExamBadge | null {
  if (correct == null || !total) return null;
  const pct = examPercent(correct, total);
  return EXAM_BADGES.find((b) => pct >= b.min) ?? null;
}

/** Whole days from today (São Paulo calendar date) until the exam date; negative once passed. */
export function daysUntil(examDate: string, today: string) {
  const a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const b = Date.UTC(+examDate.slice(0, 4), +examDate.slice(5, 7) - 1, +examDate.slice(8, 10));
  return Math.round((b - a) / 86400000);
}
