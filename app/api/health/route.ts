import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.from('materials').select('id').limit(1);
  if (error) return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
