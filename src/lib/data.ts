import { queryOptions } from "@tanstack/react-query";
import { format } from "date-fns";
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

export const todayStr = () => format(new Date(), "yyyy-MM-dd");

export const sourcesQuery = queryOptions({
  queryKey: ["sources"],
  queryFn: async () => {
    const { data, error } = await supabase.from("sources").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
});

export const skillsQuery = queryOptions({
  queryKey: ["skills"],
  queryFn: async () => {
    const { data, error } = await supabase.from("skills").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const activitiesQuery = (status: "approved" | "pending") =>
  queryOptions({
    queryKey: ["activities", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, activity_skills(skill_id)")
        .eq("status", status)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
  });

export type ActivityInput = {
  id?: string | undefined;
  source_id: string | null;
  date: string;
  type: string;
  title: string;
  quantity: number;
  minutes: number;
  xp: number;
  notes: string | null;
  skill_ids: string[];
  status?: string;
};

export async function saveActivity(input: ActivityInput) {
  const { skill_ids, id, ...row } = input;
  let activityId = id;
  if (id) {
    const { error } = await supabase.from("activities").update(row).eq("id", id);
    if (error) throw error;
    await supabase.from("activity_skills").delete().eq("activity_id", id);
  } else {
    const { data, error } = await supabase.from("activities").insert(row).select("id").single();
    if (error) throw error;
    activityId = data.id;
  }
  if (skill_ids.length) {
    const { error } = await supabase
      .from("activity_skills")
      .insert(skill_ids.map((skill_id) => ({ activity_id: activityId!, skill_id })));
    if (error) throw error;
  }
}

export function fmtMinutes(m: number) {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}
