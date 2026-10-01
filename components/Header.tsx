'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { isAdminEmail } from '@/lib/admin';
import ThemeToggle from './ThemeToggle';
import WhatsAppButton from './WhatsAppButton';

export default function Header() {
  const session = useSession();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-lab-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Micro <span className="text-blue-600 dark:text-cyan-300">Atlas</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <WhatsAppButton />
          <ThemeToggle />

          {session === null && (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="hidden rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 sm:inline-block"
              >
                Sign up
              </Link>
            </>
          )}

          {session && (
            <>
              {isAdminEmail(session.user.email) && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:text-cyan-300 dark:hover:bg-white/10"
                >
                  Admin
                </Link>
              )}
              <span className="hidden max-w-[10rem] truncate text-sm text-slate-500 dark:text-slate-300 md:inline">
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}