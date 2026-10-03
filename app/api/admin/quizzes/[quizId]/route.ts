import type { NextRequest } from 'next/server';
import { authorizeQuizStaff } from '@/lib/adminQuizAuth';

export async function DELETE(request: NextRequest, { params }: { params: { quizId: string } }) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  if (!/^[0-9a-f-]{36}$/i.test(params.quizId)) return Response.json({ error: 'Invalid quiz ID.' }, { status: 400 });
  const { error } = await auth.admin.from('lecture_quizzes').delete().eq('id', params.quizId);
  if (error) return Response.json({ error: 'Could not delete this quiz.' }, { status: 503 });
  return Response.json({ success: true });
}
