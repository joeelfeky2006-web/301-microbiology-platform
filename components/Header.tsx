'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Shield,
  User,
  HeartHandshake,
  Menu,
  X,
  LogIn,
  UserPlus,
  LogOut,
  Layers,
  GraduationCap,
  Users2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { useRole } from '@/lib/useRole';
import { useSettings } from '@/lib/useSettings';
import type { GroupSection } from '@/types';
import ThemeToggle from './ThemeToggle';
import WhatsAppButton from './WhatsAppButton';
import CreditBadge from './credits/CreditBadge';
import SupportModal from './community/SupportModal';
import { useOnClickOutside } from '@/lib/useOnClickOutside';
import { SHOW_SUPPORT } from '@/lib/siteConfig';

export default function Header() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useSettings();
  const site = settings.site_content;
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const mobileMenu = useRef<HTMLDivElement>(null);
  const modulesMenu = useRef<HTMLDetailsElement>(null);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const [userGroup, setUserGroup] = useState<GroupSection>('G1');
  const { role: userRole } = useRole();

  const closeMobileMenuOutside = useCallback(() => setMobileMenuOpen(false), []);
  const closeModulesOutside = useCallback(() => { if (modulesMenu.current) modulesMenu.current.open = false; }, []);
  const closeAccountOutside = useCallback(() => { if (accountMenu.current) accountMenu.current.open = false; }, []);
  useOnClickOutside(mobileMenu, closeMobileMenuOutside, mobileMenuOpen, menuTrigger);
  useOnClickOutside(modulesMenu, closeModulesOutside);
  useOnClickOutside(accountMenu, closeAccountOutside);

  useEffect(() => {
    if (session?.user?.user_metadata?.group_section) {
      setUserGroup(session.user.user_metadata.group_section as GroupSection);
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('student_group_preference');
      if (stored === 'G1' || stored === 'G2') setUserGroup(stored);
    }
  }, [session]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileMenuOpen(false); menuTrigger.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [mobileMenuOpen]);
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const setGroupPreference = (grp: GroupSection) => {
    setUserGroup(grp);
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_group_preference', grp);
      window.dispatchEvent(new CustomEvent('student_group_changed', { detail: grp }));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const userEmail = session?.user?.email;
  const userName = session?.user?.user_metadata?.name || userEmail?.split('@')[0] || 'Student';
  const hasAdminAccess = userRole === 'super_admin' || userRole === 'editor';

  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded bg-blue-700 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6 md:px-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-base sm:text-lg font-black tracking-tight text-slate-900 transition hover:opacity-90 dark:text-white"
            >
              <img src={site.brand.logo || '/logo.svg'} alt="" width={30} height={30} className="h-7 w-7 rounded object-contain" onError={(e) => { e.currentTarget.src = '/logo.svg'; }} />
              <span>{site.brand.shortName}</span>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-700 dark:border-cyan-800/60 dark:bg-cyan-950/60 dark:text-cyan-300">
                301
              </span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 dark:bg-blue-400/10 dark:text-blue-300">
                Beta
              </span>
            </Link>

            <Link
              href="/#ai-studio"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-cyan-300 dark:hover:bg-slate-800 md:flex transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {site.brand.tagline}
            </Link>
          </div>

          <nav aria-label="Main" className="hidden items-center gap-3 text-xs font-semibold lg:flex">
            {site.navigationOrder.map((key) => {
              if (key === 'modules') return <details ref={modulesMenu} key={key} className="relative"><summary className="cursor-pointer list-none rounded px-2 py-2 text-slate-600 hover:text-blue-700 dark:text-slate-300">{site.navigation.modules} ▾</summary><div className="absolute right-0 top-full z-50 mt-2 grid min-w-48 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900">{([['CNS', site.navigation.cns], ['URS', site.navigation.urs], ['REP', site.navigation.rep]] as const).map(([id, label]) => <Link key={id} href={`/modules/${id}`} className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">{label}</Link>)}</div></details>;
              const href = key === 'home' ? '/' : `/${key}`;
              if ((key === 'about' && !site.pages.about.visible) || (key === 'contact' && !site.pages.contact.visible)) return null;
              return <Link key={key} href={href} aria-current={pathname === href ? 'page' : undefined} className="rounded px-2 py-2 text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 dark:text-slate-300 dark:hover:text-cyan-300">{site.navigation[key]}</Link>;
            })}
          </nav>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* Live Student AI Credits */}
            <CreditBadge onOpenSupport={SHOW_SUPPORT ? () => setSupportModalOpen(true) : undefined} />

            {/* Support Community Link */}
            {SHOW_SUPPORT && <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              title="Support student server hosting & AI tokens"
              className="hidden items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-100 dark:border-emerald-800/80 dark:bg-emerald-950/70 dark:text-emerald-300 active:scale-95 sm:flex"
            >
              <HeartHandshake className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Support Us</span>
            </button>}

            {/* WhatsApp Support Button */}
            <WhatsAppButton />

            {/* Theme Toggle (Dark / Light) */}
            <ThemeToggle />

            {/* Auth Actions: Desktop and Tablet */}
            <div className="hidden min-w-[168px] items-center justify-end gap-2 pl-1 sm:flex border-l border-slate-200 dark:border-slate-800">
              {session === undefined ? (
                <span aria-label="Loading account" className="h-8 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              ) : session === null ? (
                <>
                  <Link
                    href="/sign-in"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Sign up
                  </Link>
                </>
              ) : (
                <details ref={accountMenu} className="group relative">
                  <summary aria-label="Open account menu" className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{userName.charAt(0).toUpperCase()}</span><span className="max-w-20 truncate">{userName}</span>
                  </summary>
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900">
                    <div className="border-b border-slate-200 px-3 py-2 dark:border-white/10"><p className="truncate text-xs font-bold">{userName}</p><p className="truncate text-[11px] text-slate-500">{userEmail}</p></div>
                    <Link href="/profile" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><User className="h-4 w-4" />My Profile</Link>
                    <Link href="/#modules" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Layers className="h-4 w-4" />My Modules</Link>
                    {hasAdminAccess && <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Shield className="h-4 w-4" />Admin</Link>}
                    <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"><LogOut className="h-4 w-4" />Sign out</button>
                  </div>
                </details>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              ref={menuTrigger}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </nav>
        </div>

        {/* Mobile Dropdown Drawer for Phones & Small Tablets */}
        {mobileMenuOpen && (
          <div ref={mobileMenu} id="mobile-navigation" className="sm:hidden border-t border-slate-200/80 bg-white/98 p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950/98 backdrop-blur-lg animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-3.5">
              {/* Signed-in Student Profile Card & Section Selector */}
              {session?.user && (
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 p-3.5 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-extrabold text-white shadow-xs">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {userName}
                        </p>
                        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                          {userEmail}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-cyan-900/60 dark:text-cyan-300">
                      {userRole === 'super_admin' ? 'Super Admin' : userRole === 'editor' ? 'Editor' : 'Student'}
                    </span>
                  </div>

                  {/* Student Cohort / Group Switcher (G1 / G2) */}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-white/80 p-2 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <Users2 className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
                      Active Cohort:
                    </span>
                    <div className="flex gap-1">
                      {(['G1', 'G2'] as const).map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setGroupPreference(grp)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition-all ${
                            userGroup === grp
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/#modules"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center justify-between text-blue-600 dark:text-cyan-300">
                    <Layers className="h-4 w-4" />
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">Modules</span>
                  <span className="text-[10px] text-slate-500">CNS · URS · REP</span>
                </Link>

                <Link
                  href="/#ai-studio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col gap-1 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 hover:bg-indigo-100/50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 transition"
                >
                  <div className="flex items-center justify-between text-indigo-600 dark:text-cyan-300">
                    <Sparkles className="h-4 w-4" />
                    <ChevronRight className="h-3 w-3 text-indigo-400" />
                  </div>
                  <span className="text-xs font-bold text-indigo-900 dark:text-cyan-200">AI Clinical Lab</span>
                  <span className="text-[10px] text-indigo-600/80 dark:text-cyan-300/80">Case Studies & MCQs</span>
                </Link>
              </div>

              <nav aria-label="Main" className="grid grid-cols-2 gap-2 text-sm font-semibold">
                {([[site.navigation.home, '/'], [site.navigation.about, '/about'], [site.navigation.contact, '/contact'], [site.navigation.privacy, '/privacy'], [site.navigation.terms, '/terms'], [site.navigation.copyright, '/copyright']] as const).filter(([, href]) => (href !== '/about' || site.pages.about.visible) && (href !== '/contact' || site.pages.contact.visible) && (href !== '/privacy' || site.pages.privacy.visible) && (href !== '/terms' || site.pages.terms.visible) && (href !== '/copyright' || site.pages.copyright.visible)).map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-slate-200 p-2.5 dark:border-white/10">{label}</Link>)}
              </nav>
              <a href={`https://wa.me/${(settings.whatsapp_number || '').replace(/\D/g, '')}?text=${encodeURIComponent('Hello, I need some info about MedAtlas Egypt.')}`} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-emerald-600 p-3 text-center text-sm font-bold text-white">Need info? WhatsApp</a>

              {/* Module Direct Jump */}
              <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2 text-[11px] font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <span>Jump to Module:</span>
                <div className="flex gap-1.5">
                  {(['URS', 'CNS', 'REP'] as const).map((m) => (
                    <Link
                      key={m}
                      href={`/modules/${m}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-extrabold text-blue-600 shadow-xs hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:text-cyan-300 transition"
                    >
                      {m}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Community Support CTA */}
              {SHOW_SUPPORT && <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSupportModalOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300 transition"
              >
                <span className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Support Student AI Hosting Fund
                </span>
                <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">Chip In →</span>
              </button>}

              {/* Account Controls */}
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                {session === null ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/sign-in"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Sign Up
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
                    >
                      <User className="h-3.5 w-3.5" />
                      My Profile
                    </Link>
                    {hasAdminAccess && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 py-2.5 text-center text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-cyan-950/60 dark:text-cyan-300 transition"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Enter Admin Portal
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Support Community Modal */}
      {SHOW_SUPPORT && <SupportModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />}
    </>
  );
}
