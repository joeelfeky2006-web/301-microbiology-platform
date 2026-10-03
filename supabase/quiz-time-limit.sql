-- Optional timed mode for structured lecture quizzes.
-- null / omitted = untimed only. Run in Supabase SQL Editor.
begin;

alter table public.lecture_quizzes
  add column if not exists time_limit_minutes integer
  check (time_limit_minutes is null or (time_limit_minutes >= 1 and time_limit_minutes <= 180));

comment on column public.lecture_quizzes.time_limit_minutes is
  'Optional whole-quiz timer in minutes. NULL means students only see the untimed option.';

commit;
