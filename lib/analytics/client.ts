'use client';

import type { AnalyticsEventName } from './events';
import { sanitizeAnalyticsProps, type AnalyticsProps } from './sanitize';
import { authenticatedHeaders } from '@/lib/authHeaders';

/**
 * Browser helper — posts to our server ingest (server holds the analytics key).
 * Never put secrets or lecture content in props.
 */
export function trackClient(
  event: AnalyticsEventName,
  props: AnalyticsProps = {},
): void {
  if (typeof window === 'undefined') return;
  const clean = sanitizeAnalyticsProps(props);
  void (async () => {
    try {
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        headers = { ...(await authenticatedHeaders()), 'Content-Type': 'application/json' };
      } catch {
        /* anonymous ok for some events */
      }
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers,
        body: JSON.stringify({ event, properties: clean }),
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  })();
}
