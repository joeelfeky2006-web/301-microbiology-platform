'use client';

export type CreditSnapshot = {
  daily_remaining: number;
  daily_limit: number;
  monthly_remaining: number;
  monthly_limit: number;
  bonus_balance?: number;
};

/** Notify the header CreditBadge. Pass a snapshot for instant UI; badge also refetches. */
export function notifyCreditsUpdated(credits?: Partial<CreditSnapshot> | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('credits_updated', { detail: credits || null }));
}
