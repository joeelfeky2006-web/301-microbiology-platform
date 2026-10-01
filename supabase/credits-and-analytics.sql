-- ==============================================================================
-- MedAtlas Egypt (Micro 301) — AI Credit Economy & Sponsor Analytics Script
-- ==============================================================================
-- Target: Supabase SQL Editor
-- Features:
--   1. AI Credit Accounting Table (public.user_credits)
--   2. Atomic stored procedure: deduct_user_credit (prevents double-spending)
--   3. Sponsor Analytics Table (public.sponsor_analytics) for CTR verification
--   4. Automatic new student signup credit provisioning (80 monthly, 8 daily)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create User Credits Table
-- ------------------------------------------------------------------------------
create table if not exists public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  daily_remaining int not null default 8 check (daily_remaining >= 0),
  daily_limit int not null default 8,
  monthly_remaining int not null default 80 check (monthly_remaining >= 0),
  monthly_limit int not null default 80,
  last_daily_reset date not null default current_date,
  last_monthly_reset text not null default to_char(current_date, 'YYYY-MM'),
  exam_bonus_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_credits_user_id on public.user_credits(user_id);
alter table public.user_credits enable row level security;

-- RLS: Students can view their own credit balances
drop policy if exists "user_credits_select_self" on public.user_credits;
create policy "user_credits_select_self" on public.user_credits
  for select to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. Atomic Stored Procedure: deduct_user_credit
-- ------------------------------------------------------------------------------
-- Drop existing signature first to allow changing OUT parameter return types
drop function if exists public.deduct_user_credit(uuid, integer);
drop function if exists public.deduct_user_credit(uuid, int);
drop function if exists public.deduct_user_credit(uuid);
drop function if exists public.deduct_user_credit;

-- Locks user row with FOR UPDATE to prevent parallel request double-spending
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
  select * into v_rec
  from public.user_credits
  where user_id = p_user_id
  for update;

  if not found then
    -- Auto-provision if missing
    insert into public.user_credits (user_id, daily_remaining, daily_limit, monthly_remaining, monthly_limit)
    values (p_user_id, 8, 8, 80, 80)
    returning * into v_rec;
  end if;

  -- Daily reset if date shifted
  if v_rec.last_daily_reset < v_today then
    v_rec.daily_remaining := v_rec.daily_limit;
    v_rec.last_daily_reset := v_today;
  end if;

  -- Monthly reset if month shifted
  if v_rec.last_monthly_reset <> v_month then
    v_rec.monthly_remaining := v_rec.monthly_limit;
    v_rec.last_monthly_reset := v_month;
  end if;

  -- Check daily cap
  if v_rec.daily_remaining < p_cost then
    return query select false, 'daily_cap_reached', v_rec.daily_remaining, v_rec.monthly_remaining;
    return;
  end if;

  -- Check monthly allowance
  if v_rec.monthly_remaining < p_cost then
    return query select false, 'monthly_cap_reached', v_rec.daily_remaining, v_rec.monthly_remaining;
    return;
  end if;

  -- Deduct atomically
  update public.user_credits
  set daily_remaining = v_rec.daily_remaining - p_cost,
      monthly_remaining = v_rec.monthly_remaining - p_cost,
      last_daily_reset = v_rec.last_daily_reset,
      last_monthly_reset = v_rec.last_monthly_reset,
      updated_at = now()
  where user_id = p_user_id;

  return query select true, 'approved', (v_rec.daily_remaining - p_cost), (v_rec.monthly_remaining - p_cost);
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------------------------
-- 3. Automatic Credit Provisioning Trigger for New Students
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user_credits()
returns trigger as $$
begin
  insert into public.user_credits (
    user_id,
    daily_remaining,
    daily_limit,
    monthly_remaining,
    monthly_limit
  )
  values (new.id, 8, 8, 80, 80)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created_credits on auth.users;
create trigger on_auth_user_created_credits
  after insert on auth.users
  for each row execute function public.handle_new_user_credits();

-- Seed existing users with credit rows if missing
insert into public.user_credits (user_id, daily_remaining, daily_limit, monthly_remaining, monthly_limit)
select id, 8, 8, 80, 80
from auth.users
on conflict (user_id) do nothing;

-- ------------------------------------------------------------------------------
-- 4. Sponsor Analytics Table (For Revive Medical Wear & CTR Tracking)
-- ------------------------------------------------------------------------------
create table if not exists public.sponsor_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  sponsor text not null default 'Revive Medical Wear',
  event_type text not null check (event_type in ('impression', 'click', 'coupon_copy')),
  coupon_code text default 'revivemicro301',
  placement text default 'inline',
  created_at timestamptz not null default now()
);

create index if not exists idx_sponsor_analytics_event on public.sponsor_analytics(event_type);
alter table public.sponsor_analytics enable row level security;

-- Super Admins can query analytics
create policy "sponsor_analytics_admin_select" on public.sponsor_analytics
  for select to authenticated
  using (public.is_super_admin());

-- Authenticated users can insert telemetry events
create policy "sponsor_analytics_insert" on public.sponsor_analytics
  for insert to authenticated
  with check (true);

do $$
begin
  raise notice 'MedAtlas Egypt AI Credit Economy & Analytics provisioned successfully:';
  raise notice ' - 80 monthly / 8 daily credits configured';
  raise notice ' - Atomic credit deduction function active';
  raise notice ' - Sponsor analytics table active';
end $$;
