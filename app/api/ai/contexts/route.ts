import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

const MODULES = new Set(['CNS', 'URS', 'REP']);

/** Returns only safe file labels/IDs; context text remains server-side. */
export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const module = request.nextUrl.searchParams.get('module');
  if (!module || !MODULES.has(module)) return Response.json({ error: 'Invalid module.' }, { status: 400 });
  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'AI context service is unavailable.' }, { status: 503 });

  const { data, error } = await admin.from('materials')
    .select('id,module,type,title,file_url,ai_context')
    .eq('module', module)
    .not('ai_context', 'is', null)
    .order('title', { ascending: true });
  if (error) return Response.json({ error: 'Could not load lecture contexts.' }, { status: 503 });

  const files = (data || []).filter((row) => typeof row.ai_context === 'string' && row.ai_context.trim().length > 0)
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
