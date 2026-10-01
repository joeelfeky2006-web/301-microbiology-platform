'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Shield,
  GraduationCap,
  BookOpen,
  Stethoscope,
  ArrowRight,
  Zap,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { MODULE_TITLES, type ModuleName } from '@/types';
import { useSession } from '@/lib/useSession';
import { cardClass } from '@/lib/ui';
import AdSlot from '@/components/marketing/AdSlot';
import AILearningStudio from '@/components/ai/AILearningStudio';

const modules: { id: ModuleName; badge: string; hover: string; description: string }[] = [
  {
    id: 'CNS',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30',
    hover: 'hover:border-violet-400 dark:hover:border-violet-400/60',
    description: 'Bacterial & viral meningitis, encephalitis, CSF analysis, and neuro-infectious syndromes.',
  },
  {
    id: 'URS',
    badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/30',
    hover: 'hover:border-cyan-400 dark:hover:border-cyan-400/60',
    description: 'Urinary tract infections (UTIs), acute pyelonephritis, urine culture AST, and nephropathogens.',
  },
  {
    id: 'REP',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30',
    hover: 'hover:border-rose-400 dark:hover:border-rose-400/60',
    description: 'Sexually transmitted infections, genital ulcers, TORCH screen, and wet mount diagnostics.',
  },
];

export default function Home() {
  const session = useSession();
  const displayName =
    (session?.user?.user_metadata?.name as string | undefined) || session?.user?.email || '';

  // State to easily demo/toggle marketing slot variant if desired
  const [activeInlineVariant, setActiveInlineVariant] = useState<'revive' | 'academic' | 'both'>('both');

  return (
    <>
      {/* Top Partner Sponsor Banner */}
      <AdSlot placement="banner" variant="revive" />

      <main className="p-4 sm:p-6 md:p-12">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* ======================================================== */}
          {/* REBRANDED HERO HEADER (Targeting Medical Students)      */}
          {/* ======================================================== */}
          <header className="mt-4 text-center space-y-5">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1 text-xs font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-cyan-300 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-300" />
              <span>MedAtlas Egypt Academic Network</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl lg:text-6xl">
              MedAtlas Egypt:{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500">
                Next-Gen AI Training
              </span>{' '}
              for Medical Students.
            </h1>

            {/* Sub-headline / Tagline with bespoke creative "301" styling */}
            <div className="flex items-center justify-center flex-wrap gap-2 text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-200">
              <span className="tracking-tight text-slate-900 dark:text-white">Micro</span>

              {/* Distinct visual styling for "301" */}
              <span className="relative inline-flex items-center px-3.5 py-0.5 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 font-mono text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white shadow-lg shadow-blue-500/25 ring-2 ring-cyan-300/40 dark:ring-cyan-400/40 transform -rotate-1 hover:rotate-0 transition-transform">
                301
                {/* Microscopic glowing accent dot */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-300"></span>
                </span>
              </span>

              <span className="font-serif italic font-normal text-slate-500 dark:text-slate-400">
                — Culturing Curiosity
              </span>
            </div>

            {/* Value Proposition Section */}
            <div className="mx-auto max-w-3xl pt-2">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 via-white to-slate-50/50 p-5 shadow-sm dark:border-white/10 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950">
                <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                  &ldquo;A time-efficient, AI-driven platform built specifically to help medical students master complex infectious diseases and excel in their exams.&rdquo;
                </p>

                {/* Core student benefit highlights */}
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-3 border-t border-slate-200/80 dark:border-white/10 text-left">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Zap className="h-4 w-4 flex-shrink-0 text-amber-500" />
                    <span>Time-Efficient High-Yield Notes</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Stethoscope className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-cyan-400" />
                    <span>Bedside AI Case Vignettes</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Award className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span>BRS &amp; Guyton Reference Prep</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Auth CTA Actions */}
            <div className="flex min-h-[44px] items-center justify-center gap-3 pt-2">
              {session === null && (
                <>
                  <Link
                    href="/sign-in"
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
                  >
                    Sign in to Portal
                  </Link>
                  <Link
                    href="/sign-up"
                    className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 active:scale-95"
                  >
                    Create Account
                  </Link>
                </>
              )}
              {session && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span>
                    Signed in as <strong className="text-blue-600 dark:text-cyan-300">{displayName}</strong>
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* ======================================================== */}
          {/* COURSE MODULES GRID                                      */}
          {/* ======================================================== */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Micro 301 Modules
                </h2>
                <p className="text-xs text-slate-500">
                  Select a module to access lecture PDFs, G1/G2 audio records, practicals, and past exam vaults.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                CNS · URS · REP
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {modules.map((mod) => (
                <Link key={mod.id} href={`/modules/${mod.id}`} className="h-full">
                  <div
                    className={`${cardClass} group flex h-full cursor-pointer flex-col justify-between p-8 text-center transition-all duration-300 hover:shadow-lg ${mod.hover}`}
                  >
                    <div>
                      <div
                        className={`font-mono-accent mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold ring-1 transition-transform group-hover:scale-110 ${mod.badge}`}
                      >
                        {mod.id}
                      </div>
                      <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                        {MODULE_TITLES[mod.id]}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-4 dark:border-white/5 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 dark:text-cyan-300 group-hover:gap-2 transition-all">
                      <span>Explore materials</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ======================================================== */}
          {/* INLINE MARKETING SLOTS (AdSlot.tsx)                       */}
          {/* Variant 1: Revive Medical Wear | Variant 2: Academic Prep */}
          {/* ======================================================== */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Featured Partnerships &amp; Clinical Prep
                </span>
              </div>

              {/* Variant Demo Switcher */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs dark:border-white/10 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveInlineVariant('both')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activeInlineVariant === 'both'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Show Both
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInlineVariant('revive')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activeInlineVariant === 'revive'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Revive Scrubs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInlineVariant('academic')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activeInlineVariant === 'academic'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Academic Prep
                </button>
              </div>
            </div>

            {/* Display based on selection */}
            {activeInlineVariant === 'both' && (
              <div className="grid grid-cols-1 gap-6">
                {/* Variant 1: Revive Medical Wear */}
                <AdSlot variant="revive" placement="inline" />
                {/* Variant 2: Academic & Clinical Prep */}
                <AdSlot variant="academic" placement="inline" />
              </div>
            )}

            {activeInlineVariant === 'revive' && (
              <AdSlot variant="revive" placement="inline" />
            )}

            {activeInlineVariant === 'academic' && (
              <AdSlot variant="academic" placement="inline" />
            )}
          </section>

          {/* ======================================================== */}
          {/* AI MICROBIOLOGY STUDY STUDIO SECTION                     */}
          {/* ======================================================== */}
          <div id="ai-studio" className="pt-2">
            <AILearningStudio initialModule="URS" />
          </div>
        </div>
      </main>
    </>
  );
}
