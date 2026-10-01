'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UserCredits {
  dailyRemaining: number;
  dailyLimit: number;
  monthlyRemaining: number;
  monthlyLimit: number;
  lastDailyReset: string; // YYYY-MM-DD
  lastMonthlyReset: string; // YYYY-MM
  examBonusActive: boolean;
}

export type AIActionType = 'summary' | 'mcq' | 'case_study' | 'chat';

export const ACTION_COSTS: Record<AIActionType, number> = {
  summary: 1,      // Lecture summary / flash review
  mcq: 2,          // 5 MCQs / Practice Quiz Evaluation
  case_study: 3,   // Full Clinical Vignette & Lab Reasoning
  chat: 1,         // Dr. Atlas multi-turn clinical tutor query
};

export const DEFAULT_CREDIT_POLICY = {
  dailyLimit: 8,
  monthlyLimit: 80,
  examBonusCredits: 20,
};

const CREDITS_STORAGE_KEY = 'medatlas_student_ai_credits';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}

export function getLocalCredits(): UserCredits {
  if (typeof window === 'undefined') {
    return {
      dailyRemaining: DEFAULT_CREDIT_POLICY.dailyLimit,
      dailyLimit: DEFAULT_CREDIT_POLICY.dailyLimit,
      monthlyRemaining: DEFAULT_CREDIT_POLICY.monthlyLimit,
      monthlyLimit: DEFAULT_CREDIT_POLICY.monthlyLimit,
      lastDailyReset: getTodayString(),
      lastMonthlyReset: getCurrentMonthString(),
      examBonusActive: false,
    };
  }

  try {
    const raw = localStorage.getItem(CREDITS_STORAGE_KEY);
    const today = getTodayString();
    const currentMonth = getCurrentMonthString();

    if (raw) {
      const parsed: UserCredits = JSON.parse(raw);

      let needsSave = false;

      // Check daily reset (midnight)
      if (parsed.lastDailyReset !== today) {
        parsed.dailyRemaining = parsed.dailyLimit;
        parsed.lastDailyReset = today;
        needsSave = true;
      }

      // Check monthly reset
      if (parsed.lastMonthlyReset !== currentMonth) {
        parsed.monthlyRemaining = parsed.monthlyLimit;
        parsed.lastMonthlyReset = currentMonth;
        needsSave = true;
      }

      if (needsSave) {
        localStorage.setItem(CREDITS_STORAGE_KEY, JSON.stringify(parsed));
      }

      return parsed;
    }
  } catch (err) {
    console.error('Error reading credits:', err);
  }

  // Initial fresh allocation
  const initial: UserCredits = {
    dailyRemaining: DEFAULT_CREDIT_POLICY.dailyLimit,
    dailyLimit: DEFAULT_CREDIT_POLICY.dailyLimit,
    monthlyRemaining: DEFAULT_CREDIT_POLICY.monthlyLimit,
    monthlyLimit: DEFAULT_CREDIT_POLICY.monthlyLimit,
    lastDailyReset: getTodayString(),
    lastMonthlyReset: getCurrentMonthString(),
    examBonusActive: false,
  };

  try {
    localStorage.setItem(CREDITS_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }

  return initial;
}

export function saveLocalCredits(credits: UserCredits): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CREDITS_STORAGE_KEY, JSON.stringify(credits));
    window.dispatchEvent(new Event('credits_updated'));
  } catch (err) {
    console.error('Failed to save credits:', err);
  }
}

/** Check if user has sufficient credits for an action without deducting */
export function checkHasCredits(action: AIActionType): {
  allowed: boolean;
  cost: number;
  reason?: 'daily_cap' | 'monthly_cap';
} {
  const credits = getLocalCredits();
  const cost = ACTION_COSTS[action] ?? 1;

  if (credits.dailyRemaining < cost) {
    return { allowed: false, cost, reason: 'daily_cap' };
  }
  if (credits.monthlyRemaining < cost) {
    return { allowed: false, cost, reason: 'monthly_cap' };
  }
  return { allowed: true, cost };
}

/** Deduct credits locally and dispatch reactive update */
export function deductLocalCredits(action: AIActionType): {
  success: boolean;
  cost: number;
  remainingDaily: number;
  remainingMonthly: number;
  reason?: 'daily_cap' | 'monthly_cap';
} {
  const credits = getLocalCredits();
  const cost = ACTION_COSTS[action] ?? 1;

  if (credits.dailyRemaining < cost) {
    return {
      success: false,
      cost,
      remainingDaily: credits.dailyRemaining,
      remainingMonthly: credits.monthlyRemaining,
      reason: 'daily_cap',
    };
  }

  if (credits.monthlyRemaining < cost) {
    return {
      success: false,
      cost,
      remainingDaily: credits.dailyRemaining,
      remainingMonthly: credits.monthlyRemaining,
      reason: 'monthly_cap',
    };
  }

  credits.dailyRemaining = Math.max(0, credits.dailyRemaining - cost);
  credits.monthlyRemaining = Math.max(0, credits.monthlyRemaining - cost);
  saveLocalCredits(credits);

  return {
    success: true,
    cost,
    remainingDaily: credits.dailyRemaining,
    remainingMonthly: credits.monthlyRemaining,
  };
}

/** Refund credits in case of API failure */
export function refundLocalCredits(cost: number): void {
  const credits = getLocalCredits();
  credits.dailyRemaining = Math.min(credits.dailyLimit, credits.dailyRemaining + cost);
  credits.monthlyRemaining = Math.min(credits.monthlyLimit, credits.monthlyRemaining + cost);
  saveLocalCredits(credits);
}

/** Activate Exam-Week Mode (+20 bonus credits) */
export function toggleExamWeekBonus(activate: boolean): void {
  const credits = getLocalCredits();
  if (activate && !credits.examBonusActive) {
    credits.examBonusActive = true;
    credits.monthlyLimit += DEFAULT_CREDIT_POLICY.examBonusCredits;
    credits.monthlyRemaining += DEFAULT_CREDIT_POLICY.examBonusCredits;
    credits.dailyLimit += 4; // bonus 4/day during exam week
    credits.dailyRemaining += 4;
  } else if (!activate && credits.examBonusActive) {
    credits.examBonusActive = false;
    credits.monthlyLimit = DEFAULT_CREDIT_POLICY.monthlyLimit;
    credits.monthlyRemaining = Math.min(DEFAULT_CREDIT_POLICY.monthlyLimit, credits.monthlyRemaining);
    credits.dailyLimit = DEFAULT_CREDIT_POLICY.dailyLimit;
    credits.dailyRemaining = Math.min(DEFAULT_CREDIT_POLICY.dailyLimit, credits.dailyRemaining);
  }
  saveLocalCredits(credits);
}

/** React hook for real-time live credit balances */
export function useUserCredits() {
  const [credits, setCredits] = useState<UserCredits>(getLocalCredits());

  const sync = useCallback(() => {
    setCredits(getLocalCredits());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('credits_updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('credits_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [sync]);

  return {
    credits,
    checkCredits: checkHasCredits,
    deductCredits: deductLocalCredits,
    refundCredits: refundLocalCredits,
    toggleBonus: toggleExamWeekBonus,
  };
}
