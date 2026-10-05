'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, HeartHandshake } from 'lucide-react';
import { authenticatedHeaders } from '@/lib/authHeaders';
import { cardClass } from '@/lib/ui';
import AtlasCoin from '@/components/brand/AtlasCoin';

interface CreditBadgeProps { compact?: boolean; className?: string; onOpenSupport?: () => void }
type Credits = { daily_remaining: number; daily_limit: number; monthly_remaining: number; monthly_limit: number };

export default function CreditBadge({ compact = false, className = '', onOpenSupport }: CreditBadgeProps) {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/credits', { headers: await authenticatedHeaders(), cache: 'no-store' });
      if (response.status === 401) return;
      const data = await response.json();
      if (response.ok && data.credits) setCredits(data.credits as Credits);
    } catch { /* The server enforces balances even when the badge cannot refresh. */ }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener('credits_updated', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('credits_updated', refresh); window.removeEventListener('focus', refresh); };
  }, [refresh]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  if (!credits) return null;
  const dailyPercent = Math.round((credits.daily_remaining / Math.max(1, credits.daily_limit)) * 100);
  const monthlyPercent = Math.round((credits.monthly_remaining / Math.max(1, credits.monthly_limit)) * 100);
  const color = credits.daily_remaining === 0
    ? 'border-rose-200 text-rose-700 dark:border-rose-900/60 dark:text-rose-300'
    : credits.daily_remaining <= 2
      ? 'border-amber-200 text-amber-800 dark:border-amber-900/60 dark:text-amber-300'
      : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200';

  return <>
    <button type="button" onClick={() => setModalOpen(true)} title="View your Atlas Credits" aria-label="Atlas Credits balance" className={`group flex h-9 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-semibold transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 ${color} ${className}`}>
      <AtlasCoin className="h-4 w-4" />
      <span className="font-mono tabular-nums">{credits.daily_remaining}/{credits.daily_limit}</span>
      {!compact && <span className="hidden text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:inline">{credits.monthly_remaining} mo</span>}
    </button>
    {modalOpen && typeof document !== 'undefined' && createPortal(
      <div onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }} className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-xs">
        <section role="dialog" aria-modal="true" aria-labelledby="credits-dialog-title" className={`${cardClass} relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto overscroll-contain border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-6`}>
          <header className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3"><AtlasCoin className="h-10 w-10" /><div><h3 id="credits-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">Atlas Credits</h3><p className="text-xs text-slate-500 dark:text-slate-400">Balances refresh from your account</p></div></div>
            <button type="button" onClick={() => setModalOpen(false)} aria-label="Close Atlas Credits" className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
          </header>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-slate-800/40"><div className="flex justify-between gap-2 text-xs font-semibold text-slate-500"><span>Daily credits</span><span className="flex items-center gap-1 text-[10px]"><Clock className="h-3 w-3" /> Reset daily</span></div><div className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">{credits.daily_remaining}<span className="text-xs text-slate-400"> / {credits.daily_limit}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-blue-600" style={{ width: `${dailyPercent}%` }} /></div></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-slate-800/40"><div className="flex justify-between gap-2 text-xs font-semibold text-slate-500"><span>Monthly credits</span><span className="text-[10px]">Resets monthly</span></div><div className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">{credits.monthly_remaining}<span className="text-xs text-slate-400"> / {credits.monthly_limit}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-indigo-600" style={{ width: `${monthlyPercent}%` }} /></div></div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-center sm:grid-cols-3"><div className="rounded-lg border p-2 text-xs dark:border-white/10"><b>1 credit</b><p>Quiz, summary, or chat</p></div><div className="rounded-lg border p-2 text-xs dark:border-white/10"><b>2 credits</b><p>Case study</p></div><div className="rounded-lg border p-2 text-xs dark:border-white/10"><b>Free</b><p>Question bank</p></div></div>
          {onOpenSupport && <div className="mt-4 border-t border-slate-200 pt-3 text-center dark:border-white/10"><button type="button" onClick={() => { setModalOpen(false); onOpenSupport(); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline dark:text-cyan-300"><HeartHandshake className="h-3.5 w-3.5" /><span>Support server &amp; AI costs →</span></button></div>}
        </section>
      </div>, document.body,
    )}
  </>;
}
