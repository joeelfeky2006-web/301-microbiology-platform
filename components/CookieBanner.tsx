'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

const COOKIE_STORAGE_KEY = 'medatlas_cookie_consent';

export default function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!consent) {
        // Small delay so it animates in smoothly without layout jitter
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // In case localStorage is blocked in private browsing
    }
  }, []);

  const handleConsent = (accepted: boolean) => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, accepted ? 'accepted' : 'declined');
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <aside
      aria-label="Cookie preferences"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-blue-200/80 bg-white/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Icon & Medical Humorous Copy */}
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:ring-amber-700/60 shadow-xs">
              <Cookie className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                We use cookies to improve your experience. Not the chocolate chip kind unfortunately, just the strictly
                necessary digital ones that keep Dr. Atlas awake and logged in.{' '}
                <Link
                  href="/privacy"
                  className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Read our privacy &amp; data policy
                </Link>
                .
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Essential session tokens &amp; study progress trackers only. No third-party ad trackers.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 items-center gap-2.5 sm:self-center">
            <button
              type="button"
              onClick={() => handleConsent(false)}
              className="flex-1 sm:flex-none rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              No (I&apos;m on a diet)
            </button>
            <button
              type="button"
              onClick={() => handleConsent(true)}
              className="flex-1 sm:flex-none rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 active:scale-95"
            >
              Accept (Give me cookies)
            </button>
            <button
              type="button"
              onClick={() => handleConsent(false)}
              aria-label="Dismiss cookie notice"
              className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
