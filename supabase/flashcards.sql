-- Flashcards: raw bank on materials + published decks + per-user SM-2 progress.
-- Run once in Supabase SQL Editor.

begin;

-- 1. Raw flashcard bank on materials (parallel to raw_quiz_text)
alter table public.materials
  add column if not exists raw_flashcard_text text;

comment on column public.materials.raw_flashcard_text is
  'Admin-authored flashcard bank (Q:/A:/HINT:/TAG:). Parsed server-side for study sessions.';

-- Staff may write the column (same grants pattern as quiz AI fields when present)
do $$
begin
  grant insert (raw_flashcard_text) on public.materials to authenticated;
  grant update (raw_flashcard_text) on public.materials to authenticated;
exception when undefined_object then
  null;
end $$;

-- 2. Published decks (parallel to lecture_quizzes)
create table if not exists public.lecture_flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references public.materials(id) on delete set null,
  module text not null check (module in ('CNS', 'URS', 'REP')),
  lecture_title text not null check (length(trim(lecture_title)) > 0),
  deck_number integer not null check (deck_number > 0),
  title text not null check (length(trim(title)) > 0),
  cards jsonb not null check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) > 0),
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module, lecture_title, deck_number)
);

create index if not exists lecture_flashcard_decks_lecture_idx
  on public.lecture_flashcard_decks (module, lecture_title, is_published, deck_number);

create index if not exists lecture_flashcard_decks_material_idx
  on public.lecture_flashcard_decks (material_id);

alter table public.lecture_flashcard_decks enable row level security;

drop policy if exists lecture_flashcard_decks_staff_manage on public.lecture_flashcard_decks;
create policy lecture_flashcard_decks_staff_manage on public.lecture_flashcard_decks
  for all to authenticated
  using (public.get_current_user_role() in ('super_admin', 'editor'))
  with check (public.get_current_user_role() in ('super_admin', 'editor'));

revoke all on public.lecture_flashcard_decks from anon, authenticated;
grant select, insert, update, delete on public.lecture_flashcard_decks to authenticated;
grant all on public.lecture_flashcard_decks to service_role;

-- 3. Per-student SRS progress
create table if not exists public.flashcard_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  deck_id uuid references public.lecture_flashcard_decks(id) on delete cascade,
  card_id text not null check (length(trim(card_id)) > 0 and length(card_id) <= 120),
  ease_factor double precision not null default 2.5 check (ease_factor >= 1.3),
  interval_days integer not null default 0 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deck cards: unique per user+deck+card
create unique index if not exists flashcard_progress_user_deck_card_uidx
  on public.flashcard_progress (user_id, deck_id, card_id)
  where deck_id is not null;

-- Raw material bank: unique per user+material+card when no deck
create unique index if not exists flashcard_progress_user_material_card_uidx
  on public.flashcard_progress (user_id, material_id, card_id)
  where deck_id is null;

create index if not exists flashcard_progress_due_idx
  on public.flashcard_progress (user_id, due_at);

alter table public.flashcard_progress enable row level security;

drop policy if exists flashcard_progress_own on public.flashcard_progress;
create policy flashcard_progress_own on public.flashcard_progress
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.flashcard_progress from anon;
grant select, insert, update, delete on public.flashcard_progress to authenticated;
grant all on public.flashcard_progress to service_role;

commit;
