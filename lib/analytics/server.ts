import 'server-only';
import type { AnalyticsEventName } from './events';
import { anonymizeUserId } from './identity';
import { analyticsEnabled, captureExternal } from './provider';
import { sanitizeAnalyticsProps, type AnalyticsProps } from './sanitize';

/**
 * Server-side product analytics. Fire-and-forget; never throws.
 * Never pass lecture text, prompts, emails, or secrets in properties.
 */
export function trackServer(
  event: AnalyticsEventName,
  props: AnalyticsProps = {},
  opts: { userId?: string | null } = {},
): void {
  if (!analyticsEnabled()) return;
  void (async () => {
    try {
      const distinctId = await anonymizeUserId(opts.userId);
      await captureExternal({
        event,
        distinctId,
        properties: sanitizeAnalyticsProps({
          ...props,
          env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        }),
      });
    } catch {
      console.warn(JSON.stringify({ kind: 'analytics_track_failed', event }));
    }
  })();
}

export { analyticsEnabled };
