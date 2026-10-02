import { HeartPulse } from 'lucide-react';

export default function QuizComfortCard() {
  return (
    <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-indigo-50 p-6 text-center shadow-sm dark:border-cyan-900/60 dark:from-slate-900 dark:to-indigo-950/40">
      <HeartPulse className="mx-auto h-8 w-8 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
        No practice questions available for this lecture just yet! Take a breath, review your lecture notes, and keep crushing your study goals. You&apos;ve got this! 🩺✨
      </p>
    </div>
  );
}
