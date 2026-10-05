import 'server-only';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

/** Soft per-user AI request caps (DB-backed via ai_usage counts). */
export const AI_RATE_PER_MINUTE = envInt('AI_RATE_PER_MINUTE', 6);
export const AI_RATE_PER_HOUR = envInt('AI_RATE_PER_HOUR', 60);

export const AI_MAINTENANCE_MESSAGE =
  'Dr. Atlas is resting for a short while. Your study materials are still available!';
