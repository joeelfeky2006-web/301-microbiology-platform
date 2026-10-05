import type { NextRequest } from 'next/server';
import { authorizeQuizStaff } from '@/lib/adminQuizAuth';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, { params }: { params: { deckId: string } }) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  if (!/^[0-9a-f-]{36}$/i.test(params.deckId)) {
    return Response.json({ error: 'Invalid deck ID.' }, { status: 400 });
  }
  const { error } = await auth.admin.from('lecture_flashcard_decks').delete().eq('id', params.deckId);
  if (error) return Response.json({ error: 'Could not delete this deck.' }, { status: 503 });
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
