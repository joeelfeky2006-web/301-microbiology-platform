import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizeDeckCards, parseFlashcardBank, type Flashcard } from './parseFlashcardBank';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LoadedDeck = {
  materialId: string;
  deckId: string | null;
  title: string;
  module: string;
  lectureTitle: string;
  cards: Flashcard[];
  source: 'deck' | 'raw';
};

export async function loadPublishedDeck(deckId: string): Promise<LoadedDeck | { error: string; status: number }> {
  if (!UUID_RE.test(deckId)) return { error: 'Invalid deck ID.', status: 400 };
  const admin = createSupabaseAdmin();
  if (!admin) return { error: 'Flashcard service is unavailable.', status: 503 };
  const { data, error } = await admin
    .from('lecture_flashcard_decks')
    .select('id,material_id,module,lecture_title,title,cards,is_published')
    .eq('id', deckId)
    .eq('is_published', true)
    .maybeSingle();
  if (error || !data) return { error: 'This deck is unavailable.', status: 404 };
  const cards = normalizeDeckCards(data.cards);
  if (!cards.length) return { error: 'This deck has no valid cards.', status: 404 };
  const materialId = typeof data.material_id === 'string' ? data.material_id : '';
  if (!materialId) return { error: 'This deck is not linked to a material.', status: 404 };
  return {
    materialId,
    deckId: data.id,
    title: data.title,
    module: data.module,
    lectureTitle: data.lecture_title,
    cards,
    source: 'deck',
  };
}

export async function loadRawBank(materialId: string): Promise<LoadedDeck | { error: string; status: number }> {
  if (!UUID_RE.test(materialId)) return { error: 'Choose a lecture.', status: 400 };
  const admin = createSupabaseAdmin();
  if (!admin) return { error: 'Flashcard service is unavailable.', status: 503 };
  const { data, error } = await admin
    .from('materials')
    .select('id,module,title,raw_flashcard_text')
    .eq('id', materialId)
    .maybeSingle();
  if (error || !data) return { error: 'Material not found.', status: 404 };

  let sourceRow = data;
  let cards = parseFlashcardBank(data.raw_flashcard_text || '');
  // Prefer a sibling material on the same lecture that actually has a bank.
  if (!cards.length) {
    const { data: siblings } = await admin
      .from('materials')
      .select('id,module,title,raw_flashcard_text')
      .eq('module', data.module)
      .eq('title', data.title);
    const withBank = (siblings || []).find((row) => parseFlashcardBank(row.raw_flashcard_text || '').length > 0);
    if (withBank) {
      sourceRow = withBank;
      cards = parseFlashcardBank(withBank.raw_flashcard_text || '');
    }
  }
  if (!cards.length) return { error: 'No flashcards are available for this material.', status: 404 };
  return {
    materialId: sourceRow.id,
    deckId: null,
    title: `${sourceRow.title} · Flashcard bank`,
    module: sourceRow.module,
    lectureTitle: sourceRow.title,
    cards,
    source: 'raw',
  };
}

export { UUID_RE as FLASHCARD_UUID_RE };
