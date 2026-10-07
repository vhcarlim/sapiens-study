import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StudyTrack = Tables<"study_tracks">;
export const TRACK_COLORS = [
  { value: "green", label: "Verde" },
  { value: "blue", label: "Azul" },
  { value: "cyan", label: "Ciano" },
  { value: "amber", label: "Âmbar" },
  { value: "rose", label: "Rosa" },
  { value: "violet", label: "Violeta" },
] as const;

type TrackContextValue = {
  tracks: StudyTrack[];
  track: StudyTrack | undefined;
  trackId: string;
  selectTrack: (id: string) => void;
  loading: boolean;
  error: boolean;
};
const TrackContext = createContext<TrackContextValue | null>(null);

export function TrackProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { data: tracks = [], isPending, isError } = useQuery({
    queryKey: ["tracks", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_tracks").select("*").eq("user_id", userId).order("created_at");
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