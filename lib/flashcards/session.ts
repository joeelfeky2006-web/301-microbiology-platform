import type { Flashcard } from './parseFlashcardBank';
import type { SrsState } from './srs';

export const SESSION_CAP = 40;

export type ProgressRow = {
  card_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
  last_reviewed_at: string | null;
};

export type StudyCard = Flashcard & {
  progress: ProgressRow | null;
  due: boolean;
  isNew: boolean;
};

/** Due cards first, then new cards; cap session size. */
export function buildStudySession(
  cards: Flashcard[],
  progressRows: ProgressRow[],
  now = new Date(),
  cap = SESSION_CAP,
): { queue: StudyCard[]; stats: { due: number; new: number; learned: number; total: number } } {
  const byId = new Map(progressRows.map((row) => [row.card_id, row]));
  const nowMs = now.getTime();
  const due: StudyCard[] = [];
  const fresh: StudyCard[] = [];
  let learned = 0;

  for (const card of cards) {
    const progress = byId.get(card.id) || null;
    if (!progress) {
      fresh.push({ ...card, progress: null, due: true, isNew: true });
      continue;
    }
    const dueAt = Date.parse(progress.due_at);
    const isDue = !Number.isFinite(dueAt) || dueAt <= nowMs;
    if (progress.repetitions > 0 && !isDue) learned += 1;
    if (isDue) due.push({ ...card, progress, due: true, isNew: false });
  }

  const queue = [...due, ...fresh].slice(0, cap);
  return {
    queue,
    stats: {
      due: due.length,
      new: fresh.length,
      learned,
      total: cards.length,
    },
  };
}
