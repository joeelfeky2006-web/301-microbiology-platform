import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ObservabilitySnapshot } from './types';

function envRate(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/** Rough USD estimate from token totals (override via env). */
function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const inPerM = envRate('AI_COST_INPUT_USD_PER_MTOK', 0.1);
  const outPerM = envRate('AI_COST_OUTPUT_USD_PER_MTOK', 0.4);
  return (inputTokens / 1_000_000) * inPerM + (outputTokens / 1_000_000) * outPerM;
}

function formatEgp(cents: number): string {
  return `${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)} EGP`;
}

function bump(map: Record<string, number>, key: string, by = 1) {
  const k = key || 'unknown';
  map[k] = (map[k] || 0) + by;
}

/**
 * Aggregate observability metrics from existing tables.
 * Missing tables (SQL not applied) → empty series + availability flags.
 */
export async function collectObservability(
  admin: SupabaseClient,
  opts: { days?: number; totalUsers?: number } = {},
): Promise<ObservabilitySnapshot> {
  const days = opts.days && opts.days > 0 ? Math.min(opts.days, 90) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const availability = {
    ai_usage: true,
    payment_orders: true,
    payment_events: true,
    user_credit_history: true,
  };

  const [
    aiResult,
    creditHistoryResult,
    ordersResult,
    eventsResult,
    errorsResult,
  ] = await Promise.all([
    admin
      .from('ai_usage')
      .select('user_id,feature,provider,status,input_tokens,output_tokens,total_tokens,error_code,created_at')
      .gte('created_at', since)
      .limit(5000),
    admin
      .from('user_credit_history')
      .select('event_type,action,amount')
      .gte('created_at', since)
      .limit(5000),
    admin
      .from('payment_orders')
      .select('id,status,amount_cents,currency,credits,created_at,fulfilled_at')
      .gte('created_at', since)
      .limit(2000),
    admin
      .from('payment_events')
      .select('id,provider,event_type,order_id,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('ai_usage')
      .select('id,feature,provider,error_code,status,created_at')
      .in('status', ['error', 'refunded', 'blocked'])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (aiResult.error) availability.ai_usage = false;
  if (creditHistoryResult.error) availability.user_credit_history = false;
  if (ordersResult.error) availability.payment_orders = false;
  if (eventsResult.error) availability.payment_events = false;

  const aiRows = aiResult.data || [];
  const byFeature: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byProvider: Record<string, number> = {};
  const activeUsers = new Set<string>();
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let providerFailures = 0;

  for (const row of aiRows) {
    if (row.user_id) activeUsers.add(String(row.user_id));
    bump(byFeature, String(row.feature || 'unknown'));
    bump(byStatus, String(row.status || 'unknown'));
    if (row.provider) bump(byProvider, String(row.provider));
    inputTokens += Number(row.input_tokens) || 0;
    outputTokens += Number(row.output_tokens) || 0;
    totalTokens += Number(row.total_tokens) || 0;
    if (row.status === 'error' || row.status === 'refunded') providerFailures += 1;
  }

  let consumed = 0;
  let purchased = 0;
  let granted = 0;
  for (const row of creditHistoryResult.data || []) {
    const amount = Math.abs(Number(row.amount) || 0);
    if (row.event_type === 'spend') consumed += amount;
    else if (row.event_type === 'purchase' || row.action === 'purchase') purchased += amount;
    else if (row.event_type === 'grant' || row.action === 'admin_grant' || row.action === 'pack') granted += amount;
  }

  const orders = ordersResult.data || [];
  let checkoutStarted = 0;
  let purchasesCompleted = 0;
  let paidAmountCents = 0;
  let paidOrders = 0;
  for (const row of orders) {
    if (['checkout_created', 'paid', 'fulfilled', 'failed', 'cancelled', 'pending'].includes(String(row.status))) {
      checkoutStarted += 1;
    }
    if (row.status === 'fulfilled' || row.status === 'paid') {
      purchasesCompleted += 1;
      paidOrders += 1;
      paidAmountCents += Number(row.amount_cents) || 0;
    }
  }

  const conversionRate =
    checkoutStarted > 0 ? Number((purchasesCompleted / checkoutStarted).toFixed(4)) : null;

  const cost = availability.ai_usage ? estimateCostUsd(inputTokens, outputTokens) : null;

  return {
    window: { since, days },
    users: {
      total: opts.totalUsers ?? 0,
      active7d: activeUsers.size,
    },
    ai: {
      requests: aiRows.length,
      byFeature,
      byStatus,
      byProvider,
      providerFailures,
      totalTokens,
      estimatedCostUsd: cost === null ? null : Number(cost.toFixed(4)),
    },
    credits: { consumed, purchased, granted },
    revenue: {
      currency: 'EGP',
      paidOrders,
      amountCents: paidAmountCents,
      amountLabel: formatEgp(paidAmountCents),
    },
    conversion: {
      checkoutStarted,
      purchasesCompleted,
      rate: conversionRate,
    },
    recentPaymentEvents: (eventsResult.data || []).map((row) => ({
      id: String(row.id),
      provider: String(row.provider || ''),
      event_type: String(row.event_type || ''),
      order_id: row.order_id ? String(row.order_id) : null,
      created_at: String(row.created_at),
    })),
    recentErrors: (errorsResult.data || []).map((row) => ({
      id: String(row.id),
      feature: row.feature ? String(row.feature) : null,
      provider: row.provider ? String(row.provider) : null,
      error_code: row.error_code ? String(row.error_code) : null,
      status: String(row.status || ''),
      created_at: String(row.created_at),
    })),
    availability,
  };
}
