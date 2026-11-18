ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS byok boolean NOT NULL DEFAULT false;

CREATE TABLE public.ai_entitlements (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','basico','avancado')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_entitlements TO authenticated;
GRANT ALL ON public.ai_entitlements TO service_role;
ALTER TABLE public.ai_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entitlement read" ON public.ai_entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.user_ai_keys (
  user_id uuid PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('openai','anthropic','gemini','openrouter')),
  model text NOT NULL,
  key_cipher text NOT NULL,
  key_iv text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_ai_keys TO service_role;
ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_key text NOT NULL,
  subject_key text NOT NULL,
  topic_key text NOT NULL,
  fingerprint text NOT NULL DEFAULT '',
  payload jsonb NOT NULL,
  source text NOT NULL DEFAULT 'ai',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX question_bank_lookup ON public.question_bank (board_key, subject_key, topic_key);
GRANT SELECT ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank readable by members" ON public.question_bank FOR SELECT TO authenticated USING (true);

CREATE TABLE public.question_bank_seen (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
GRANT SELECT, INSERT, DELETE ON public.question_bank_seen TO authenticated;
GRANT ALL ON public.question_bank_seen TO service_role;
ALTER TABLE public.question_bank_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own seen" ON public.question_bank_seen FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.ai_quota_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'plan', coalesce((SELECT plan FROM ai_entitlements WHERE user_id = auth.uid()), 'free'),
    'used', (SELECT count(*) FROM ai_usage WHERE user_id = auth.uid() AND byok = false
             AND created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')),
    'byok_provider', (SELECT provider FROM user_ai_keys WHERE user_id = auth.uid()),
    'byok_model', (SELECT model FROM user_ai_keys WHERE user_id = auth.uid())
  )
$$;
REVOKE ALL ON FUNCTION public.ai_quota_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ai_quota_status() TO authenticated;