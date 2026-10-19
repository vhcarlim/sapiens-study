ALTER TABLE public.study_tracks ADD COLUMN exam_date date;

CREATE TABLE public.past_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  track_id uuid NOT NULL,
  title text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_correct integer,
  score_total integer,
  taken_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT past_exams_track_owner_fkey FOREIGN KEY (track_id, user_id) REFERENCES public.study_tracks(id, user_id) ON DELETE CASCADE,
  CONSTRAINT past_exams_score_valid CHECK (score_total IS NULL OR (score_total > 0 AND score_correct >= 0 AND score_correct <= score_total))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.past_exams TO authenticated;
GRANT ALL ON public.past_exams TO service_role;
ALTER TABLE public.past_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own past_exams" ON public.past_exams FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX past_exams_track_idx ON public.past_exams(track_id);