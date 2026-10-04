import 'server-only';
import { NextRequest } from 'next/server';
import { authenticate, authorizeAndSpend, refundCredit } from '@/lib/apiAuth';
import { errorCodeFromUnknown, featureCost, generateJson, loadMaterial, noStoreJson, recordAiUsage } from '@/lib/ai/pipeline';
import { AI_MESSAGES, aiError } from '@/lib/ai/messages';
import { MODULE_RULES, SAFETY_RULES, dataBlock } from '@/lib/ai/modulePrompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const schema = { type: 'OBJECT', properties: { reply: { type: 'STRING' } }, required: ['reply'] };

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  let body: any;
  try { body = await request.json(); } catch { return aiError('glitch', 400); }
  if (typeof body?.message !== 'string' || body.message.length > 1000 || !body.message.trim() || typeof body.material_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.material_id)) return aiError('glitch', 400);
  const history = Array.isArray(body.history) ? body.history : [];
  if (history.length > 20 || history.some((item: any) => !item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string' || item.text.length > 500)) return aiError('glitch', 400);
  const loaded = await loadMaterial(body.material_id);
  if ('response' in loaded) return loaded.response;
  const source = `${loaded.material.ai_context || ''}\n${loaded.material.raw_quiz_text || ''}`.trim();
  if (!source) return noStoreJson({ kind: 'fallback', message: 'Choose a lecture with AI context or a question bank to continue.' });
  const access = await authorizeAndSpend(request, 'chat');
  if ('response' in access) return access.response;
  try {
    const moduleCode = loaded.material.module;
    const generated = await generateJson(`You are Dr. Atlas, a supportive Micro 301 tutor. ${SAFETY_RULES}\n${MODULE_RULES[moduleCode] || ''}\nAnswer only from the source where lecture-specific facts are needed; if source is insufficient, say so. ${dataBlock('SOURCE MATERIAL', source)}\n${dataBlock('STUDENT INPUT', body.message)}\nConversation context: ${dataBlock('STUDENT INPUT', JSON.stringify(history))}`, schema);
    const parsed = generated.data;
    if (typeof parsed.reply !== 'string' || parsed.reply.length > 5000) throw new Error('shape');
    const latency = Date.now() - started;
    console.info(JSON.stringify({ action: 'chat', material_id: loaded.material.id, kind: 'ok', latency_ms: latency }));
    recordAiUsage({
      userId: access.userId,
      requestId: access.requestId,
      feature: 'chat',
      materialId: loaded.material.id,
      provider: generated.provider,
      model: generated.model,
      inputTokens: generated.usage.input,
      outputTokens: generated.usage.output,
      totalTokens: generated.usage.total,
      creditsCharged: featureCost('chat'),
      latencyMs: latency,
      status: 'success',
    });
    return noStoreJson({ reply: parsed.reply, credits: access.credits });
  } catch (error: any) {
    const refunded = await refundCredit(access.userId, access.requestId);
    const busy = /429|RESOURCE_EXHAUSTED|rate.?limit/i.test(String(error?.message || error));
    const latency = Date.now() - started;
    console.info(JSON.stringify({ action: 'chat', material_id: loaded.material.id, kind: busy ? 'busy' : 'glitch', latency_ms: latency }));
    recordAiUsage({
      userId: access.userId,
      requestId: access.requestId,
      feature: 'chat',
      materialId: loaded.material.id,
      creditsCharged: 0,
      latencyMs: latency,
      status: 'refunded',
      errorCode: errorCodeFromUnknown(error),
    });
    return noStoreJson({ ok: false, kind: busy ? 'busy' : 'glitch', message: busy ? AI_MESSAGES.busy : AI_MESSAGES.glitch, credits: refunded || access.credits }, 503);
  }
}
