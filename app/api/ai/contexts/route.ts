import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

const MODULES = new Set(['CNS', 'URS', 'REP']);

/** Returns only safe file labels/IDs; context text remains server-side. */
export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const moduleCode = request.nextUrl.searchParams.get('module');
  if (!moduleCode || !MODULES.has(moduleCode)) return Response.json({ error: 'Invalid module.' }, { status: 400 });
  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'AI context service is unavailable.' }, { status: 503 });

  // Include lectures that have AI context and/or quiz bank text (siblings are merged server-side later).
  const { data, error } = await admin.from('materials')
    .select('id,module,type,title,file_url,ai_context,raw_quiz_text')
    .eq('module', moduleCode)
    .order('title', { ascending: true });
  if (error) return Response.json({ error: 'Could not load lecture contexts.' }, { status: 503 });

  const seenTitles = new Set<string>();
  const files = (data || [])
    .filter((row) => {
      const hasAi = typeof row.ai_context === 'string' && row.ai_context.trim().length > 0;
      const hasQuiz = typeof row.raw_quiz_text === 'string' && row.raw_quiz_text.trim().length > 0;
      return hasAi || hasQuiz;
    })
    .filter((row) => {
      // One picker entry per lecture title (loadMaterial merges sibling banks).
      const key = `${row.module}::${row.title}`;
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .map(({ id, module: rowModule, type, title, file_url }) => {
      let fileLabel = 'Resource';
      try {
        const url = new URL(file_url);
        const tail = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
        fileLabel = `${url.hostname.replace(/^www\./, '')}${tail ? ` · ${tail}` : ''}`;
      } catch { /* legacy non-URL values use the generic label */ }
      return { id, module: rowModule, type, title, fileLabel };
    });
  return Response.json({ files }, { headers: { 'Cache-Control': 'private, no-store' } });
}
