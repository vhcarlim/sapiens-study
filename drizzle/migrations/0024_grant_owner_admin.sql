insert into public.user_roles(user_id, role)
select id, 'admin'::public.app_role from auth.users where lower(email) = 'vhcarlim080@gmail.com'
on conflict do nothing;