import 'server-only';
import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { loadMaterial, noStoreJson } from '@/lib/ai/pipeline';
import { parseBank } from '@/lib/ai/quizBank';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  const result = await loadMaterial(request.nextUrl.searchParams.get('material_id'));
  if ('response' in result) return result.response;
  const questions = parseBank(result.material.raw_quiz_text || '');
  if (!questions.length) return noStoreJson({ kind: 'fallback' });
  return noStoreJson({ questions: questions.map(({ id, question, options }) => ({ id, question, options })) });
}
