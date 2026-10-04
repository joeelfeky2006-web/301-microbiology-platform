import 'server-only';
import { randomUUID } from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getPackage, listPurchasablePackages } from './packages';
import { createPaymobProvider } from './paymobProvider';
import type { PaymentProvider } from './provider';
import type {
  CreatePaymentOrderInput,
  CreatePaymentOrderResult,
  PaymentProviderName,
  VerifyPaymentResult,
  WebhookHandleResult,
} from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Master kill switch — default OFF. Live Paymob must never run without this. */
export function paymentsLiveEnabled(): boolean {
  return (process.env.PAYMENTS_LIVE || '').trim().toLowerCase() === 'true';
}

export function defaultPaymentProviderName(): PaymentProviderName {
  const raw = (process.env.PAYMENT_PROVIDER || 'paymob').trim().toLowerCase();
  return raw === 'fawry' ? 'fawry' : 'paymob';
}

function getProvider(name: PaymentProviderName = defaultPaymentProviderName()): PaymentProvider {
  if (name === 'paymob') return createPaymobProvider();
  // Fawry reserved — same interface later.
  throw new Error(`Payment provider "${name}" is not implemented yet.`);
}

/**
 * Create a payment order. Persists a pending row when the DB is available.
 * Does NOT open live checkout unless PAYMENTS_LIVE=true and the provider is configured.
 */
