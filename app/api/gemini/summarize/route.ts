import 'server-only';
import { NextRequest } from 'next/server';
import { authenticate, authorizeAndSpend, refundCredit } from '@/lib/apiAuth';
import { errorCodeFromUnknown, featureCost, generateJson, guardAiAccess, loadMaterial, noStoreJson, recordAiUsage } from '@/lib/ai/pipeline';
import { AI_MESSAGES, aiError } from '@/lib/ai/messages';
import { MODULE_RULES, SAFETY_RULES, dataBlock } from '@/lib/ai/modulePrompts';
import { getCachedSummary, putCachedSummary, SUMMARIZE_PROMPT_VERSION, summaryContentHash } from '@/lib/ai/summaryCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const schema = { type: 'OBJECT', properties: { topic: { type: 'STRING' }, overview: { type: 'STRING' }, keyPathogens: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, classification: { type: 'STRING' }, cultureMedia: { type: 'STRING' }, virulenceFactors: { type: 'ARRAY', items: { type: 'STRING' } }, clinicalManifestation: { type: 'STRING' }, treatment: { type: 'STRING' } }, required: ['name', 'classification', 'cultureMedia', 'virulenceFactors', 'clinicalManifestation', 'treatment'] } }, diagnosticAlgorithms: { type: 'ARRAY', items: { type: 'STRING' } }, examTraps: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['topic', 'overview', 'keyPathogens', 'diagnosticAlgorithms', 'examTraps'] };

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  let body: any;
  try { body = await request.json(); } catch { return aiError('glitch', 400); }
  if (typeof body?.material_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.material_id) || (body.topic !== undefined && (typeof body.topic !== 'string' || body.topic.length > 500))) return aiError('glitch', 400);
  const loaded = await loadMaterial(body.material_id);
  if ('response' in loaded) return loaded.response;
  const source = `${loaded.material.ai_context || ''}\n${loaded.material.raw_quiz_text || ''}`.trim();
  if (!source) return noStoreJson({ kind: 'fallback' });
  const gate = await guardAiAccess(auth.userId, 'summarize', loaded.material.id);
  if ('response' in gate) return gate.response;
  const access = await authorizeAndSpend(request, 'summarize');
  if ('response' in access) return access.response;

  const moduleCode = loaded.material.module;
  const contentHash = summaryContentHash(loaded.material);
  const cached = await getCachedSummary(loaded.material.id, contentHash, SUMMARIZE_PROMPT_VERSION);
  if (cached?.summary) {
    const latency = Date.now() - started;
    console.info(JSON.stringify({ action: 'summarize', material_id: loaded.material.id, kind: 'ok', latency_ms: latency, cache: 'hit' }));
    recordAiUsage({
      userId: access.userId,
      requestId: access.requestId,
      feature: 'summarize',
      materialId: loaded.material.id,
      provider: 'cache',
      model: cached.model || 'cache',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      creditsCharged: featureCost('summarize'),
      latencyMs: latency,
      status: 'success',
    });
    return noStoreJson({
      success: true,
      summary: { ...cached.summary, module: moduleCode, moduleTitle: moduleCode },
      credits: access.credits,
      cached: true,
    });
  }

  try {
    const topic = typeof body.topic === 'string' ? body.topic.slice(0, 500) : loaded.material.title || 'Lecture summary';
    const generated = await generateJson(`You are Dr. Atlas. ${SAFETY_RULES}\n${MODULE_RULES[moduleCode] || ''}\nCreate an exam-focused summary only from the source. Do not invent facts absent from it; identify thin areas briefly. Topic: ${dataBlock('STUDENT INPUT', topic)} ${dataBlock('SOURCE MATERIAL', source)} ${loaded.material.custom_system_prompt ? dataBlock('ADMIN OVERLAY', loaded.material.custom_system_prompt) : ''}`, schema);
    const parsed = generated.data;
    if (!Array.isArray(parsed.keyPathogens) || !Array.isArray(parsed.examTraps) || !Array.isArray(parsed.diagnosticAlgorithms)) throw new Error('shape');
    const summaryPayload = { ...parsed, module: moduleCode, moduleTitle: moduleCode };
    await putCachedSummary({
      materialId: loaded.material.id,
      contentHash,
      promptVersion: SUMMARIZE_PROMPT_VERSION,
      model: generated.model,
      summary: summaryPayload,
    });
    const latency = Date.now() - started;
    console.info(JSON.stringify({ action: 'summarize', material_id: loaded.material.id, kind: 'ok', latency_ms: latency, cache: 'miss' }));
    recordAiUsage({
      userId: access.userId,
      requestId: access.requestId,
      feature: 'summarize',
      materialId: loaded.material.id,
      provider: generated.provider,
      model: generated.model,
      inputTokens: generated.usage.input,
      outputTokens: generated.usage.output,
      totalTokens: generated.usage.total,
      creditsCharged: featureCost('summarize'),
      latencyMs: latency,
      status: 'success',
    });
    return noStoreJson({ success: true, summary: summaryPayload, credits: access.credits, cached: false });
  } catch (error: any) {
    const refunded = await refundCredit(access.userId, access.requestId);
    const busy = /429|RESOURCE_EXHAUSTED|rate.?limit/i.test(String(error?.message || error));
    const latency = Date.now() - started;
    console.info(JSON.stringify({ action: 'summarize', material_id: loaded.material.id, kind: busy ? 'busy' : 'glitch', latency_ms: latency }));
    recordAiUsage({
      userId: access.userId,
      requestId: access.requestId,
      feature: 'summarize',
      materialId: loaded.material.id,
      creditsCharged: 0,
      latencyMs: latency,
      status: 'refunded',
      errorCode: errorCodeFromUnknown(error),
    });
    return noStoreJson({ ok: false, kind: busy ? 'busy' : 'glitch', message: busy ? AI_MESSAGES.busy : AI_MESSAGES.glitch, credits: refunded || access.credits }, 503);
  }
}
