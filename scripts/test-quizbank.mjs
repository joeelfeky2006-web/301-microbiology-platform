/**
 * Unit-style smoke tests for the quiz bank parser.
 * Run: node scripts/test-quizbank.mjs
 * (No extra dependencies. Logic mirrors lib/ai/parseQuizBank.ts.)
 */

function parseBank(raw) {
  const normalized = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized
    .split(/(?=^\s*Q\s*:\s*)/im)
    .map((part) => part.trim())
    .filter((part) => /^Q\s*:/i.test(part));

  return blocks.flatMap((block, index) => {
    const q = block.match(/^Q\s*:\s*([\s\S]+?)(?=\s+[A-D]\s*[).]\s*)/i)?.[1]?.trim();
    const parsedOptions = Array.from(
      block.matchAll(/(?:^|\s)([A-D])\s*[).]\s*([\s\S]*?)(?=\s+[A-D]\s*[).]\s*|\s*ANSWER\s*:|$)/gi),
    );
    const options = ['A', 'B', 'C', 'D'].map((id) => {
      const match = parsedOptions.find((option) => option[1].toUpperCase() === id);
      return match ? { id, text: match[2].trim() } : null;
    });
    const answer = block.match(/(?:^|\s)ANSWER\s*:\s*([A-D])/i)?.[1]?.toUpperCase();
    const explanation = block.match(/(?:^|\s)EXPLANATION\s*:\s*([\s\S]*)$/i)?.[1]?.trim() || '';
    if (!q || options.some((option) => !option) || !answer) return [];
    return [{ id: `q${index + 1}`, question: q, options, correctAnswer: answer, explanation }];
  });
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const paren = parseBank('Q: What?\nA) one\nB) two\nC) three\nD) four\nANSWER: B\nEXPLANATION: because\n');
assert(paren.length === 1 && paren[0].correctAnswer === 'B' && paren[0].explanation.includes('because'), 'A) style');

const dotted = parseBank('Q: What?\nA. one\nB. two\nC. three\nD. four\nANSWER: A\n');
assert(dotted.length === 1 && dotted[0].correctAnswer === 'A' && dotted[0].explanation === '', 'A. style + missing EXPLANATION');

const three = parseBank('Q: What?\nA) one\nB) two\nC) three\nANSWER: A\n');
assert(three.length === 0, '3 options skipped');

const mixed = parseBank('Q: Broken\nA) only\nANSWER: A\n\nQ: Good?\nA) one\nB) two\nC) three\nD) four\nANSWER: C\nEXPLANATION: ok');
assert(mixed.length === 1 && mixed[0].correctAnswer === 'C', 'one bad block + one good block');

const lower = parseBank('Q: What?\na) one\nb) two\nc) three\nd) four\nANSWER: d\n');
assert(lower.length === 1 && lower[0].correctAnswer === 'D', 'lowercase options');

console.log('parseQuizBank tests: PASS');
