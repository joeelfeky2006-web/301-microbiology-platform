import type { NextRequest } from 'next/server';
import { authorizeQuizStaff } from '@/lib/adminQuizAuth';

export const dynamic = 'force-dynamic';

function validateQuestions(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) throw new Error('Add between 1 and 200 questions.');
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Question ${index + 1} is invalid.`);
    const item = raw as Record<string, unknown>;
    const question = typeof item.question === 'string' ? item.question.trim() : '';
    const answer = typeof item.correctAnswer === 'string' ? item.correctAnswer.toUpperCase() : '';
    if (!question || question.length > 5000 || !['A', 'B', 'C', 'D'].includes(answer) || !Array.isArray(item.options) || item.options.length !== 4) throw new Error(`Question ${index + 1} needs text, four options, and correctAnswer A–D.`);
    const options = item.options.map((option, optionIndex) => {
      const row = option as Record<string, unknown>;
      const id = ['A', 'B', 'C', 'D'][optionIndex];
      const text = typeof row?.text === 'string' ? row.text.trim() : '';
      if (!text || text.length > 2000) throw new Error(`Question ${index + 1}, option ${id} is empty or too long.`);
      return { id, text };
    });
    const explanation = typeof item.explanation === 'string' ? item.explanation.trim().slice(0, 5000) : '';
    return { id: `q${index + 1}`, question, options, correctAnswer: answer, explanation };
  });
}

export async function GET(request: NextRequest) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.admin.from('lecture_quizzes').select('id,material_id,module,lecture_title,quiz_number,title,time_limit_minutes,is_published,created_at').order('module').order('lecture_title').order('quiz_number');
  if (error) return Response.json({ error: 'Could not load quizzes.' }, { status: 503 });
  return Response.json({ quizzes: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  try {
    const body = await request.json();
    if (typeof body.material_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.material_id)) return Response.json({ error: 'Choose a lecture.' }, { status: 400 });
    const quizNumber = Number(body.quiz_number);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!Number.isInteger(quizNumber) || quizNumber < 1 || quizNumber > 100 || !title || title.length > 120) return Response.json({ error: 'Enter a title and quiz number from 1 to 100.' }, { status: 400 });
    let timeLimit: number | null = null;
    if (body.time_limit_minutes !== undefined && body.time_limit_minutes !== null && body.time_limit_minutes !== '') {
      const minutes = Number(body.time_limit_minutes);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
        return Response.json({ error: 'Time limit must be blank (untimed) or between 1 and 180 minutes.' }, { status: 400 });
      }
      timeLimit = minutes;
    }
    const questions = validateQuestions(body.questions);
    const { data: material, error: materialError } = await auth.admin.from('materials').select('id,module,title').eq('id', body.material_id).maybeSingle();
    if (materialError || !material) return Response.json({ error: 'The selected lecture no longer exists.' }, { status: 404 });
    const { data, error } = await auth.admin.from('lecture_quizzes').insert({
      material_id: material.id,
      module: material.module,
      lecture_title: material.title,
      quiz_number: quizNumber,
      title,
      time_limit_minutes: timeLimit,
      questions,
      created_by: auth.identity.userId,
    }).select('id,title,quiz_number,module,lecture_title,time_limit_minutes').single();
    if (error?.code === '23505') return Response.json({ error: `Quiz ${quizNumber} already exists for this lecture. Choose another quiz number.` }, { status: 409 });
    if (error || !data) return Response.json({ error: 'Could not save this quiz.' }, { status: 503 });
    return Response.json({ quiz: data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid quiz data.' }, { status: 400 });
  }
}
