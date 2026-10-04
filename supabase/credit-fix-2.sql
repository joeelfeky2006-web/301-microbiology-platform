-- ==============================================================================
-- MedAtlas — credit-fix-2 (REVIEW BEFORE APPLYING — do not auto-run)
-- ==============================================================================
-- Apply after credit-refund-abuse-fix.sql on databases that already ran P0.
-- Fresh installs that use the updated credit-refund-abuse-fix.sql already include
-- these hardenings; this file is the incremental patch for live DBs.
--
-- 1. Scope duplicate-request check to the caller's user_id
-- 2. Revoke REFERENCES + TRIGGER on credit tables from anon/authenticated
-- 3. Revoke SELECT on credit tables from anon
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. deduct_user_credit — duplicate spend must match user_id
-- ------------------------------------------------------------------------------
create or replace function public.deduct_user_credit(
  p_user_id uuid,
  p_cost integer,
  p_action text,
  p_request_id uuid
) returns table(success boolean, reason text, daily_remaining integer, monthly_remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.user_credits%rowtype;
  v_today date := current_date;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_action text := coalesce(nullif(trim(p_action), ''), 'unknown');
  v_daily integer;
  v_monthly integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Cannot spend credits for another user' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'request_id is required' using errcode = '22023';
  end if;
  if p_cost is null or p_cost < 1 or p_cost > 3 then
    raise exception 'Invalid credit cost' using errcode = '22023';
  end if;
  if v_action not in (
    'quiz-eval', 'case-study', 'summarize', 'chat', 'unknown',
    'admin_grant', 'purchase', 'pack', 'expiry', 'adjustment'
  ) then
    raise exception 'Invalid credit action' using errcode = '22023';
  end if;

  -- Idempotent re-call with the same spend request_id for this user only.
  if exists (
    select 1 from public.user_credit_history
    where request_id = p_request_id and event_type = 'spend' and user_id = p_user_id
  ) then
    select * into v_rec from public.user_credits where user_id = p_user_id;
    if not found then
      return query select false, 'missing_balance', 0, 0;
      return;
    end if;
    return query select true, 'duplicate_request', v_rec.daily_remaining, v_rec.monthly_remaining;
    return;
  end if;

  select * into v_rec from public.user_credits where user_id = p_user_id for update;
  if not found then
    insert into public.user_credits (user_id, daily_remaining, daily_limit, monthly_remaining, monthly_limit)
    values (p_user_id, 8, 8, 80, 80)
    returning * into v_rec;
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

  v_daily := v_rec.daily_remaining - p_cost;
  v_monthly := v_rec.monthly_remaining - p_cost;

  update public.user_credits
  set daily_remaining = v_daily,
      monthly_remaining = v_monthly,
      last_daily_reset = v_rec.last_daily_reset,
      last_monthly_reset = v_rec.last_monthly_reset,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.user_credit_history (
    user_id, event_type, action, amount,
    daily_remaining, monthly_remaining,
    request_id, refunded, reference_id, feature, metadata
  ) values (
    p_user_id, 'spend', v_action, p_cost,
    v_daily, v_monthly,
    p_request_id, false, p_request_id::text, v_action, '{}'::jsonb
  );

  return query select true, 'approved', v_daily, v_monthly;
end;
$$;

revoke all on function public.deduct_user_credit(uuid, integer, text, uuid) from public, anon;
grant execute on function public.deduct_user_credit(uuid, integer, text, uuid) to authenticated;

-- ------------------------------------------------------------------------------
-- 2–3. Tighten table privileges
-- ------------------------------------------------------------------------------
revoke references, trigger on public.user_credits from public, anon, authenticated;
revoke references, trigger on public.user_credit_history from public, anon, authenticated;
revoke select on public.user_credits from public, anon;
revoke select on public.user_credit_history from public, anon;

commit;
