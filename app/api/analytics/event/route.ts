import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { isAnalyticsEventName } from '@/lib/analytics/events';
import { sanitizeAnalyticsProps } from '@/lib/analytics/sanitize';
import { trackServer, analyticsEnabled } from '@/lib/analytics/server';

export const dynamic = 'force-dynamic';

/**
 * Authenticated client → server analytics bridge.
 * Allowlisted events only; properties sanitized; user id hashed before egress.
 */
export async function POST(request: NextRequest) {
  if (!analyticsEnabled()) {
    return Response.json({ ok: true, enabled: false }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const auth = await authenticate(request);
  // Allow anonymous product events (package_viewed) without forcing login,
  // but prefer authenticated distinct ids when present.
  let userId: string | null = null;
  if (!('response' in auth)) userId = auth.userId;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!isAnalyticsEventName(body.event)) {
    return Response.json({ error: 'Unknown event.' }, { status: 400 });
  }

  // Auth-only events (signup/login may fire before session cookies settle)
  if (['ai_request', 'ai_request_success', 'ai_request_error', 'credits_used', 'checkout_started', 'purchase_completed'].includes(body.event) && !userId) {
    return Response.json({ error: 'Authentication required for this event.' }, { status: 401 });
  }

  trackServer(body.event, sanitizeAnalyticsProps(body.properties), { userId });
  return Response.json({ ok: true, enabled: true }, { headers: { 'Cache-Control': 'no-store' } });
}
