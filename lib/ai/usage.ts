import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export type AiUsageStatus = 'success' | 'error' | 'refunded' | 'blocked';

export type AiUsageEntry = {
  userId?: string | null;
  requestId?: string | null;
  feature: string;
  materialId?: string | null;
  provider?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  creditsCharged?: number | null;
  latencyMs?: number | null;
  status: AiUsageStatus;
  errorCode?: string | null;
};

/** Map provider/runtime errors to short codes — never store raw messages. */
export function errorCodeFromUnknown(error: unknown): string {
  const text = String(error instanceof Error ? error.message : error || '').toLowerCase();
  if (/429|resource_exhausted|rate.?limit/.test(text)) return 'rate_limit';
  if (/timeout|timed out|abort/.test(text)) return 'timeout';
  if (/invalid json|unexpected token|shape|missing required/.test(text)) return 'invalid_json';
  if (/5\d\d|internal server|bad gateway|service unavailable/.test(text)) return 'provider_5xx';
  if (/not.?found|unsupported|404/.test(text)) return 'provider_4xx';
  if (/not configured|no ai providers/.test(text)) return 'misconfigured';
  return 'unknown';
}

/**
 * Fire-and-forget usage insert. Never throws; never blocks the response.
 * STRICT: do not pass prompts, outputs, answers, lecture text, emails, or IPs.
 */
export function logUsage(entry: AiUsageEntry): void {
  void (async () => {
    try {
      const admin = createSupabaseAdmin();
      if (!admin) {
        console.error(JSON.stringify({ kind: 'ai_usage_skip', reason: 'no_admin' }));
        return;
      }
      const { error } = await admin.from('ai_usage').insert({
        user_id: entry.userId || null,
        request_id: entry.requestId || null,
        feature: entry.feature,
        material_id: entry.materialId || null,
        provider: entry.provider || null,
        model: entry.model || null,
        input_tokens: entry.inputTokens ?? null,
        output_tokens: entry.outputTokens ?? null,
        total_tokens: entry.totalTokens ?? null,
        credits_charged: entry.creditsCharged ?? null,
        latency_ms: entry.latencyMs ?? null,
        status: entry.status,
        error_code: entry.errorCode || null,
      });
      if (error) {
        console.error(JSON.stringify({ kind: 'ai_usage_failed', code: error.code || 'db' }));
      }
    } catch {
      console.error(JSON.stringify({ kind: 'ai_usage_failed', code: 'exception' }));
    }
  })();
}
