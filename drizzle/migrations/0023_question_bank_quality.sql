create type public.app_role as enum ('admin', 'moderator', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

alter table public.question_bank
  add column status text not null default 'active' check (status in ('pending','active','disabled')),
  add column origin_label text not null default '',
  add column report_count integer not null default 0;
create index question_bank_subject_status on public.question_bank (subject_key, board_key, status);
create index question_bank_origin_status on public.question_bank (origin_label, status);

drop policy "bank readable by members" on public.question_bank;
create policy "active questions readable" on public.question_bank for select to authenticated
  using (status = 'active' or public.has_role(auth.uid(), 'admin'));
create policy "admins update questions" on public.question_bank for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "admins delete questions" on public.question_bank for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
grant update, delete on public.question_bank to authenticated;

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_bank(id) on delete cascade,
  user_id uuid not null,
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);
grant select, insert on public.question_reports to authenticated;
grant all on public.question_reports to service_role;
alter table public.question_reports enable row level security;
create policy "insert own report" on public.question_reports for insert to authenticated with check (auth.uid() = user_id);
create policy "read own or admin" on public.question_reports for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create or replace function public.on_question_report()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.question_bank
     set report_count = report_count + 1,
         status = case when report_count + 1 >= 3 and status = 'active' then 'disabled' else status end
   where id = new.question_id;
  return new;
end $$;
revoke execute on function public.on_question_report() from public, anon, authenticated;
create trigger question_report_count after insert on public.question_reports
  for each row execute function public.on_question_report();