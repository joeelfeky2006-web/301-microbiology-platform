import 'server-only';
import type { NextRequest } from 'next/server';
import type { AIAction } from './actions';
import { ACTION_COSTS } from './actions';
import { authenticate, authorizeAndSpend, refundCredit } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { aiError } from './messages';
import { loadLectureSource } from './loadSource';
import { generateStructuredJson, type GenerateResult } from './provider';
import { errorCodeFromUnknown, logUsage, type AiUsageEntry, type AiUsageStatus } from './usage';

export type AIBody = Record<string, unknown>;
export type LoadedMaterial = { id: string; module: string; title?: string | null; ai_context?: string | null; raw_quiz_text?: string | null; custom_system_prompt?: string | null };

export { logUsage, errorCodeFromUnknown };
export type { AiUsageEntry, AiUsageStatus, GenerateResult };

export async function parseObject(request: NextRequest, limits: { message?: boolean; answers?: boolean } = {}) {
  let body: AIBody;
  try { body = await request.json() as AIBody; } catch { return { response: aiError('glitch', 400) }; }
  if (limits.message && (typeof body.message !== 'string' || body.message.length > 1000)) return { response: aiError('glitch', 400) };
  if (limits.answers && (!Array.isArray(body.answers) || body.answers.length > 50 || body.answers.some((a: any) => !a || typeof a.qid !== 'string' || typeof a.choice !== 'string' || a.qid.length > 500 || a.choice.length > 500))) return { response: aiError('glitch', 400) };
  if (body.material_id !== undefined && (typeof body.material_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.material_id))) return { response: aiError('glitch', 400) };
  return { body };
}

export async function loadMaterial(id: unknown) {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return { response: aiError('glitch', 400) };
  const admin = createSupabaseAdmin();
  if (!admin) return { response: aiError('glitch', 503) };
  const { data, error } = await admin.from('materials').select('id,module,title,ai_context,raw_quiz_text,custom_system_prompt').eq('id', id).maybeSingle();
  if (error || !data) return { response: aiError('glitch', 404) };
  return { material: await loadLectureSource(admin, data as unknown as import('./loadSource').SourceRow) };
}

export async function beginAction(request: NextRequest, action: AIAction) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity;
  return authorizeAndSpend(request, action);
}

export async function refund(userId: string, requestId: string | undefined) {
  return refundCredit(userId, requestId);
}

export function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function generateJson(prompt: string, schema: Record<string, unknown>, timeoutMs = 25_000): Promise<GenerateResult> {
  return generateStructuredJson(prompt, schema, timeoutMs);
}

export function featureCost(action: AIAction): number {
  return ACTION_COSTS[action];
}

/** Convenience logger used by AI routes — never awaits. */
export function recordAiUsage(entry: AiUsageEntry): void {
  logUsage(entry);
}
