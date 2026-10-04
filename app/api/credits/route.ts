import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { aiError } from '@/lib/ai/messages';
import { refreshUserCredits } from '@/lib/credits/refresh';

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
  const credits = await refreshUserCredits(client, identity.userId);
  if (!credits) return aiError('glitch', 503);
  return Response.json({ credits }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Credits are server-determined via deduct/grant RPCs — never accept client mutations here. */
export async function POST() {
  return Response.json({ error: 'Credits cannot be modified from this endpoint.' }, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } });
}
export async function PUT() {
  return POST();
}
export async function PATCH() {
  return POST();
}
export async function DELETE() {
  return POST();
}
