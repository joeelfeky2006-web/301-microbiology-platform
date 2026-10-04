/** Phase 10 observability snapshot — backend shape for admin dashboards. */

export type ObservabilityWindow = {
  since: string;
  days: number;
};

export type ObservabilitySnapshot = {
  window: ObservabilityWindow;
  users: {
    total: number;
    active7d: number;
  };
  ai: {
    requests: number;
    byFeature: Record<string, number>;
    byStatus: Record<string, number>;
    byProvider: Record<string, number>;
    providerFailures: number;
    totalTokens: number;
    estimatedCostUsd: number | null;
  };
  credits: {
    consumed: number;
    purchased: number;
    granted: number;
  };
  revenue: {
    currency: 'EGP';
    paidOrders: number;
    amountCents: number;
    amountLabel: string;
  };
  conversion: {
    checkoutStarted: number;
    purchasesCompleted: number;
    rate: number | null;
  };
  recentPaymentEvents: Array<{
    id: string;
    provider: string;
    event_type: string;
    order_id: string | null;
    created_at: string;
  }>;
  recentErrors: Array<{
    id: string;
    feature: string | null;
    provider: string | null;
    error_code: string | null;
    status: string;
    created_at: string;
  }>;
  availability: {
    ai_usage: boolean;
    payment_orders: boolean;
    payment_events: boolean;
    user_credit_history: boolean;
  };
};
