import type { NextRequest } from 'next/server';
import { authorizeQuizStaff } from '@/lib/adminQuizAuth';
import { parseTimeLimitMinutes, validateQuizQuestions } from '@/lib/adminQuizQuestions';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Load one quiz including questions for admin editing. */
export async function GET(request: NextRequest, { params }: { params: { quizId: string } }) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  if (!UUID_RE.test(params.quizId)) return Response.json({ error: 'Invalid quiz ID.' }, { status: 400 });

  const { data, error } = await auth.admin
    .from('lecture_quizzes')
    .select('id,material_id,module,lecture_title,quiz_number,title,time_limit_minutes,is_published,questions,created_at,updated_at')
    .eq('id', params.quizId)
    .maybeSingle();
  if (error) return Response.json({ error: 'Could not load this quiz.' }, { status: 503 });
  if (!data) return Response.json({ error: 'Quiz not found.' }, { status: 404 });
  return Response.json({ quiz: data }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Update title, number, time limit, questions, publish flag, and/or lecture. */
export async function PATCH(request: NextRequest, { params }: { params: { quizId: string } }) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  if (!UUID_RE.test(params.quizId)) return Response.json({ error: 'Invalid quiz ID.' }, { status: 400 });

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title || title.length > 120) return Response.json({ error: 'Enter a quiz title (max 120 characters).' }, { status: 400 });
      updates.title = title;
    }

    if (body.quiz_number !== undefined) {
      const quizNumber = Number(body.quiz_number);
      if (!Number.isInteger(quizNumber) || quizNumber < 1 || quizNumber > 100) {
        return Response.json({ error: 'Quiz number must be from 1 to 100.' }, { status: 400 });
      }
      updates.quiz_number = quizNumber;
    }

    if (body.time_limit_minutes !== undefined) {
      updates.time_limit_minutes = parseTimeLimitMinutes(body.time_limit_minutes);
    }

    if (body.questions !== undefined) {
      updates.questions = validateQuizQuestions(body.questions);
    }

    if (body.is_published !== undefined) {
      updates.is_published = Boolean(body.is_published);
    }

    if (body.material_id !== undefined) {
      if (typeof body.material_id !== 'string' || !UUID_RE.test(body.material_id)) {
        return Response.json({ error: 'Choose a lecture.' }, { status: 400 });
      }
      const { data: material, error: materialError } = await auth.admin
        .from('materials')
        .select('id,module,title')
        .eq('id', body.material_id)
        .maybeSingle();
      if (materialError || !material) return Response.json({ error: 'The selected lecture no longer exists.' }, { status: 404 });
      updates.material_id = material.id;
      updates.module = material.module;
      updates.lecture_title = material.title;
    }

    const mutableKeys = Object.keys(updates).filter((key) => key !== 'updated_at');
    if (!mutableKeys.length) return Response.json({ error: 'No changes to save.' }, { status: 400 });

    const { data, error } = await auth.admin
      .from('lecture_quizzes')
      .update(updates)
      .eq('id', params.quizId)
      .select('id,material_id,module,lecture_title,quiz_number,title,time_limit_minutes,is_published,updated_at')
      .maybeSingle();

    if (error?.code === '23505') {
      return Response.json({ error: 'That quiz number already exists for this lecture. Choose another number.' }, { status: 409 });
    }
    if (error) return Response.json({ error: 'Could not update this quiz.' }, { status: 503 });
    if (!data) return Response.json({ error: 'Quiz not found.' }, { status: 404 });
    return Response.json({ quiz: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid quiz data.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { quizId: string } }) {
  const auth = await authorizeQuizStaff(request);
  if ('response' in auth) return auth.response;
  if (!UUID_RE.test(params.quizId)) return Response.json({ error: 'Invalid quiz ID.' }, { status: 400 });
  const { error } = await auth.admin.from('lecture_quizzes').delete().eq('id', params.quizId);
  if (error) return Response.json({ error: 'Could not delete this quiz.' }, { status: 503 });
  return Response.json({ success: true });
}
