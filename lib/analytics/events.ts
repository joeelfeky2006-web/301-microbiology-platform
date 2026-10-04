/** Allowlisted product analytics events — extend here, not ad hoc in call sites. */
export const ANALYTICS_EVENTS = [
  'signup',
  'login',
  'lecture_opened',
  'ai_request',
  'ai_request_success',
  'ai_request_error',
  'mcq_generated',
  'summary_generated',
  'chat_started',
  'credits_used',
  'package_viewed',
  'checkout_started',
  'purchase_completed',
  'feedback_submitted',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === 'string' && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

/** Properties that must never leave the app via analytics. */
export const FORBIDDEN_ANALYTICS_KEYS = [
  'email',
  'password',
  'token',
  'authorization',
  'api_key',
  'apikey',
  'secret',
  'prompt',
  'message',
  'reply',
  'answer',
  'answers',
  'ai_context',
  'context',
  'source',
  'lecture_text',
  'raw_quiz_text',
  'raw_flashcard_text',
  'explanation',
  'content',
  'body',
  'name',
  'phone',
  'university_id',
] as const;
