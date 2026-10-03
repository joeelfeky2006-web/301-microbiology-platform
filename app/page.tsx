'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
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
  Layers,
  TrendingUp,
  ShoppingBag,
  HeartHandshake,
  Clock3,
} from 'lucide-react';
import { MODULE_TITLES, type Material, type ModuleName } from '@/types';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { cardClass } from '@/lib/ui';
import AdSlot from '@/components/marketing/AdSlot';
import AILearningStudio from '@/components/ai/AILearningStudio';
import DrAtlasChatbot from '@/components/ai/DrAtlasChatbot';
import ModuleProgressTracker from '@/components/dashboard/ModuleProgressTracker';
import SupportModal from '@/components/community/SupportModal';
import { useModuleProgress } from '@/lib/progress';
import { useSettings } from '@/lib/useSettings';
import { authenticatedHeaders } from '@/lib/authHeaders';

const modules: {
  id: ModuleName;
  badge: string;
  hover: string;
  description: string;
  barColor: string;
}[] = [
  {
    id: 'CNS',
    badge:
      'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/80 dark:text-violet-200 dark:ring-violet-600/70',
    hover: 'hover:border-violet-400 dark:hover:border-violet-400 hover:shadow-violet-500/10',
    description:
      'Bacterial & viral meningitis, encephalitis, CSF analysis, and neuro-infectious syndromes.',
    barColor: 'bg-violet-600 dark:bg-violet-500',
  },
  {
    id: 'URS',
    badge:
      'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-200 dark:ring-cyan-600/70',
    hover: 'hover:border-cyan-400 dark:hover:border-cyan-400 hover:shadow-cyan-500/10',
    description:
      'Urinary tract infections (UTIs), acute pyelonephritis, urine culture AST, and nephropathogens.',
    barColor: 'bg-cyan-500 dark:bg-cyan-400',
  },
  {
    id: 'REP',
    badge:
      'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/80 dark:text-rose-200 dark:ring-rose-600/70',
    hover: 'hover:border-rose-400 dark:hover:border-rose-400 hover:shadow-rose-500/10',
    description:
      'Sexually transmitted infections, genital ulcers, TORCH screen, and wet mount diagnostics.',
    barColor: 'bg-rose-500 dark:bg-rose-400',
  },
];

// Staggered entrance animation variants for Framer Motion
const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 240,
    },
  },
};

