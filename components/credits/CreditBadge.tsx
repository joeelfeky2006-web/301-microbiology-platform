'use client';

import { useState } from 'react';
import {
  Zap,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Gift,
  X,
  HeartHandshake,
} from 'lucide-react';
import { useUserCredits, ACTION_COSTS } from '@/lib/credits';
import { cardClass } from '@/lib/ui';

interface CreditBadgeProps {
  compact?: boolean;
  className?: string;
  onOpenSupport?: () => void;
}

export default function CreditBadge({
  compact = false,
  className = '',
  onOpenSupport,
}: CreditBadgeProps) {
  const { credits, toggleBonus } = useUserCredits();
  const [modalOpen, setModalOpen] = useState(false);

  const dailyPercent = Math.round((credits.dailyRemaining / credits.dailyLimit) * 100);
  const monthlyPercent = Math.round((credits.monthlyRemaining / credits.monthlyLimit) * 100);

  const getPillColor = () => {
    if (credits.dailyRemaining === 0) {
      return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300';
    }
    if (credits.dailyRemaining <= 2) {
      return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300';
    }
    return 'border-indigo-200 bg-indigo-50/90 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-cyan-300';
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="View AI Token Credits Balance"
        className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition hover:shadow-xs active:scale-95 ${getPillColor()} ${className}`}
      >
        <Zap className="h-3.5 w-3.5 fill-current text-amber-500 animate-pulse" />
        <span className="font-mono">
          {credits.dailyRemaining}/{credits.dailyLimit}
        </span>
        {!compact && (
          <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-slate-400">
            · {credits.monthlyRemaining} mo
          </span>
        )}
        {credits.examBonusActive && (
          <span className="rounded-full bg-emerald-500 px-1 text-[9px] font-black text-white">
            +20
          </span>
        )}
      </button>

      {/* Credit Balance & Quota Policy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`${cardClass} relative w-full max-w-lg overflow-hidden border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900`}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30">
                <Zap className="h-5 w-5 fill-current text-amber-300" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Student AI Credit Economy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fall 2026 Pilot Protection Layer · Free Tier Rate Control
                </p>
              </div>
            </div>

            {/* Balances Grid */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {/* Daily Quota Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Daily Cap</span>
                  <span className="flex items-center gap-1 text-[10px]">
                    <Clock className="h-3 w-3" /> Resets 00:00 UTC
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                    {credits.dailyRemaining}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    / {credits.dailyLimit} remaining
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${dailyPercent}%` }}
                  />
                </div>
              </div>

              {/* Monthly Quota Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Monthly Allowance</span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    80 Free Credits
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                    {credits.monthlyRemaining}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    / {credits.monthlyLimit} remaining
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${monthlyPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Cost Breakdown */}
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 dark:border-white/10 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-500">
                Action Credit Pricing
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 p-2 text-center dark:border-white/10">
                  <div className="font-mono font-black text-blue-600 dark:text-cyan-300">
                    1 Credit
                  </div>
                  <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                    Lecture Summary &amp; Chat
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-2 text-center dark:border-white/10">
                  <div className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                    2 Credits
                  </div>
                  <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                    5 MCQs &amp; Diagnosis
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-2 text-center dark:border-white/10">
                  <div className="font-mono font-black text-purple-600 dark:text-purple-400">
                    3 Credits
                  </div>
                  <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                    Full Clinical Vignette
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Week Bonus Mode Banner */}
            <div className="mt-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-3 text-xs dark:border-indigo-900/60 dark:from-indigo-950/40 dark:to-blue-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-indigo-600 dark:text-cyan-300" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    Midterm &amp; OSPE Bonus Mode (+20)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleBonus(!credits.examBonusActive)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    credits.examBonusActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-slate-800 dark:text-cyan-300'
                  }`}
                >
                  {credits.examBonusActive ? 'Active ✓ (+20 Credits)' : 'Activate Bonus'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                Grants +20 extra monthly credits and increases daily limit during exam preparation periods.
              </p>
            </div>

            {/* Why Limits Exist Callout */}
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              * The 80-credit quota protects server capacity so all 700 MUST medical students receive zero-lag, real-time responses. If credits are exhausted, all static Lecture PDFs, Audio recordings, and OSPE guides remain 100% accessible.
            </p>

            {/* Support Community CTA */}
            {onOpenSupport && (
              <div className="mt-4 border-t border-slate-200 pt-3 text-center dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    onOpenSupport();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline dark:text-cyan-300"
                >
                  <HeartHandshake className="h-3.5 w-3.5" />
                  <span>Support server &amp; AI token costs for the student body →</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
