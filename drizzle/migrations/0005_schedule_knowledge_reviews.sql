CREATE OR REPLACE FUNCTION public.schedule_knowledge_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='approved' AND length(trim(coalesce(NEW.knowledge_summary,'')))>0 THEN
 INSERT INTO public.review_threads(activity_id,user_id,track_id,next_review_at) VALUES(NEW.id,NEW.user_id,NEW.track_id,greatest(NEW.date::timestamptz+interval '1 day',now())) ON CONFLICT(activity_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER schedule_knowledge_review AFTER INSERT OR UPDATE OF knowledge_summary,status ON public.activities FOR EACH ROW EXECUTE FUNCTION public.schedule_knowledge_review();
INSERT INTO public.review_threads(activity_id,user_id,track_id,next_review_at) SELECT id,user_id,track_id,greatest(date::timestamptz+interval '1 day',now()) FROM public.activities WHERE status='approved' AND length(trim(coalesce(knowledge_summary,'')))>0 ON CONFLICT(activity_id) DO NOTHING;