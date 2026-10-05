import 'server-only';
import { createHash } from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

/** Bump when the summarize system prompt / schema shape changes. */
export const SUMMARIZE_PROMPT_VERSION = 'v1';

type MaterialSource = {
  module: string;
  ai_context?: string | null;
  custom_system_prompt?: string | null;
  raw_quiz_text?: string | null;
};

/** Hash lecture content only (never student topic/input). */
export function summaryContentHash(material: MaterialSource): string {
  const mergedSource = `${material.ai_context || ''}\n${material.raw_quiz_text || ''}`.trim();
  const payload = [
    String(material.module || ''),
    String(material.ai_context || ''),
    String(material.custom_system_prompt || ''),
    mergedSource,
  ].join('\n---\n');
  return createHash('sha256').update(payload).digest('hex');
}

export async function getCachedSummary(materialId: string, contentHash: string, promptVersion: string) {
  const admin = createSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from('ai_summary_cache')
    .select('summary,model')
    .eq('material_id', materialId)
    .eq('content_hash', contentHash)
    .eq('prompt_version', promptVersion)
    .maybeSingle();
  if (error || !data?.summary) return null;
  return { summary: data.summary as Record<string, unknown>, model: String(data.model || 'cache') };
}

export async function putCachedSummary(input: {
  materialId: string;
  contentHash: string;
  promptVersion: string;
  model: string;
  summary: Record<string, unknown>;
}): Promise<void> {
  const admin = createSupabaseAdmin();
  if (!admin) return;
  const { error } = await admin.from('ai_summary_cache').upsert({
    material_id: input.materialId,
    content_hash: input.contentHash,
    prompt_version: input.promptVersion,
    model: input.model,
    summary: input.summary,
    created_at: new Date().toISOString(),
  }, { onConflict: 'material_id,content_hash,prompt_version' });
  if (error) {
    console.error(JSON.stringify({ kind: 'summary_cache_write_failed', code: error.code || 'db' }));
  }
}
