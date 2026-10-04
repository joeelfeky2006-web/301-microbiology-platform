import 'server-only';
import type { PaymentProvider, ProviderCheckoutRequest, ProviderCheckoutResult } from './provider';
import type { VerifyPaymentResult, WebhookHandleResult } from './types';

/**
 * Paymob adapter — structure only. Live API calls are disabled until PAYMENTS_LIVE=true
 * and credentials are set. Do not treat any client callback as payment success.
 */
export function createPaymobProvider(): PaymentProvider {
  const apiKey = process.env.PAYMOB_API_KEY?.trim() || '';
  const integrationId = process.env.PAYMOB_INTEGRATION_ID?.trim() || '';
  const iframeId = process.env.PAYMOB_IFRAME_ID?.trim() || '';
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET?.trim() || '';

  return {
    name: 'paymob',

    isConfigured() {
      return Boolean(apiKey && integrationId && iframeId && hmacSecret);
    },

    async createCheckout(_input: ProviderCheckoutRequest): Promise<ProviderCheckoutResult> {
      // Intentionally not calling Paymob APIs in Phase 7.
      throw new Error('Paymob live checkout is not enabled. Set PAYMENTS_LIVE=true and complete provider wiring in a later phase.');
    },

    async verifyPayment(): Promise<VerifyPaymentResult> {
      return { ok: false, paid: false, reason: 'paymob_verify_not_implemented' };
    },

    async handleWebhook(_request: Request, rawBody: string): Promise<WebhookHandleResult & { providerOrderId?: string; providerTransactionId?: string; rawEvent?: unknown }> {
      // Parse body for future HMAC verification — never grant credits from this stub.
      let payload: unknown = null;
      try {
        payload = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        return { ok: false, reason: 'invalid_json' };
      }
      void payload;
      void hmacSecret;
      return {
        ok: false,
        reason: 'paymob_webhook_not_live',
        rawEvent: payload,
      };
    },
  };
}
