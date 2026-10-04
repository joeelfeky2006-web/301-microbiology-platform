-- MedAtlas — Phase 8: membership model (no recurring billing).
-- Run once after payments-ready.sql / phase4 credits.

begin;

create table if not exists public.user_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (length(trim(plan)) > 0 and length(plan) <= 64),
  status text not null default 'active'
    check (status in ('active', 'cancelled', 'expired', 'paused')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  renews_at timestamptz,
  monthly_credit_allocation integer not null check (monthly_credit_allocation >= 0),
  source text not null default 'manual'
    check (source in ('manual', 'purchase', 'admin', 'migration')),
  -- Optional link to payment_orders.id (no FK so this SQL can apply before/after payments-ready)
  payment_order_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active membership per user+plan
create unique index if not exists user_memberships_user_plan_active_uidx
  on public.user_memberships (user_id, plan)
  where status = 'active';

create index if not exists user_memberships_user_status_idx
  on public.user_memberships (user_id, status, expires_at);

create index if not exists user_memberships_expires_idx
  on public.user_memberships (expires_at)
  where status = 'active';

alter table public.user_memberships enable row level security;

drop policy if exists user_memberships_read_own on public.user_memberships;
create policy user_memberships_read_own on public.user_memberships
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.user_memberships from anon, authenticated;
grant select on public.user_memberships to authenticated;
grant all on public.user_memberships to service_role;

-- Mark expired actives (callable by service_role cron later; safe to run anytime)
create or replace function public.expire_memberships()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.user_memberships
    set status = 'expired', updated_at = now()
    where status = 'active'
      and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_memberships() from public, anon, authenticated;
grant execute on function public.expire_memberships() to service_role;

-- Admin/manual assign: create/replace active membership + optional period credit grant.
-- Authenticated super_admin only (same spirit as grant_user_credits).
create or replace function public.assign_user_membership(
  p_target_email text,
  p_plan text,
  p_period_days integer,
  p_monthly_credit_allocation integer,
  p_grant_credits boolean default true,
  p_reason text default 'manual membership assign'
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_target_email, '')));
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_reason text := left(trim(coalesce(p_reason, '')), 500);
  v_target uuid;
  v_id uuid;
  v_days integer := coalesce(p_period_days, 30);
  v_alloc integer := coalesce(p_monthly_credit_allocation, 0);
  v_start timestamptz := now();
  v_end timestamptz;
  v_daily integer;
  v_monthly integer;
  v_bonus integer;
  v_request uuid := gen_random_uuid();
begin
  if v_admin is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if public.get_current_user_role() <> 'super_admin' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Valid student email is required' using errcode = '22023';
  end if;
  if v_plan = '' or length(v_plan) > 64 then
    raise exception 'Valid plan is required' using errcode = '22023';
  end if;
  if v_days < 1 or v_days > 366 then
    raise exception 'period_days must be between 1 and 366' using errcode = '22023';
  end if;
  if v_alloc < 0 or v_alloc > 5000 then
    raise exception 'monthly_credit_allocation must be between 0 and 5000' using errcode = '22023';
  end if;
  if length(v_reason) < 2 then
    raise exception 'Reason is required' using errcode = '22023';
  end if;

  select id into v_target from auth.users where lower(trim(email)) = v_email limit 1;
  if v_target is null then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  v_end := v_start + make_interval(days => v_days);

  -- Close any active row for this plan
  update public.user_memberships
    set status = 'cancelled', updated_at = now()
    where user_id = v_target and plan = v_plan and status = 'active';

  insert into public.user_memberships (
    user_id, plan, status, started_at, expires_at, renews_at,
    monthly_credit_allocation, source, metadata
  ) values (
    v_target, v_plan, 'active', v_start, v_end, v_end,
    v_alloc, 'admin',
    jsonb_build_object('reason', v_reason, 'assigned_by', v_admin)
  )
  returning id into v_id;

  if p_grant_credits and v_alloc > 0 then
    insert into public.user_credits (user_id, daily_remaining, daily_limit, monthly_remaining, monthly_limit, bonus_balance)
    values (v_target, 8, 8, 80, 80, v_alloc)
    on conflict (user_id) do update
      set bonus_balance = public.user_credits.bonus_balance + excluded.bonus_balance,
          updated_at = now();

    select daily_remaining, monthly_remaining, bonus_balance
      into v_daily, v_monthly, v_bonus
    from public.user_credits
    where user_id = v_target
    for update;

    insert into public.user_credit_history (
      user_id, event_type, action, amount,
      daily_remaining, monthly_remaining,
      request_id, refunded, reference_id, feature, metadata
    ) values (
      v_target, 'grant', 'pack', v_alloc,
      v_daily, v_monthly,
      v_request, false, v_id::text, 'membership',
      jsonb_build_object(
        'reason', v_reason,
        'plan', v_plan,
        'membership_id', v_id,
        'granted_by', v_admin
      )
    );
  end if;

  return v_id;
end;
$$;

revoke all on function public.assign_user_membership(text, text, integer, integer, boolean, text) from public, anon;
grant execute on function public.assign_user_membership(text, text, integer, integer, boolean, text) to authenticated;

commit;
