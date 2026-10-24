CREATE TABLE public.track_exam_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  track_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  total_questions integer NOT NULL DEFAULT 0 CHECK (total_questions BETWEEN 0 AND 1000),
  weight numeric(5,2) NOT NULL DEFAULT 1 CHECK (weight > 0 AND weight <= 100),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT track_exam_blocks_track_owner_fkey FOREIGN KEY (track_id, user_id) REFERENCES public.study_tracks(id, user_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_exam_blocks TO authenticated;
GRANT ALL ON public.track_exam_blocks TO service_role;
ALTER TABLE public.track_exam_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam blocks" ON public.track_exam_blocks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.track_skill_rules (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  track_id uuid NOT NULL,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  block_id uuid REFERENCES public.track_exam_blocks(id) ON DELETE SET NULL,
  questions integer CHECK (questions IS NULL OR questions BETWEEN 0 AND 1000),
  weight numeric(5,2) CHECK (weight IS NULL OR (weight > 0 AND weight <= 100)),
  difficulty smallint NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (track_id, skill_id),
  CONSTRAINT track_skill_rules_track_owner_fkey FOREIGN KEY (track_id, user_id) REFERENCES public.study_tracks(id, user_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_skill_rules TO authenticated;
GRANT ALL ON public.track_skill_rules TO service_role;
ALTER TABLE public.track_skill_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own skill rules" ON public.track_skill_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_skill_rule()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills s WHERE s.id = NEW.skill_id AND s.user_id = NEW.user_id AND (s.track_id = NEW.track_id OR s.shared)) THEN
    RAISE EXCEPTION 'skill not available in this track';
  END IF;
  IF NEW.block_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.track_exam_blocks b WHERE b.id = NEW.block_id AND b.track_id = NEW.track_id AND b.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'block not in this track';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER validate_skill_rule BEFORE INSERT OR UPDATE ON public.track_skill_rules FOR EACH ROW EXECUTE FUNCTION public.validate_skill_rule();