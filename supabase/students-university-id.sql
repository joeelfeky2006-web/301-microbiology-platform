-- Persist university_id on public.students and sync from auth.users metadata.
-- Applied remotely via Supabase migration students_university_id_sync.

alter table public.students
  add column if not exists university_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_id_fkey' and conrelid = 'public.students'::regclass
  ) then
    begin
      alter table public.students
        add constraint students_id_fkey
        foreign key (id) references auth.users(id) on delete cascade;
    exception when others then
      raise notice 'students_id_fkey not added: %', sqlerrm;
    end;
  end if;
end $$;

drop index if exists students_university_id_uidx;
create index if not exists students_university_id_idx
  on public.students (university_id);

alter table public.students enable row level security;

drop policy if exists students_select_self on public.students;
create policy students_select_self on public.students
  for select to authenticated
  using (auth.uid() = id or public.is_super_admin());

drop policy if exists students_update_self on public.students;
create policy students_update_self on public.students
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke all on public.students from public, anon;
grant select, update on public.students to authenticated;

create or replace function public.sync_student_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_name text;
  v_uni text;
  v_group text;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', '')), '');
  if v_name is null then
    v_name := split_part(coalesce(new.email, 'student'), '@', 1);
  end if;
  v_uni := nullif(trim(coalesce(new.raw_user_meta_data->>'university_id', '')), '');
  v_group := nullif(trim(coalesce(new.raw_user_meta_data->>'group_section', '')), '');

  insert into public.students (id, email, name, university_id, group_section, updated_at)
  values (
    new.id,
    coalesce(new.email, ''),
    v_name,
    v_uni,
    case when v_group in ('G1', 'G2') then v_group else null end,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    university_id = coalesce(excluded.university_id, public.students.university_id),
    group_section = coalesce(excluded.group_section, public.students.group_section),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_sync_student on auth.users;
create trigger on_auth_user_sync_student
  after insert or update of email, raw_user_meta_data
  on auth.users
  for each row execute function public.sync_student_from_auth();

insert into public.students (id, email, name, university_id, group_section)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(u.email, 'student'), '@', 1)
  ),
  nullif(trim(u.raw_user_meta_data->>'university_id'), ''),
  case
    when nullif(trim(u.raw_user_meta_data->>'group_section'), '') in ('G1', 'G2')
      then nullif(trim(u.raw_user_meta_data->>'group_section'), '')
    else null
  end
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  university_id = coalesce(excluded.university_id, public.students.university_id),
  group_section = coalesce(excluded.group_section, public.students.group_section),
  updated_at = now();

drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  name text,
  university_id text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then raise exception 'Not authorized'; end if;
  return query
    select
      u.id,
      u.email::text,
      coalesce(
        ur.role,
        case when lower(trim(u.email)) = 'joeelfeky2006@gmail.com' then 'super_admin' else 'student' end
      ),
      u.created_at,
      coalesce(
        nullif(trim(s.name), ''),
        nullif(trim(u.raw_user_meta_data->>'name'), ''),
        split_part(coalesce(u.email, 'student'), '@', 1)
      )::text,
      coalesce(
        nullif(trim(s.university_id), ''),
        nullif(trim(u.raw_user_meta_data->>'university_id'), '')
      )::text
    from auth.users u
    left join public.user_roles ur on ur.user_id = u.id
    left join public.students s on s.id = u.id
    order by lower(coalesce(u.email, ''));
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