export default function Home() {
  const { settings } = useSettings();
  const session = useSession();
  const displayName =
    (session?.user?.user_metadata?.name as string | undefined) || session?.user?.email || '';

  // Materials & Progress State
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsUnavailable, setMaterialsUnavailable] = useState(false);
  const { stats } = useModuleProgress(materials);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const [userGroup, setUserGroup] = useState<string>('G1');

  useEffect(() => {
    if (session?.user?.user_metadata?.group_section) {
      setUserGroup(session.user.user_metadata.group_section);
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('student_group_preference');
      if (stored) setUserGroup(stored);
    }
  }, [session]);

  // Clean dashboard view tab: 'modules' (default, uncluttered) | 'progress' | 'ai-studio'
  const [activeTab, setActiveTab] = useState<'modules' | 'progress' | 'ai-studio'>('modules');

  useEffect(() => {
    // Check URL hash if user clicked #ai-studio
    if (typeof window !== 'undefined' && window.location.hash === '#ai-studio') {
      setActiveTab('ai-studio');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMaterials() {
      // Attempt 1: Fetch via /api/materials API endpoint
      try {
        const res = await fetch('/api/materials', {
          headers: await authenticatedHeaders(),
          cache: 'no-store',
        });
        if (res.status === 503) {
          if (!cancelled) {
            setMaterials([]);
            setMaterialsUnavailable(true);
          }
          return;
        }
        if (res.ok) {
          const payload = await res.json();
          if (!cancelled && Array.isArray(payload.materials)) {
            setMaterials(payload.materials);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('/api/materials fetch on home failed, falling back to direct query:', apiErr);
      }

      // Attempt 2: Direct Supabase client query
      try {
        const { data, error } = await supabase
          .from('materials')
          .select('id,module,type,title,subtitle,file_url,format,source_type')
          .order('title', { ascending: true })
          .returns<Material[]>();
        if (!cancelled && !error && data) {
          setMaterials(data);
          return;
        }

        // Attempt 3: Core columns fallback
        const { data: baseData, error: baseErr } = await supabase
          .from('materials')
          .select('id,module,type,title,file_url,format,source_type')
          .order('title', { ascending: true })
          .returns<Material[]>();
        if (!cancelled && !baseErr && baseData) {
          setMaterials(baseData);
        }
      } catch (err) {
        console.error('Failed to load materials on home:', err);
      }
    }
    loadMaterials();
    const handleUpdate = () => loadMaterials();
    window.addEventListener('materials_updated', handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('materials_updated', handleUpdate);
    };
  }, []);

  return (
    <>
      {/* Top Partner Sponsor Banner */}
      <AdSlot placement="banner" variant="revive" />

      <main className="p-4 sm:p-6 md:p-12 pb-28 sm:pb-32 overflow-hidden">
        <div className="mx-auto max-w-5xl space-y-10">
          {/* ======================================================== */}
          {/* REBRANDED HERO HEADER (Framed with Smooth Motion)        */}
          {/* ======================================================== */}
          <motion.header
            initial="hidden"
            animate="visible"
            variants={heroContainerVariants}
            className="mt-2 text-center space-y-5 will-change-transform"
          >
            {/* Tagline Badge */}
            <motion.div variants={heroItemVariants} className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-xs font-bold text-blue-700 shadow-sm transition hover:border-blue-300 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-300" />
                <span>{settings.site_content.home.tagline}</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={heroItemVariants}
              className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl lg:text-6xl"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500">{settings.site_content.home.headline}</span>
            </motion.h1>

            {/* Sub-headline / Tagline with bespoke creative "301" styling */}
            <motion.div
              variants={heroItemVariants}
              className="flex items-center justify-center flex-wrap gap-2 text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-200"
            >
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
            </motion.div>

            {/* Value Proposition Section */}
            <motion.div variants={heroItemVariants} className="mx-auto max-w-3xl pt-1">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 via-white to-slate-50/50 p-5 shadow-sm dark:border-white/10 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950">
                <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                  &ldquo;{settings.site_content.home.description}&rdquo;
                </p>

                {/* Academic Hook Calibration Banner */}
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50/80 px-3 py-1 text-[11px] font-semibold text-indigo-800 ring-1 ring-indigo-200 dark:bg-indigo-950/50 dark:text-cyan-300 dark:ring-indigo-900/60">
                  <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-indigo-600 dark:text-cyan-400" />
                  <span>Built for focused, exam-ready microbiology learning</span>
                </div>

                {/* Core student benefit highlights */}
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-3 border-t border-slate-200/80 dark:border-white/10 text-left">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Zap className="h-4 w-4 flex-shrink-0 text-amber-500" />
                      <span>{settings.site_content.home.features[0]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Stethoscope className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-cyan-400" />
                      <span>{settings.site_content.home.features[1]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Award className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span>{settings.site_content.home.features[2]}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Auth CTA Actions */}
            <motion.div
              variants={heroItemVariants}
              className="flex min-h-[44px] items-center justify-center gap-3 pt-1"
            >
              {session === null && (
                <>
                  <Link
                    href="/sign-in"
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
                  >
                    {settings.site_content.home.ctaPrimary}
                  </Link>
                  {settings.registration_open && <Link
                    href="/sign-up"
                    className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 active:scale-95"
                  >
                    {settings.site_content.home.ctaSecondary}
                  </Link>}
                </>
              )}
              {session && (
                <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span>
                    Signed in as <strong className="text-blue-600 dark:text-cyan-300">{displayName}</strong>
                  </span>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-cyan-950/80 dark:text-cyan-300 ring-1 ring-blue-300 dark:ring-cyan-800">
                    Cohort {userGroup}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.header>

          {/* ======================================================== */}
          {/* DASHBOARD TAB CONTROLS (Keeps Homepage Uncluttered)       */}
          {/* ======================================================== */}
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800">
            <div className="flex gap-1 sm:gap-2 p-1 whitespace-nowrap min-w-max">
              <button
                type="button"
                onClick={() => setActiveTab('modules')}
                className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'modules'
                    ? 'border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Course Modules</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('progress')}
                className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'progress'
                    ? 'border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Study Progress</span>
                {stats.total > 0 && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-black text-blue-800 dark:bg-cyan-900/50 dark:text-cyan-300">
                    {stats.percent}%
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai-studio')}
                className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'ai-studio'
                    ? 'border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Clinical Lab</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: COURSE MODULES (Default, Clean, Uncluttered)       */}
          {/* ======================================================== */}
          {activeTab === 'modules' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {materialsUnavailable && (
                <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Materials are unavailable right now. Please try again in a moment.
                </div>
              )}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      Micro 301 Modules
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Access lecture PDFs, audio recordings (G1/G2), practical manuals, and past exam vaults.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                    CNS · URS · REP
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {modules.map((mod) => {
                    const modMaterialsCount = materials.filter((m) => (m.module || '').toUpperCase() === mod.id).length;
                    const hasData = modMaterialsCount > 0;
                    const modStats = stats.byModule[mod.id];

                    return (
                      <Link key={mod.id} href={`/modules/${mod.id}`} className="h-full">
                        <div
                          className={`${cardClass} group flex h-full cursor-pointer flex-col justify-between p-7 text-center transition-all duration-300 hover:shadow-lg dark:hover:border-slate-700 ${mod.hover}`}
                        >
                          <div>
                            <div
                              className={`font-mono-accent mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold ring-1 transition-transform group-hover:scale-110 ${mod.badge}`}
                            >
                              {mod.id}
                            </div>
                            <div className="flex items-center justify-center gap-1.5 mb-2">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {settings.site_content.modules[mod.id]?.label || MODULE_TITLES[mod.id]}
                              </h3>
                            </div>
                            {!hasData && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 mb-3">
                                <Clock3 className="h-3 w-3" /> Coming Soon
                              </span>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
                              {settings.site_content.modules[mod.id]?.summary || mod.description}
                            </p>

                            {/* Mini live progress indicator on module card if module has active materials */}
                            {hasData && modStats && modStats.total > 0 && (
                              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-left dark:border-slate-800 dark:bg-slate-800/80">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  <span>Completed</span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {modStats.completed}/{modStats.total} ({modStats.percent}%)
                                  </span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                  <div
                                    className={`h-full rounded-full ${mod.barColor} transition-all duration-300`}
                                    style={{ width: `${modStats.percent}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {!hasData && (
                              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  Curriculum currently under preparation
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold transition-all">
                            {hasData ? (
                              <span className="flex items-center gap-1.5 text-blue-600 dark:text-cyan-300 group-hover:gap-2 transition-all">
                                <span>Explore materials</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                <span>Preview module details</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Single Clean Partner Slot */}
              <section>
                <AdSlot variant="revive" placement="inline" />
              </section>

              {/* Mobile & Desktop Student Support Callout Card */}
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200 text-left">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                      <HeartHandshake className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                        Help Keep MedAtlas Fast &amp; Accessible for MUST 301
                      </p>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                        Contributions support Gemini AI token credits &amp; high-speed database bandwidth during exam surges.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSupportModalOpen(true)}
                    className="w-full sm:w-auto flex-shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                  >
                    Support Student Fund →
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: STUDY PROGRESS TRACKER (Interactive Checklist)    */}
          {/* ======================================================== */}
          {activeTab === 'progress' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <ModuleProgressTracker materials={materials} />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: AI STUDY STUDIO (Case Lab & Diagnostics)          */}
          {/* ======================================================== */}
          {activeTab === 'ai-studio' && (
            <div id="ai-studio" className="space-y-6 animate-in fade-in duration-200">
              <AILearningStudio initialModule="URS" />
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* DR. ATLAS AI CHATBOT (Multi-turn Gemini Tutor)            */}
        {/* ======================================================== */}
        <DrAtlasChatbot />

        {/* Global Student Support Modal */}
        <SupportModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
      </main>
    </>
  );
}
