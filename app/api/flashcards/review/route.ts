import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { FLASHCARD_UUID_RE, loadPublishedDeck, loadRawBank } from '@/lib/flashcards/loadDeck';
import { applySrsRating, isSrsRating } from '@/lib/flashcards/srs';

export const dynamic = 'force-dynamic';

/** Record an SRS rating for one card. */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const cardId = typeof body.card_id === 'string' ? body.card_id.trim() : '';
  if (!cardId || cardId.length > 120 || !isSrsRating(body.rating)) {
    return Response.json({ error: 'Provide card_id and rating (again|hard|good|easy).' }, { status: 400 });
  }

  const deckId = typeof body.deck_id === 'string' && FLASHCARD_UUID_RE.test(body.deck_id) ? body.deck_id : null;
  const materialId = typeof body.material_id === 'string' && FLASHCARD_UUID_RE.test(body.material_id) ? body.material_id : null;
  if (!deckId && !materialId) {
    return Response.json({ error: 'Provide deck_id or material_id.' }, { status: 400 });
  }

  const loaded = deckId ? await loadPublishedDeck(deckId) : await loadRawBank(materialId!);
  if ('error' in loaded) return Response.json({ error: loaded.error }, { status: loaded.status });
  if (!loaded.cards.some((card) => card.id === cardId)) {
    return Response.json({ error: 'Card not found in this deck.' }, { status: 404 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Flashcard service is unavailable.' }, { status: 503 });

  let query = admin
    .from('flashcard_progress')
    .select('id,ease_factor,interval_days,repetitions,due_at')
    .eq('user_id', auth.userId)
    .eq('card_id', cardId)
    .eq('material_id', loaded.materialId);
  query = loaded.deckId ? query.eq('deck_id', loaded.deckId) : query.is('deck_id', null);
  const { data: existing, error: readError } = await query.maybeSingle();
  if (readError) return Response.json({ error: 'Could not load progress.' }, { status: 503 });

  const next = applySrsRating(existing, body.rating);
  const payload = {
    user_id: auth.userId,
    material_id: loaded.materialId,
    deck_id: loaded.deckId,
    card_id: cardId,
    ease_factor: next.ease_factor,
    interval_days: next.interval_days,
    repetitions: next.repetitions,
    due_at: next.due_at,
    last_reviewed_at: next.last_reviewed_at,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await admin
      .from('flashcard_progress')
      .update(payload)
      .eq('id', existing.id)
      .select('card_id,ease_factor,interval_days,repetitions,due_at,last_reviewed_at')
      .single();
    if (error || !data) return Response.json({ error: 'Could not save review.' }, { status: 503 });
    return Response.json({ progress: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  const { data, error } = await admin
    .from('flashcard_progress')
    .insert(payload)
    .select('card_id,ease_factor,interval_days,repetitions,due_at,last_reviewed_at')
    .single();
  if (error || !data) return Response.json({ error: 'Could not save review.' }, { status: 503 });
  return Response.json({ progress: data }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
}
