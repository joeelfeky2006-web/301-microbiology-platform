import 'server-only';
import { NextRequest } from 'next/server';
import { parseAiRouterBody } from '@/lib/ai/router';
import { aiError } from '@/lib/ai/messages';
import { POST as chatPost } from '@/app/api/gemini/chat/route';
import { POST as summarizePost } from '@/app/api/gemini/summarize/route';
import { POST as quizEvalPost } from '@/app/api/gemini/quiz-eval/route';
import { POST as caseStudyPost } from '@/app/api/gemini/case-study/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type FeatureHandler = (request: NextRequest) => Promise<Response | undefined>;

const HANDLERS: Record<string, FeatureHandler> = {
  chat: chatPost,
  summarize: summarizePost,
  'quiz-eval': quizEvalPost,
  'case-study': caseStudyPost,
};

/**
 * Unified AI facade.
 * Body: { feature, material_id, input?, idempotency_key? }
 * Lecture text is never accepted from the client — feature handlers load it server-side.
 * Legacy `/api/gemini/*` routes remain supported.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return aiError('glitch', 400);
  }

  const parsed = parseAiRouterBody(body);
  if ('response' in parsed) return parsed.response;

  const handler = HANDLERS[parsed.data.feature];
  if (!handler) return aiError('glitch', 400);

  const input =
    parsed.data.input && typeof parsed.data.input === 'object' && !Array.isArray(parsed.data.input)
      ? (parsed.data.input as Record<string, unknown>)
      : parsed.data.feature === 'chat' && typeof parsed.data.input === 'string'
        ? { message: parsed.data.input }
        : {};

  const mapped = {
    material_id: parsed.data.material_id,
    idempotency_key: parsed.data.idempotency_key,
    ...input,
  };

  const headers = new Headers(request.headers);
  headers.set('content-type', 'application/json');
  const forwarded = new NextRequest(request.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(mapped),
  });

  const result = await handler(forwarded);
  return result ?? aiError('glitch', 500);
}
