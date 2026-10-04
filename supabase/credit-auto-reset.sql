-- ==============================================================================
-- MedAtlas — Credit auto-reset (read path + Africa/Cairo calendar)
-- REVIEW BEFORE APPLYING — do not auto-run against production from an agent.
-- Idempotent / re-runnable.
-- Prerequisites: supabase/phase4-usage-credits.sql
-- ==============================================================================
-- Daily/monthly free buckets previously reset only inside deduct/refund (lazy).
-- GET /api/credits and the profile therefore showed 0 until the next spend.
-- This migration:
--   1) Uses Africa/Cairo calendar day/month (not UTC midnight).
--   2) Adds refresh_user_credits so balance reads apply the same reset.
--   3) Aligns deduct_user_credit / refund_spend to the same calendar helpers.
-- ==============================================================================

begin;

create or replace function public.credit_local_today()
returns date
language sql
stable
set search_path = public
as $$
  select (timezone('Africa/Cairo', now()))::date;
$$;

create or replace function public.credit_local_month()
returns text
language sql
stable
set search_path = public
as $$
  select to_char(timezone('Africa/Cairo', now()), 'YYYY-MM');
$$;

revoke all on function public.credit_local_today() from public, anon, authenticated;
revoke all on function public.credit_local_month() from public, anon, authenticated;
grant execute on function public.credit_local_today() to authenticated, service_role;
grant execute on function public.credit_local_month() to authenticated, service_role;

drop function if exists public.refresh_user_credits(uuid);

