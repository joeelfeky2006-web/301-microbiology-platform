import 'server-only';

export type BankQuestion = { id: string; question: string; options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[]; correctAnswer: 'A' | 'B' | 'C' | 'D'; explanation: string };

export function parseBank(raw: string): BankQuestion[] {
  const blocks = raw.split(/(?=^\s*Q\s*:\s*)/im).map((part) => part.trim()).filter((part) => /^Q\s*:/i.test(part));
  return blocks.flatMap((block, index) => {
    const q = block.match(/^Q\s*:\s*([\s\S]+?)(?=\n\s*A\s*\))/i)?.[1]?.trim();
    const options = (['A', 'B', 'C', 'D'] as const).map((id) => {
      const match = block.match(new RegExp(`(?:^|\\n)\\s*${id}\\)\\s*([\\s\\S]*?)(?=\\n\\s*[A-D]\\)\\s*|\\n\\s*ANSWER\\s*:|$)`, 'i'));
      return match ? { id, text: match[1].trim() } : null;
    });
    const answer = block.match(/(?:^|\n)\s*ANSWER\s*:\s*([A-D])/i)?.[1]?.toUpperCase();
    const explanation = block.match(/(?:^|\n)\s*EXPLANATION\s*:\s*([\s\S]*)$/i)?.[1]?.trim() || '';
    if (!q || options.some((option) => !option) || !answer) return [];
    return [{ id: `q${index + 1}`, question: q, options: options as BankQuestion['options'], correctAnswer: answer as BankQuestion['correctAnswer'], explanation }];
  });
}
