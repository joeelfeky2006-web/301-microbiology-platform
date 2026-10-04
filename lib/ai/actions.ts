import 'server-only';

/** Central ledger action names (keep in sync with user_credit_history CHECK). */
export const LEDGER_ACTIONS = [
  'quiz-eval',
  'case-study',
  'summarize',
  'chat',
  'unknown',
  'admin_grant',
  'purchase',
  'pack',
  'expiry',
  'adjustment',
] as const;
export type LedgerAction = (typeof LEDGER_ACTIONS)[number];

export const ACTION_COSTS = {
  'quiz-eval': 1,
  summarize: 1,
  chat: 1,
  'case-study': 2,
} as const;
export type AIAction = keyof typeof ACTION_COSTS;

export function isAIAction(action: string): action is AIAction {
  return Object.prototype.hasOwnProperty.call(ACTION_COSTS, action);
}
