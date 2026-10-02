-- Site content managed by super_admin. Safe to re-run; this workspace does not
-- apply migrations to the connected Supabase project automatically.
-- Prerequisites: public.platform_settings and public.is_super_admin() from
-- the platform CMS/security migrations, plus Supabase Storage being enabled.
begin;

alter table public.platform_settings
  add column if not exists site_content jsonb not null default '{}'::jsonb;

insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

-- Public content is readable to render the site; writes remain guarded by the
-- existing platform_settings_super_admin_manage RLS policy.
grant select (id, site_content) on public.platform_settings to anon, authenticated;
grant update (site_content, updated_at) on public.platform_settings to authenticated;

-- Public logo assets. Upload and deletion are limited to super_admin by policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 2097152, array['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg'];

drop policy if exists site_assets_public_read on storage.objects;
create policy site_assets_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-assets');
drop policy if exists site_assets_super_admin_insert on storage.objects;
create policy site_assets_super_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'site-assets' and public.is_super_admin());
drop policy if exists site_assets_super_admin_update on storage.objects;
create policy site_assets_super_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'site-assets' and public.is_super_admin())
  with check (bucket_id = 'site-assets' and public.is_super_admin());
drop policy if exists site_assets_super_admin_delete on storage.objects;
create policy site_assets_super_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'site-assets' and public.is_super_admin());

commit;
