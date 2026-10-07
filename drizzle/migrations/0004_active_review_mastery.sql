ALTER TABLE public.activities ADD COLUMN knowledge_summary text;
ALTER TABLE public.activities ADD CONSTRAINT knowledge_summary_length CHECK (length(knowledge_summary) <= 12000);
CREATE TABLE public.review_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL UNIQUE REFERENCES public.activities(id) ON DELETE CASCADE,
 user_id uuid NOT NULL, track_id uuid NOT NULL, messages jsonb NOT NULL DEFAULT '[]',
 next_review_at timestamptz NOT NULL DEFAULT now(), stage integer NOT NULL DEFAULT 0, interval_days integer NOT NULL DEFAULT 1,
 question_open boolean NOT NULL DEFAULT false, round_id uuid, busy_until timestamptz, last_score integer,
 FOREIGN KEY(track_id,user_id) REFERENCES public.study_tracks(id,user_id) ON DELETE CASCADE
);
GRANT SELECT ON public.review_threads TO authenticated;
GRANT ALL ON public.review_threads TO service_role;
ALTER TABLE public.review_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_review_threads ON public.review_threads FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.review_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), round_id uuid NOT NULL UNIQUE, thread_id uuid NOT NULL REFERENCES public.review_threads(id) ON DELETE CASCADE,
 activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE, track_id uuid NOT NULL, user_id uuid NOT NULL,
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100), mastery_delta integer NOT NULL, xp integer NOT NULL DEFAULT 0,
 feedback text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(track_id,user_id) REFERENCES public.study_tracks(id,user_id) ON DELETE CASCADE
);
GRANT SELECT ON public.review_results TO authenticated;
GRANT ALL ON public.review_results TO service_role;
ALTER TABLE public.review_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_review_results ON public.review_results FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.skill_mastery (
 skill_id uuid PRIMARY KEY REFERENCES public.skills(id) ON DELETE CASCADE, user_id uuid NOT NULL, track_id uuid NOT NULL,
 mastery integer NOT NULL DEFAULT 50 CHECK(mastery BETWEEN 0 AND 100), review_xp integer NOT NULL DEFAULT 0,
 reviews integer NOT NULL DEFAULT 0, last_score integer, updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(track_id,user_id) REFERENCES public.study_tracks(id,user_id) ON DELETE CASCADE
);
GRANT SELECT ON public.skill_mastery TO authenticated;
GRANT ALL ON public.skill_mastery TO service_role;
ALTER TABLE public.skill_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_skill_mastery ON public.skill_mastery FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.review_ai_access (
 user_id uuid PRIMARY KEY, denied boolean NOT NULL DEFAULT false, reason text, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.review_ai_access TO authenticated;
GRANT ALL ON public.review_ai_access TO service_role;
ALTER TABLE public.review_ai_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_review_ai_access ON public.review_ai_access FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.finish_active_review(p_thread uuid,p_user uuid,p_round uuid,p_score integer,p_feedback text,p_messages jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.review_threads; a public.activities; delta integer; reward integer; new_stage integer; days integer;
BEGIN
 SELECT * INTO t FROM public.review_threads WHERE id=p_thread AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR NOT t.question_open OR t.round_id IS DISTINCT FROM p_round THEN RAISE EXCEPTION 'Revisão indisponível'; END IF;
 SELECT * INTO a FROM public.activities WHERE id=t.activity_id AND user_id=p_user AND track_id=t.track_id AND status='approved';
 IF NOT FOUND THEN RAISE EXCEPTION 'Atividade indisponível'; END IF;
 IF p_score NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Nota inválida'; END IF;
 delta := CASE WHEN p_score>=70 THEN 8 WHEN p_score>=40 THEN -3 ELSE -5 END;
 reward := CASE WHEN p_score>=70 THEN 25 ELSE 0 END;
 new_stage := CASE WHEN p_score>=70 THEN least(t.stage+1,5) ELSE greatest(t.stage-1,0) END;
 days := CASE WHEN p_score<70 THEN 1 ELSE (ARRAY[1,7,30,60,90,180])[new_stage+1] END;
 INSERT INTO public.review_results(round_id,thread_id,activity_id,track_id,user_id,score,mastery_delta,xp,feedback)
 VALUES(p_round,t.id,a.id,t.track_id,p_user,p_score,delta,reward,p_feedback);
 INSERT INTO public.skill_mastery(skill_id,user_id,track_id,mastery,review_xp,reviews,last_score)
 SELECT s.id,p_user,t.track_id,least(100,greatest(0,50+delta)),reward,1,p_score FROM public.activity_skills l JOIN public.skills s ON s.id=l.skill_id
 WHERE l.activity_id=a.id AND s.track_id=t.track_id AND s.user_id=p_user
 ON CONFLICT(skill_id) DO UPDATE SET mastery=least(100,greatest(0,skill_mastery.mastery+delta)), review_xp=skill_mastery.review_xp+reward,reviews=skill_mastery.reviews+1,last_score=p_score,updated_at=now();
 UPDATE public.review_threads SET messages=p_messages,last_score=p_score,question_open=false,busy_until=NULL,stage=new_stage,interval_days=days,next_review_at=now()+make_interval(days=>days) WHERE id=t.id;
END $$;
REVOKE ALL ON FUNCTION public.finish_active_review(uuid,uuid,uuid,integer,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_active_review(uuid,uuid,uuid,integer,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_active_review(p_thread uuid,p_user uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH claimed AS (UPDATE public.review_threads SET busy_until=now()+interval '15 minutes' WHERE id=p_thread AND user_id=p_user AND (busy_until IS NULL OR busy_until<now()) RETURNING id) SELECT EXISTS(SELECT 1 FROM claimed);
$$;
REVOKE ALL ON FUNCTION public.claim_active_review(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_active_review(uuid,uuid) TO service_role;