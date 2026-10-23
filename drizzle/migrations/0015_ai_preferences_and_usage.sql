CREATE TABLE public.ai_preferences (
 user_id uuid PRIMARY KEY,
 study_model text NOT NULL DEFAULT 'openai/gpt-5.4-mini' CHECK (study_model IN ('openai/gpt-5.4-mini','openai/gpt-5.4','openai/gpt-6-astra')),
 study_effort text NOT NULL DEFAULT 'low' CHECK (study_effort IN ('low','medium','high')),
 document_model text NOT NULL DEFAULT 'openai/gpt-5.4-mini' CHECK (document_model IN ('openai/gpt-5.4-mini','openai/gpt-5.4','openai/gpt-6-astra')),
 document_effort text NOT NULL DEFAULT 'low' CHECK (document_effort IN ('low','medium','high')),
 monthly_token_goal bigint CHECK (monthly_token_goal IS NULL OR monthly_token_goal > 0)
);
GRANT SELECT, INSERT, UPDATE ON public.ai_preferences TO authenticated;
GRANT ALL ON public.ai_preferences TO service_role;
ALTER TABLE public.ai_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_preferences_own_select ON public.ai_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ai_preferences_own_insert ON public.ai_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY ai_preferences_own_update ON public.ai_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TABLE public.ai_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 feature text NOT NULL, model text NOT NULL, effort text NOT NULL,
 status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','completed','incomplete','failed','aborted')),
 input_tokens bigint CHECK (input_tokens >= 0), output_tokens bigint CHECK (output_tokens >= 0),
 reasoning_tokens bigint CHECK (reasoning_tokens >= 0), cached_input_tokens bigint CHECK (cached_input_tokens >= 0),
 run_id text, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_usage_own_select ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX ai_usage_user_month ON public.ai_usage (user_id, created_at DESC);
CREATE FUNCTION public.ai_monthly_usage() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 WITH rows AS (
 SELECT * FROM public.ai_usage WHERE user_id = auth.uid() AND created_at >= (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')
 ), grouped AS (
 SELECT feature, model, effort, count(*) AS calls, count(*) FILTER (WHERE input_tokens IS NOT NULL AND output_tokens IS NOT NULL) AS measured_calls,
 sum(input_tokens) AS input_tokens, sum(output_tokens) AS output_tokens, sum(reasoning_tokens) AS reasoning_tokens,
 avg(input_tokens) FILTER (WHERE status = 'completed') AS avg_input, avg(output_tokens) FILTER (WHERE status = 'completed') AS avg_output
 FROM rows GROUP BY feature, model, effort
 )
 SELECT jsonb_build_object('month_start', date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo', 'groups', COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM grouped g), '[]'::jsonb), 'recent', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM (SELECT id, feature, model, effort, status, input_tokens, output_tokens, reasoning_tokens, created_at FROM rows ORDER BY created_at DESC LIMIT 20) r), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.ai_monthly_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_monthly_usage() TO authenticated, service_role;