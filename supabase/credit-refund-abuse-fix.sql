-- ==============================================================================
-- MedAtlas — P0 credit refund abuse fix (REVIEW BEFORE APPLYING)
-- ==============================================================================
-- Do NOT auto-run. Apply in the Supabase SQL Editor in the same release as the
-- app that calls deduct_user_credit(..., p_request_id) and refund_spend via
-- service_role. Applying this migration closes the student refill hole immediately
-- (refund_user_credit is dropped); deploy the matching app code in the same window.
--
-- Changes:
--   1. Ledger columns: request_id, refunded, reference_id, feature, metadata
--   2. Partial unique index on spend.request_id
--   3. deduct_user_credit requires p_request_id (caller must be auth.uid())
--   4. refund_spend(service_role only) — matched, idempotent refund
--   5. Drop refund_user_credit (unauthenticated refill vector)
--   6. Revoke table writes from anon/authenticated
--   7. Drop sponsor_analytics_insert policy
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Widen ledger schema
-- ------------------------------------------------------------------------------
alter table public.user_credit_history
  add column if not exists request_id uuid,
  add column if not exists refunded boolean not null default false,
  add column if not exists reference_id text,
  add column if not exists feature text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Drop legacy CHECKs (names are Postgres defaults from inline constraints).
alter table public.user_credit_history drop constraint if exists user_credit_history_event_type_check;
alter table public.user_credit_history drop constraint if exists user_credit_history_action_check;
alter table public.user_credit_history drop constraint if exists user_credit_history_amount_check;

alter table public.user_credit_history
  add constraint user_credit_history_event_type_check
    check (event_type in ('spend', 'refund', 'grant', 'purchase', 'admin_adjustment', 'expiry')),
  add constraint user_credit_history_action_check
    check (action in (
      'quiz-eval', 'case-study', 'summarize', 'chat', 'unknown',
      'admin_grant', 'purchase', 'pack', 'expiry', 'adjustment'
    )),
  add constraint user_credit_history_amount_check
    check (amount <> 0);

-- One spend row per request_id (nulls allowed for legacy rows).
create unique index if not exists user_credit_history_spend_request_id_uidx
  on public.user_credit_history (request_id)
  where event_type = 'spend' and request_id is not null;

create index if not exists user_credit_history_user_request_idx
  on public.user_credit_history (user_id, request_id);

-- ------------------------------------------------------------------------------
-- 2. Table privileges: students may SELECT own rows only (RLS); no writes
-- ------------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.user_credits from public, anon, authenticated;
revoke insert, update, delete, truncate on public.user_credit_history from public, anon, authenticated;
grant select on public.user_credits to authenticated;
grant select on public.user_credit_history to authenticated;
-- Service role keeps write access for SECURITY DEFINER callers / server admin paths.
grant select, insert, update, delete on public.user_credits to service_role;
grant select, insert, update, delete on public.user_credit_history to service_role;

-- ------------------------------------------------------------------------------
-- 3. deduct_user_credit — requires p_request_id; own user only
-- ------------------------------------------------------------------------------
drop function if exists public.deduct_user_credit(uuid, integer);
drop function if exists public.deduct_user_credit(uuid, integer, text);
drop function if exists public.deduct_user_credit(uuid, integer, text, uuid);

create function public.deduct_user_credit(
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

  -- Idempotent re-call with the same spend request_id: return current balances.
  if exists (
    select 1 from public.user_credit_history
    where request_id = p_request_id and event_type = 'spend'
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
-- 4. refund_spend — service_role only; matched + idempotent
-- ------------------------------------------------------------------------------
drop function if exists public.refund_spend(uuid, uuid);

create function public.refund_spend(p_user_id uuid, p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spend public.user_credit_history%rowtype;
  v_rec public.user_credits%rowtype;
  v_today date := current_date;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_daily integer;
  v_monthly integer;
  v_cost integer;
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

  v_daily := least(v_rec.daily_limit, v_rec.daily_remaining + v_cost);
  v_monthly := least(v_rec.monthly_limit, v_rec.monthly_remaining + v_cost);

  update public.user_credits
  set daily_remaining = v_daily,
      monthly_remaining = v_monthly,
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
    jsonb_build_object('refund_of', v_spend.id)
  );

  return true;
end;
$$;

revoke all on function public.refund_spend(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refund_spend(uuid, uuid) to service_role;

-- ------------------------------------------------------------------------------
-- 5. Remove the abusive refund_user_credit entry points
-- ------------------------------------------------------------------------------
revoke all on function public.refund_user_credit(integer) from public, anon, authenticated;
revoke all on function public.refund_user_credit(integer, text) from public, anon, authenticated;
drop function if exists public.refund_user_credit(integer);
drop function if exists public.refund_user_credit(integer, text);

-- ------------------------------------------------------------------------------
-- 6. Drop open sponsor analytics insert policy
-- ------------------------------------------------------------------------------
drop policy if exists "sponsor_analytics_insert" on public.sponsor_analytics;
drop policy if exists sponsor_analytics_insert on public.sponsor_analytics;

commit;
