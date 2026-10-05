-- Phase 10: optional indexes to keep admin observability queries cheap.
-- Safe to re-run. Does not change product behavior.

begin;

create index if not exists ai_usage_status_created_idx
  on public.ai_usage (status, created_at desc);

create index if not exists ai_usage_provider_created_idx
  on public.ai_usage (provider, created_at desc)
  where provider is not null;

create index if not exists user_credit_history_event_created_idx
  on public.user_credit_history (event_type, created_at desc);

-- payment_* tables may not exist until payments-ready.sql is applied
do $$
begin
  if to_regclass('public.payment_orders') is not null then
    execute 'create index if not exists payment_orders_status_created_idx on public.payment_orders (status, created_at desc)';
  end if;
  if to_regclass('public.payment_events') is not null then
    execute 'create index if not exists payment_events_created_idx on public.payment_events (created_at desc)';
  end if;
end $$;

commit;
