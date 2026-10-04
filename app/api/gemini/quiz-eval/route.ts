import 'server-only';
import { NextRequest } from 'next/server';
import { authenticate, authorizeAndSpend, refundCredit } from '@/lib/apiAuth';
import { parseBank } from '@/lib/ai/quizBank';
import { loadMaterial, generateJson, noStoreJson } from '@/lib/ai/pipeline';
import { AI_MESSAGES, aiError } from '@/lib/ai/messages';
import { MODULE_RULES, SAFETY_RULES, dataBlock } from '@/lib/ai/modulePrompts';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { BankQuestion } from '@/lib/ai/quizBank';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type ScoredRow = {
  question_id: string;
  question: string;
  topic: string;
  is_correct: boolean;
  student_answer: string;
  correct_answer: string;
  explanation: string;
};

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  let body: any;
  try { body = await request.json(); } catch { return aiError('glitch', 400); }

  const materialIdValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.material_id || '');
  const quizIdValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.quiz_id || '');
  const wantCritique = body?.critique === true;
  // score (default): free end report. critique: optional paid Dr. Atlas feedback.
  if ((!materialIdValid && !quizIdValid) || !Array.isArray(body?.answers) || body.answers.length > 200
    || body.answers.some((a: any) => !a || typeof a.qid !== 'string' || a.qid.length > 500 || typeof a.choice !== 'string' || a.choice.length > 500)) {
    return aiError('glitch', 400);
  }

  let structuredQuestions: BankQuestion[] | null = null;
  let targetMaterialId: string = body.material_id;
  if (quizIdValid) {
    const admin = createSupabaseAdmin();
    if (!admin) return aiError('glitch', 503);
    const { data: quiz, error } = await admin.from('lecture_quizzes').select('material_id,questions').eq('id', body.quiz_id).eq('is_published', true).maybeSingle();
    if (error || !quiz?.material_id || !Array.isArray(quiz.questions)) return aiError('glitch', 404);
    targetMaterialId = quiz.material_id;
    structuredQuestions = quiz.questions as unknown as BankQuestion[];
  }

  const loaded = await loadMaterial(targetMaterialId);
  if ('response' in loaded) return loaded.response;
  const bank = structuredQuestions || parseBank(loaded.material.raw_quiz_text || '');
  if (!bank.length) return noStoreJson({ kind: 'fallback' });

  // Score every bank question; missing/blank answers count as wrong.
  const answerMap = new Map<string, string>(
    body.answers.map((answer: { qid: string; choice: string }) => [answer.qid, answer.choice]),
  );
  const results: ScoredRow[] = bank.map((question) => {
    const raw = (answerMap.get(question.id) || '').trim().toUpperCase();
    const student = ['A', 'B', 'C', 'D'].includes(raw) ? raw : '';
    return {
      question_id: question.id,
      question: question.question,
      topic: question.question.slice(0, 100),
      is_correct: student !== '' && student === question.correctAnswer,
      student_answer: student || '—',
      correct_answer: question.correctAnswer,
      explanation: question.explanation || '',
    };
  });
  if (!results.length) return aiError('glitch', 400);

  const wrong = results.filter((item) => !item.is_correct);
  const score = Math.round(((results.length - wrong.length) / results.length) * 100);
  const baseReport = {
    module: loaded.material.module,
    score,
    isCorrect: wrong.length === 0,
    perQuestion: results.map(({ explanation, ...item }) => ({ ...item, explanation })),
    feedback: wrong.length === 0
      ? 'Nice work. You answered every question correctly.'
      : 'Quiz complete. Review the answer key below. Optional Dr. Atlas feedback costs 1 credit.',
    diagnosticFocus: '',
    strengths: results.filter((x) => x.is_correct).map((x) => `Correct: ${x.topic}`),
    weaknesses: [] as string[],
    studyRecommendations: [] as string[],
  };

  if (!wantCritique) {
    console.info(JSON.stringify({ action: 'quiz-eval', material_id: loaded.material.id, kind: 'ok', latency_ms: Date.now() - started, charged: false, mode: 'score' }));
    return noStoreJson({ report: baseReport });
  }

  if (!wrong.length) {
    console.info(JSON.stringify({ action: 'quiz-eval', material_id: loaded.material.id, kind: 'ok', latency_ms: Date.now() - started, charged: false, mode: 'critique' }));
    return noStoreJson({ report: { ...baseReport, feedback: 'Perfect score — no critique needed.' } });
  }

  const access = await authorizeAndSpend(request, 'quiz-eval');
  if ('response' in access) return access.response;
  try {
    const critique = await generateJson(`You are Dr. Atlas. ${SAFETY_RULES}\n${MODULE_RULES[loaded.material.module] || ''}\nCreate a short supportive critique, weak topics, and revision advice based ONLY on these wrong questions and stored explanations. ${dataBlock('SOURCE MATERIAL', JSON.stringify(wrong.map(({ question, explanation }) => ({ question, explanation }))))}\n${dataBlock('STUDENT INPUT', JSON.stringify(wrong.map(({ question, student_answer }) => ({ question, student_answer }))))}`, {
      type: 'OBJECT',
      properties: {
        feedback: { type: 'STRING' },
        weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
        studyRecommendations: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['feedback', 'weaknesses', 'studyRecommendations'],
    });
    if (typeof critique.feedback !== 'string' || !Array.isArray(critique.weaknesses) || !Array.isArray(critique.studyRecommendations)) throw new Error('shape');
    console.info(JSON.stringify({ action: 'quiz-eval', material_id: loaded.material.id, kind: 'ok', latency_ms: Date.now() - started, charged: true, mode: 'critique' }));
    return noStoreJson({
      report: {
        ...baseReport,
        feedback: critique.feedback.slice(0, 1500),
        weaknesses: critique.weaknesses.slice(0, 8).map((x: unknown) => String(x).slice(0, 300)),
        studyRecommendations: critique.studyRecommendations.slice(0, 8).map((x: unknown) => String(x).slice(0, 300)),
      },
      credits: access.credits,
    });
  } catch (error: any) {
    const refunded = await refundCredit(request, 'quiz-eval');
    const busy = /429|RESOURCE_EXHAUSTED|rate.?limit/i.test(String(error?.message || error));
    console.info(JSON.stringify({ action: 'quiz-eval', material_id: loaded.material.id, kind: busy ? 'busy' : 'glitch', latency_ms: Date.now() - started }));
    return noStoreJson({
      report: {
        ...baseReport,
        feedback: busy ? AI_MESSAGES.busy : AI_MESSAGES.glitch,
      },
      kind: busy ? 'busy' : 'glitch',
      message: busy ? AI_MESSAGES.busy : AI_MESSAGES.glitch,
      credits: refunded || access.credits,
    }, 503);
  }
}
