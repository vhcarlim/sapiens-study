ALTER TABLE public.activities ALTER COLUMN date SET DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date);
CREATE OR REPLACE FUNCTION public.schedule_knowledge_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='approved' AND length(trim(coalesce(NEW.knowledge_summary,'')))>=30 THEN
 INSERT INTO public.review_threads(activity_id,user_id,track_id,next_review_at) VALUES(NEW.id,NEW.user_id,NEW.track_id,greatest(((NEW.date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'),now())) ON CONFLICT(activity_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TABLE public.streak_freezes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, track_id uuid NOT NULL,
 protected_day date NOT NULL, purchased_at timestamptz NOT NULL DEFAULT now(), cost integer NOT NULL DEFAULT 100 CHECK(cost=100),
 UNIQUE(track_id,protected_day), FOREIGN KEY(track_id,user_id) REFERENCES public.study_tracks(id,user_id) ON DELETE CASCADE
);
GRANT SELECT ON public.streak_freezes TO authenticated;
GRANT ALL ON public.streak_freezes TO service_role;
ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_streak_freezes ON public.streak_freezes FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.study_xp_balance(p_track uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT sum(greatest(minutes,0)+greatest(quantity,0)*10+CASE WHEN length(trim(coalesce(knowledge_summary,'')))>0 THEN 20 ELSE 0 END) FROM public.activities WHERE track_id=p_track AND user_id=auth.uid() AND status='approved'),0)::integer + coalesce((SELECT sum(xp) FROM public.review_results WHERE track_id=p_track AND user_id=auth.uid()),0)::integer - coalesce((SELECT sum(cost) FROM public.streak_freezes WHERE track_id=p_track AND user_id=auth.uid()),0)::integer;
$$;
REVOKE ALL ON FUNCTION public.study_xp_balance(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.study_xp_balance(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.purchase_streak_freeze(p_track uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date; yesterday date; used integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 PERFORM id FROM public.study_tracks WHERE id=p_track AND user_id=uid AND NOT archived FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trilha indisponível'; END IF;
 yesterday:=today-1;
 IF EXISTS(SELECT 1 FROM public.activities WHERE track_id=p_track AND user_id=uid AND status='approved' AND date=yesterday AND (minutes>0 OR quantity>0 OR length(trim(coalesce(knowledge_summary,'')))>0)) OR EXISTS(SELECT 1 FROM public.review_results WHERE track_id=p_track AND user_id=uid AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date=yesterday) THEN RAISE EXCEPTION 'Ontem já tem estudos registrados'; END IF;
 IF EXISTS(SELECT 1 FROM public.streak_freezes WHERE track_id=p_track AND user_id=uid AND protected_day=yesterday) THEN RAISE EXCEPTION 'Ontem já está protegido'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.activities WHERE track_id=p_track AND user_id=uid AND status='approved' AND date=yesterday-1 AND (minutes>0 OR quantity>0 OR length(trim(coalesce(knowledge_summary,'')))>0)) AND NOT EXISTS(SELECT 1 FROM public.review_results WHERE track_id=p_track AND user_id=uid AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date=yesterday-1) AND NOT EXISTS(SELECT 1 FROM public.streak_freezes WHERE track_id=p_track AND user_id=uid AND protected_day=yesterday-1) THEN RAISE EXCEPTION 'Não há uma ofensiva recente para proteger'; END IF;
 SELECT count(*) INTO used FROM public.streak_freezes WHERE track_id=p_track AND user_id=uid AND date_trunc('month',purchased_at AT TIME ZONE 'America/Sao_Paulo')=date_trunc('month',today::timestamp);
 IF used>=2 THEN RAISE EXCEPTION 'Limite de dois protetores neste mês'; END IF;
 IF public.study_xp_balance(p_track)<100 THEN RAISE EXCEPTION 'Você precisa de 100 XP disponíveis'; END IF;
 INSERT INTO public.streak_freezes(user_id,track_id,protected_day) VALUES(uid,p_track,yesterday);
END $$;
REVOKE ALL ON FUNCTION public.purchase_streak_freeze(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.purchase_streak_freeze(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.streak_protection_state(p_track uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('balance',public.study_xp_balance(p_track),'days',coalesce((SELECT jsonb_agg(protected_day ORDER BY protected_day) FROM public.streak_freezes WHERE track_id=p_track AND user_id=auth.uid()),'[]'::jsonb),'used', (SELECT count(*) FROM public.streak_freezes WHERE track_id=p_track AND user_id=auth.uid() AND date_trunc('month',purchased_at AT TIME ZONE 'America/Sao_Paulo')=date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')));
$$;
REVOKE ALL ON FUNCTION public.streak_protection_state(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.streak_protection_state(uuid) TO authenticated;