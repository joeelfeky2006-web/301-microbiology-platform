-- MedAtlas Egypt / Micro 301 — final CMS settings and role RPC migration.
-- Run after secure-admin.sql in the Supabase SQL Editor.

begin;

alter table public.materials add column if not exists subtitle text;
grant select (id, module, type, title, subtitle, file_url, format, source_type)
  on public.materials to authenticated;
-- The CMS writes course rows directly with the signed-in user's Supabase client.
-- Existing materials RLS policies restrict these privileges to staff; deletes
-- remain limited to super admins by materials_delete_policy.
grant insert, update, delete on public.materials to authenticated;

create table if not exists public.platform_settings (
  id integer primary key check (id = 1),
  announcement_text text not null default '',
  announcement_active boolean not null default false,
  maintenance_mode boolean not null default false,
  whatsapp_number text not null default '',
  registration_open boolean not null default true,
  support_content jsonb not null default '{"title":"Support MedAtlas Egypt","subtitle":"Micro 301 Student Hosting & AI Token Fund","description":"MedAtlas Egypt is an independent student academic initiative built specifically for 3rd-year MUST medical students. Your voluntary contribution helps keep AI tools and course resources available.","benefit_one":"AI Token Compute","benefit_two":"High-Speed DB & CDN","payment_heading":"Student Payment Channels","methods":[{"id":"instapay","title":"InstaPay (Egypt)","value":"medatlas.egypt@instapay","display":"medatlas.egypt@instapay","action":"copy","link_url":""},{"id":"vodafone","title":"Vodafone Cash","value":"01099887766","display":"010 9988 7766","action":"copy","link_url":""},{"id":"fawry","title":"Fawry Service / Smart Wallet","value":"9900223311","display":"Ref: 9900 2233 11","action":"copy","link_url":""}],"copy_label":"Copy","copied_label":"Copied","footer":"Thank you for supporting your colleagues at MUST Medical School!"}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings add column if not exists support_content jsonb not null default '{}'::jsonb;

insert into public.platform_settings (id) values (1) on conflict (id) do nothing;
alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_public_read on public.platform_settings;
create policy platform_settings_public_read on public.platform_settings
  for select to anon, authenticated using (true);
drop policy if exists platform_settings_super_admin_manage on public.platform_settings;
create policy platform_settings_super_admin_manage on public.platform_settings
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

grant select on public.platform_settings to anon, authenticated;
grant insert, update, delete on public.platform_settings to authenticated;

create or replace function public.admin_list_users()
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then raise exception 'Not authorized'; end if;
  return query
    select u.id, u.email::text,
      coalesce(ur.role, case when lower(trim(u.email)) = 'joeelfeky2006@gmail.com' then 'super_admin' else 'student' end),
      u.created_at
    from auth.users u
    left join public.user_roles ur on ur.user_id = u.id
    order by lower(coalesce(u.email, ''));
end;
$$;

create or replace function public.admin_set_role(p_email text, p_role text)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user_id uuid;
begin
  if not public.is_super_admin() then raise exception 'Not authorized'; end if;
  if v_email = '' then raise exception 'Email is required'; end if;
  if p_role not in ('super_admin', 'editor', 'student') then raise exception 'Invalid role'; end if;
  if v_email = 'joeelfeky2006@gmail.com' and p_role <> 'super_admin' then
    raise exception 'The platform owner role is locked';
  end if;

  select id into v_user_id from auth.users where lower(trim(email)) = v_email limit 1;
  if v_user_id is null then raise exception 'User not found'; end if;
  insert into public.user_roles(user_id, role) values (v_user_id, p_role)
  on conflict (user_id) do update set role = excluded.role, updated_at = now();
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_role(text, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_role(text, text) to authenticated;

commit;