create function public.refresh_user_credits(p_user_id uuid)
returns table(
  daily_remaining integer,
  daily_limit integer,
  monthly_remaining integer,
  monthly_limit integer,
  bonus_balance integer,
  last_daily_reset date,
  last_monthly_reset text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.user_credits%rowtype;
  v_today date := public.credit_local_today();
  v_month text := public.credit_local_month();
  v_dirty boolean := false;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = '22023';
  end if;
  -- JWT callers may only refresh themselves; service_role / SQL have auth.uid() null.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Cannot refresh credits for another user' using errcode = '42501';
  end if;

  select * into v_rec from public.user_credits where user_id = p_user_id for update;
  if not found then
    insert into public.user_credits (user_id, daily_remaining, daily_limit, monthly_remaining, monthly_limit, bonus_balance)
    values (p_user_id, 8, 8, 80, 80, 0)
    returning * into v_rec;
    v_dirty := true;
  end if;

  if v_rec.last_daily_reset < v_today then
    v_rec.daily_remaining := v_rec.daily_limit;
    v_rec.last_daily_reset := v_today;
    v_dirty := true;
  end if;
  if v_rec.last_monthly_reset <> v_month then
    v_rec.monthly_remaining := v_rec.monthly_limit;
    v_rec.last_monthly_reset := v_month;
    v_dirty := true;
  end if;

  if v_dirty then
    update public.user_credits
    set daily_remaining = v_rec.daily_remaining,
        monthly_remaining = v_rec.monthly_remaining,
        last_daily_reset = v_rec.last_daily_reset,
        last_monthly_reset = v_rec.last_monthly_reset,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  return query
  select
    v_rec.daily_remaining,
    v_rec.daily_limit,
    v_rec.monthly_remaining,
    v_rec.monthly_limit,
    coalesce(v_rec.bonus_balance, 0),
    v_rec.last_daily_reset,
    v_rec.last_monthly_reset;
end;
$$;

revoke all on function public.refresh_user_credits(uuid) from public, anon;
grant execute on function public.refresh_user_credits(uuid) to authenticated, service_role;

-- Align spend/refund calendar with Cairo (same helpers as refresh).
create or replace function public.deduct_user_credit(
  p_user_id uuid,
  p_cost integer,
  p_action text,
  p_request_id uuid
) returns table(
  success boolean,
  reason text,
  daily_remaining integer,
  monthly_remaining integer,
  bonus_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.user_credits%rowtype;
  v_today date := public.credit_local_today();
  v_month text := public.credit_local_month();
  v_action text := coalesce(nullif(trim(p_action), ''), 'unknown');
  v_daily integer;
  v_monthly integer;
  v_bonus integer;
  v_source text;
  v_meta jsonb;
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

  if exists (
    select 1 from public.user_credit_history
    where request_id = p_request_id and event_type = 'spend' and user_id = p_user_id
  ) then
    select * into v_rec from public.user_credits where user_id = p_user_id;
    if not found then
      return query select false, 'missing_balance', 0, 0, 0;
      return;
    end if;
    return query select true, 'duplicate_request', v_rec.daily_remaining, v_rec.monthly_remaining, coalesce(v_rec.bonus_balance, 0);
    return;
  end if;

  select * into v_rec from public.user_credits where user_id = p_user_id for update;
  if not found then
    insert into public.user_credits (user_id, daily_remaining, daily_limit, monthly_remaining, monthly_limit, bonus_balance)
    values (p_user_id, 8, 8, 80, 80, 0)
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

  v_bonus := coalesce(v_rec.bonus_balance, 0);

  if v_rec.daily_remaining >= p_cost and v_rec.monthly_remaining >= p_cost then
    v_source := 'free';
    v_daily := v_rec.daily_remaining - p_cost;
    v_monthly := v_rec.monthly_remaining - p_cost;
  elsif v_bonus >= p_cost then
    v_source := 'bonus';
    v_daily := v_rec.daily_remaining;
    v_monthly := v_rec.monthly_remaining;
    v_bonus := v_bonus - p_cost;
  else
    if v_rec.daily_remaining < p_cost then
      return query select false, 'daily_cap_reached', v_rec.daily_remaining, v_rec.monthly_remaining, v_bonus;
      return;
    end if;
    if v_rec.monthly_remaining < p_cost then
      return query select false, 'monthly_cap_reached', v_rec.daily_remaining, v_rec.monthly_remaining, v_bonus;
      return;
    end if;
    return query select false, 'insufficient_bonus', v_rec.daily_remaining, v_rec.monthly_remaining, v_bonus;
    return;
  end if;

  update public.user_credits
  set daily_remaining = v_daily,
      monthly_remaining = v_monthly,
      bonus_balance = v_bonus,
      last_daily_reset = v_rec.last_daily_reset,
      last_monthly_reset = v_rec.last_monthly_reset,
      updated_at = now()
  where user_id = p_user_id;

  v_meta := jsonb_build_object('source', v_source);

  insert into public.user_credit_history (
    user_id, event_type, action, amount,
    daily_remaining, monthly_remaining,
    request_id, refunded, reference_id, feature, metadata
  ) values (
    p_user_id, 'spend', v_action, p_cost,
    v_daily, v_monthly,
    p_request_id, false, p_request_id::text, v_action, v_meta
  );

  return query select true, 'approved', v_daily, v_monthly, v_bonus;
end;
$$;

revoke all on function public.deduct_user_credit(uuid, integer, text, uuid) from public, anon;
grant execute on function public.deduct_user_credit(uuid, integer, text, uuid) to authenticated;

create or replace function public.refund_spend(p_user_id uuid, p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spend public.user_credit_history%rowtype;
  v_rec public.user_credits%rowtype;
  v_today date := public.credit_local_today();
  v_month text := public.credit_local_month();
  v_daily integer;
  v_monthly integer;
  v_bonus integer;
  v_cost integer;
  v_source text;
begin
  if p_user_id is null or p_request_id is null then
    return false;
  end if;

  select * into v_spend
  from public.user_credit_history
  where user_id = p_user_id
    and request_id = p_request_id
    and event_type = 'spend'
    and refunded = false
  for update;

  if not found then
    return false;
  end if;

  v_cost := abs(v_spend.amount);
  if v_cost < 1 then
    return false;
  end if;

  v_source := coalesce(nullif(trim(v_spend.metadata->>'source'), ''), 'free');

  select * into v_rec from public.user_credits where user_id = p_user_id for update;
  if not found then
    return false;
  end if;

  if v_rec.last_daily_reset < v_today then
    v_rec.daily_remaining := v_rec.daily_limit;
    v_rec.last_daily_reset := v_today;
  end if;
  if v_rec.last_monthly_reset <> v_month then
    v_rec.monthly_remaining := v_rec.monthly_limit;
    v_rec.last_monthly_reset := v_month;
  end if;

  v_bonus := coalesce(v_rec.bonus_balance, 0);

  if v_source = 'bonus' then
    v_daily := v_rec.daily_remaining;
    v_monthly := v_rec.monthly_remaining;
    v_bonus := v_bonus + v_cost;
  else
    v_daily := least(v_rec.daily_limit, v_rec.daily_remaining + v_cost);
    v_monthly := least(v_rec.monthly_limit, v_rec.monthly_remaining + v_cost);
  end if;

  update public.user_credits
  set daily_remaining = v_daily,
      monthly_remaining = v_monthly,
      bonus_balance = v_bonus,
      last_daily_reset = v_rec.last_daily_reset,
      last_monthly_reset = v_rec.last_monthly_reset,
      updated_at = now()
  where user_id = p_user_id;

  update public.user_credit_history
  set refunded = true
  where id = v_spend.id;

  insert into public.user_credit_history (
    user_id, event_type, action, amount,
    daily_remaining, monthly_remaining,
    request_id, refunded, reference_id, feature, metadata
  ) values (
    p_user_id, 'refund', v_spend.action, v_cost,
    v_daily, v_monthly,
    p_request_id, false, coalesce(v_spend.reference_id, p_request_id::text),
    coalesce(v_spend.feature, v_spend.action),
    jsonb_build_object('refund_of', v_spend.id, 'source', v_source)
  );

  return true;
end;
$$;

revoke all on function public.refund_spend(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refund_spend(uuid, uuid) to service_role;

commit;
