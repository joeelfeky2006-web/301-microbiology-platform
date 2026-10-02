-- ==============================================================================
-- MedAtlas Egypt (Micro 301) — PostgreSQL Role-Based Access Control (RBAC) Script
-- ==============================================================================
-- Target: Supabase SQL Editor
-- Features:
--   1. Role Management Table (public.user_roles) with 'super_admin', 'editor', 'student'
--   2. Automatic user signup trigger with default role assignment
--   3. Initial Super Admin setup for joeelfeky2006@gmail.com
--   4. Row-Level Security (RLS) on public.materials (Full, Editor, Read-only)
--   5. Storage Bucket ('materials') RLS policies mirroring user permissions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create User Roles Table & Constraints
-- ------------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'editor', 'student')) default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for lightning-fast RLS evaluation
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);

-- Enable RLS on the user_roles table itself
alter table public.user_roles enable row level security;

-- ------------------------------------------------------------------------------
-- 2. Security Definer Helper Functions (Bypasses RLS to prevent recursion)
-- ------------------------------------------------------------------------------

-- Returns the active role for the current authenticated user session
create or replace function public.get_current_user_role()
returns text as $$
declare
  v_role text;
  v_email text;
begin
  -- Quick escape if not authenticated
  if auth.uid() is null then
    return 'anonymous';
  end if;

  -- 1. Check if the authenticated email is the primary Super Admin (Hardened Fallback)
  select lower(trim(email)) into v_email
  from auth.users
  where id = auth.uid();

  if v_email in ('joeelfeky2006@gmail.com', 'admin@must.edu.eg') then
    return 'super_admin';
  end if;

  -- 2. Query the user_roles table
  select role into v_role
  from public.user_roles
  where user_id = auth.uid();

  return coalesce(v_role, 'student');
end;
$$ language plpgsql security definer set search_path = public;

-- Check if current user has Super Admin privileges
create or replace function public.is_super_admin()
returns boolean as $$
begin
  return public.get_current_user_role() = 'super_admin';
end;
$$ language plpgsql security definer set search_path = public;

-- Check if current user has Editor or Super Admin privileges
create or replace function public.is_editor_or_admin()
returns boolean as $$
begin
  return public.get_current_user_role() in ('super_admin', 'editor');
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------------------------
-- 3. RLS Policies for user_roles Table
-- ------------------------------------------------------------------------------
drop policy if exists "user_roles_select_self" on public.user_roles;
drop policy if exists "user_roles_admin_all" on public.user_roles;

-- Users can read their own assigned role
create policy "user_roles_select_self" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id);

-- Super Admins can view, assign, update, and remove roles for anyone
create policy "user_roles_admin_all" on public.user_roles
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 4. Automatic Role Provisioning Trigger on New User Signup
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user_role()
returns trigger as $$
declare
  v_initial_role text;
