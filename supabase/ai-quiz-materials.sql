-- MedAtlas AI knowledge and quiz authoring migration.
-- Safe to run repeatedly.
alter table public.materials
  add column if not exists ai_context text,
  add column if not exists raw_quiz_text text,
  add column if not exists custom_system_prompt text;

comment on column public.materials.ai_context is
  'Lecture source text used as the AI resource knowledge bank.';
comment on column public.materials.raw_quiz_text is
  'Admin-authored raw quiz questions, options, answer keys and explanations.';
comment on column public.materials.custom_system_prompt is
  'Optional per-material AI prompt overlay.';

-- Do not create tables for quiz attempts or reports. These remain in request/client memory only.
