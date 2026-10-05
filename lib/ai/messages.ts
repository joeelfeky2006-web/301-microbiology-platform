import 'server-only';

export const AI_MESSAGES = {
  busy: 'Dr. Atlas is handling a high volume of student questions right now! Take a quick 60-second break, review your notes, and try again.',
  glitch: "Dr. Atlas is catching his breath. Let's give it another try in a moment!",
  limit: "You've used your Atlas Credits for now. They refresh soon, so keep practicing with the question bank in the meantime!",
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
