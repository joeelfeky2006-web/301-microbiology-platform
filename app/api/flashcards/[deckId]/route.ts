import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { loadPublishedDeck } from '@/lib/flashcards/loadDeck';
import { buildStudySession, type ProgressRow } from '@/lib/flashcards/session';

export const dynamic = 'force-dynamic';

/** Load a published deck + caller progress (due/new queue). */
export async function GET(request: NextRequest, { params }: { params: { deckId: string } }) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;

  const loaded = await loadPublishedDeck(params.deckId);
  if ('error' in loaded) return Response.json({ error: loaded.error }, { status: loaded.status });

  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Flashcard service is unavailable.' }, { status: 503 });

  const { data: progressData, error } = await admin
    .from('flashcard_progress')
    .select('card_id,ease_factor,interval_days,repetitions,due_at,last_reviewed_at')
    .eq('user_id', auth.userId)
    .eq('deck_id', loaded.deckId!);
  if (error) return Response.json({ error: 'Could not load progress.' }, { status: 503 });

  const progressRows = (progressData || []) as ProgressRow[];
  const session = buildStudySession(loaded.cards, progressRows);

  return Response.json(
    {
      deck: {
        id: loaded.deckId,
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
