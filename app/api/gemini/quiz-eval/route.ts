import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

interface QuizEvalPayload {
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  module: string;
  topic?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: QuizEvalPayload = await req.json();
    const { question, studentAnswer, correctAnswer, module: moduleName, topic } = body;

    if (!question || !studentAnswer) {
      return NextResponse.json(
        { error: 'Missing question or student answer' },
        { status: 400 }
      );
    }

    if (ai) {
      const prompt = `You are a medical microbiology examiner evaluating a MUST 301 student's exam response.
Module: ${moduleName} (Central Nervous System, Urinary System, or Reproductive System).
Topic: ${topic || 'General'}.
Question Asked: "${question}".
Student's Chosen or Written Answer: "${studentAnswer}".
Reference Correct Answer: "${correctAnswer}".

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
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          return NextResponse.json({ success: true, evaluation: parsed, source: 'gemini' });
        }
      } catch (err) {
        console.warn('Gemini quiz eval fallback to local heuristics:', err);
      }
    }

    // Local heuristic evaluation fallback
    const isExact = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const isPartial =
      !isExact &&
      correctAnswer
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
        ? `Your answer aligns with standard microbiological criteria for ${moduleName}. The correct finding is: ${correctAnswer}.`
        : `Your answer was "${studentAnswer}", but the expected clinical answer is "${correctAnswer}". Review the specific diagnostic tests (culture media, enzymatic reactions, and staining) for this pathogen.`,
      keyTakeaways: [
        `Always correlate clinical presentation with Gram stain morphology before ordering secondary biochemical tests.`,
        `Remember the primary virulence factors highlighted in MUST 301 lecture slides.`,
      ],
      recommendedModuleReview: `${moduleName} Lectures & OSPE Practical Station`,
    };

    return NextResponse.json({ success: true, evaluation: fallbackEvaluation, source: 'curated_bank' });
  } catch (error: any) {
    console.error('Quiz eval API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate quiz' },
      { status: 500 }
    );
  }
}
