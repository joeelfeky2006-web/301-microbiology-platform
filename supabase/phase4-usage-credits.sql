-- ==============================================================================
-- MedAtlas — Phase 4: usage logging, safety switches, packs, summary cache
-- REVIEW BEFORE APPLYING — do not auto-run against production from an agent.
-- Single transaction; idempotent / re-runnable.
-- Prerequisites: credit-refund-abuse-fix.sql (+ credit-fix-2.sql if needed).
-- Do not recreate anything from supabase/_archive/.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- ITEM 1 — ai_usage (metadata only; never prompts/outputs/PII)
-- ------------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  request_id uuid,
  feature text,
  material_id uuid,
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  credits_charged integer,
  latency_ms integer,
  status text not null check (status in ('success', 'error', 'refunded', 'blocked')),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_at_idx on public.ai_usage (created_at);
create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at);
create index if not exists ai_usage_feature_created_idx on public.ai_usage (feature, created_at);

alter table public.ai_usage enable row level security;

-- No student policies. Service role only.
revoke all on public.ai_usage from public, anon, authenticated;
grant select, insert, update, delete on public.ai_usage to service_role;

commit;
