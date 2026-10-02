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

-- Harden the existing credit RPC before the application relies on it.
-- The caller must be the owner of the balance and costs are fixed positive units.
create or replace function public.deduct_user_credit(
  p_user_id uuid,
  p_cost int default 1
) returns table(
  success boolean,
  reason text,
  daily_remaining int,
  monthly_remaining int
) as $$
declare
  v_rec record;
  v_today date := current_date;
  v_month text := to_char(current_date, 'YYYY-MM');
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Cannot spend credits for another user' using errcode = '42501';
  end if;
  if p_cost is null or p_cost < 1 or p_cost > 3 then
    raise exception 'Invalid credit cost' using errcode = '22023';
  end if;

  select * into v_rec from public.user_credits where user_id = p_user_id for update;
  if not found then
    insert into public.user_credits (user_id, daily_remaining, daily_limit, monthly_remaining, monthly_limit)
    values (p_user_id, 8, 8, 80, 80) returning * into v_rec;
  end if;
  if v_rec.last_daily_reset < v_today then
    v_rec.daily_remaining := v_rec.daily_limit;
    v_rec.last_daily_reset := v_today;
  end if;
  if v_rec.last_monthly_reset <> v_month then
    v_rec.monthly_remaining := v_rec.monthly_limit;
    v_rec.last_monthly_reset := v_month;
  end if;
  if v_rec.daily_remaining < p_cost then
    return query select false, 'daily_cap_reached', v_rec.daily_remaining, v_rec.monthly_remaining;
    return;
  end if;
  if v_rec.monthly_remaining < p_cost then
    return query select false, 'monthly_cap_reached', v_rec.daily_remaining, v_rec.monthly_remaining;
    return;
  end if;
  update public.user_credits
    set daily_remaining = v_rec.daily_remaining - p_cost,
        monthly_remaining = v_rec.monthly_remaining - p_cost,
        last_daily_reset = v_rec.last_daily_reset,
        last_monthly_reset = v_rec.last_monthly_reset,
        updated_at = now()
    where user_id = p_user_id;
  return query select true, 'approved', v_rec.daily_remaining - p_cost, v_rec.monthly_remaining - p_cost;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.deduct_user_credit(uuid, integer) from public, anon;
grant execute on function public.deduct_user_credit(uuid, integer) to authenticated;

-- Keep lecture notes, raw question banks and custom prompts out of student REST reads.
-- Students receive only safe column privileges; CMS access to AI fields goes through a staff endpoint.
drop policy if exists "materials_select_policy" on public.materials;
drop policy if exists "materials_staff_select_policy" on public.materials;
drop policy if exists "materials_student_select_policy" on public.materials;
drop view if exists public.student_materials;
create policy "materials_student_select_policy" on public.materials
  for select to authenticated using (true);

revoke select on public.materials from public, anon, authenticated;
grant select (id, module, type, title, file_url, format, source_type)
  on public.materials to authenticated;
-- The unauthenticated health probe may read only an identifier, never course content.
drop policy if exists "materials_health_id_select" on public.materials;
create policy "materials_health_id_select" on public.materials
  for select to anon using (true);
grant select (id) on public.materials to anon;

grant insert (ai_context, raw_quiz_text, custom_system_prompt)
  on public.materials to authenticated;
grant update (ai_context, raw_quiz_text, custom_system_prompt)
  on public.materials to authenticated;
