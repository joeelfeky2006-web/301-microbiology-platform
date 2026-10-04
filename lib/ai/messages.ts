import 'server-only';

export const AI_MESSAGES = {
  busy: 'AI provider is temporarily rate-limited (high traffic). This is not a platform bug — wait about 60 seconds and try again.',
  glitch: "Dr. Atlas hit a temporary error. Your credit is refunded if one was charged — try again in a moment.",
  limit: "You've used your AI credits for now. They refresh soon, so keep practicing with the question bank in the meantime!",
  auth: 'Please sign in to continue with Dr. Atlas.',
  fallback: 'No practice questions are available for this lecture yet.',
  unavailable: 'This study feature is temporarily unavailable. Please try again shortly.',
} as const;

export function aiError(kind: keyof typeof AI_MESSAGES, status: number) {
  return Response.json({ ok: false, kind, message: AI_MESSAGES[kind] }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
