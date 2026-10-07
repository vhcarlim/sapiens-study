import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";
import type { Tables } from "@/integrations/supabase/types";

export type ReviewThread = Tables<"review_threads">;
export const threadsQuery = (trackId: string) => queryOptions({
  queryKey: ["review-threads", trackId], enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("review_threads").select("*").eq("track_id", trackId).order("next_review_at");
    if (error) throw error;
    return data;
  },
});
export const masteryQuery = (trackId: string) => queryOptions({
  queryKey: ["skill-mastery", trackId], enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("skill_mastery").select("*").eq("track_id", trackId);
    if (error) throw error;
    return data;
  },
});
export const resultsQuery = (trackId: string) => queryOptions({
  queryKey: ["review-results", trackId], enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("review_results").select("*").eq("track_id", trackId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});
export function threadMessages(thread: ReviewThread): UIMessage[] {
  return Array.isArray(thread.messages) ? thread.messages as unknown as UIMessage[] : [];
}
export function reviewOutcome(score: number, stage: number) {
  const passed = score >= 70;
  const nextStage = passed ? Math.min(5, stage + 1) : Math.max(0, stage - 1);
  return { passed, delta: passed ? 8 : score >= 40 ? -3 : -5, xp: passed ? 25 : 0, stage: nextStage, days: passed ? [1, 7, 30, 60, 90, 180][nextStage] ?? 180 : 1 };
}