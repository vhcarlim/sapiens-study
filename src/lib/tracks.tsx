import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StudyTrack = Tables<"study_tracks">;
export const TRACK_COLORS = [
  { value: "green", label: "Verde esmeralda" },
  { value: "forest", label: "Verde floresta" },
  { value: "teal", label: "Azul petróleo" },
  { value: "cyan", label: "Turquesa" },
  { value: "blue", label: "Azul cobalto" },
  { value: "indigo", label: "Índigo" },
  { value: "violet", label: "Violeta" },
  { value: "plum", label: "Ameixa" },
  { value: "magenta", label: "Magenta" },
  { value: "rose", label: "Framboesa" },
  { value: "coral", label: "Coral" },
  { value: "terracotta", label: "Terracota" },
  { value: "amber", label: "Âmbar" },
  { value: "bronze", label: "Bronze" },
] as const;

type TrackContextValue = {
  tracks: StudyTrack[];
  track: StudyTrack | undefined;
  trackId: string;
  selectTrack: (id: string) => void;
  loading: boolean;
  error: boolean;
};
// Keep one context instance across hot reloads so providers and consumers never diverge.
const globalScope = globalThis as typeof globalThis & { __sapiensTrackContext?: React.Context<TrackContextValue | null> };
const TrackContext = (globalScope.__sapiensTrackContext ??= createContext<TrackContextValue | null>(null));

export function TrackProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { data: tracks = [], isPending, isError } = useQuery({
    queryKey: ["tracks", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_tracks").select("*").eq("user_id", userId).order("position").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [selectedId, setSelectedId] = useState("");
  const storageKey = `xp-log-track:${userId}`;
  useEffect(() => {
    try { setSelectedId(localStorage.getItem(storageKey) ?? ""); } catch { /* Storage is optional. */ }
  }, [storageKey]);
  const track = tracks.find((t) => t.id === selectedId && !t.archived) ?? tracks.find((t) => !t.archived);
  const selectTrack = (id: string) => {
    setSelectedId(id);
    try { localStorage.setItem(storageKey, id); } catch { /* Storage is optional. */ }
  };
  return <TrackContext.Provider value={{ tracks, track, trackId: track?.id ?? "", selectTrack, loading: isPending, error: isError }}>{children}</TrackContext.Provider>;
}

export function useTrack() {
  const value = useContext(TrackContext);
  if (!value) throw new Error("Trilha indisponível");
  return value;
}