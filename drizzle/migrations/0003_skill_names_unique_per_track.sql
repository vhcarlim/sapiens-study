ALTER TABLE public.skills DROP CONSTRAINT skills_user_id_name_key;
ALTER TABLE public.skills ADD CONSTRAINT skills_track_name_key UNIQUE (track_id, name);