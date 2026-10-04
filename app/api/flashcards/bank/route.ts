import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { loadRawBank, FLASHCARD_UUID_RE } from '@/lib/flashcards/loadDeck';
import { buildStudySession, type ProgressRow } from '@/lib/flashcards/session';

export const dynamic = 'force-dynamic';

/** Load raw material flashcard bank + caller progress (due/new queue). */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  const materialId = request.nextUrl.searchParams.get('material_id');
  if (!materialId || !FLASHCARD_UUID_RE.test(materialId)) {
    return Response.json({ error: 'Choose a lecture.' }, { status: 400 });
  }

  const loaded = await loadRawBank(materialId);
  if ('error' in loaded) return Response.json({ error: loaded.error }, { status: loaded.status });

  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Flashcard service is unavailable.' }, { status: 503 });

  const { data: progressData, error } = await admin
    .from('flashcard_progress')
    .select('card_id,ease_factor,interval_days,repetitions,due_at,last_reviewed_at')
    .eq('user_id', auth.userId)
    .eq('material_id', loaded.materialId)
    .is('deck_id', null);
  if (error) return Response.json({ error: 'Could not load progress.' }, { status: 503 });

  const progressRows = (progressData || []) as ProgressRow[];
  const session = buildStudySession(loaded.cards, progressRows);

  return Response.json(
    {
      deck: {
        id: null,
        material_id: loaded.materialId,
        title: loaded.title,
        source: loaded.source,
      },
      stats: session.stats,
      cards: session.queue,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
