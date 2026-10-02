import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import type { ModuleName } from '@/types';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticate, authorizeAndSpend } from '@/lib/apiAuth';

export const runtime = 'nodejs';

const MODULES: ModuleName[] = ['CNS', 'REP', 'URS'];
const MAX_SOURCE_CHARS = 80_000;

type QuizQuestion = {
  id: string;
  question: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
};

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/, '');
  return JSON.parse(cleaned);
}

function validateQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) throw new Error('Quiz response must be an array');
  return value.slice(0, 50).map((row, index) => {
    const q = row as Partial<QuizQuestion>;
    const answer = q.correctAnswer;
    if (typeof q.question !== 'string' || !Array.isArray(q.options) ||
        !['A', 'B', 'C', 'D'].includes(String(answer)) || typeof q.explanation !== 'string') {
      throw new Error(`Invalid question at index ${index}`);
    }
    const options = q.options.slice(0, 4).map((option) => {
      const item = option as { id?: string; text?: string };
      if (!['A', 'B', 'C', 'D'].includes(String(item.id)) || typeof item.text !== 'string') {
        throw new Error(`Invalid option at question ${index}`);
      }
      return { id: item.id as 'A' | 'B' | 'C' | 'D', text: item.text.slice(0, 2000) };
    });
    if (options.length !== 4 || !options.some((option) => option.id === answer)) {
      throw new Error(`Question ${index} must have four options and a valid answer`);
    }
    return {
      id: typeof q.id === 'string' ? q.id.slice(0, 100) : `q-${index + 1}`,
      question: q.question.slice(0, 5000),
      options,
      correctAnswer: answer!,
      explanation: q.explanation.slice(0, 5000),
    };
  });
}

export async function GET(request: NextRequest) {
  const access = await authenticate(request);
  if ('response' in access) return access.response;
  const materialId = new URL(request.url).searchParams.get('material_id');
  if (!materialId) return NextResponse.json({ error: 'A lecture material id is required.' }, { status: 400 });
  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'AI resource service is not configured.' }, { status: 503 });
  const { data, error } = await admin.from('materials').select('raw_quiz_text').eq('id', materialId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Lecture material was not found.' }, { status: 404 });
  return NextResponse.json({ available: Boolean(data.raw_quiz_text?.trim()) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const materialId = typeof body?.material_id === 'string' ? body.material_id : '';
    if (!materialId) return NextResponse.json({ error: 'A lecture material id is required.' }, { status: 400 });

    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) return NextResponse.json({ error: 'AI resource service is not configured.' }, { status: 503 });
    const { data: material, error: materialError } = await supabaseAdmin
      .from('materials')
      .select('id,module,raw_quiz_text,ai_context,custom_system_prompt')
      .eq('id', materialId)
      .maybeSingle();
    if (materialError || !material) return NextResponse.json({ error: 'Lecture material was not found.' }, { status: 404 });

    const module = material.module as ModuleName;
    const rawQuizText = material.raw_quiz_text || '';
    const aiContext = material.ai_context || '';
    const customPrompt = material.custom_system_prompt || '';
    if (!MODULES.includes(module)) return NextResponse.json({ error: 'Invalid module code.' }, { status: 400 });
    if (rawQuizText.length > MAX_SOURCE_CHARS || aiContext.length > MAX_SOURCE_CHARS || customPrompt.length > 10_000) {
      return NextResponse.json({ error: 'Quiz source exceeds the allowed size.' }, { status: 413 });
    }
    if (!rawQuizText.trim()) {
      return NextResponse.json({ questions: [], source: 'empty' }, { status: 200 });
    }
    if (!ai) {
      return NextResponse.json({ error: 'Quiz conversion is temporarily unavailable.' }, { status: 503 });
    }

    const access = await authorizeAndSpend(request, 2);
    if ('response' in access) return access.response;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        'Convert the supplied raw quiz bank into JSON only. Return an array of question objects with id, question, exactly four options {id: A|B|C|D, text}, correctAnswer (option ID), and explanation. Preserve the provided key; never invent a key when absent. Omit questions whose answer key cannot be determined.',
        `Module: ${module}`,
        `Lecture knowledge context:\n${aiContext.slice(0, MAX_SOURCE_CHARS)}`,
        `Admin prompt overlay:\n${customPrompt.slice(0, 10_000)}`,
        `Raw quiz bank:\n${rawQuizText.slice(0, MAX_SOURCE_CHARS)}`,
      ].join('\n\n'),
      config: { responseMimeType: 'application/json' },
    });

    const questions = validateQuestions(parseJson(response.text || '[]'));
    return NextResponse.json({ questions, source: 'gemini' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Quiz generation failed:', error);
    return NextResponse.json({ error: 'Could not convert this quiz bank. Check the source text and try again.' }, { status: 422 });
  }
}
