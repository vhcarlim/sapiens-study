CREATE TABLE public.study_plan_settings (
  track_id uuid PRIMARY KEY REFERENCES public.study_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  weekly_minutes integer[] NOT NULL DEFAULT ARRAY[120,120,120,120,120,240,0],
  block_minutes integer NOT NULL DEFAULT 50 CHECK (block_minutes BETWEEN 20 AND 180),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (array_length(weekly_minutes,1) = 7)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plan_settings TO authenticated;
GRANT ALL ON public.study_plan_settings TO service_role;
ALTER TABLE public.study_plan_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan settings" ON public.study_plan_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.study_tracks t WHERE t.id = track_id AND t.user_id = auth.uid()));

CREATE TABLE public.study_plan_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.study_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  week_start date NOT NULL,
  pinned uuid[] NOT NULL DEFAULT '{}',
  skipped uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plan_overrides TO authenticated;
GRANT ALL ON public.study_plan_overrides TO service_role;
ALTER TABLE public.study_plan_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan overrides" ON public.study_plan_overrides FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.study_tracks t WHERE t.id = track_id AND t.user_id = auth.uid()));