import { FORBIDDEN_ANALYTICS_KEYS } from './events';

const FORBIDDEN = new Set(FORBIDDEN_ANALYTICS_KEYS.map((k) => k.toLowerCase()));

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/** Drop PII / lecture content keys; coerce values to primitives. */
export function sanitizeAnalyticsProps(input: unknown): AnalyticsProps {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN.has(lower) || lower.includes('password') || lower.includes('token') || lower.includes('secret')) {
      continue;
    }
    if (value === null || value === undefined) {
      out[key] = value as null | undefined;
      continue;
    }
    if (typeof value === 'string') {
      out[key] = value.length > 120 ? value.slice(0, 120) : value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}
