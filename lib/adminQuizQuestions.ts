/** Shared validation for structured lecture quiz JSON (admin create/update).
 *  Each question must have 4 or 5 options (A–D or A–E). */

const OPTION_IDS = ['A', 'B', 'C', 'D', 'E'] as const;
export type QuizOptionId = (typeof OPTION_IDS)[number];

export function validateQuizQuestions(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) {
    throw new Error('Add between 1 and 200 questions.');
  }
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Question ${index + 1} is invalid.`);
    const item = raw as Record<string, unknown>;
    const question = typeof item.question === 'string' ? item.question.trim() : '';
    const answer = typeof item.correctAnswer === 'string' ? item.correctAnswer.toUpperCase() : '';
    const optionCount = Array.isArray(item.options) ? item.options.length : 0;
    const allowedAnswers = OPTION_IDS.slice(0, optionCount) as QuizOptionId[];
    if (
      !question
      || question.length > 5000
      || !Array.isArray(item.options)
      || optionCount < 4
      || optionCount > 5
      || !allowedAnswers.includes(answer as QuizOptionId)
    ) {
      throw new Error(`Question ${index + 1} needs text, 4–5 options (A–D or A–E), and correctAnswer matching an option.`);
    }
    const options = item.options.map((option, optionIndex) => {
      const row = option as Record<string, unknown>;
      const id = OPTION_IDS[optionIndex];
      const text = typeof row?.text === 'string' ? row.text.trim() : '';
      if (!text || text.length > 2000) throw new Error(`Question ${index + 1}, option ${id} is empty or too long.`);
      return { id, text };
    });
    const explanation = typeof item.explanation === 'string' ? item.explanation.trim().slice(0, 5000) : '';
    return { id: `q${index + 1}`, question, options, correctAnswer: answer as QuizOptionId, explanation };
  });
}

export function parseTimeLimitMinutes(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    throw new Error('Time limit must be blank (untimed) or between 1 and 180 minutes.');
  }
  return minutes;
}
