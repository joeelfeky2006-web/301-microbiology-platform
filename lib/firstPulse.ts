/**
 * First Pulse: the badge for students who joined MedAtlas Egypt during the beta.
 * While `FIRST_PULSE_CLOSES_AT` is null every account qualifies. Set it to an ISO date to close the
 * badge: accounts created before that moment keep it permanently, newer accounts never receive it.
 */
export const FIRST_PULSE_CLOSES_AT: string | null = null;

export function firstPulseOpen(now = new Date()): boolean {
  return !FIRST_PULSE_CLOSES_AT || now < new Date(FIRST_PULSE_CLOSES_AT);
}

export function hasFirstPulse(accountCreatedAt: string | null | undefined): boolean {
  if (!accountCreatedAt) return false;
  const created = new Date(accountCreatedAt);
  if (Number.isNaN(created.getTime())) return false;
  return !FIRST_PULSE_CLOSES_AT || created < new Date(FIRST_PULSE_CLOSES_AT);
}
