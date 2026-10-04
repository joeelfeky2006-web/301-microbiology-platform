import type { NextRequest } from 'next/server';
import { authorizeQuizStaff } from '@/lib/adminQuizAuth';
import { normalizeDeckCards, parseFlashcardBank } from '@/lib/flashcards/parseFlashcardBank';

export const dynamic = 'force-dynamic';

function validateCards(value: unknown) {
  const cards = normalizeDeckCards(value);
  if (!cards.length) throw new Error('Add between 1 and 500 valid flashcards (front + back).');
  return cards;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.admin
    .from('lecture_flashcard_decks')
    .select('id,material_id,module,lecture_title,deck_number,title,is_published,created_at')
    .order('module')
    .order('lecture_title')
    .order('deck_number');
  if (error) return Response.json({ error: 'Could not load flashcard decks.' }, { status: 503 });
  return Response.json({ decks: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Publish a deck from structured cards OR from material raw_flashcard_text.
 * Body: material_id, title, deck_number, cards? | from_raw?: true
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  try {
    const body = await request.json();
    if (typeof body.material_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.material_id)) {
      return Response.json({ error: 'Choose a lecture.' }, { status: 400 });
    }
    const deckNumber = Number(body.deck_number);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!Number.isInteger(deckNumber) || deckNumber < 1 || deckNumber > 100 || !title || title.length > 120) {
      return Response.json({ error: 'Enter a title and deck number from 1 to 100.' }, { status: 400 });
    }

    const { data: material, error: materialError } = await auth.admin
      .from('materials')
      .select('id,module,title,raw_flashcard_text')
      .eq('id', body.material_id)
      .maybeSingle();
    if (materialError || !material) return Response.json({ error: 'The selected lecture no longer exists.' }, { status: 404 });

    let cards;
    if (body.from_raw === true) {
      cards = parseFlashcardBank(material.raw_flashcard_text || '');
      if (!cards.length) return Response.json({ error: 'This material has no parsable raw flashcard text.' }, { status: 400 });
    } else {
      cards = validateCards(body.cards);
    }

    const { data, error } = await auth.admin
      .from('lecture_flashcard_decks')
      .insert({
        material_id: material.id,
        module: material.module,
        lecture_title: material.title,
        deck_number: deckNumber,
        title,
        cards,
        created_by: auth.identity.userId,
      })
      .select('id,title,deck_number,module,lecture_title')
      .single();
    if (error?.code === '23505') {
      return Response.json({ error: `Deck ${deckNumber} already exists for this lecture. Choose another deck number.` }, { status: 409 });
    }
    if (error || !data) return Response.json({ error: 'Could not save this deck.' }, { status: 503 });
    return Response.json({ deck: data, card_count: cards.length }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid deck data.' }, { status: 400 });
  }
}
