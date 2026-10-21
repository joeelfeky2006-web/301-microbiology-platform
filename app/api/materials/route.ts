import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase, INITIAL_MATERIALS } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { supabaseNoStoreFetch } from '@/lib/supabaseFetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const LIST_COLUMNS = 'id,module,type,title,subtitle,file_url,format,source_type';

/**
 * GET /api/materials?module=URS
 * Course materials list for student dashboard and module viewer.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawModule = searchParams.get('module')?.trim().toUpperCase();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const admin = createSupabaseAdmin();

  // Prefer service-role; else authenticated user token; else anon/browser client.
  let clientToQuery: any = admin;
  if (!clientToQuery && url && anonKey && token) {
    clientToQuery = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: supabaseNoStoreFetch,
        headers: { Authorization: `Bearer ${token}` },
      },
    });
  }
  if (!clientToQuery) {
    clientToQuery = supabase;
  }

  const pageSize = 500;
  const materials: Record<string, unknown>[] = [];
  let success = false;

  try {
    for (let from = 0; ; from += pageSize) {
      let q = clientToQuery
        .from('materials')
        .select(LIST_COLUMNS)
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
    success = false;
  }

  // Never serve demo seed data in production / Vercel.
  if (!success) {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    if (isProd) {
      return NextResponse.json(
        { materials: [], count: 0 },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const fallbackList =
      rawModule && rawModule !== 'ALL'
        ? INITIAL_MATERIALS.filter((m) => m.module === rawModule)
        : INITIAL_MATERIALS;
    return NextResponse.json(
      { materials: fallbackList, count: fallbackList.length, fallback: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Bank presence flags without transferring bank text (avoids huge payloads / timeouts).
  const aiIds = new Set<string>();
  const quizIds = new Set<string>();
  const flashIds = new Set<string>();
  if (admin) {
    try {
      const [aiRes, quizRes, flashRes] = await Promise.all([
        admin.from('materials').select('id').not('ai_context', 'is', null),
        admin.from('materials').select('id').not('raw_quiz_text', 'is', null),
        admin.from('materials').select('id').not('raw_flashcard_text', 'is', null),
      ]);
      for (const row of aiRes.data || []) if (row?.id) aiIds.add(String(row.id));
      for (const row of quizRes.data || []) if (row?.id) quizIds.add(String(row.id));
      for (const row of flashRes.data || []) if (row?.id) flashIds.add(String(row.id));
    } catch {
      // Flags are optional; list still returns.
    }
  }

  const normalized = materials.map((m: any) => {
    const id = String(m.id || '');
    return {
      id: m.id,
      module: typeof m.module === 'string' ? m.module.trim().toUpperCase() : m.module,
      type: m.type,
      title: m.title,
      subtitle: m.subtitle ?? null,
      file_url: m.file_url,
      format: m.format,
      source_type: m.source_type ?? null,
      has_ai_context: aiIds.has(id),
      has_raw_quiz: quizIds.has(id),
      has_raw_flashcard: flashIds.has(id),
    };
  });

  return NextResponse.json(
    { materials: normalized, count: normalized.length },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
