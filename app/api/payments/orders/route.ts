import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createPaymentOrder, paymentsLiveEnabled } from '@/lib/payments/paymentService';
import { trackServer } from '@/lib/analytics/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Create a payment order for the authenticated student.
 * With PAYMENTS_LIVE unset/false: records a pending order and returns live:false (no checkout).
 * Never grants credits from this route.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const packageId = typeof body.package_id === 'string' ? body.package_id.trim() : '';
  const idempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
  if (!packageId || !UUID_RE.test(idempotencyKey)) {
    return Response.json({ error: 'Provide package_id and idempotency_key (UUID).' }, { status: 400 });
  }

  try {
    const order = await createPaymentOrder({
      userId: auth.userId,
      packageId,
      idempotencyKey,
    });
    trackServer('checkout_started', {
      package_id: packageId,
      live: order.live,
      status: order.status,
    }, { userId: auth.userId });
    return Response.json(
      { order, live: paymentsLiveEnabled() },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create order.';
    const status = /unknown|unavailable|Invalid|must be/i.test(message) ? 400 : 503;
    return Response.json({ error: message, live: paymentsLiveEnabled() }, { status });
  }
}
