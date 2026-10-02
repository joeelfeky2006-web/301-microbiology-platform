import 'server-only';
import { GoogleGenAI } from '@google/genai';
import type { NextRequest } from 'next/server';
import type { AIAction } from './actions';
import { authenticate, authorizeAndSpend, refundCredit } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { aiError } from './messages';
import { loadLectureSource } from './loadSource';

export type AIBody = Record<string, unknown>;
export type LoadedMaterial = { id: string; module: string; title?: string | null; ai_context?: string | null; raw_quiz_text?: string | null; custom_system_prompt?: string | null };

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
  return { material: await loadLectureSource(admin, data as LoadedMaterial) };
}

export async function beginAction(request: NextRequest, action: AIAction) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity;
  return authorizeAndSpend(request, action);
}

export async function refund(request: NextRequest, action: AIAction) {
  await refundCredit(request, action);
}

export function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function generateJson(prompt: string, schema: Record<string, unknown>, timeoutMs = 25_000) {
  const apiKey = process.env.GEMINI_API_KEY;
  const primary = process.env.GEMINI_MODEL;
  if (!apiKey || !primary) throw new Error('configuration');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });
  const run = async (model: string) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema as any } });
        const parsed = JSON.parse(result.text || '');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape');
        const required = Array.isArray(schema.required) ? schema.required as string[] : [];
        if (required.some((key) => !(key in parsed))) throw new Error('shape');
        return parsed as Record<string, any>;
      } catch (error) { lastError = error; }
    }
    throw lastError;
  };
  try { return await run(primary); }
  catch (error: any) {
    if (process.env.GEMINI_FALLBACK_MODEL && /not.?found|unsupported|404/i.test(String(error?.message || error))) return run(process.env.GEMINI_FALLBACK_MODEL);
    throw error;
  }
}
