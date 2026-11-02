CREATE TABLE public.arena_question_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  track_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  topic text NOT NULL,
  fingerprint text NOT NULL CHECK (char_length(fingerprint) <= 400),
  angle text,
  repeated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX arena_qh_lookup ON public.arena_question_history (user_id, skill_id, topic, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arena_question_history TO authenticated;
GRANT ALL ON public.arena_question_history TO service_role;
ALTER TABLE public.arena_question_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history select" ON public.arena_question_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own history insert" ON public.arena_question_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own history update" ON public.arena_question_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own history delete" ON public.arena_question_history FOR DELETE TO authenticated USING (auth.uid() = user_id);