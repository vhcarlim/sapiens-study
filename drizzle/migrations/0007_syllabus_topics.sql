ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS syllabus_topic text;