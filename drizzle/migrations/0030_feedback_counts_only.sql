CREATE OR REPLACE FUNCTION public.apply_question_feedback()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 -- Likes and reports only count; only an admin decides to disable or promote a question.
 UPDATE public.question_bank SET likes_count = likes_count + CASE WHEN NEW.vote='like' THEN 1 ELSE 0 END, reports_count = reports_count + CASE WHEN NEW.vote='report' THEN 1 ELSE 0 END, report_count = report_count + CASE WHEN NEW.vote='report' THEN 1 ELSE 0 END WHERE id = NEW.question_id;
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.on_question_report()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 UPDATE public.question_bank SET report_count=report_count+1,reports_count=reports_count+1 WHERE id=NEW.question_id;
 RETURN NEW;
END $function$;