'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Shield, User, HeartHandshake, Zap, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { canAccessAdmin, getUserRole, isSuperAdmin } from '@/lib/admin';
import ThemeToggle from './ThemeToggle';
import WhatsAppButton from './WhatsAppButton';
import CreditBadge from './credits/CreditBadge';
import SupportModal from './community/SupportModal';

export default function Header() {
  const session = useSession();
  const router = useRouter();
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const userEmail = session?.user?.email;
  const userRole = getUserRole(userEmail);
  const hasAdminAccess = canAccessAdmin(userEmail);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6 md:px-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-2 sm:gap-5">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white"
            >
              <span>
                MedAtlas <span className="text-blue-600 dark:text-cyan-300">Egypt</span>
              </span>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-700 dark:border-cyan-800/60 dark:bg-cyan-950/60 dark:text-cyan-300">
                301
              </span>
            </Link>

            <Link
              href="/#ai-studio"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-cyan-300 dark:hover:bg-slate-800 md:flex"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Studio
            </Link>
          </div>

          {/* Navigation Controls across all screen sizes */}
          <nav className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Student AI Credit Economy Badge (Compact on mobile) */}
            <CreditBadge onOpenSupport={() => setSupportModalOpen(true)} />

            {/* Support Community Link — Visible across ALL devices (phone, tablet, laptop) */}
            <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              title="Support student server hosting & AI tokens"
              className="flex items-center gap-1 rounded-full sm:rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-100 dark:border-emerald-800/80 dark:bg-emerald-950/70 dark:text-emerald-300 active:scale-95"
            >
              <HeartHandshake className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="inline sm:hidden">Support</span>
              <span className="hidden sm:inline">Support Us</span>
            </button>

            {/* WhatsApp Quick Link */}
            <WhatsAppButton />

            {/* Theme Toggle (Dark / Light) */}
            <ThemeToggle />

            {/* Auth Actions: Desktop and Tablet */}
            <div className="hidden sm:flex items-center gap-2">
              {session === null && (
                <>
                  <Link
                    href="/sign-in"
                    className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
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
                      className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-cyan-950/50 dark:text-cyan-300 dark:hover:bg-cyan-900/60"
                    >
                      <Shield className="h-3 w-3" />
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={signOut}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </nav>
        </div>

        {/* Mobile Dropdown Drawer for Phones */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-3">
              <Link
                href="/#ai-studio"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl bg-indigo-50 p-2.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-cyan-300"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Study Studio (Case Lab &amp; MCQs)
                </span>
                <span>→</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSupportModalOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <span className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4" />
                  Support Student Server &amp; AI Fund
                </span>
                <span>Chip In →</span>
              </button>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                {session === null ? (
                  <div className="flex gap-2">
                    <Link
                      href="/sign-in"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 rounded-xl bg-blue-600 py-2 text-center text-xs font-bold text-white shadow-xs"
                    >
                      Create Account
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate">{userEmail}</span>
                      <span className="font-bold uppercase text-slate-700 dark:text-slate-300">
                        {userRole}
                      </span>
                    </div>
                    {hasAdminAccess && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-lg bg-blue-50 py-1.5 text-center text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-cyan-300"
                      >
                        Admin Portal
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Support Community Modal */}
      <SupportModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
    </>
  );
}
