export type PaymentProviderName = 'paymob' | 'fawry';

export type PaymentOrderStatus =
  | 'pending'
  | 'checkout_created'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'fulfilled';

export type CreatePaymentOrderInput = {
  userId: string;
  packageId: string;
  idempotencyKey: string;
};

export type CreatePaymentOrderResult = {
  orderId: string;
  provider: PaymentProviderName;
  status: PaymentOrderStatus;
  checkoutUrl: string | null;
  amountCents: number;
  currency: string;
  credits: number;
  live: boolean;
  message?: string;
};

export type VerifyPaymentInput = {
  provider: PaymentProviderName;
  providerTransactionId?: string;
  providerOrderId?: string;
  raw?: unknown;
};

export type VerifyPaymentResult = {
  ok: boolean;
  paid: boolean;
  orderId?: string;
  providerTransactionId?: string;
  reason?: string;
};

export type WebhookHandleResult = {
  ok: boolean;
  orderId?: string;
  status?: PaymentOrderStatus;
  fulfilled?: boolean;
  reason?: string;
};
