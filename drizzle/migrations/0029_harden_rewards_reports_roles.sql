CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select _user_id = auth.uid() and exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "insert own report" ON public.question_reports;
REVOKE INSERT, UPDATE, DELETE ON public.question_reports FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_activity_amounts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total integer;
BEGIN
  IF NEW.minutes < 0 OR NEW.minutes > 720 THEN RAISE EXCEPTION 'Duração inválida (máx. 12h por atividade)'; END IF;
  IF NEW.quantity < 0 OR NEW.quantity > 500 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF NEW.xp < 0 OR NEW.xp > 10000 THEN RAISE EXCEPTION 'XP inválido'; END IF;
  IF NEW.date > (now() AT TIME ZONE 'America/Sao_Paulo')::date + 1 THEN RAISE EXCEPTION 'Data no futuro'; END IF;
  IF NEW.status = 'approved' THEN
    SELECT coalesce(sum(minutes),0) INTO total FROM public.activities
     WHERE user_id = NEW.user_id AND date = NEW.date AND status = 'approved' AND id <> NEW.id;
    IF total + NEW.minutes > 1440 THEN RAISE EXCEPTION 'Um dia tem no máximo 24h de estudo'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_activity_amounts() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS activities_validate_amounts ON public.activities;
CREATE TRIGGER activities_validate_amounts BEFORE INSERT OR UPDATE OF minutes, quantity, xp, date, status ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.validate_activity_amounts();