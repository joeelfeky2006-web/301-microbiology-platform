import 'server-only';
import { NextRequest } from 'next/server';
import { authenticate, authorizeAndSpend, refundCredit } from '@/lib/apiAuth';
import { errorCodeFromUnknown, featureCost, generateJson, guardAiAccess, loadMaterial, noStoreJson, recordAiUsage } from '@/lib/ai/pipeline';
import { AI_MESSAGES, aiError } from '@/lib/ai/messages';
import { MODULE_RULES, SAFETY_RULES, dataBlock } from '@/lib/ai/modulePrompts';
import { sealCaseAnswer } from '@/lib/ai/caseSeal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const schema = { type: 'OBJECT', properties: { title: { type: 'STRING' }, module: { type: 'STRING' }, difficulty: { type: 'STRING' }, patient: { type: 'OBJECT', properties: { demographics: { type: 'STRING' }, chiefComplaint: { type: 'STRING' }, physicalExam: { type: 'STRING' }, labFindings: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['demographics', 'chiefComplaint', 'physicalExam', 'labFindings'] }, question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, text: { type: 'STRING' }, isCorrect: { type: 'BOOLEAN' } }, required: ['id', 'text', 'isCorrect'] } }, explanation: { type: 'STRING' }, clinicalPearls: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['title', 'module', 'difficulty', 'patient', 'question', 'options', 'explanation', 'clinicalPearls'] };

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  let body: any;
  try { body = await request.json(); } catch { return aiError('glitch', 400); }
  if (typeof body?.material_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.material_id) || (body.topic !== undefined && (typeof body.topic !== 'string' || body.topic.length > 500)) || (body.difficulty !== undefined && !['beginner', 'intermediate', 'advanced'].includes(body.difficulty))) return aiError('glitch', 400);
  const loaded = await loadMaterial(body.material_id);
  if ('response' in loaded) return loaded.response;
  const source = loaded.material.ai_context?.trim() || '';
  if (!source) return noStoreJson({ kind: 'fallback' });
  const gate = await guardAiAccess(auth.userId, 'case-study', loaded.material.id);
  if ('response' in gate) return gate.response;
  const access = await authorizeAndSpend(request, 'case-study');
  if ('response' in access) return access.response;
  try {
    const moduleCode = loaded.material.module;
    const topic = typeof body.topic === 'string' ? body.topic.slice(0, 500) : '';
    const difficulty = body.difficulty || 'intermediate';
    const generated = await generateJson(`You are Dr. Atlas. ${SAFETY_RULES}\n${MODULE_RULES[moduleCode] || ''}\nCreate an educational 301 Microbiology case vignette strictly from facts present in the source. If the source is too thin, say so in the vignette instead of inventing facts. Do not use outside clinical facts. Requested difficulty: ${difficulty}. ${topic ? dataBlock('STUDENT INPUT', topic) : ''} ${dataBlock('SOURCE MATERIAL', source)} ${loaded.material.custom_system_prompt ? dataBlock('ADMIN OVERLAY', loaded.material.custom_system_prompt) : ''}`, schema);
    const parsed = generated.data;
    if (!parsed.patient || !Array.isArray(parsed.options) || parsed.options.length !== 4 || parsed.options.filter((option: any) => option.isCorrect === true).length !== 1 || !Array.isArray(parsed.clinicalPearls)) throw new Error('shape');
    const correct = (parsed.options as any[]).find((option: any) => option.isCorrect === true);
    if (!correct || typeof correct.id !== 'string') throw new Error('shape');
    const sealed = sealCaseAnswer({
      correctId: String(correct.id).slice(0, 8),
      explanation: String(parsed.explanation || '').slice(0, 5000),
      clinicalPearls: (parsed.clinicalPearls as unknown[]).map((pearl: unknown) => String(pearl).slice(0, 500)).slice(0, 12),
    });
    const publicOptions = (parsed.options as any[]).map((option: any) => ({ id: String(option.id).slice(0, 8), text: String(option.text || '').slice(0, 1000) }));
    const latency = Date.now() - started;
    console.info(JSON.stringify({ action: 'case-study', material_id: loaded.material.id, kind: 'ok', latency_ms: latency }));
    recordAiUsage({
      userId: access.userId,
      requestId: access.requestId,
      feature: 'case-study',
      materialId: loaded.material.id,
      provider: generated.provider,
      model: generated.model,
      inputTokens: generated.usage.input,
      outputTokens: generated.usage.output,
      totalTokens: generated.usage.total,
      creditsCharged: featureCost('case-study'),
      latencyMs: latency,
      status: 'success',
    });
    return noStoreJson({
      success: true,
      sealed,
      caseStudy: {
        title: parsed.title,
        module: moduleCode,
        difficulty: parsed.difficulty,
        patient: parsed.patient,
        question: parsed.question,
        options: publicOptions,
      },
      credits: access.credits,
    });
  } catch (error: any) {
    const refunded = await refundCredit(access.userId, access.requestId);
    const busy = /429|RESOURCE_EXHAUSTED|rate.?limit/i.test(String(error?.message || error));
    const misconfig = /CASE_SEAL_SECRET/i.test(String(error?.message || error));
    const latency = Date.now() - started;
    console.info(JSON.stringify({ action: 'case-study', material_id: loaded.material.id, kind: busy ? 'busy' : 'glitch', latency_ms: latency, misconfig }));
    recordAiUsage({
      userId: access.userId,
      requestId: access.requestId,
      feature: 'case-study',
      materialId: loaded.material.id,
      creditsCharged: 0,
      latencyMs: latency,
      status: 'refunded',
      errorCode: misconfig ? 'misconfigured' : errorCodeFromUnknown(error),
    });
    return noStoreJson({ ok: false, kind: busy ? 'busy' : 'glitch', message: busy ? AI_MESSAGES.busy : AI_MESSAGES.glitch, credits: refunded || access.credits }, 503);
  }
}
