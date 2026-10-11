'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type Accent = 'indigo' | 'teal';

const accents: Record<Accent, { shell: string; title: string; chevron: string }> = {
  indigo: {
    shell: 'border-indigo-200 bg-white dark:border-indigo-900/50 dark:bg-slate-900',
    title: 'text-slate-900 dark:text-white',
    chevron: 'text-indigo-600 dark:text-indigo-300',
  },
  teal: {
    shell: 'border-teal-200 bg-gradient-to-br from-teal-50/80 to-white dark:border-teal-900/40 dark:from-teal-950/30 dark:to-slate-900',
    title: 'text-teal-900 dark:text-teal-200',
    chevron: 'text-teal-700 dark:text-teal-300',
  },
};

/** Compact open/close shell for lecture study tools (quiz, flashcards). */
export default function CollapsiblePanel({
  title,
  subtitle,
  meta,
  accent = 'indigo',
  defaultOpen = false,
  /** Keep expanded (e.g. mid-quiz / mid-study). */
  forceOpen = false,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  meta?: ReactNode;
  accent?: Accent;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = forceOpen || open;
  const tone = accents[accent];

  return (
    <div className={`mt-4 overflow-hidden rounded-xl border ${tone.shell}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          if (forceOpen) return;
          setOpen((v) => !v);
        }}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
          forceOpen ? 'cursor-default' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className={`flex flex-wrap items-center gap-2 text-sm font-bold ${tone.title}`}>
            {title}
            {meta}
          </div>
          {subtitle && !isOpen && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {!forceOpen && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${tone.chevron} ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        )}
      </button>
      {isOpen && <div className="border-t border-black/5 px-4 pb-4 pt-3 dark:border-white/10">{children}</div>}
    </div>
  );
}
