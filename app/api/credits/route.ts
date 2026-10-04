import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { aiError } from '@/lib/ai/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return aiError('glitch', 503);
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await client.from('user_credits').select('daily_remaining,daily_limit,monthly_remaining,monthly_limit,bonus_balance').eq('user_id', identity.userId).maybeSingle();
  if (error || !data) return aiError('glitch', 503);
  return Response.json({
    credits: {
      ...data,
      bonus_balance: Number((data as { bonus_balance?: number }).bonus_balance || 0),
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
