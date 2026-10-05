/** Client-safe flashcard bank parser (no server-only imports). */

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
};

function stableCardId(index: number, front: string): string {
  // Short deterministic id so progress survives reordering when fronts stay unique.
  let hash = 0;
  const seed = `${index}:${front}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `fc${index + 1}_${hash.toString(16).slice(0, 8)}`;
}

/**
 * Parse admin-authored raw flashcard text.
 * Format per block:
 *   Q: Front
 *   A: Back
 *   HINT: optional
 *   TAG: tag1, tag2
 * Incomplete blocks (missing Q or A) are skipped.
 */
export function parseFlashcardBank(raw: string): Flashcard[] {
  const normalized = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized
    .split(/(?=^\s*Q\s*:\s*)/im)
    .map((part) => part.trim())
    .filter((part) => /^Q\s*:/i.test(part));

  return blocks.flatMap((block, index) => {
    const front = block.match(/^Q\s*:\s*([\s\S]+?)(?=\s+A\s*:|$)/i)?.[1]?.trim() || '';
    const back = block.match(/(?:^|\s)A\s*:\s*([\s\S]+?)(?=\s+HINT\s*:|\s+TAG\s*:|$)/i)?.[1]?.trim() || '';
    const hint = block.match(/(?:^|\s)HINT\s*:\s*([\s\S]+?)(?=\s+TAG\s*:|$)/i)?.[1]?.trim() || '';
    const tagLine = block.match(/(?:^|\s)TAG\s*:\s*([\s\S]+)$/i)?.[1]?.trim() || '';
    if (!front || front.length > 5000 || !back || back.length > 5000) return [];
    const tags = tagLine
      ? tagLine.split(/[,;]/).map((t) => t.trim()).filter((t) => t.length > 0 && t.length <= 60).slice(0, 12)
      : undefined;
    return [{
      id: stableCardId(index, front),
      front: front.slice(0, 5000),
      back: back.slice(0, 5000),
      ...(hint ? { hint: hint.slice(0, 1000) } : {}),
      ...(tags?.length ? { tags } : {}),
    }];
  });
}

/** Normalize structured deck JSON into Flashcard[]. */
export function normalizeDeckCards(value: unknown): Flashcard[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500) return [];
  return value.flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const front = typeof item.front === 'string' ? item.front.trim() : '';
    const back = typeof item.back === 'string' ? item.back.trim() : '';
    if (!front || !back) return [];
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 120) : stableCardId(index, front);
    const hint = typeof item.hint === 'string' ? item.hint.trim().slice(0, 1000) : '';
    const tags = Array.isArray(item.tags)
      ? item.tags.map((t) => String(t).trim()).filter((t) => t.length > 0 && t.length <= 60).slice(0, 12)
      : undefined;
    return [{
      id,
      front: front.slice(0, 5000),
      back: back.slice(0, 5000),
      ...(hint ? { hint } : {}),
      ...(tags?.length ? { tags } : {}),
    }];
  });
}
