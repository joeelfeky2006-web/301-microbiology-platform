/** SM-2 style spaced repetition for flashcard ratings. */

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

export type SrsState = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
  last_reviewed_at: string;
};

export const SRS_RATINGS: SrsRating[] = ['again', 'hard', 'good', 'easy'];

export function isSrsRating(value: unknown): value is SrsRating {
  return typeof value === 'string' && (SRS_RATINGS as string[]).includes(value);
}

export function defaultSrsState(now = new Date()): SrsState {
  return {
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    due_at: now.toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}

/**
 * Update SRS state from a rating.
 * - again: reset reps, due in ~10 minutes
 * - hard / good / easy: advance interval with extended SM-2 ease adjustments
 */
export function applySrsRating(
  prev: Pick<SrsState, 'ease_factor' | 'interval_days' | 'repetitions'> | null | undefined,
  rating: SrsRating,
  now = new Date(),
): SrsState {
  const ease = Math.max(1.3, Number(prev?.ease_factor) || 2.5);
  const interval = Math.max(0, Number(prev?.interval_days) || 0);
  const reps = Math.max(0, Number(prev?.repetitions) || 0);
  const reviewedAt = now.toISOString();

  if (rating === 'again') {
    const due = new Date(now.getTime() + 10 * 60 * 1000);
    return {
      ease_factor: Math.max(1.3, ease - 0.2),
      interval_days: 0,
      repetitions: 0,
      due_at: due.toISOString(),
      last_reviewed_at: reviewedAt,
    };
  }

  let nextEase = ease;
  if (rating === 'hard') nextEase = Math.max(1.3, ease - 0.15);
  if (rating === 'easy') nextEase = ease + 0.15;

  let nextReps = reps + 1;
  let nextInterval: number;
  if (nextReps === 1) {
    nextInterval = rating === 'easy' ? 2 : rating === 'hard' ? 0 : 1;
  } else if (nextReps === 2) {
    nextInterval = rating === 'hard' ? 1 : rating === 'easy' ? 4 : 3;
  } else {
    const factor = rating === 'hard' ? Math.max(1.2, nextEase - 0.3) : rating === 'easy' ? nextEase * 1.3 : nextEase;
    nextInterval = Math.max(1, Math.round(interval * factor));
  }

  // Hard on first pass: show again later today (~6h) rather than tomorrow.
  if (rating === 'hard' && nextReps === 1) {
    const due = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    return {
      ease_factor: nextEase,
      interval_days: 0,
      repetitions: nextReps,
      due_at: due.toISOString(),
      last_reviewed_at: reviewedAt,
    };
  }

  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + nextInterval);
  return {
    ease_factor: nextEase,
    interval_days: nextInterval,
    repetitions: nextReps,
    due_at: due.toISOString(),
    last_reviewed_at: reviewedAt,
  };
}
