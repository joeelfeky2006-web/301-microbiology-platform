import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest, { params }: { params: { quizId: string } }) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  if (!/^[0-9a-f-]{36}$/i.test(params.quizId)) return Response.json({ error: 'Invalid quiz ID.' }, { status: 400 });
  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Quiz service is unavailable.' }, { status: 503 });
  const { data, error } = await admin.from('lecture_quizzes').select('id,title,quiz_number,questions').eq('id', params.quizId).eq('is_published', true).maybeSingle();
  if (error || !data) return Response.json({ error: 'This quiz is unavailable.' }, { status: 404 });
  const questions = Array.isArray(data.questions) ? data.questions.map((item: any) => ({ id: item.id, question: item.question, options: item.options })) : [];
  return Response.json({ quiz: { id: data.id, title: data.title, quiz_number: data.quiz_number }, questions }, { headers: { 'Cache-Control': 'private, no-store' } });
}
