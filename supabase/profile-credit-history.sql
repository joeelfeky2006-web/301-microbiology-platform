-- Run after credits-and-analytics.sql and ai-credit-refund.sql.
-- Stores a bounded, per-user activity ledger without exposing user_credits broadly.
begin;

create table if not exists public.user_credit_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('spend', 'refund')),
  action text not null check (action in ('quiz-eval', 'case-study', 'summarize', 'chat', 'unknown')),
  amount integer not null check (amount > 0),
  daily_remaining integer not null,
  monthly_remaining integer not null,
  created_at timestamptz not null default now()
);

create index if not exists user_credit_history_user_created_idx
  on public.user_credit_history (user_id, created_at desc);

alter table public.user_credit_history enable row level security;
drop policy if exists user_credit_history_read_self on public.user_credit_history;
create policy user_credit_history_read_self on public.user_credit_history
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.user_credit_history from public, anon;
grant select on public.user_credit_history to authenticated;

drop function if exists public.deduct_user_credit(uuid, integer);
create function public.deduct_user_credit(
  p_user_id uuid,
  p_cost integer default 1,
  p_action text default 'unknown'
) returns table(success boolean, reason text, daily_remaining integer, monthly_remaining integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_rec public.user_credits%rowtype;
  v_today date := current_date;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_action text := coalesce(nullif(p_action, ''), 'unknown');
  v_daily integer;
  v_monthly integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Cannot spend credits for another user' using errcode = '42501';
  end if;
  if p_cost is null or p_cost < 1 or p_cost > 3 then
    raise exception 'Invalid credit cost' using errcode = '22023';
  end if;
  if v_action not in ('quiz-eval', 'case-study', 'summarize', 'chat', 'unknown') then
    raise exception 'Invalid credit action' using errcode = '22023';
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

  v_daily := v_rec.daily_remaining - p_cost;
  v_monthly := v_rec.monthly_remaining - p_cost;
  update public.user_credits set daily_remaining = v_daily, monthly_remaining = v_monthly,
    last_daily_reset = v_rec.last_daily_reset, last_monthly_reset = v_rec.last_monthly_reset, updated_at = now()
  where user_id = p_user_id;
  insert into public.user_credit_history(user_id, event_type, action, amount, daily_remaining, monthly_remaining)
    values (p_user_id, 'spend', v_action, p_cost, v_daily, v_monthly);
  return query select true, 'approved', v_daily, v_monthly;
end;
$$;

revoke all on function public.deduct_user_credit(uuid, integer, text) from public, anon;
grant execute on function public.deduct_user_credit(uuid, integer, text) to authenticated;

drop function if exists public.refund_user_credit(integer);
create function public.refund_user_credit(p_cost integer, p_action text default 'unknown')
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rec public.user_credits%rowtype;
  v_today date := current_date;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_action text := coalesce(nullif(p_action, ''), 'unknown');
  v_daily integer;
  v_monthly integer;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_cost is null or p_cost < 1 or p_cost > 3 then raise exception 'Invalid refund cost' using errcode = '22023'; end if;
  if v_action not in ('quiz-eval', 'case-study', 'summarize', 'chat', 'unknown') then raise exception 'Invalid credit action' using errcode = '22023'; end if;

  select * into v_rec from public.user_credits where user_id = v_user_id for update;
  if not found then raise exception 'Credit balance not found' using errcode = 'P0002'; end if;
  if v_rec.last_daily_reset < v_today then v_rec.daily_remaining := v_rec.daily_limit; v_rec.last_daily_reset := v_today; end if;
  if v_rec.last_monthly_reset <> v_month then v_rec.monthly_remaining := v_rec.monthly_limit; v_rec.last_monthly_reset := v_month; end if;
  v_daily := least(v_rec.daily_limit, v_rec.daily_remaining + p_cost);
  v_monthly := least(v_rec.monthly_limit, v_rec.monthly_remaining + p_cost);
  update public.user_credits set daily_remaining = v_daily, monthly_remaining = v_monthly,
    last_daily_reset = v_rec.last_daily_reset, last_monthly_reset = v_rec.last_monthly_reset, updated_at = now()
  where user_id = v_user_id;
  insert into public.user_credit_history(user_id, event_type, action, amount, daily_remaining, monthly_remaining)
    values (v_user_id, 'refund', v_action, p_cost, v_daily, v_monthly);
  return true;
end;
$$;

revoke all on function public.refund_user_credit(integer, text) from public, anon;
grant execute on function public.refund_user_credit(integer, text) to authenticated;
commit;
