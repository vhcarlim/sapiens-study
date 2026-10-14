ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS skills_user_shared_idx ON public.skills(user_id) WHERE shared;

CREATE OR REPLACE FUNCTION public.validate_activity_skill_track()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.activities a JOIN public.skills s ON (s.track_id = a.track_id OR s.shared) WHERE a.id = NEW.activity_id AND s.id = NEW.skill_id AND a.user_id = NEW.user_id AND s.user_id = NEW.user_id) THEN RAISE EXCEPTION 'Competência de outra trilha'; END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.finish_active_review(p_thread uuid, p_user uuid, p_round uuid, p_score integer, p_feedback text, p_messages jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
 SELECT s.id,p_user,coalesce(s.track_id,t.track_id),least(100,greatest(0,50+delta)),reward,1,p_score FROM public.activity_skills l JOIN public.skills s ON s.id=l.skill_id
 WHERE l.activity_id=a.id AND (s.track_id=t.track_id OR s.shared) AND s.user_id=p_user
 ON CONFLICT(skill_id) DO UPDATE SET mastery=least(100,greatest(0,skill_mastery.mastery+delta)), review_xp=skill_mastery.review_xp+reward,reviews=skill_mastery.reviews+1,last_score=p_score,updated_at=now();
 UPDATE public.review_threads SET messages=p_messages,last_score=p_score,question_open=false,busy_until=NULL,stage=new_stage,interval_days=days,next_review_at=now()+make_interval(days=>days) WHERE id=t.id;
END $function$;