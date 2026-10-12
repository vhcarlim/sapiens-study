import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shiftStudyDay, studyDay } from "@/lib/study-day";
import { activityXp } from "@/lib/gamification";
import type { Activity } from "@/lib/data";
import type { Tables } from "@/integrations/supabase/types";
export const FREEZE_COST = 100;
export const MONTHLY_FREEZE_LIMIT = 2;
export type ProtectionState = { balance: number; days: string[]; used: number };
export const protectionQuery = (trackId: string) => queryOptions({ queryKey: ["streak-protection", trackId], enabled: !!trackId, queryFn: async () => {
  const { data, error } = await supabase.rpc("streak_protection_state", { p_track: trackId });
  if (error) throw error;
  return data as unknown as ProtectionState;
} });
export function canProtect(state: ProtectionState, activities: Activity[], results: Tables<"review_results">[], now: Date) {
  const yesterday = shiftStudyDay(studyDay(now), -1);
  const before = shiftStudyDay(yesterday, -1);
  const studied = new Set([...activities.filter(a => activityXp(a)>0).map(a => a.date), ...results.map(r => studyDay(r.created_at))]);
  return state.balance >= FREEZE_COST && state.used < MONTHLY_FREEZE_LIMIT && !studied.has(yesterday) && !state.days.includes(yesterday) && (studied.has(before) || state.days.includes(before));
}