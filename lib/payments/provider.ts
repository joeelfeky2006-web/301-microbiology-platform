import 'server-only';
import type { CreatePaymentOrderResult, PaymentProviderName, VerifyPaymentResult, WebhookHandleResult } from './types';

export type ProviderCheckoutRequest = {
  orderId: string;
  userId: string;
  amountCents: number;
  currency: string;
  packageId: string;
  credits: number;
  idempotencyKey: string;
};

export type ProviderCheckoutResult = {
  providerOrderId: string;
  checkoutUrl: string;
  raw?: unknown;
};

/**
 * Provider-agnostic gateway. Paymob first; Fawry can implement the same surface later.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  isConfigured(): boolean;
  createCheckout(input: ProviderCheckoutRequest): Promise<ProviderCheckoutResult>;
  verifyPayment(input: { providerOrderId?: string; providerTransactionId?: string; raw?: unknown }): Promise<VerifyPaymentResult>;
  handleWebhook(request: Request, rawBody: string): Promise<WebhookHandleResult & {
    paid?: boolean;
    providerOrderId?: string;
    providerTransactionId?: string;
    rawEvent?: unknown;
  }>;
}

export type { CreatePaymentOrderResult };
