'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, Layers, CheckCircle2, Circle, Check, Users2, Clock3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cardClass } from '@/lib/ui';
import {
  EXAM_TYPES,
  MATERIAL_TYPE_LABELS,
  MODULE_TITLES,
  PRACTICAL_TYPES,
  THEORY_TYPES,
  type Material,
  type MaterialCategory,
  type ModuleName,
} from '@/types';
import AdSlot from '@/components/marketing/AdSlot';
import AILearningStudio from '@/components/ai/AILearningStudio';
import { useModuleProgress } from '@/lib/progress';
import MaterialQuiz from '@/components/quiz/MaterialQuiz';
import { useSettings } from '@/lib/useSettings';
import { authenticatedHeaders } from '@/lib/authHeaders';

type Tone = 'blue' | 'emerald' | 'purple';

function isDirectPlayableAudio(url?: string | null, sourceType?: string | null): boolean {
  if (!url) return false;
  // External cloud storage or messaging links require opening externally
  if (sourceType === 'drive' || sourceType === 'telegram' || sourceType === 'external') {
    return false;
  }
  const clean = url.trim().toLowerCase().split('?')[0];
  if (
    clean.includes('drive.google.com') ||
    clean.includes('docs.google.com') ||
    clean.includes('t.me') ||
    clean.includes('telegram.me') ||
    clean.includes('youtube.com') ||
    clean.includes('youtu.be') ||
    clean.includes('dropbox.com') ||
    clean.includes('onedrive.live.com') ||
    clean.includes('1drv.ms') ||
    clean.includes('mega.nz')
  ) {
    return false;
  }
  // Direct Supabase storage file upload
  if (sourceType === 'supabase' || url.includes('/storage/v1/object/public/')) {
    return true;
  }
  // Direct playable audio stream / file extension
  return /\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(clean);
}

const tones: Record<Tone, { bar: string; badge: string; button: string }> = {
  blue: {
    bar: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:ring-blue-700/80',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  emerald: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:ring-emerald-700/80',
    button: 'bg-emerald-600 hover:bg-emerald-700',
  },
  purple: {
    bar: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/80 dark:text-purple-200 dark:ring-purple-700/80',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
};

const TYPE_ORDER = Object.keys(MATERIAL_TYPE_LABELS) as MaterialCategory[];

function groupByTitle(items: Material[]): [string, Material[]][] {
  const groups = new Map<string, Material[]>();
  for (const item of items) {
    const list = groups.get(item.title) ?? [];
    list.push(item);
    groups.set(item.title, list);
  }
  return Array.from(groups.entries()).map(([title, list]) => [
    title,
    [...list].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)),
  ]);
}

