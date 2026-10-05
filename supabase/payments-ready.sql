-- MedAtlas — Phase 7: payment-ready schema (no live Paymob yet).
-- Run once in Supabase SQL Editor after phase4 credit SQL.

begin;

-- Durable orders. Credits are granted ONLY after status → paid + fulfill RPC.
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id text not null check (length(trim(package_id)) > 0 and length(package_id) <= 64),
  provider text not null default 'paymob' check (provider in ('paymob', 'fawry', 'manual')),
  status text not null default 'pending'
    check (status in ('pending', 'checkout_created', 'paid', 'failed', 'cancelled', 'refunded', 'fulfilled')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EGP' check (length(currency) = 3),
  credits integer not null check (credits >= 0),
  provider_order_id text,
  provider_transaction_id text,
  idempotency_key uuid not null unique,
  checkout_url text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);
create index if not exists payment_orders_provider_txn_idx
  on public.payment_orders (provider, provider_transaction_id)
  where provider_transaction_id is not null;
create unique index if not exists payment_orders_provider_order_uidx
  on public.payment_orders (provider, provider_order_id)
  where provider_order_id is not null;

alter table public.payment_orders enable row level security;

drop policy if exists payment_orders_read_own on public.payment_orders;
create policy payment_orders_read_own on public.payment_orders
  for select to authenticated
  using (auth.uid() = user_id);

-- Students never insert/update orders directly — API uses service_role.
revoke insert, update, delete on public.payment_orders from anon, authenticated;
grant select on public.payment_orders to authenticated;
grant all on public.payment_orders to service_role;

-- Append-only provider / webhook audit trail
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.payment_orders(id) on delete set null,
  provider text not null,
  event_type text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists payment_events_provider_event_uidx
  on public.payment_events (provider, provider_event_id)
  where provider_event_id is not null;

create index if not exists payment_events_order_idx
  on public.payment_events (order_id, created_at desc);

alter table public.payment_events enable row level security;
-- No student access; service_role / staff via admin only
revoke all on public.payment_events from anon, authenticated;
grant all on public.payment_events to service_role;

-- Fulfill a paid order once: bonus credits + ledger purchase row.
-- EXECUTE granted to service_role only (same pattern as refund_spend).
create or replace function public.fulfill_payment_order(p_order_id uuid)
returns table(success boolean, reason text, bonus_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_daily integer;
  v_monthly integer;
  v_bonus integer;
  v_request uuid := gen_random_uuid();
begin
  select * into v_order from public.payment_orders where id = p_order_id for update;
  if not found then
    return query select false, 'order_not_found', 0;
    return;
  end if;

  if v_order.status = 'fulfilled' then
    select uc.bonus_balance into v_bonus from public.user_credits uc where uc.user_id = v_order.user_id;
    return query select true, 'already_fulfilled', coalesce(v_bonus, 0);
    return;
  end if;

  if v_order.status <> 'paid' then
    return query select false, 'not_paid', 0;
    return;
  end if;

  if v_order.credits < 1 then
    update public.payment_orders
      set status = 'fulfilled', fulfilled_at = now(), updated_at = now()
      where id = v_order.id;
    return query select true, 'zero_credit_pack', 0;
    return;
  end if;

  insert into public.user_credits (user_id, daily_remaining, daily_limit, monthly_remaining, monthly_limit, bonus_balance)
  values (v_order.user_id, 8, 8, 80, 80, v_order.credits)
  on conflict (user_id) do update
    set bonus_balance = public.user_credits.bonus_balance + excluded.bonus_balance,
        updated_at = now();

  select daily_remaining, monthly_remaining, bonus_balance
    into v_daily, v_monthly, v_bonus
  from public.user_credits
  where user_id = v_order.user_id
  for update;

  insert into public.user_credit_history (
    user_id, event_type, action, amount,
    daily_remaining, monthly_remaining,
    request_id, refunded, reference_id, feature, metadata
  ) values (
    v_order.user_id, 'purchase', 'purchase', v_order.credits,
    v_daily, v_monthly,
    v_request, false, v_order.id::text, 'purchase',
    jsonb_build_object(
      'order_id', v_order.id,
      'package_id', v_order.package_id,
      'provider', v_order.provider,
      'provider_transaction_id', v_order.provider_transaction_id
    )
  );

  update public.payment_orders
    set status = 'fulfilled', fulfilled_at = now(), updated_at = now()
    where id = v_order.id;

  return query select true, 'fulfilled', v_bonus;
end;
$$;

revoke all on function public.fulfill_payment_order(uuid) from public, anon, authenticated;
grant execute on function public.fulfill_payment_order(uuid) to service_role;

commit;
