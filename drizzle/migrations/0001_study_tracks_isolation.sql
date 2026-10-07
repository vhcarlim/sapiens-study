CREATE TABLE public.study_tracks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 name text NOT NULL,
 color text NOT NULL DEFAULT 'green',
 archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id, user_id),
 CONSTRAINT track_name_valid CHECK (length(btrim(name)) BETWEEN 1 AND 60),
 CONSTRAINT track_color_valid CHECK (color IN ('green','blue','cyan','amber','rose','violet'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_tracks TO authenticated;
GRANT ALL ON public.study_tracks TO service_role;
ALTER TABLE public.study_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tracks" ON public.study_tracks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.sources ADD COLUMN track_id uuid;
ALTER TABLE public.skills ADD COLUMN track_id uuid;
ALTER TABLE public.activities ADD COLUMN track_id uuid;
INSERT INTO public.study_tracks (user_id, name, color)
SELECT DISTINCT user_id, 'Meus estudos', 'green' FROM (
 SELECT user_id FROM public.sources UNION SELECT user_id FROM public.skills UNION SELECT user_id FROM public.activities
) existing;
UPDATE public.sources s SET track_id = t.id FROM public.study_tracks t WHERE s.user_id = t.user_id;
UPDATE public.skills s SET track_id = t.id FROM public.study_tracks t WHERE s.user_id = t.user_id;
UPDATE public.activities a SET track_id = t.id FROM public.study_tracks t WHERE a.user_id = t.user_id;
ALTER TABLE public.sources ADD CONSTRAINT sources_track_owner_fkey FOREIGN KEY (track_id,user_id) REFERENCES public.study_tracks(id,user_id) ON DELETE CASCADE;
ALTER TABLE public.skills ADD CONSTRAINT skills_track_owner_fkey FOREIGN KEY (track_id,user_id) REFERENCES public.study_tracks(id,user_id) ON DELETE CASCADE;
ALTER TABLE public.activities ADD CONSTRAINT activities_track_owner_fkey FOREIGN KEY (track_id,user_id) REFERENCES public.study_tracks(id,user_id) ON DELETE CASCADE;
CREATE INDEX sources_track_idx ON public.sources(track_id);
CREATE INDEX skills_track_idx ON public.skills(track_id);
CREATE INDEX activities_track_status_idx ON public.activities(track_id,status,date);
CREATE OR REPLACE FUNCTION public.validate_study_track() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.track_id IS NULL THEN
  SELECT id INTO NEW.track_id FROM public.study_tracks WHERE user_id = NEW.user_id AND NOT archived ORDER BY created_at LIMIT 1;
 END IF;
 IF NEW.track_id IS NULL THEN RAISE EXCEPTION 'Selecione uma trilha'; END IF;
 IF TG_OP = 'UPDATE' AND NEW.track_id IS DISTINCT FROM OLD.track_id THEN RAISE EXCEPTION 'A trilha de um registro não pode ser alterada'; END IF;
 IF TG_TABLE_NAME = 'activities' AND NEW.source_id IS NOT NULL THEN
  IF NOT EXISTS (SELECT 1 FROM public.sources WHERE id = NEW.source_id AND user_id = NEW.user_id AND track_id = NEW.track_id) THEN RAISE EXCEPTION 'Fonte de outra trilha'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sources_validate_track BEFORE INSERT OR UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.validate_study_track();
CREATE TRIGGER skills_validate_track BEFORE INSERT OR UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.validate_study_track();
CREATE TRIGGER activities_validate_track BEFORE INSERT OR UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.validate_study_track();
CREATE OR REPLACE FUNCTION public.validate_activity_skill_track() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.activities a JOIN public.skills s ON s.track_id = a.track_id WHERE a.id = NEW.activity_id AND s.id = NEW.skill_id AND a.user_id = NEW.user_id AND s.user_id = NEW.user_id) THEN RAISE EXCEPTION 'Competência de outra trilha'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER activity_skills_validate_track BEFORE INSERT OR UPDATE ON public.activity_skills FOR EACH ROW EXECUTE FUNCTION public.validate_activity_skill_track();
CREATE OR REPLACE FUNCTION public.seed_user_defaults() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tid uuid;
BEGIN
 INSERT INTO public.study_tracks (user_id,name,color) VALUES (NEW.id,'Meus estudos','green') RETURNING id INTO tid;
 INSERT INTO public.sources (user_id,track_id,name,color,kind) VALUES
 (NEW.id,tid,'Duolingo','#58cc02','duolingo'),(NEW.id,tid,'TryHackMe','#ef4444','tryhackme'),(NEW.id,tid,'Alura','#3b82f6','manual'),(NEW.id,tid,'Coursera','#0ea5e9','manual'),(NEW.id,tid,'PortSwigger','#f97316','manual');
 INSERT INTO public.skills (user_id,track_id,name,color) VALUES
 (NEW.id,tid,'Idiomas','#58cc02'),(NEW.id,tid,'Redes','#22d3ee'),(NEW.id,tid,'Web Security','#f97316'),(NEW.id,tid,'APIs','#a78bfa'),(NEW.id,tid,'Linux','#facc15'),(NEW.id,tid,'Programação','#3b82f6');
 RETURN NEW;
END $$;