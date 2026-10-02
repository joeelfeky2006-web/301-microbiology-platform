import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import 'server-only';
import { aiError } from '@/lib/ai/messages';
import { ACTION_COSTS, isAIAction, type AIAction } from '@/lib/ai/actions';

type Authorization = { userId: string } | { response: Response };

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
  return { userId: data.user.id };
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
  const { data, error } = await client.rpc('deduct_user_credit', { p_user_id: auth.userId, p_cost: ACTION_COSTS[action] });
  if (error) {
    console.error(JSON.stringify({ action: 'credit', material_id: null, kind: 'glitch', latency_ms: 0 }));
    return { response: aiError('glitch', 503) };
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.success) return { response: aiError('limit', 429) };
  return auth;
}

export async function refundCredit(request: NextRequest, action: AIAction): Promise<boolean> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return false;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { error } = await client.rpc('refund_user_credit', { p_cost: ACTION_COSTS[action] });
  return !error;
}
