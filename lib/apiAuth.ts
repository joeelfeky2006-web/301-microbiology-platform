import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

type Authorization = { userId: string } | { response: Response };

export async function authenticate(request: NextRequest): Promise<Authorization> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return { response: Response.json({ error: 'Sign in is required.' }, { status: 401 }) };
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { response: Response.json({ error: 'Your session is invalid or expired.' }, { status: 401 }) };
  return { userId: data.user.id };
}

/** Verify the caller and atomically spend server-side AI credits. */
export async function authorizeAndSpend(request: NextRequest, cost: number): Promise<Authorization> {
  const auth = await authenticate(request);
  if ('response' in auth) return auth;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const token = request.headers.get('authorization')!.replace(/^Bearer\s+/i, '');
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.rpc('deduct_user_credit', { p_user_id: auth.userId, p_cost: cost });
  if (error) {
    console.error('Server credit check failed:', error.message);
    return { response: Response.json({ error: 'AI credit service is unavailable.' }, { status: 503 }) };
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.success) return { response: Response.json({ error: result?.reason || 'AI credit limit reached.' }, { status: 429 }) };
  return auth;
}
