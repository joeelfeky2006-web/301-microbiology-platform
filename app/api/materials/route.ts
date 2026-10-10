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

  // Public list columns. With service role we can also read bank columns to derive
  // has_* flags for quiz/flashcard UI without exposing the bank text to the client.
  const publicColumns = 'id,module,type,title,subtitle,file_url,format,source_type';
  const adminColumns = `${publicColumns},ai_context,raw_quiz_text,raw_flashcard_text`;
  const baselineColumns = 'id,module,type,title,subtitle,file_url,format,source_type';
  const columns = admin ? adminColumns : publicColumns;

  let success = false;

  // Attempt 1: Query with subtitle (+ bank columns when service role is available)
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
    // Attempt 2: Public columns only
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

  // Normalize module names; expose bank presence flags only (never raw bank text).
  const normalized = materials.map((m: any) => {
    const hasAi = typeof m.ai_context === 'string' && m.ai_context.trim().length > 0;
    const hasQuiz = typeof m.raw_quiz_text === 'string' && m.raw_quiz_text.trim().length > 0;
    const hasFlash = typeof m.raw_flashcard_text === 'string' && m.raw_flashcard_text.trim().length > 0;
    return {
      id: m.id,
      module: typeof m.module === 'string' ? m.module.trim().toUpperCase() : m.module,
      type: m.type,
      title: m.title,
      subtitle: m.subtitle ?? null,
      file_url: m.file_url,
      format: m.format,
      source_type: m.source_type ?? null,
      has_ai_context: hasAi,
      has_raw_quiz: hasQuiz,
      has_raw_flashcard: hasFlash,
    };
  });

  return NextResponse.json(
    { materials: normalized, count: normalized.length },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