export async function createPaymentOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
  if (!UUID_RE.test(input.userId)) throw new Error('Invalid user.');
  if (!UUID_RE.test(input.idempotencyKey)) throw new Error('idempotency_key must be a UUID.');

  const pkg = getPackage(input.packageId);
  if (!pkg || !listPurchasablePackages().some((item) => item.id === pkg.id)) {
    throw new Error('Unknown or unavailable package.');
  }

  const providerName = defaultPaymentProviderName();
  const admin = createSupabaseAdmin();
  if (!admin) throw new Error('Payment service is unavailable.');

  // Idempotent replay
  const { data: existing } = await admin
    .from('payment_orders')
    .select('id,status,checkout_url,amount_cents,currency,credits,provider')
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (existing) {
    return {
      orderId: existing.id,
      provider: (existing.provider as PaymentProviderName) || providerName,
      status: existing.status,
      checkoutUrl: existing.checkout_url,
      amountCents: existing.amount_cents,
      currency: existing.currency,
      credits: existing.credits,
      live: paymentsLiveEnabled(),
      message: 'Existing order for this idempotency_key.',
    };
  }

  const orderId = randomUUID();
  const { error: insertError } = await admin.from('payment_orders').insert({
    id: orderId,
    user_id: input.userId,
    package_id: pkg.id,
    provider: providerName,
    status: 'pending',
    amount_cents: pkg.price_cents,
    currency: pkg.currency,
    credits: pkg.credits,
    idempotency_key: input.idempotencyKey,
    metadata: { package_name: pkg.name },
  });
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raced } = await admin
        .from('payment_orders')
        .select('id,status,checkout_url,amount_cents,currency,credits,provider')
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle();
      if (raced) {
        return {
          orderId: raced.id,
          provider: (raced.provider as PaymentProviderName) || providerName,
          status: raced.status,
          checkoutUrl: raced.checkout_url,
          amountCents: raced.amount_cents,
          currency: raced.currency,
          credits: raced.credits,
          live: paymentsLiveEnabled(),
          message: 'Existing order for this idempotency_key.',
        };
      }
    }
    throw new Error('Could not create payment order. Apply supabase/payments-ready.sql if missing.');
  }

  const live = paymentsLiveEnabled();
  const provider = getProvider(providerName);

  if (!live || !provider.isConfigured()) {
    return {
      orderId,
      provider: providerName,
      status: 'pending',
      checkoutUrl: null,
      amountCents: pkg.price_cents,
      currency: pkg.currency,
      credits: pkg.credits,
      live: false,
      message: live
        ? 'Payments are flagged live but the provider is not fully configured.'
        : 'Payments are not live. Order recorded as pending; use admin credit grant for beta packs.',
    };
  }

  try {
    const checkout = await provider.createCheckout({
      orderId,
      userId: input.userId,
      amountCents: pkg.price_cents,
      currency: pkg.currency,
      packageId: pkg.id,
      credits: pkg.credits,
      idempotencyKey: input.idempotencyKey,
    });
    await admin
      .from('payment_orders')
      .update({
        status: 'checkout_created',
        provider_order_id: checkout.providerOrderId,
        checkout_url: checkout.checkoutUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    return {
      orderId,
      provider: providerName,
      status: 'checkout_created',
      checkoutUrl: checkout.checkoutUrl,
      amountCents: pkg.price_cents,
      currency: pkg.currency,
      credits: pkg.credits,
      live: true,
    };
  } catch (error) {
    await admin
      .from('payment_orders')
      .update({ status: 'failed', updated_at: new Date().toISOString(), metadata: { error: error instanceof Error ? error.message : 'checkout_failed' } })
      .eq('id', orderId);
    throw error;
  }
}

export async function verifyPayment(input: {
  provider?: PaymentProviderName;
  providerOrderId?: string;
  providerTransactionId?: string;
  raw?: unknown;
}): Promise<VerifyPaymentResult> {
  if (!paymentsLiveEnabled()) {
    return { ok: false, paid: false, reason: 'payments_not_live' };
  }
  const provider = getProvider(input.provider || defaultPaymentProviderName());
  return provider.verifyPayment(input);
}

/**
 * Server-only webhook entry. Must never trust browser redirects.
 * Stub providers return not-live; when live, mark paid then fulfill once.
 */
export async function handleWebhook(providerName: PaymentProviderName, request: Request, rawBody: string): Promise<WebhookHandleResult> {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, reason: 'service_unavailable' };

  const provider = getProvider(providerName);
  const handled = await provider.handleWebhook(request, rawBody);

  await admin.from('payment_events').insert({
    provider: providerName,
    event_type: handled.reason || (handled.ok ? 'webhook' : 'webhook_rejected'),
    provider_event_id: handled.providerTransactionId || null,
    payload: {
      ok: handled.ok,
      reason: handled.reason,
      orderId: handled.orderId,
      raw: handled.rawEvent ?? null,
    },
    order_id: handled.orderId && UUID_RE.test(handled.orderId) ? handled.orderId : null,
  });

  if (!paymentsLiveEnabled() || !handled.ok || !handled.paid) {
    return {
      ok: handled.ok,
      reason: handled.reason || (!paymentsLiveEnabled() ? 'payments_not_live' : 'not_paid'),
      orderId: handled.orderId,
    };
  }

  // Live path (future): locate order, mark paid, fulfill idempotently.
  let orderId = handled.orderId;
  if (!orderId && handled.providerOrderId) {
    const { data } = await admin
      .from('payment_orders')
      .select('id')
      .eq('provider', providerName)
      .eq('provider_order_id', handled.providerOrderId)
      .maybeSingle();
    orderId = data?.id;
  }
  if (!orderId) return { ok: false, reason: 'order_not_found' };

  await admin
    .from('payment_orders')
    .update({
      status: 'paid',
      provider_transaction_id: handled.providerTransactionId || null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .in('status', ['pending', 'checkout_created', 'paid']);

  const { data: fulfill, error } = await admin.rpc('fulfill_payment_order', { p_order_id: orderId });
  if (error) return { ok: false, orderId, reason: error.message, status: 'paid' };
  const row = Array.isArray(fulfill) ? fulfill[0] : fulfill;
  return {
    ok: Boolean(row?.success),
    orderId,
    status: row?.success ? 'fulfilled' : 'paid',
    fulfilled: Boolean(row?.success),
    reason: row?.reason,
  };
}

export const paymentService = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  paymentsLiveEnabled,
  listPurchasablePackages,
  getPackage,
};
