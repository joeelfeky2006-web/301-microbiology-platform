import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  const materialId = request.nextUrl.searchParams.get('material_id');
  if (!materialId || !/^[0-9a-f-]{36}$/i.test(materialId)) return Response.json({ error: 'Choose a lecture.' }, { status: 400 });
  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Quiz service is unavailable.' }, { status: 503 });
  const { data: material, error: materialError } = await admin.from('materials').select('module,title').eq('id', materialId).maybeSingle();
  if (materialError || !material) return Response.json({ error: 'Lecture not found.' }, { status: 404 });
  const { data, error } = await admin.from('lecture_quizzes').select('id,title,quiz_number').eq('module', material.module).eq('lecture_title', material.title).eq('is_published', true).order('quiz_number');
  if (error) return Response.json({ error: 'Could not load the lecture quizzes.' }, { status: 503 });
  return Response.json({ quizzes: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}