function Section({
  heading,
  tone,
  items,
  emptyText,
  isComplete,
  onToggleComplete,
}: {
  heading: string;
  tone: Tone;
  items: Material[];
  emptyText: string;
  isComplete: (id: string) => boolean;
  onToggleComplete: (id: string) => void;
}) {
  const t = tones[tone];
  const groups = groupByTitle(items);

  return (
    <section className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className={`h-6 w-2.5 rounded-full ${t.bar}`} />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{heading}</h2>
      </div>

      {groups.length === 0 ? (
        <p className="italic text-slate-500">{emptyText}</p>
      ) : (
        <div className="grid gap-4">
          {groups.map(([title, materials]) => (
            <div key={title} className={`${cardClass} space-y-4 p-6`}>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="font-mono-accent mt-0.5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {materials.length} file{materials.length === 1 ? '' : 's'} available
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 md:grid-cols-2 lg:grid-cols-3">
                {materials.map((mat) => {
                  const completed = isComplete(mat.id);
                  return (
                    <div
                      key={mat.id}
                      className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                        completed
                          ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/40'
                          : 'border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {mat.type === 'record_g1' ? (
                          <span className="font-mono-accent inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold uppercase ring-1 bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:ring-emerald-700/80">
                            🎧 G1 Audio · Group 1
                          </span>
                        ) : mat.type === 'record_g2' ? (
                          <span className="font-mono-accent inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold uppercase ring-1 bg-purple-100 text-purple-800 ring-purple-300 dark:bg-purple-950/80 dark:text-cyan-300 dark:ring-purple-700/80">
                            🎧 G2 Audio · Group 2
                          </span>
                        ) : mat.type === 'lec_pdf' ? (
                          <span className="font-mono-accent inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold uppercase ring-1 bg-blue-100 text-blue-800 ring-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:ring-blue-700/80">
                            📄 Lecture PDF
                          </span>
                        ) : (
                          <span className={`font-mono-accent w-fit rounded px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${t.badge}`}>
                            {MATERIAL_TYPE_LABELS[mat.type] ?? mat.type}
                          </span>
                        )}

                        {/* Completion Toggle Button */}
                        <button
                          type="button"
                          onClick={() => onToggleComplete(mat.id)}
                          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition active:scale-95 ${
                            completed
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {completed ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <Circle className="h-3 w-3 text-slate-400" />
                              <span>Mark Done</span>
                            </>
                          )}
                        </button>
                      </div>

                      {mat.subtitle && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{mat.subtitle}</p>}

                      {/* Mutually Exclusive Audio Player or External Link */}
                      {mat.format === 'audio' && isDirectPlayableAudio(mat.file_url, mat.source_type) ? (
                        <div className="mt-3">
                          <audio controls preload="none" src={mat.file_url} className="w-full" />
                        </div>
                      ) : (
                        <a
                          href={mat.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-3 block rounded-lg px-3 py-1.5 text-center text-xs font-semibold text-white transition-colors ${t.button}`}
                        >
                          {mat.format === 'audio' ? 'Open audio link ↗' : 'Open file →'}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
              <MaterialQuiz material={materials.find((m) => Boolean(m.raw_quiz_text?.trim() || m.ai_context?.trim())) ?? materials[0]} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ModuleViewer({ moduleName }: { moduleName: ModuleName }) {
  const { settings } = useSettings();
  const moduleTitle = settings.site_content.modules[moduleName]?.label || MODULE_TITLES[moduleName];
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAIStudio, setShowAIStudio] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<'ALL' | 'G1' | 'G2'>('ALL');

  const { isComplete, toggle, stats } = useModuleProgress(materials);
  const currentModStats = stats.byModule[moduleName];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('student_group_preference');
      if (stored === 'G1' || stored === 'G2') {
        setSelectedCohort(stored);
      }
      const handleGroupChange = (e: any) => {
        if (e.detail === 'G1' || e.detail === 'G2') {
          setSelectedCohort(e.detail);
        }
      };
      window.addEventListener('student_group_changed', handleGroupChange);
      return () => window.removeEventListener('student_group_changed', handleGroupChange);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');

      // Attempt 1: Fast cached /api/materials API endpoint (handles guest RLS and module casing)
      try {
        const res = await fetch(`/api/materials?module=${encodeURIComponent(moduleName)}`, {
          headers: await authenticatedHeaders(),
          cache: 'no-store',
        });
        if (res.status === 503) {
          if (!cancelled) {
            setMaterials([]);
            setLoadError('Materials are unavailable right now');
            setLoading(false);
          }
          return;
        }
        if (res.ok) {
          const payload = await res.json();
          if (!cancelled && Array.isArray(payload.materials)) {
            setMaterials(payload.materials);
            setLoading(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('API /api/materials fetch failed, falling back to direct client query:', apiErr);
      }

      // Attempt 2: Direct Supabase client fallback
      try {
        const { data, error } = await (supabase.from('materials') as any)
          .select('id,module,type,title,subtitle,file_url,format,source_type')
          .or(`module.eq.${moduleName},module.eq.${moduleName.toLowerCase()}`)
          .order('title', { ascending: true });

        if (cancelled) return;
        if (error) {
          // Attempt 3: Base columns if subtitle is restricted
          const { data: baseData, error: baseErr } = await (supabase.from('materials') as any)
            .select('id,module,type,title,file_url,format,source_type')
            .or(`module.eq.${moduleName},module.eq.${moduleName.toLowerCase()}`)
            .order('title', { ascending: true });

          if (baseErr) {
            console.error('Error fetching materials:', error, baseErr);
            setLoadError('Materials are unavailable right now');
          } else {
            setMaterials((baseData as Material[]) ?? []);
          }
        } else {
          setMaterials((data as Material[]) ?? []);
        }
      } catch (err: unknown) {
        console.error('Error fetching materials:', err);
        if (!cancelled) setLoadError('Materials are unavailable right now');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleName]);

  const categorizedTypes = new Set<MaterialCategory>([...THEORY_TYPES, ...PRACTICAL_TYPES, ...EXAM_TYPES]);

  return (
    <main className="p-4 sm:p-6 md:p-12">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Module Header with Live Progress */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link href="/" className="text-xs font-semibold text-blue-600 hover:underline dark:text-cyan-300">
              ← Back to Main Dashboard
            </Link>
            <h1 className="mt-1 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {moduleName}{' '}
              <span className="font-normal text-slate-400 dark:text-slate-500">
                · {moduleTitle}
              </span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{settings.site_content.modules[moduleName]?.summary}</p>

            {/* Module Completion Indicator */}
            {currentModStats && currentModStats.total > 0 && (
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Module Progress:
                </span>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${currentModStats.percent}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {currentModStats.completed}/{currentModStats.total} ({currentModStats.percent}%)
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAIStudio(!showAIStudio)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-cyan-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {showAIStudio ? 'Hide AI Study Studio' : `Launch ${moduleName} AI Case Lab`}
          </button>
        </div>

        {/* AI Study Studio embedded drawer */}
        {showAIStudio && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <AILearningStudio initialModule={moduleName} embedded />
          </div>
        )}

        {loadError && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            Materials are unavailable right now. Please refresh in a moment.
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">Loading {moduleTitle} resources…</p>
        ) : materials.length === 0 ? (
          <div className={`${cardClass} mx-auto max-w-2xl p-8 sm:p-12 text-center space-y-4`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200 dark:bg-indigo-950/60 dark:text-cyan-300 dark:ring-indigo-800">
              <Clock3 className="h-8 w-8" />
            </div>
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-800 dark:bg-indigo-900/60 dark:text-cyan-300">
              Curriculum in Preparation
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {moduleTitle} ({moduleName}) Coming Soon
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
              Course materials, lecture recordings, practical OSPE slides, and question vaults for the{' '}
              <strong>{moduleTitle}</strong> module are currently being curated and uploaded by the academic staff.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/modules/URS"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                View Active URS Materials →
              </Link>
              <button
                type="button"
                onClick={() => setShowAIStudio(true)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 transition"
              >
                Practice with AI Case Lab
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="space-y-8 lg:col-span-3">
              {/* Student Cohort Selector Bar (G1 / G2) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 p-4 dark:border-blue-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                    <Users2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Student Cohort Tracks: G1 &amp; G2
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Filter audio lecture recordings for your section (Group 1 vs Group 2)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-800">
                  {(['ALL', 'G1', 'G2'] as const).map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => {
                        setSelectedCohort(grp);
                        if (typeof window !== 'undefined' && grp !== 'ALL') {
                          localStorage.setItem('student_group_preference', grp);
                        }
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                        selectedCohort === grp
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {grp === 'ALL' ? 'All (G1 + G2)' : `Group ${grp}`}
                    </button>
                  ))}
                </div>
              </div>

              <Section
                heading="Theory & Lectures"
                tone="blue"
                items={materials.filter((m) => {
                  if (!THEORY_TYPES.includes(m.type)) return false;
                  if (selectedCohort === 'G1' && m.type === 'record_g2') return false;
                  if (selectedCohort === 'G2' && m.type === 'record_g1') return false;
                  return true;
                })}
                emptyText={
                  selectedCohort !== 'ALL'
                    ? `No theory materials uploaded for Group ${selectedCohort} yet in ${moduleTitle}.`
                    : `No theory materials uploaded yet for ${moduleTitle}.`
                }
                isComplete={isComplete}
                onToggleComplete={toggle}
              />
              <Section
                heading="Practicals & OSPE"
                tone="emerald"
                items={materials.filter((m) => PRACTICAL_TYPES.includes(m.type))}
                emptyText={`No practical materials uploaded yet for ${moduleTitle}.`}
                isComplete={isComplete}
                onToggleComplete={toggle}
              />
              <Section
                heading="Exam Vault"
                tone="purple"
                items={materials.filter((m) => EXAM_TYPES.includes(m.type))}
                emptyText={`No exam materials uploaded yet for ${moduleTitle}.`}
                isComplete={isComplete}
                onToggleComplete={toggle}
              />
              <Section
                heading="Other Resources"
                tone="blue"
                items={materials.filter((m) => !categorizedTypes.has(m.type))}
                emptyText="No other resources are available for this module."
                isComplete={isComplete}
                onToggleComplete={toggle}
              />
            </div>

            {/* Sidebar with Medova Sponsor Widget & Quick Links */}
            <div className="space-y-6 lg:col-span-1">
              <AdSlot placement="sidebar" />

              <div className={`${cardClass} p-5 space-y-3`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {moduleName} Quick Actions
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAIStudio(true)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    AI Clinical Cases
                  </span>
                  <span>→</span>
                </button>
                <Link
                  href="/admin"
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-500" />
                    Upload / Edit Materials
                  </span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
