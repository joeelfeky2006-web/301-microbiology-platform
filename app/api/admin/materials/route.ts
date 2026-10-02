import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

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

  const { data: materials, error } = await admin
    .from('materials')
    .select('*')
    .order('title', { ascending: true });
  if (error) {
    console.error('Admin material load failed:', error.message);
    return NextResponse.json({ error: 'Could not load course materials.' }, { status: 500 });
  }
  return NextResponse.json({ materials: materials || [] }, { headers: { 'Cache-Control': 'no-store' } });
}
