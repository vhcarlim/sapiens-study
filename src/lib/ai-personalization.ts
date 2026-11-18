import { getRouteApi } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AI_PREFERENCES, PreferencesSchema, type AIPreferences, type UsageOverview } from "@/lib/ai-settings";

export function useAIAccount() {
  const { user } = getRouteApi("/_authenticated").useRouteContext();
  const qc = useQueryClient();
  const preferences = useQuery({ queryKey: ["ai-preferences", user.id], queryFn: async () => {
    const { data, error } = await supabase.from("ai_preferences").select("study_model,study_effort,document_model,document_effort,monthly_token_goal").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return PreferencesSchema.parse(data ?? {});
  } });
  const usage = useQuery({ queryKey: ["ai-usage", user.id], queryFn: async () => {
    const { data, error } = await supabase.rpc("ai_monthly_usage");
    if (error) throw error;
    return data as unknown as UsageOverview;
  }, staleTime: 0 });
  const save = useMutation({ mutationFn: async (next: AIPreferences) => {
    const parsed = PreferencesSchema.parse(next);
    const { error } = await supabase.from("ai_preferences").upsert({ user_id: user.id, ...parsed });
    if (error) throw error;
    return parsed;
  }, onSuccess: (next) => qc.setQueryData(["ai-preferences", user.id], next) });
  return { prefs: preferences.data ?? DEFAULT_AI_PREFERENCES, ready: preferences.isSuccess, error: preferences.error ?? usage.error,
    usage: usage.data, save, refresh: () => Promise.all([qc.invalidateQueries({ queryKey: ["ai-usage", user.id] }), qc.invalidateQueries({ queryKey: ["ai-quota", user.id] })]) };
}