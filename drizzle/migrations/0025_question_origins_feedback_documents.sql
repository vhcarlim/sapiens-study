ALTER TABLE public.question_bank
 ADD COLUMN source_origin text NOT NULL DEFAULT 'ai_ephemeral' CHECK (source_origin IN ('official','ai_community','ai_ephemeral')),
 ADD COLUMN grounding_type text NOT NULL DEFAULT 'general_ai' CHECK (grounding_type IN ('exam_official','user_rag','general_ai')),
 ADD COLUMN likes_count integer NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
 ADD COLUMN reports_count integer NOT NULL DEFAULT 0 CHECK (reports_count >= 0),
 ADD COLUMN quarantined boolean NOT NULL DEFAULT false,
 ADD COLUMN exam_year integer,
 ADD COLUMN document_name text NOT NULL DEFAULT '',
 ADD COLUMN grounding_chunks jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.question_bank SET source_origin = CASE WHEN source = 'official_exam' THEN 'official' ELSE 'ai_ephemeral' END, grounding_type = CASE WHEN source = 'official_exam' THEN 'exam_official' ELSE 'general_ai' END, reports_count = report_count, quarantined = report_count > 0, status = CASE WHEN source <> 'official_exam' THEN 'pending' ELSE status END, exam_year = CASE WHEN payload->'origin'->>'year' ~ '^\d{4}$' THEN (payload->'origin'->>'year')::integer ELSE NULL END;
CREATE INDEX bank_quality_lookup ON public.question_bank(source_origin,subject_key,topic_key,board_key,exam_year) WHERE NOT quarantined;
DROP POLICY "active questions readable" ON public.question_bank;
CREATE POLICY "quality questions readable" ON public.question_bank FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid() OR (status = 'active' AND NOT quarantined AND source_origin IN ('official','ai_community') AND grounding_type <> 'user_rag'));
CREATE POLICY "admins insert official questions" ON public.question_bank FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT ON public.question_bank TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_question_origin() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND OLD.source_origin <> 'official' AND NEW.source_origin = 'official' THEN RAISE EXCEPTION 'AI questions cannot become official'; END IF;
 IF NEW.source_origin = 'official' AND NEW.grounding_type <> 'exam_official' THEN RAISE EXCEPTION 'Official questions require exam provenance'; END IF;
 IF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status <> 'active' AND public.has_role(auth.uid(),'admin') THEN
   NEW.quarantined := false;
   IF NEW.source_origin = 'ai_ephemeral' THEN NEW.source_origin := 'ai_community'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_question_origin BEFORE INSERT OR UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.guard_question_origin();
CREATE TABLE public.question_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
 vote text NOT NULL CHECK (vote IN ('like','report')),
 report_reason text CHECK (char_length(report_reason) <= 200),
 report_details text CHECK (char_length(report_details) <= 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,question_id,vote),
 CHECK (vote <> 'report' OR nullif(trim(report_reason),'') IS NOT NULL)
);
GRANT SELECT, INSERT ON public.question_feedback TO authenticated;
GRANT ALL ON public.question_feedback TO service_role;
ALTER TABLE public.question_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own feedback or admin" ON public.question_feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vote visible questions" ON public.question_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS(SELECT 1 FROM public.question_bank q WHERE q.id = question_id AND (q.created_by = auth.uid() OR (q.status='active' AND NOT q.quarantined AND q.source_origin IN ('official','ai_community') AND q.grounding_type <> 'user_rag') OR public.has_role(auth.uid(),'admin'))));
CREATE OR REPLACE FUNCTION public.apply_question_feedback() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.question_bank SET likes_count = likes_count + CASE WHEN NEW.vote='like' THEN 1 ELSE 0 END, reports_count = reports_count + CASE WHEN NEW.vote='report' THEN 1 ELSE 0 END, report_count = report_count + CASE WHEN NEW.vote='report' THEN 1 ELSE 0 END, quarantined = quarantined OR NEW.vote='report', status = CASE WHEN NEW.vote='report' THEN 'disabled' ELSE status END WHERE id = NEW.question_id;
 UPDATE public.question_bank SET source_origin='ai_community',status='active' WHERE id=NEW.question_id AND source_origin='ai_ephemeral' AND likes_count >= 3 AND reports_count=0 AND NOT quarantined;
 RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_question_feedback() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER apply_question_feedback AFTER INSERT ON public.question_feedback FOR EACH ROW EXECUTE FUNCTION public.apply_question_feedback();
CREATE OR REPLACE FUNCTION public.on_question_report() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.question_bank SET report_count=report_count+1,reports_count=reports_count+1,quarantined=true,status='disabled' WHERE id=NEW.question_id;
 RETURN NEW;
END $$;
COMMENT ON TABLE public.question_reports IS 'DEPRECATED: new Arena feedback uses question_feedback; legacy reports still quarantine immediately';
CREATE TABLE public.source_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 track_id uuid NOT NULL REFERENCES public.study_tracks(id) ON DELETE CASCADE,
 source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
 content text NOT NULL CHECK (char_length(content) BETWEEN 20 AND 500000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.source_documents TO authenticated;
GRANT ALL ON public.source_documents TO service_role;
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own track documents" ON public.source_documents FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.study_tracks t WHERE t.id=track_id AND t.user_id=auth.uid()) AND (source_id IS NULL OR EXISTS(SELECT 1 FROM public.sources s WHERE s.id=source_id AND s.user_id=auth.uid() AND s.track_id=source_documents.track_id)));
CREATE INDEX source_documents_track ON public.source_documents(user_id,track_id);