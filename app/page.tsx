'use client';

import Link from 'next/link';
import { MODULE_TITLES, type ModuleName } from '@/types';
import { useSession } from '@/lib/useSession';
import { cardClass } from '@/lib/ui';

const modules: { id: ModuleName; badge: string; hover: string }[] = [
  {
    id: 'CNS',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30',
    hover: 'hover:border-violet-400 dark:hover:border-violet-400/60',
  },
  {
    id: 'URS',
    badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30',
    hover: 'hover:border-cyan-400 dark:hover:border-cyan-400/60',
  },
  {
    id: 'REP',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30',
    hover: 'hover:border-rose-400 dark:hover:border-rose-400/60',
  },
];

export default function Home() {
  const session = useSession();
  const displayName =
    (session?.user.user_metadata?.name as string | undefined) || session?.user.email || '';

  return (
    <main className="p-6 md:p-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 mt-6 text-center">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-5xl">
            301 Microbiology <span className="text-blue-600 dark:text-cyan-300">Portal</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Select a module below to access lecture PDFs, G1/G2 audio records, and practical materials.
          </p>

          <div className="mt-6 flex min-h-[44px] items-center justify-center gap-3">
            {session === null && (
              <>
                <Link href="/sign-in" className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Create account
                </Link>
              </>
            )}
            {session && (
              <p className="text-slate-600 dark:text-slate-300">
                Welcome back, <span className="font-semibold">{displayName}</span>
              </p>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {modules.map((mod) => (
            <Link key={mod.id} href={`/modules/${mod.id}`} className="h-full">
              <div
                className={`${cardClass} group flex h-full cursor-pointer flex-col items-center p-8 text-center transition-all duration-300 hover:shadow-lg ${mod.hover}`}
              >
                <div
                  className={`font-mono-accent mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold ring-1 transition-transform group-hover:scale-110 ${mod.badge}`}
                >
                  {mod.id}
                </div>
                <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{MODULE_TITLES[mod.id]}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  {session === null ? 'Sign in to open this module' : 'View theory, practicals & exam vault'} &rarr;
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}