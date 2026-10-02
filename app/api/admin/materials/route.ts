import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin content service is not configured.' }, { status: 503 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !anonKey || !token) {
    return NextResponse.json({ error: 'Could not verify CMS role: Supabase public configuration or session token is missing.' }, { status: 503 });
  }
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: role, error: roleError } = await userClient.rpc('get_current_user_role');
  if (roleError) {
    return NextResponse.json({ error: 'Could not verify CMS role. Confirm get_current_user_role() is installed and callable.' }, { status: 503 });
  }
  if (!['super_admin', 'editor'].includes(role)) {
    return NextResponse.json({ error: 'Staff access is required.' }, { status: 403 });
  }

  const materials: Record<string, unknown>[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('materials')
      .select('*')
      .order('title', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error(JSON.stringify({ action: 'admin-materials', material_id: null, kind: 'glitch', latency_ms: 0 }));
      return NextResponse.json({ error: 'Could not load course materials.' }, { status: 500 });
    }
    materials.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return NextResponse.json({ materials }, { headers: { 'Cache-Control': 'no-store' } });
}
