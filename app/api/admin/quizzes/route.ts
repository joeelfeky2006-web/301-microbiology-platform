import type { NextRequest } from 'next/server';
import { authorizeQuizStaff } from '@/lib/adminQuizAuth';
import { parseTimeLimitMinutes, validateQuizQuestions } from '@/lib/adminQuizQuestions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.admin
    .from('lecture_quizzes')
    .select('id,material_id,module,lecture_title,quiz_number,title,time_limit_minutes,is_published,created_at')
    .order('module')
    .order('lecture_title')
    .order('quiz_number');
  if (error) return Response.json({ error: 'Could not load quizzes.' }, { status: 503 });
  return Response.json({ quizzes: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  try {
    const body = await request.json();
    if (typeof body.material_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.material_id)) {
      return Response.json({ error: 'Choose a lecture.' }, { status: 400 });
    }
    const quizNumber = Number(body.quiz_number);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!Number.isInteger(quizNumber) || quizNumber < 1 || quizNumber > 100 || !title || title.length > 120) {
      return Response.json({ error: 'Enter a title and quiz number from 1 to 100.' }, { status: 400 });
    }
    const timeLimit = parseTimeLimitMinutes(body.time_limit_minutes);
    const questions = validateQuizQuestions(body.questions);
    const isPublished = body.is_published === undefined ? true : Boolean(body.is_published);
    const { data: material, error: materialError } = await auth.admin
      .from('materials')
      .select('id,module,title')
      .eq('id', body.material_id)
      .maybeSingle();
    if (materialError || !material) return Response.json({ error: 'The selected lecture no longer exists.' }, { status: 404 });
    const { data, error } = await auth.admin
      .from('lecture_quizzes')
      .insert({
        material_id: material.id,
        module: material.module,
        lecture_title: material.title,
        quiz_number: quizNumber,
        title,
        time_limit_minutes: timeLimit,
        questions,
        is_published: isPublished,
        created_by: auth.identity.userId,
      })
      .select('id,title,quiz_number,module,lecture_title,time_limit_minutes,is_published')
      .single();
    if (error?.code === '23505') {
      return Response.json({ error: `Quiz ${quizNumber} already exists for this lecture. Choose another quiz number.` }, { status: 409 });
    }
    if (error || !data) return Response.json({ error: 'Could not save this quiz.' }, { status: 503 });
    return Response.json({ quiz: data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid quiz data.' }, { status: 400 });
  }
}
