import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';
import 'server-only';
import { AI_MESSAGES, aiError } from '@/lib/ai/messages';
import { ACTION_COSTS, isAIAction, type AIAction } from '@/lib/ai/actions';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export type CreditBalance = {
  daily_remaining: number;
  monthly_remaining: number;
  daily_limit?: number;
  monthly_limit?: number;
  bonus_balance?: number;
};

export type AuthIdentity = {
  userId: string;
  email?: string;
  credits?: CreditBalance;
  /** Present after a successful authorizeAndSpend; required for refund_spend. */
  requestId?: string;
};
type Authorization = AuthIdentity | { response: Response };

export async function authenticate(request: NextRequest): Promise<Authorization> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return { response: aiError('auth', 401) };
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { response: aiError('auth', 401) };
  return { userId: data.user.id, email: data.user.email?.toLowerCase() };
}

function creditPayload(result: any): CreditBalance | undefined {
  if (result?.daily_remaining == null || result?.monthly_remaining == null) return undefined;
  return {
    daily_remaining: Number(result.daily_remaining),
    monthly_remaining: Number(result.monthly_remaining),
    bonus_balance: result.bonus_remaining != null ? Number(result.bonus_remaining) : undefined,
  };
}

async function readBalance(userId: string): Promise<CreditBalance | null> {
  const admin = createSupabaseAdmin();
  if (!admin) return null;
  const { data: row } = await admin
    .from('user_credits')
    .select('daily_remaining,monthly_remaining,daily_limit,monthly_limit,bonus_balance')
    .eq('user_id', userId)
    .maybeSingle();
  if (!row) return null;
  return {
    daily_remaining: Number(row.daily_remaining),
    monthly_remaining: Number(row.monthly_remaining),
    daily_limit: Number(row.daily_limit),
    monthly_limit: Number(row.monthly_limit),
    bonus_balance: Number(row.bonus_balance || 0),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Verify the caller and atomically spend server-side AI credits. Returns requestId for refunds. */
export async function authorizeAndSpend(
  request: NextRequest,
  action: AIAction,
  idempotencyKey?: string | null,
): Promise<Authorization> {
  const auth = await authenticate(request);
  if ('response' in auth) return auth;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const token = request.headers.get('authorization')!.replace(/^Bearer\s+/i, '');
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  if (!isAIAction(action)) return { response: aiError('glitch', 400) };

  const requestId = typeof idempotencyKey === 'string' && UUID_RE.test(idempotencyKey)
    ? idempotencyKey
    : randomUUID();
  const { data, error } = await client.rpc('deduct_user_credit', {
    p_user_id: auth.userId,
    p_cost: ACTION_COSTS[action],
    p_action: action,
    p_request_id: requestId,
  });
  if (error) {
    console.error(JSON.stringify({ action: 'credit', material_id: null, kind: 'glitch', latency_ms: 0, message: error.message }));
    return { response: aiError('glitch', 503) };
  }
  const result = Array.isArray(data) ? data[0] : data;
  const credits = creditPayload(result);
  if (!result?.success) {
    return {
      response: Response.json(
        { ok: false, kind: 'limit', message: AI_MESSAGES.limit, credits },
        { status: 429, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }
  return { ...auth, credits, requestId };
}

/**
 * Refund a prior spend by request_id via service-role refund_spend.
 * Students cannot call refund_spend; this must never use the user JWT client.
 */
export async function refundCredit(userId: string, requestId: string | undefined): Promise<CreditBalance | null> {
  if (!userId || !requestId) {
    console.error(JSON.stringify({ kind: 'refund_failed', message: 'Missing userId or requestId' }));
    return null;
  }
  const admin = createSupabaseAdmin();
  if (!admin) {
    console.error(JSON.stringify({ kind: 'refund_failed', message: 'Service role client unavailable' }));
    return null;
  }
  const { data, error } = await admin.rpc('refund_spend', {
    p_user_id: userId,
    p_request_id: requestId,
  });
  if (error) {
    console.error(JSON.stringify({ kind: 'refund_failed', message: error.message, requestId }));
    return null;
  }
  if (data !== true) {
    return readBalance(userId);
  }
  return readBalance(userId);
}
