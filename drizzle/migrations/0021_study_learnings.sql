CREATE TABLE public.study_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  track_id uuid NOT NULL REFERENCES public.study_tracks(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES public.skills(id) ON DELETE SET NULL,
  topic text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('rule','trap','mistake','chat','note')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  detail text CHECK (detail IS NULL OR char_length(detail) <= 4000),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('arena','manual')),
  session_key text,
  starred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_learnings TO authenticated;
GRANT ALL ON public.study_learnings TO service_role;
ALTER TABLE public.study_learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own learnings" ON public.study_learnings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.study_tracks t WHERE t.id = track_id AND t.user_id = auth.uid()));
CREATE INDEX study_learnings_track_idx ON public.study_learnings(track_id, created_at DESC);