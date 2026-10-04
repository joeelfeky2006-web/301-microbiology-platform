import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import 'server-only';
import { AI_MESSAGES, aiError } from '@/lib/ai/messages';
import { ACTION_COSTS, isAIAction, type AIAction } from '@/lib/ai/actions';

export type CreditBalance = {
  daily_remaining: number;
  monthly_remaining: number;
  daily_limit?: number;
  monthly_limit?: number;
};

export type AuthIdentity = { userId: string; email?: string; credits?: CreditBalance };
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
  };
}

/** Verify the caller and atomically spend server-side AI credits. */
export async function authorizeAndSpend(request: NextRequest, action: AIAction): Promise<Authorization> {
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
  const { data, error } = await client.rpc('deduct_user_credit', { p_user_id: auth.userId, p_cost: ACTION_COSTS[action], p_action: action });
  if (error) {
    console.error(JSON.stringify({ action: 'credit', material_id: null, kind: 'glitch', latency_ms: 0 }));
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
  return { ...auth, credits };
}

export async function refundCredit(request: NextRequest, action: AIAction): Promise<CreditBalance | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await client.auth.getUser(token);
  const userId = userData.user?.id;
  const { data, error } = await client.rpc('refund_user_credit', { p_cost: ACTION_COSTS[action], p_action: action });
  if (error || data !== true) {
    console.error(JSON.stringify({ action, kind: 'refund_failed', message: error?.message || 'Refund RPC returned false' }));
    return null;
  }
  if (!userId) return null;
  const { data: row } = await client
    .from('user_credits')
    .select('daily_remaining,monthly_remaining,daily_limit,monthly_limit')
    .eq('user_id', userId)
    .maybeSingle();
  if (!row) return null;
  return {
    daily_remaining: Number(row.daily_remaining),
    monthly_remaining: Number(row.monthly_remaining),
    daily_limit: Number(row.daily_limit),
    monthly_limit: Number(row.monthly_limit),
  };
}
