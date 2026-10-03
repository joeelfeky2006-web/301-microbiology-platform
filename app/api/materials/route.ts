import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase, INITIAL_MATERIALS } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/materials?module=URS
 * Public course materials list for student dashboard and module viewer.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawModule = searchParams.get('module')?.trim().toUpperCase();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const admin = createSupabaseAdmin();

  // Determine client: service-role admin -> authenticated user token -> anon client
  let clientToQuery: any = admin;
  if (!clientToQuery && url && anonKey && token) {
    clientToQuery = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  if (!clientToQuery) {
    clientToQuery = supabase;
  }

  const pageSize = 500;
  const materials: Record<string, unknown>[] = [];

  // Exclude 'created_at' as that column does not exist on the database table
  const columns = 'id,module,type,title,subtitle,file_url,format,source_type';
  const baselineColumns = 'id,module,type,title,file_url,format,source_type';

  let success = false;

  // Attempt 1: Query with subtitle
  try {
    for (let from = 0; ; from += pageSize) {
      let q = clientToQuery
        .from('materials')
        .select(columns)
        .order('title', { ascending: true })
        .range(from, from + pageSize - 1);

      if (rawModule && rawModule !== 'ALL') {
        q = q.or(`module.eq.${rawModule},module.eq.${rawModule.toLowerCase()}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      if (data && Array.isArray(data) && data.length > 0) {
        materials.push(...(data as Record<string, unknown>[]));
      }
      if (!data || data.length < pageSize) break;
    }
    success = true;
  } catch (err: any) {
    // Attempt 2: Query without subtitle if subtitle column is missing or restricted
    materials.length = 0;
    try {
      for (let from = 0; ; from += pageSize) {
        let q = clientToQuery
          .from('materials')
          .select(baselineColumns)
          .order('title', { ascending: true })
          .range(from, from + pageSize - 1);

        if (rawModule && rawModule !== 'ALL') {
          q = q.or(`module.eq.${rawModule},module.eq.${rawModule.toLowerCase()}`);
        }

        const { data, error } = await q;
        if (error) throw error;
        if (data && Array.isArray(data) && data.length > 0) {
          materials.push(...(data as Record<string, unknown>[]));
        }
        if (!data || data.length < pageSize) break;
      }
      success = true;
    } catch {
      // Both database queries failed (e.g. anon role has no select permissions on materials)
      success = false;
    }
  }

  // Never serve demo seed data in production / Vercel. Local dev may use curated seed.
  if (!success) {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      return NextResponse.json(
        { materials: [], count: 0 },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const fallbackList = (rawModule && rawModule !== 'ALL')
      ? INITIAL_MATERIALS.filter((m) => m.module === rawModule)
      : INITIAL_MATERIALS;
    return NextResponse.json(
      { materials: fallbackList, count: fallbackList.length, fallback: true },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
    );
  }

  // Normalize module names to uppercase in output
  const normalized = materials.map((m: any) => ({
    ...m,
    module: typeof m.module === 'string' ? m.module.trim().toUpperCase() : m.module,
  }));

  return NextResponse.json(
    { materials: normalized, count: normalized.length },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    }
  );
}
