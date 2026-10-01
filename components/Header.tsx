'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Shield, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { canAccessAdmin, getUserRole, isSuperAdmin } from '@/lib/admin';
import ThemeToggle from './ThemeToggle';
import WhatsAppButton from './WhatsAppButton';

export default function Header() {
  const session = useSession();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const userEmail = session?.user?.email;
  const userRole = getUserRole(userEmail);
  const hasAdminAccess = canAccessAdmin(userEmail);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-lab-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            <span>MedAtlas <span className="text-blue-600 dark:text-cyan-300">Egypt</span></span>
            <span className="hidden sm:inline-flex rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-cyan-300">
              Micro 301
            </span>
          </Link>

          <Link
            href="/#ai-studio"
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-cyan-300 dark:hover:bg-white/10 md:flex"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Study Studio
          </Link>
        </div>

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
              {hasAdminAccess && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-cyan-950/50 dark:text-cyan-300 dark:hover:bg-cyan-900/60"
                >
                  <Shield className="h-3 w-3" />
                  Admin CMS
                </Link>
              )}

              <div className="hidden items-center gap-1.5 lg:flex">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {userRole.replace('_', ' ')}
                </span>
                <span className="max-w-[8rem] truncate text-xs text-slate-500 dark:text-slate-400">
                  {userEmail}
                </span>
              </div>

              <button
                type="button"
                onClick={signOut}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
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
