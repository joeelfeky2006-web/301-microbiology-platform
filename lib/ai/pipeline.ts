import 'server-only';
import type { NextRequest } from 'next/server';
import type { AIAction } from './actions';
import { ACTION_COSTS } from './actions';
import { authenticate, authorizeAndSpend, refundCredit } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { aiError } from './messages';
import { loadLectureSource } from './loadSource';
import { generateStructuredJson, type GenerateResult } from './provider';
import { AI_MAINTENANCE_MESSAGE, AI_RATE_PER_HOUR, AI_RATE_PER_MINUTE } from './limits';
import { AI_MESSAGES } from './messages';
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

type GuardOk = { ok: true };
type GuardBlocked = { response: Response };

/**
 * Kill switch + DB-backed rate limit. Call BEFORE authorizeAndSpend.
 * Fail CLOSED if platform_settings cannot be read.
 */
export async function guardAiAccess(
  userId: string,
  feature: string,
  materialId?: string | null,
): Promise<GuardOk | GuardBlocked> {
  const admin = createSupabaseAdmin();
  if (!admin) {
    recordAiUsage({
      userId, feature, materialId, status: 'blocked', errorCode: 'settings_unavailable', creditsCharged: 0,
    });
    return {
      response: Response.json(
        { ok: false, kind: 'maintenance', message: AI_MAINTENANCE_MESSAGE },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  const { data: settings, error: settingsError } = await admin
    .from('platform_settings')
    .select('ai_enabled')
    .eq('id', 1)
    .maybeSingle();

  if (settingsError || !settings) {
    recordAiUsage({
      userId, feature, materialId, status: 'blocked', errorCode: 'settings_unavailable', creditsCharged: 0,
    });
    return {
      response: Response.json(
        { ok: false, kind: 'maintenance', message: AI_MAINTENANCE_MESSAGE },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  if (settings.ai_enabled === false) {
    recordAiUsage({
      userId, feature, materialId, status: 'blocked', errorCode: 'ai_disabled', creditsCharged: 0,
    });
    return {
      response: Response.json(
        { ok: false, kind: 'maintenance', message: AI_MESSAGES.maintenance },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  const now = Date.now();
  const sinceMinute = new Date(now - 60_000).toISOString();
  const sinceHour = new Date(now - 3_600_000).toISOString();

  const [{ count: minuteCount, error: minuteError }, { count: hourCount, error: hourError }] = await Promise.all([
    admin.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', sinceMinute),
    admin.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', sinceHour),
  ]);

  if (minuteError || hourError) {
    // Fail closed for rate-limit reads as well — safer under load.
    recordAiUsage({
      userId, feature, materialId, status: 'blocked', errorCode: 'rate_check_failed', creditsCharged: 0,
    });
    return {
      response: Response.json(
        { ok: false, kind: 'busy', message: AI_MESSAGES.busy, retry_after_seconds: 60 },
        { status: 429, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  if ((minuteCount ?? 0) >= AI_RATE_PER_MINUTE || (hourCount ?? 0) >= AI_RATE_PER_HOUR) {
    recordAiUsage({
      userId, feature, materialId, status: 'blocked', errorCode: 'user_rate_limit', creditsCharged: 0,
    });
    return {
      response: Response.json(
        { ok: false, kind: 'busy', message: AI_MESSAGES.busy, retry_after_seconds: 60 },
        { status: 429, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  return { ok: true };
}
