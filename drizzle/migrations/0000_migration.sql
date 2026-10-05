CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#22d3ee',
  kind text NOT NULL DEFAULT 'manual', -- manual | duolingo | tryhackme
  username text,
  active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sources" ON public.sources FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#a3e635',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own skills" ON public.skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT current_date,
  type text NOT NULL DEFAULT 'lesson', -- lesson | room | course | certificate | level | other
  title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  minutes integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'approved', -- pending | approved | rejected
  external_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX activities_external_key ON public.activities(user_id, external_key) WHERE external_key IS NOT NULL;
CREATE INDEX activities_user_date ON public.activities(user_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activities" ON public.activities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.activity_skills (
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  PRIMARY KEY (activity_id, skill_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_skills TO authenticated;
GRANT ALL ON public.activity_skills TO service_role;
ALTER TABLE public.activity_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity_skills" ON public.activity_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.import_snapshots (
  source_id uuid PRIMARY KEY REFERENCES public.sources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_snapshots TO authenticated;
GRANT ALL ON public.import_snapshots TO service_role;
ALTER TABLE public.import_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own snapshots" ON public.import_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed default sources & skills for each new user
CREATE OR REPLACE FUNCTION public.seed_user_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sources (user_id, name, color, kind) VALUES
    (NEW.id, 'Duolingo', '#58cc02', 'duolingo'),
    (NEW.id, 'TryHackMe', '#ef4444', 'tryhackme'),
    (NEW.id, 'Alura', '#3b82f6', 'manual'),
    (NEW.id, 'Coursera', '#0ea5e9', 'manual'),
    (NEW.id, 'PortSwigger', '#f97316', 'manual');
  INSERT INTO public.skills (user_id, name, color) VALUES
    (NEW.id, 'Idiomas', '#58cc02'),
    (NEW.id, 'Redes', '#22d3ee'),
    (NEW.id, 'Web Security', '#f97316'),
    (NEW.id, 'APIs', '#a78bfa'),
    (NEW.id, 'Linux', '#facc15'),
    (NEW.id, 'Programação', '#3b82f6');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_seed AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.seed_user_defaults();