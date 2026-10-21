import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return Response.json(
      { ok: false, reason: 'service_role_missing' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const { data, error } = await admin.from('materials').select('id,module');
  if (error) {
    return Response.json(
      { ok: false, reason: 'materials_query_failed' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const byModule: Record<string, number> = {};
  for (const row of data || []) {
    const mod = typeof row.module === 'string' ? row.module.trim().toUpperCase() : 'UNKNOWN';
    byModule[mod] = (byModule[mod] || 0) + 1;
  }
  return Response.json(
    { ok: true, count: (data || []).length, byModule },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
