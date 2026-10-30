ALTER TABLE public.activities ADD COLUMN material text, ADD COLUMN phase text, ADD COLUMN perception smallint;
ALTER TABLE public.activities ADD CONSTRAINT activities_material_valid CHECK (material IS NULL OR material IN ('video','pdf','law','questions','summary','book','other'));
ALTER TABLE public.activities ADD CONSTRAINT activities_phase_valid CHECK (phase IS NULL OR phase IN ('theory','fixation','review','deep','mock'));
ALTER TABLE public.activities ADD CONSTRAINT activities_perception_valid CHECK (perception IS NULL OR perception BETWEEN 1 AND 4);
UPDATE public.activities SET material = CASE WHEN type IN ('practice','mock','exam') THEN 'questions' WHEN type = 'reading' THEN 'pdf' WHEN type = 'course' THEN 'video' ELSE 'other' END,
  phase = CASE WHEN type IN ('mock','exam') THEN 'mock' WHEN type = 'practice' THEN 'fixation' ELSE NULL END;
COMMENT ON COLUMN public.activities.source_id IS 'DEPRECATED: replaced by material in the UI';