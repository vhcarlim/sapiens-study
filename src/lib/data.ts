import { queryOptions } from "@tanstack/react-query";
import { studyDay } from "@/lib/study-day";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Source = Tables<"sources">;
export type Skill = Tables<"skills">;
export type Activity = Tables<"activities"> & { activity_skills: { skill_id: string }[] };

export const ACTIVITY_TYPES: { value: string; label: string }[] = [
  { value: "lesson", label: "Lição" },
  { value: "room", label: "Sala / Lab" },
  { value: "course", label: "Curso / Módulo" },
  { value: "certificate", label: "Certificado" },
  { value: "level", label: "Nível" },
  { value: "other", label: "Outro" },
];
export const typeLabel = (t: string) => ACTIVITY_TYPES.find((x) => x.value === t)?.label ?? t;

export const todayStr = () => studyDay();

export const sourcesQuery = (trackId: string) => queryOptions({
  queryKey: ["sources", trackId],
  enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("sources").select("*").eq("track_id", trackId).order("created_at");
    if (error) throw error;
    return data;
  },
});

export const skillsQuery = (trackId: string) => queryOptions({
  queryKey: ["skills", trackId],
  enabled: !!trackId,
  queryFn: async () => {
    const { data, error } = await supabase.from("skills").select("*").eq("track_id", trackId).order("name");
    if (error) throw error;
    return data;
  },
});

export const activitiesQuery = (status: "approved" | "pending", trackId: string) =>
  queryOptions({
    queryKey: ["activities", status, trackId],
    enabled: !!trackId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, activity_skills(skill_id)")
        .eq("status", status)
        .eq("track_id", trackId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
  });

export type ActivityInput = {
  track_id: string;
  id?: string | undefined;
  source_id: string | null;
  date: string;
  type: string;
  title: string;
  quantity: number;
  minutes: number;
  xp: number;
  notes: string | null;
  knowledge_summary?: string | null;
  skill_ids: string[];
  status?: string;
};

export async function saveActivity(input: ActivityInput) {
  const { skill_ids, id, ...row } = input;
  let activityId = id;
  if (id) {
    const { error } = await supabase.from("activities").update(row).eq("id", id).eq("track_id", row.track_id);
    if (error) throw error;
    const { error: linksError } = await supabase.from("activity_skills").delete().eq("activity_id", id);
    if (linksError) throw linksError;
  } else {
    const { data, error } = await supabase.from("activities").insert(row).select("id").single();
    if (error) throw error;
    activityId = data.id;
  }
  if (skill_ids.length) {
    if (!activityId) throw new Error("Atividade indisponível");
    const { error } = await supabase
      .from("activity_skills")
      .insert(skill_ids.map((skill_id) => ({ activity_id: activityId, skill_id })));
    if (error) throw error;
  }
}

// Hours needed to reach each level (index = level - 1).
export const LEVEL_HOURS = [0, 2, 5, 10, 20, 35, 55, 80, 120, 170, 250];
export const LEVEL_NAMES = ["Iniciante", "Aprendiz", "Explorador", "Praticante", "Competente", "Proficiente", "Avançado", "Especialista", "Expert", "Mestre", "Lenda"];

/** XP = minutes + 10 per item concluded. Level is driven by hours studied. */
export function levelInfo(minutes: number, quantity = 0) {
  const hours = minutes / 60;
  let lvl = 1;
  for (const [i, threshold] of LEVEL_HOURS.entries()) if (hours >= threshold) lvl = i + 1;
  const cur = LEVEL_HOURS[lvl - 1] ?? 0;
  const next = LEVEL_HOURS[lvl];
  const progress = next === undefined ? 1 : (hours - cur) / (next - cur);
  return {
    level: lvl,
    name: LEVEL_NAMES[lvl - 1] ?? "Iniciante",
    xp: minutes + quantity * 10,
    progress: Math.min(1, Math.max(0, progress)),
    minutesToNext: next === undefined ? 0 : Math.ceil(next * 60 - minutes),
    maxed: next === undefined,
  };
}

export function fmtMinutes(m: number) {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}
