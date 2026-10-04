import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { parseFlashcardBank } from '@/lib/flashcards/parseFlashcardBank';
import { FLASHCARD_UUID_RE } from '@/lib/flashcards/loadDeck';

export const dynamic = 'force-dynamic';

/** List published decks + whether a raw bank exists for a material. */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  const materialId = request.nextUrl.searchParams.get('material_id');
  if (!materialId || !FLASHCARD_UUID_RE.test(materialId)) {
    return Response.json({ error: 'Choose a lecture.' }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Flashcard service is unavailable.' }, { status: 503 });

  const { data: material, error: materialError } = await admin
    .from('materials')
    .select('id,module,title,raw_flashcard_text')
    .eq('id', materialId)
    .maybeSingle();
  if (materialError || !material) return Response.json({ error: 'Material not found.' }, { status: 404 });

  let rawCount = parseFlashcardBank(material.raw_flashcard_text || '').length;
  let bankMaterialId = material.id;
  if (!rawCount) {
    const { data: siblings } = await admin
      .from('materials')
      .select('id,raw_flashcard_text')
      .eq('module', material.module)
      .eq('title', material.title);
    for (const row of siblings || []) {
      const count = parseFlashcardBank(row.raw_flashcard_text || '').length;
      if (count > 0) {
        rawCount = count;
        bankMaterialId = row.id;
        break;
      }
    }
  }

  const { data: decks, error } = await admin
    .from('lecture_flashcard_decks')
    .select('id,title,deck_number')
    .eq('module', material.module)
    .eq('lecture_title', material.title)
    .eq('is_published', true)
    .order('deck_number');
  if (error) return Response.json({ error: 'Could not load flashcard decks.' }, { status: 503 });

  return Response.json(
    {
      material_id: bankMaterialId,
      has_raw_bank: rawCount > 0,
      raw_card_count: rawCount,
      decks: decks || [],
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
