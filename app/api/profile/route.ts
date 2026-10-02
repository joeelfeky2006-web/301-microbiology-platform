import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns only the signed-in user's profile, one balance row, and the newest 20 ledger events. */
export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!url || !anonKey || !token) return NextResponse.json({ error: 'Profile service is not configured.' }, { status: 503 });

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const [{ data: userData, error: userError }, { data: credits, error: creditsError }, { data: history, error: historyError }] = await Promise.all([
    client.auth.getUser(token),
    client.from('user_credits').select('daily_remaining,daily_limit,monthly_remaining,monthly_limit,created_at,updated_at').eq('user_id', identity.userId).maybeSingle(),
    client.from('user_credit_history').select('id,event_type,action,amount,daily_remaining,monthly_remaining,created_at').eq('user_id', identity.userId).order('created_at', { ascending: false }).limit(20),
  ]);
  if (userError || !userData.user) return NextResponse.json({ error: 'Could not load your account profile.' }, { status: 401 });
  if (creditsError || historyError) {
    console.error('Profile data load failed:', creditsError?.message || historyError?.message);
    return NextResponse.json({ error: 'Credit history is not configured yet. Apply the profile-credit-history SQL migration.' }, { status: 503 });
  }

  const user = userData.user;
  return NextResponse.json({
    profile: {
      id: user.id,
      name: String(user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'),
      email: user.email || '',
      email_confirmed: Boolean(user.email_confirmed_at),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    credits: credits || { daily_remaining: 0, daily_limit: 8, monthly_remaining: 0, monthly_limit: 80 },
    history: history || [],
  }, { headers: { 'Cache-Control': 'no-store' } });
}
