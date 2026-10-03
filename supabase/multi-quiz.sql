-- Structured, multiple quizzes per lecture. Run once in Supabase SQL Editor.
begin;

create table if not exists public.lecture_quizzes (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references public.materials(id) on delete set null,
  module text not null check (module in ('CNS', 'URS', 'REP')),
  lecture_title text not null check (length(trim(lecture_title)) > 0),
  quiz_number integer not null check (quiz_number > 0),
  title text not null check (length(trim(title)) > 0),
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) > 0),
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module, lecture_title, quiz_number)
);

create index if not exists lecture_quizzes_lecture_idx
  on public.lecture_quizzes (module, lecture_title, is_published, quiz_number);

alter table public.lecture_quizzes enable row level security;
drop policy if exists lecture_quizzes_staff_manage on public.lecture_quizzes;
create policy lecture_quizzes_staff_manage on public.lecture_quizzes
  for all to authenticated
  using (public.get_current_user_role() in ('super_admin', 'editor'))
  with check (public.get_current_user_role() in ('super_admin', 'editor'));

-- Students read quizzes through authenticated API routes. Correct answers are
-- never selected into client responses; service-role access stays server-side.
revoke all on public.lecture_quizzes from anon, authenticated;
grant select, insert, update, delete on public.lecture_quizzes to authenticated;
grant all on public.lecture_quizzes to service_role;

commit;
