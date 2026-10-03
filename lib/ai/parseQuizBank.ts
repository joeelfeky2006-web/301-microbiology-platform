/** Client-safe quiz bank parser (no server-only imports). */

export type BankQuestion = {
  id: string;
  question: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
};

/**
 * Parse admin-authored raw quiz text.
 * Accepts A)/B)/C)/D) or A./B./C./D. (case-insensitive), CRLF, and blank lines.
 * Blocks missing a full A–D set or ANSWER are skipped (one bad block does not fail the bank).
 * EXPLANATION is optional.
 */
export function parseBank(raw: string): BankQuestion[] {
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
    const options = (['A', 'B', 'C', 'D'] as const).map((id) => {
      const match = parsedOptions.find((option) => option[1].toUpperCase() === id);
      return match ? { id, text: match[2].trim() } : null;
    });
    const answer = block.match(/(?:^|\s)ANSWER\s*:\s*([A-D])/i)?.[1]?.toUpperCase();
    const explanation = block.match(/(?:^|\s)EXPLANATION\s*:\s*([\s\S]*)$/i)?.[1]?.trim() || '';
    if (!q || options.some((option) => !option) || !answer) return [];
    return [{
      id: `q${index + 1}`,
      question: q,
      options: options as BankQuestion['options'],
      correctAnswer: answer as BankQuestion['correctAnswer'],
      explanation,
    }];
  });
}
