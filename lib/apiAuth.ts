import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

type Authorization = { userId: string } | { response: Response };

/** Verify the caller's Supabase JWT and atomically spend server-side AI credits. */
export async function authorizeAndSpend(request: NextRequest, cost: number): Promise<Authorization> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) {
    return { response: Response.json({ error: 'Sign in is required.' }, { status: 401 }) };
  }
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) {
    return { response: Response.json({ error: 'Your session is invalid or expired.' }, { status: 401 }) };
  }
  const { data, error } = await client.rpc('deduct_user_credit', {
    p_user_id: authData.user.id,
    p_cost: cost,
  });
  if (error) {
    console.error('Server credit check failed:', error.message);
    return { response: Response.json({ error: 'AI credit service is unavailable.' }, { status: 503 }) };
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.success) {
    return { response: Response.json({ error: result?.reason || 'AI credit limit reached.' }, { status: 429 }) };
  }
  return { userId: authData.user.id };
}
