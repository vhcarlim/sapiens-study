CREATE OR REPLACE FUNCTION public.validate_study_track() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.track_id IS NULL THEN
  SELECT id INTO NEW.track_id FROM public.study_tracks WHERE user_id = NEW.user_id AND NOT archived ORDER BY created_at LIMIT 1;
 END IF;
 IF NEW.track_id IS NULL THEN RAISE EXCEPTION 'Selecione uma trilha'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF NEW.track_id IS DISTINCT FROM OLD.track_id THEN RAISE EXCEPTION 'A trilha de um registro não pode ser alterada'; END IF;
 END IF;
 IF TG_TABLE_NAME = 'activities' THEN
  IF NEW.source_id IS NOT NULL THEN
   IF NOT EXISTS (SELECT 1 FROM public.sources WHERE id = NEW.source_id AND user_id = NEW.user_id AND track_id = NEW.track_id) THEN RAISE EXCEPTION 'Fonte de outra trilha'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;