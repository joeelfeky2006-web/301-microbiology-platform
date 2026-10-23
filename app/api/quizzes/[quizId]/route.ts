import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest, { params }: { params: { quizId: string } }) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  if (!/^[0-9a-f-]{36}$/i.test(params.quizId)) return Response.json({ error: 'Invalid quiz ID.' }, { status: 400 });
  const practice = request.nextUrl.searchParams.get('mode') === 'practice';
  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Quiz service is unavailable.' }, { status: 503 });
  const { data, error } = await admin.from('lecture_quizzes').select('id,title,quiz_number,time_limit_minutes,questions').eq('id', params.quizId).eq('is_published', true).maybeSingle();
  if (error || !data) return Response.json({ error: 'This quiz is unavailable.' }, { status: 404 });
  const questions = Array.isArray(data.questions)
    ? data.questions.map((item: any) => {
        const base = { id: item.id, question: item.question, options: item.options };
        if (!practice) return base;
        const correct = String(item.correctAnswer || item.correct_answer || '').trim().toUpperCase();
        return {
          ...base,
          correctAnswer: ['A', 'B', 'C', 'D', 'E'].includes(correct) ? correct : '',
          explanation: typeof item.explanation === 'string' ? item.explanation : '',
        };
      })
    : [];
  const timeLimit = typeof data.time_limit_minutes === 'number' && data.time_limit_minutes >= 1 ? data.time_limit_minutes : null;
  return Response.json({
    quiz: { id: data.id, title: data.title, quiz_number: data.quiz_number, time_limit_minutes: timeLimit },
    questions,
    mode: practice ? 'practice' : 'exam',
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
