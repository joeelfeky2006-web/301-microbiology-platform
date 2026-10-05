-- Phase 11 — reaffirm credit / payment privilege boundaries.
-- Safe to re-run. Does not invent new business logic.

begin;

-- Students may SELECT their balance; never INSERT/UPDATE/DELETE balances directly.
revoke insert, update, delete, truncate, references, trigger on public.user_credits from public, anon, authenticated;
grant select on public.user_credits to authenticated;
grant select, insert, update, delete on public.user_credits to service_role;

-- Ledger: read own history only (policy assumed elsewhere); no direct writes from clients.
revoke insert, update, delete, truncate on public.user_credit_history from public, anon, authenticated;
grant select on public.user_credit_history to authenticated;
grant all on public.user_credit_history to service_role;

-- Spend / refund / grant / fulfill execute grants (idempotent re-assert)
revoke all on function public.deduct_user_credit(uuid, integer, text, uuid) from public, anon;
grant execute on function public.deduct_user_credit(uuid, integer, text, uuid) to authenticated;

revoke all on function public.refund_spend(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refund_spend(uuid, uuid) to service_role;

revoke all on function public.grant_user_credits(text, integer, text) from public, anon;
grant execute on function public.grant_user_credits(text, integer, text) to authenticated;

do $$
begin
  if to_regclass('public.payment_orders') is not null then
    revoke insert, update, delete on public.payment_orders from anon, authenticated;
    grant select on public.payment_orders to authenticated;
    grant all on public.payment_orders to service_role;
  end if;
  if to_regclass('public.payment_events') is not null then
    revoke all on public.payment_events from anon, authenticated;
    grant all on public.payment_events to service_role;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fulfill_payment_order'
  ) then
    revoke all on function public.fulfill_payment_order(uuid) from public, anon, authenticated;
    grant execute on function public.fulfill_payment_order(uuid) to service_role;
  end if;
end $$;

commit;
