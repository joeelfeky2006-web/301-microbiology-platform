import 'server-only';

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
