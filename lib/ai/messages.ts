import 'server-only';

export const AI_MESSAGES = {
  busy: "Dr. Atlas is catching his breath. Let's give it another try in a moment!",
  glitch: "Dr. Atlas hit a temporary error. Your credit is refunded if one was charged — try again in a moment.",
  limit: "You've used your Atlas Credits for now. They refresh soon, so keep practicing with the question bank in the meantime!",
  auth: 'Please sign in to continue with Dr. Atlas.',
  fallback: 'No practice questions are available for this lecture yet.',
  unavailable: 'This study feature is temporarily unavailable. Please try again shortly.',
  maintenance: 'Dr. Atlas is resting for a short while. Your study materials are still available!',
} as const;

export function aiError(kind: keyof typeof AI_MESSAGES, status: number) {
  return Response.json({ ok: false, kind, message: AI_MESSAGES[kind] }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
