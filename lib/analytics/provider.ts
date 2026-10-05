import 'server-only';
import type { AnalyticsEventName } from './events';
import type { AnalyticsProps } from './sanitize';

export type CapturePayload = {
  event: AnalyticsEventName;
  distinctId?: string;
  properties: AnalyticsProps;
};

export function analyticsEnabled(): boolean {
  const flag = (process.env.ANALYTICS_ENABLED || '').trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  const key = process.env.ANALYTICS_KEY?.trim() || process.env.NEXT_PUBLIC_ANALYTICS_KEY?.trim();
  return Boolean(key);
}

/**
 * PostHog-compatible capture (or no-op).
 * Endpoint defaults to PostHog US ingest; override with ANALYTICS_ENDPOINT.
 */
export async function captureExternal(payload: CapturePayload): Promise<void> {
  const apiKey = process.env.ANALYTICS_KEY?.trim() || process.env.NEXT_PUBLIC_ANALYTICS_KEY?.trim();
  if (!apiKey) return;

  const endpoint = (process.env.ANALYTICS_ENDPOINT || 'https://us.i.posthog.com/capture/').trim();
  const body = {
    api_key: apiKey,
    event: payload.event,
    distinct_id: payload.distinctId || 'anonymous',
    properties: {
      ...payload.properties,
      $lib: 'medatlas-server',
      source: 'medatlas',
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.warn(JSON.stringify({ kind: 'analytics_capture_failed', status: response.status, event: payload.event }));
  }
}
