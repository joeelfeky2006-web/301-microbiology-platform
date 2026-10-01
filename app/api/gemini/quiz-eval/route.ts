import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

interface QuizEvalPayload {
  questionId?: string;
  question?: string;
  studentAnswer: string;
  correctAnswer?: string;
  module?: string;
  topic?: string;
}

// Canonical server-side question bank & answer keys (never exposed to client before submission)
const SERVER_ANSWER_KEYS: Record<
  string,
  {
    module: string;
    question: string;
    correctAnswer: string;
    topic: string;
  }
> = {
  'urs-q1': {
    module: 'Urinary System (URS)',
    question:
      'A 22-year-old student presents with painful dysuria and cloudy urine. Culture on MacConkey agar shows pink colonies with rapid lactose fermentation and positive indole test. What is the organism, and what pili facilitate ascent?',
    correctAnswer:
      'Uropathogenic Escherichia coli (UPEC) using P-fimbriae (pyelonephritis-associated pili) to ascend to the renal pelvis.',
    topic: 'UPEC Virulence Factors',
  },
  'cns-q1': {
    module: 'Central Nervous System (CNS)',
    question:
      'An 18-year-old college student presents with high fever, neck stiffness, and a petechial rash. CSF analysis reveals opening pressure 280 mm H2O, WBC 4500 (90% PMNs), high protein, and low glucose. Gram stain shows intracellular Gram-negative diplococci. What is the organism and the primary capsule virulence factor?',
    correctAnswer:
      'Neisseria meningitidis (Meningococcus) utilizing its antiphagocytic polysaccharide capsule and endotoxic Lipooligosaccharide (LOS).',
    topic: 'Acute Bacterial Meningitis',
  },
  'rep-q1': {
    module: 'Reproductive System (REP)',
    question:
      'A 29-year-old male presents with a single, painless, hard indurated ulcer on the penis and bilateral non-tender lymphadenopathy. Darkfield microscopy reveals slender, corkscrew motile spirochetes. What is the pathogen, and what is the drug of choice?',
    correctAnswer:
      'Treponema pallidum subsp. pallidum (Primary Syphilis), treated with Benzathine Penicillin G (single IM dose).',
    topic: 'Genital Ulcer Diseases & Syphilis',
  },
};

function safeJsonParse(rawText: string): any {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return JSON.parse(cleaned.trim());
}

export async function POST(req: NextRequest) {
  try {
    const body: QuizEvalPayload = await req.json();
    const { questionId, studentAnswer } = body;

    if (!studentAnswer || typeof studentAnswer !== 'string') {
      return NextResponse.json(
        { error: 'Student answer is required' },
        { status: 400 }
      );
    }

    // Resolve question and authoritative benchmark answer server-side
    let questionText = body.question || '';
    let authoritativeAnswer = body.correctAnswer || '';
    let moduleName = body.module || 'Microbiology';
    let topicName = body.topic || 'General Exam Prep';

    if (questionId && SERVER_ANSWER_KEYS[questionId]) {
      const serverEntry = SERVER_ANSWER_KEYS[questionId];
      questionText = serverEntry.question;
      authoritativeAnswer = serverEntry.correctAnswer;
      moduleName = serverEntry.module;
      topicName = serverEntry.topic;
    }

    if (!questionText) {
      questionText = 'Clinical microbiology diagnostic question';
    }

    if (ai && authoritativeAnswer) {
      const prompt = `You are a medical microbiology examiner evaluating a MUST 301 student's exam response.
Module: ${moduleName}.
Topic: ${topicName}.
Question Asked: "${questionText}".
Student's Chosen or Written Answer: "${studentAnswer}".
Reference Benchmark Answer: "${authoritativeAnswer}".

Provide constructive, rigorous academic feedback.
Return ONLY valid JSON matching this schema:
{
  "isCorrect": boolean,
  "score": number (0 to 100),
  "verdict": "Correct" | "Partially Correct" | "Incorrect",
  "feedbackSummary": "Concise summary of student performance",
  "detailedExplanation": "Clear clinical and microbiological explanation comparing student answer with correct answer",
  "keyTakeaways": ["Key point 1 to remember for MUST 301 exam", "Key point 2"],
  "recommendedModuleReview": "Specific lecture or topic to review"
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const parsed = safeJsonParse(response.text);
          return NextResponse.json({ success: true, evaluation: parsed, source: 'gemini' });
        }
      } catch (err) {
        console.warn('Gemini quiz eval fallback to local heuristics:', err);
      }
    }

    // Local heuristic evaluation fallback
    const reference = authoritativeAnswer || studentAnswer;
    const isExact = studentAnswer.trim().toLowerCase() === reference.trim().toLowerCase();
    const isPartial =
      !isExact &&
      reference
        .toLowerCase()
        .split(' ')
        .some((word) => word.length > 3 && studentAnswer.toLowerCase().includes(word));

    const isCorrect = isExact || isPartial;
    const score = isExact ? 100 : isPartial ? 75 : 0;

    const fallbackEvaluation = {
      isCorrect,
      score,
      verdict: isExact ? 'Correct' : isPartial ? 'Partially Correct' : 'Incorrect',
      feedbackSummary: isCorrect
        ? 'Great clinical reasoning! You correctly identified the hallmark microbiological features.'
        : 'Incorrect. Pay close attention to differential staining and specific virulence mechanisms.',
      detailedExplanation: isCorrect
        ? `Your answer aligns with standard microbiological criteria for ${moduleName}. Expected key finding: ${reference}.`
        : `Your answer was "${studentAnswer}", but the expected clinical benchmark is "${reference}". Review culture media, enzymatic reactions, and staining for this pathogen.`,
      keyTakeaways: [
        `Always correlate clinical presentation with Gram stain morphology before ordering secondary biochemical tests.`,
        `Remember the primary virulence factors highlighted in MUST 301 lecture slides.`,
      ],
      recommendedModuleReview: `${moduleName} Lectures & OSPE Practical Station`,
    };

    return NextResponse.json({ success: true, evaluation: fallbackEvaluation, source: 'server_key' });
  } catch (error: any) {
    console.error('Quiz eval API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate quiz' },
      { status: 500 }
    );
  }
}
