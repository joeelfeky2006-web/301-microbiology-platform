import 'server-only';

/** Body keys that must never be accepted from clients for self-service credit changes. */
const FORBIDDEN_CREDIT_KEYS = [
  'credits',
  'credit',
  'bonus_balance',
  'bonus',
  'daily_remaining',
  'monthly_remaining',
  'daily_limit',
  'monthly_limit',
  'amount',
  'p_amount',
  'grant',
] as const;

/**
 * Reject requests that try to smuggle credit fields into unrelated endpoints
 * (e.g. profile PATCH with `{ "credits": 999999 }`).
 */
export function rejectClientCreditMutation(body: unknown): Response | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const keys = Object.keys(body as Record<string, unknown>).map((k) => k.toLowerCase());
  const hit = FORBIDDEN_CREDIT_KEYS.find((forbidden) => keys.includes(forbidden));
  if (!hit) return null;
  return Response.json(
    { error: 'Credits cannot be modified from this endpoint.' },
    { status: 400, headers: { 'Cache-Control': 'no-store' } },
  );
}
