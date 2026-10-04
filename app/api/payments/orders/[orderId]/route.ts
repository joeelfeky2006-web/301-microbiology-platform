import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Server truth for order status — never trust client “paid” flags. */
export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  if (!UUID_RE.test(params.orderId)) {
    return Response.json({ error: 'Invalid order id.' }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) return Response.json({ error: 'Payment service is unavailable.' }, { status: 503 });

  const { data, error } = await admin
    .from('payment_orders')
    .select('id,package_id,provider,status,amount_cents,currency,credits,checkout_url,paid_at,fulfilled_at,created_at')
    .eq('id', params.orderId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (error) return Response.json({ error: 'Could not load order.' }, { status: 503 });
  if (!data) return Response.json({ error: 'Order not found.' }, { status: 404 });

  return Response.json({ order: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
