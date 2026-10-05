import 'server-only';
import type { NextRequest } from 'next/server';
import { authenticate, authorizeAndSpend, type AuthIdentity } from '@/lib/apiAuth';
import { isAIAction, type AIAction } from './actions';
import { aiError } from './messages';
import { guardAiAccess } from './pipeline';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AiRouterRequest = {
  feature: AIAction;
  material_id: string;
  /** Feature-specific student input (message, topic, answers…). Never lecture context. */
  input?: unknown;
  idempotency_key?: string;
};

/**
 * Preferred body shape for POST /api/ai.
 * Lecture text is ALWAYS loaded server-side from material_id — never from the client.
 */
export function parseAiRouterBody(body: unknown): { ok: true; data: AiRouterRequest } | { response: Response } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { response: aiError('glitch', 400) };
  const raw = body as Record<string, unknown>;
  if (typeof raw.feature !== 'string' || !isAIAction(raw.feature)) return { response: aiError('glitch', 400) };
  if (typeof raw.material_id !== 'string' || !UUID_RE.test(raw.material_id)) return { response: aiError('glitch', 400) };
  // Reject client-supplied lecture/context payloads (privacy + prompt-injection).
  if (raw.context !== undefined || raw.ai_context !== undefined || raw.source !== undefined || raw.lecture_text !== undefined) {
    return { response: aiError('glitch', 400) };
  }
  if (raw.idempotency_key !== undefined && (typeof raw.idempotency_key !== 'string' || !UUID_RE.test(raw.idempotency_key))) {
    return { response: aiError('glitch', 400) };
  }
  return {
    ok: true,
    data: {
      feature: raw.feature,
      material_id: raw.material_id,
      input: raw.input,
      idempotency_key: typeof raw.idempotency_key === 'string' ? raw.idempotency_key : undefined,
    },
  };
}

export function readIdempotencyKey(body: Record<string, unknown> | null | undefined): string | undefined {
  const key = body?.idempotency_key;
  return typeof key === 'string' && UUID_RE.test(key) ? key : undefined;
}

/**
 * Central reserve step: authenticate → kill switch / rate limit → spend with idempotency key.
 * Call before any provider request. Refund via refundCredit(userId, requestId) on failure.
 */
export async function prepareAiCall(
  request: NextRequest,
  feature: AIAction,
  opts: { materialId?: string | null; idempotencyKey?: string | null } = {},
): Promise<AuthIdentity | { response: Response }> {
  const auth = await authenticate(request);
  if ('response' in auth) return auth;
  const gate = await guardAiAccess(auth.userId, feature, opts.materialId);
  if ('response' in gate) return gate;
  return authorizeAndSpend(request, feature, opts.idempotencyKey);
}
