import 'server-only';
import { NextRequest } from 'next/server';
import { authenticate, authorizeAndSpend, refundCredit } from '@/lib/apiAuth';
import { parseBank } from '@/lib/ai/quizBank';
import { loadMaterial, generateJson, noStoreJson } from '@/lib/ai/pipeline';
import { AI_MESSAGES, aiError } from '@/lib/ai/messages';
import { MODULE_RULES, SAFETY_RULES, dataBlock } from '@/lib/ai/modulePrompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  let body: any;
  try { body = await request.json(); } catch { return aiError('glitch', 400); }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.material_id || '') || !Array.isArray(body?.answers) || body.answers.length > 50 || body.answers.some((a: any) => !a || typeof a.qid !== 'string' || a.qid.length > 500 || typeof a.choice !== 'string' || a.choice.length > 500)) return aiError('glitch', 400);
  const loaded = await loadMaterial(body.material_id);
  if ('response' in loaded) return loaded.response;
  const bank = parseBank(loaded.material.raw_quiz_text || '');
  if (!bank.length) return noStoreJson({ kind: 'fallback' });
  const results: { question_id: string; question: string; topic: string; is_correct: boolean; student_answer: string; correct_answer: string; explanation: string }[] = body.answers.flatMap((answer: any) => {
    const question = bank.find((item) => item.id === answer.qid);
    if (!question) return [];
    return [{ question_id: question.id, question: question.question, topic: question.question.slice(0, 100), is_correct: answer.choice.toUpperCase() === question.correctAnswer, student_answer: answer.choice.toUpperCase(), correct_answer: question.correctAnswer, explanation: question.explanation }];
  });
  if (!results.length) return aiError('glitch', 400);
  const access = await authorizeAndSpend(request, 'quiz-eval');
  if ('response' in access) return access.response;
  const wrong = results.filter((item) => !item.is_correct);
  const score = Math.round((results.length - wrong.length) / results.length * 100);
  let feedback = 'Nice work. Keep reviewing your lecture question bank.';
  let weaknesses: string[] = [];
  let studyRecommendations: string[] = [];
  if (wrong.length) {
    try {
      const critique = await generateJson(`You are Dr. Atlas. ${SAFETY_RULES}\n${MODULE_RULES[loaded.material.module] || ''}\nCreate a short supportive critique, weak topics, and revision advice based ONLY on these wrong questions and stored explanations. ${dataBlock('SOURCE MATERIAL', JSON.stringify(wrong.map(({ question, explanation }) => ({ question, explanation }))))}\n${dataBlock('STUDENT INPUT', JSON.stringify(wrong.map(({ question, student_answer }) => ({ question, student_answer }))))}`, {
        type: 'OBJECT', properties: { feedback: { type: 'STRING' }, weaknesses: { type: 'ARRAY', items: { type: 'STRING' } }, studyRecommendations: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['feedback', 'weaknesses', 'studyRecommendations'],
      });
      if (typeof critique.feedback !== 'string' || !Array.isArray(critique.weaknesses) || !Array.isArray(critique.studyRecommendations)) throw new Error('shape');
      feedback = critique.feedback.slice(0, 1500); weaknesses = critique.weaknesses.slice(0, 8).map((x: unknown) => String(x).slice(0, 300)); studyRecommendations = critique.studyRecommendations.slice(0, 8).map((x: unknown) => String(x).slice(0, 300));
    } catch (error: any) {
      await refundCredit(request, 'quiz-eval');
      const busy = /429|RESOURCE_EXHAUSTED|rate.?limit/i.test(String(error?.message || error));
      console.info(JSON.stringify({ action: 'quiz-eval', material_id: loaded.material.id, kind: busy ? 'busy' : 'glitch', latency_ms: Date.now() - started }));
      return noStoreJson({ report: { module: loaded.material.module, score, isCorrect: wrong.length === 0, perQuestion: results.map(({ explanation, ...item }) => item), feedback: busy ? AI_MESSAGES.busy : AI_MESSAGES.glitch, diagnosticFocus: '', strengths: results.filter((x) => x.is_correct).map((x) => `Correct: ${x.topic}`), weaknesses, studyRecommendations }, kind: busy ? 'busy' : 'glitch', message: busy ? AI_MESSAGES.busy : AI_MESSAGES.glitch });
    }
  }
  console.info(JSON.stringify({ action: 'quiz-eval', material_id: loaded.material.id, kind: 'ok', latency_ms: Date.now() - started }));
  return noStoreJson({ report: { module: loaded.material.module, score, isCorrect: wrong.length === 0, perQuestion: results.map(({ explanation, ...item }) => item), feedback, diagnosticFocus: '', strengths: results.filter((x) => x.is_correct).map((x) => `Correct: ${x.topic}`), weaknesses, studyRecommendations } });
}