begin
  -- Automatically grant Super Admin to designated platform owner
  if lower(trim(new.email)) in ('joeelfeky2006@gmail.com', 'admin@must.edu.eg') then
    v_initial_role := 'super_admin';
  else
    v_initial_role := 'student';
  end if;

  insert into public.user_roles (user_id, role)
  values (new.id, v_initial_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Bind trigger to auth.users table
drop trigger if exists on_auth_user_created_assign_role on auth.users;
create trigger on_auth_user_created_assign_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- ------------------------------------------------------------------------------
-- 5. Initial Super Admin Setup (Ensures you are never locked out)
-- ------------------------------------------------------------------------------
-- Provision role for existing user account if already signed up:
insert into public.user_roles (user_id, role)
select id, 'super_admin'
from auth.users
where lower(trim(email)) = 'joeelfeky2006@gmail.com'
on conflict (user_id) do update
set role = 'super_admin', updated_at = now();

-- Ensure any other existing users in auth.users have a baseline student role
insert into public.user_roles (user_id, role)
select id, 'student'
from auth.users
where lower(trim(email)) != 'joeelfeky2006@gmail.com'
on conflict (user_id) do nothing;

-- ------------------------------------------------------------------------------
-- 6. Row-Level Security (RLS) for public.materials Table
-- ------------------------------------------------------------------------------
-- Ensure public.materials table exists
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  module text not null check (module in ('CNS', 'URS', 'REP')),
  type text not null,
  format text not null default 'external_link' check (format in ('pdf', 'audio', 'external_link')),
  source_type text check (source_type in ('supabase', 'drive', 'telegram')),
  file_url text not null,
  author_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on materials table
alter table public.materials enable row level security;

-- Drop any legacy/conflicting policies
drop policy if exists "Allow public read access" on public.materials;
drop policy if exists "Enable insert access for all users" on public.materials;
drop policy if exists "Enable read access for all users" on public.materials;
drop policy if exists "Admin can insert materials" on public.materials;
drop policy if exists "Admin can update materials" on public.materials;
drop policy if exists "Admin can delete materials" on public.materials;
drop policy if exists "Staff and Admins can insert materials" on public.materials;
drop policy if exists "Staff and Admins can update materials" on public.materials;
drop policy if exists "Only Super Admins can delete materials" on public.materials;
drop policy if exists "Authenticated users can read materials" on public.materials;
drop policy if exists "materials_select_policy" on public.materials;
drop policy if exists "materials_insert_policy" on public.materials;
drop policy if exists "materials_update_policy" on public.materials;
drop policy if exists "materials_delete_policy" on public.materials;

-- [SELECT]: Authenticated students can read only granted public material columns.
drop policy if exists "materials_select_policy" on public.materials;
drop policy if exists "materials_staff_select_policy" on public.materials;
drop policy if exists "materials_student_select_policy" on public.materials;
drop view if exists public.student_materials;
create policy "materials_student_select_policy" on public.materials
  for select to authenticated using (true);

-- Column-level grants keep AI-only columns out of direct student REST reads.
revoke select on public.materials from public, anon, authenticated;
grant select (id, module, type, title, file_url, format, source_type)
  on public.materials to authenticated;

-- [INSERT]: Editors and Super Admins can publish new course materials
create policy "materials_insert_policy" on public.materials
  for insert to authenticated
  with check (public.is_editor_or_admin());

-- [UPDATE]: Editors and Super Admins can edit existing course materials
create policy "materials_update_policy" on public.materials
  for update to authenticated
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

-- [DELETE]: ONLY Super Admins can permanently delete materials (Destructive Action)
create policy "materials_delete_policy" on public.materials
  for delete to authenticated
  using (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 7. Storage Bucket ('materials') Policies
-- ------------------------------------------------------------------------------
-- Ensure 'materials' storage bucket exists and is set to public read
insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do update set public = true;

-- Drop old storage policies
drop policy if exists "Allow public uploads and reads" on storage.objects;
drop policy if exists "Admin manages materials bucket" on storage.objects;
drop policy if exists "Allow read access to materials bucket" on storage.objects;
drop policy if exists "Staff can upload to materials bucket" on storage.objects;
drop policy if exists "Super Admins can delete from materials bucket" on storage.objects;
drop policy if exists "materials_storage_select_policy" on storage.objects;
drop policy if exists "materials_storage_insert_policy" on storage.objects;
drop policy if exists "materials_storage_update_policy" on storage.objects;
drop policy if exists "materials_storage_delete_policy" on storage.objects;

-- [STORAGE SELECT]: Anyone authenticated (or public since bucket is public) can read/download
create policy "materials_storage_select_policy" on storage.objects
  for select to authenticated
  using (bucket_id = 'materials');

-- [STORAGE INSERT]: Editors and Super Admins can upload lecture/practical files
create policy "materials_storage_insert_policy" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materials' and public.is_editor_or_admin());

-- [STORAGE UPDATE]: Editors and Super Admins can update/overwrite files
create policy "materials_storage_update_policy" on storage.objects
  for update to authenticated
  using (bucket_id = 'materials' and public.is_editor_or_admin())
  with check (bucket_id = 'materials' and public.is_editor_or_admin());

-- [STORAGE DELETE]: ONLY Super Admins can delete files from the bucket
create policy "materials_storage_delete_policy" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materials' and public.is_super_admin());

-- ==============================================================================
-- Verification Output
-- ==============================================================================
do $$
begin
  raise notice 'MedAtlas Egypt RBAC successfully provisioned:';
  raise notice ' - Role table: public.user_roles created & protected';
  raise notice ' - Super Admin assigned: joeelfeky2006@gmail.com';
  raise notice ' - Table RLS: staff manage base materials; authenticated students read safe student_materials view';
  raise notice ' - Storage RLS: materials bucket (Upload/Update: Editor+Admin | Delete: Super Admin)';
end $$;
