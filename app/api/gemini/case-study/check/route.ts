import 'server-only';
import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { aiError } from '@/lib/ai/messages';
import { noStoreJson } from '@/lib/ai/pipeline';
import { openCaseSeal } from '@/lib/ai/caseSeal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Authenticated, free grading check for a sealed case-study answer. */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  let body: any;
  try { body = await request.json(); } catch { return aiError('glitch', 400); }
  if (typeof body?.sealed !== 'string' || body.sealed.length > 20_000 || typeof body?.choice !== 'string' || body.choice.length > 16) {
    return aiError('glitch', 400);
  }
  try {
    const payload = openCaseSeal(body.sealed);
    const choice = body.choice.trim();
    const correct = choice.toUpperCase() === payload.correctId.toUpperCase();
    return noStoreJson({
      correct,
      correctId: payload.correctId,
      explanation: payload.explanation,
      clinicalPearls: payload.clinicalPearls,
    });
  } catch (error) {
    console.error('case-study seal check failed:', error instanceof Error ? error.message : 'unknown');
    return aiError('glitch', 400);
  }
}
