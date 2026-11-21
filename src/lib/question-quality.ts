export type SourceOrigin = "official" | "ai_community" | "ai_ephemeral";
export type GroundingType = "exam_official" | "user_rag" | "general_ai";
export type QuestionMeta = { bankId: string | null; sourceOrigin: SourceOrigin; groundingType: GroundingType; origin: string; documentName: string; fromBank: boolean; historyFingerprint: string };
export const REPORT_REASONS = ["Gabarito incorreto", "Mais de uma resposta correta", "Enunciado ambíguo ou confuso", "Base legal desatualizada", "Fora do assunto"] as const;
export function eligibleForPromotion(q: { source_origin: SourceOrigin; likes_count: number; reports_count: number; quarantined: boolean }) {
  return q.source_origin === "ai_ephemeral" && q.likes_count >= 3 && q.reports_count === 0 && !q.quarantined;
}
export function afterFeedback(q: { source_origin: SourceOrigin; likes_count: number; reports_count: number; quarantined: boolean }, vote: "like" | "report") {
  const next = { ...q, likes_count: q.likes_count + Number(vote === "like"), reports_count: q.reports_count + Number(vote === "report"), quarantined: q.quarantined || vote === "report" };
  return { ...next, source_origin: eligibleForPromotion(next) ? "ai_community" as const : next.source_origin };
}