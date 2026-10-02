import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin content service is not configured.' }, { status: 503 });

  const { data: role, error: roleError } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', identity.userId)
    .maybeSingle();
  if (roleError || !role || !['super_admin', 'editor'].includes(role.role)) {
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
