import type { NextRequest } from 'next/server';
import { handleWebhook, paymentsLiveEnabled } from '@/lib/payments/paymentService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Paymob server-to-server webhook.
 * Never grant credits from browser redirects or query params — only this path (when live).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = await handleWebhook('paymob', request, rawBody);

  // Always acknowledge receipt to avoid provider retry storms on stub responses,
  // but surface not-live clearly in the body for ops.
  const status = result.reason === 'service_unavailable' ? 503 : 200;
  return Response.json(
    {
      ok: result.ok,
      live: paymentsLiveEnabled(),
      order_id: result.orderId,
      status: result.status,
      fulfilled: result.fulfilled,
      reason: result.reason,
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
