'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleGauge, Clock, X, HeartHandshake } from 'lucide-react';
import { authenticatedHeaders } from '@/lib/authHeaders';
import type { CreditSnapshot } from '@/lib/creditsClient';
import { cardClass } from '@/lib/ui';

interface CreditBadgeProps { compact?: boolean; className?: string; onOpenSupport?: () => void }

export default function CreditBadge({ compact = false, className = '', onOpenSupport }: CreditBadgeProps) {
  const [credits, setCredits] = useState<CreditSnapshot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/credits', { headers: await authenticatedHeaders(), cache: 'no-store' });
      if (response.status === 401) return;
      const data = await response.json();
      if (response.ok && data.credits) setCredits(data.credits as CreditSnapshot);
    } catch { /* The server enforces balances even when the badge cannot refresh. */ }
  }, []);

  useEffect(() => {
    void refresh();

    const applyDetail = (detail: unknown) => {
      if (!detail || typeof detail !== 'object') return;
      const snap = detail as Partial<CreditSnapshot>;
      if (typeof snap.daily_remaining !== 'number' || typeof snap.monthly_remaining !== 'number') return;
      setCredits((prev) => ({
        daily_remaining: snap.daily_remaining!,
        monthly_remaining: snap.monthly_remaining!,
        daily_limit: typeof snap.daily_limit === 'number' ? snap.daily_limit : prev?.daily_limit ?? 8,
        monthly_limit: typeof snap.monthly_limit === 'number' ? snap.monthly_limit : prev?.monthly_limit ?? 80,
        bonus_balance: typeof snap.bonus_balance === 'number' ? snap.bonus_balance : prev?.bonus_balance ?? 0,
      }));
    };

    const onCreditsUpdated = (event: Event) => {
      applyDetail((event as CustomEvent).detail);
      void refresh();
      window.setTimeout(() => void refresh(), 350);
      window.setTimeout(() => void refresh(), 1200);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener('credits_updated', onCreditsUpdated);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('credits_updated', onCreditsUpdated);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!modalOpen) return;
    void refresh();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, refresh]);

  if (!credits) return null;
  const dailyPercent = Math.round((credits.daily_remaining / Math.max(1, credits.daily_limit)) * 100);
  const monthlyPercent = Math.round((credits.monthly_remaining / Math.max(1, credits.monthly_limit)) * 100);
  const color = credits.daily_remaining === 0
    ? 'border-rose-200 text-rose-700 dark:border-rose-900/60 dark:text-rose-300'
    : credits.daily_remaining <= 2
      ? 'border-amber-200 text-amber-800 dark:border-amber-900/60 dark:text-amber-300'
      : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200';

  return <>
    <button type="button" onClick={() => setModalOpen(true)} title="View AI credit balance" className={`group flex h-9 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-semibold transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 ${color} ${className}`}>
      <CircleGauge className="h-3.5 w-3.5 opacity-80" strokeWidth={1.75} />
      <span className="font-mono tabular-nums">{credits.daily_remaining}/{credits.daily_limit}</span>
      {!compact && <span className="hidden text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:inline">{credits.monthly_remaining} mo</span>}
      {(credits.bonus_balance || 0) > 0 && (
        <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">+{credits.bonus_balance} pack</span>
      )}
    </button>
    {modalOpen && typeof document !== 'undefined' && createPortal(
      <div onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }} className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-xs">
        <section role="dialog" aria-modal="true" aria-labelledby="credits-dialog-title" className={`${cardClass} relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto overscroll-contain border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-6`}>
          <header className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><CircleGauge className="h-5 w-5" strokeWidth={1.75} /></span><div><h3 id="credits-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">Student AI Credits</h3><p className="text-xs text-slate-500 dark:text-slate-400">Balances refresh from your account</p></div></div>
            <button type="button" onClick={() => setModalOpen(false)} aria-label="Close credit wallet" className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
          </header>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-slate-800/40"><div className="flex justify-between gap-2 text-xs font-semibold text-slate-500"><span>Daily credits</span><span className="flex items-center gap-1 text-[10px]"><Clock className="h-3 w-3" /> Resets at midnight (Egypt)</span></div><div className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">{credits.daily_remaining}<span className="text-xs text-slate-400"> / {credits.daily_limit}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-blue-600" style={{ width: `${dailyPercent}%` }} /></div></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-slate-800/40"><div className="flex justify-between gap-2 text-xs font-semibold text-slate-500"><span>Monthly credits</span><span className="text-[10px]">Resets monthly</span></div><div className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">{credits.monthly_remaining}<span className="text-xs text-slate-400"> / {credits.monthly_limit}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-indigo-600" style={{ width: `${monthlyPercent}%` }} /></div></div>
          </div>
          {(credits.bonus_balance || 0) > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Pack credits</div>
              <div className="mt-1 font-mono text-2xl font-black text-emerald-900 dark:text-emerald-200">+{credits.bonus_balance}</div>
              <p className="mt-1 text-[11px] text-emerald-800/80 dark:text-emerald-300/80">Used after the free daily/monthly allowance runs out.</p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 gap-2 text-center sm:grid-cols-3"><div className="rounded-lg border p-2 text-xs dark:border-white/10"><b>1 credit</b><p>Quiz, summary, or chat</p></div><div className="rounded-lg border p-2 text-xs dark:border-white/10"><b>2 credits</b><p>Case study</p></div><div className="rounded-lg border p-2 text-xs dark:border-white/10"><b>Free</b><p>Question bank</p></div></div>
          {onOpenSupport && <div className="mt-4 border-t border-slate-200 pt-3 text-center dark:border-white/10"><button type="button" onClick={() => { setModalOpen(false); onOpenSupport(); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline dark:text-cyan-300"><HeartHandshake className="h-3.5 w-3.5" /><span>Support server &amp; AI costs →</span></button></div>}
        </section>
      </div>, document.body,
    )}
  </>;
}
