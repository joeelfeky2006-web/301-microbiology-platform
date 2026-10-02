'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, Layers, CheckCircle2, Circle, Check } from 'lucide-react';
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

type Tone = 'blue' | 'emerald' | 'purple';

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
                        <span className={`font-mono-accent w-fit rounded px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${t.badge}`}>
                          {MATERIAL_TYPE_LABELS[mat.type] ?? mat.type}
                        </span>

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

                      {mat.format === 'audio' && <audio controls preload="none" src={mat.file_url} className="mt-3 w-full" />}

                      <a
                        href={mat.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-3 rounded-lg px-3 py-1.5 text-center text-xs font-semibold text-white transition-colors ${t.button}`}
                      >
                        {mat.format === 'audio' ? 'Open audio →' : 'Open file →'}
                      </a>
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
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAIStudio, setShowAIStudio] = useState(false);

  const { isComplete, toggle, stats } = useModuleProgress(materials);
  const currentModStats = stats.byModule[moduleName];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('student_materials')
        .select('id,module,type,title,file_url,format,source_type')
        .eq('module', moduleName)
        .order('title', { ascending: true })
        .returns<Material[]>();
      if (cancelled) return;
      if (error) {
        console.error('Error fetching materials:', error);
        setLoadError(error.message);
      } else {
        setMaterials(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleName]);

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
                · {MODULE_TITLES[moduleName]}
              </span>
            </h1>

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
            Couldn&apos;t load materials right now. Please refresh in a moment.
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">Loading {MODULE_TITLES[moduleName]} resources…</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="space-y-8 lg:col-span-3">
              <Section
                heading="Theory & Lectures"
                tone="blue"
                items={materials.filter((m) => THEORY_TYPES.includes(m.type))}
                emptyText={`No theory materials uploaded yet for ${MODULE_TITLES[moduleName]}.`}
                isComplete={isComplete}
                onToggleComplete={toggle}
              />
              <Section
                heading="Practicals & OSPE"
                tone="emerald"
                items={materials.filter((m) => PRACTICAL_TYPES.includes(m.type))}
                emptyText={`No practical materials uploaded yet for ${MODULE_TITLES[moduleName]}.`}
                isComplete={isComplete}
                onToggleComplete={toggle}
              />
              <Section
                heading="Exam Vault"
                tone="purple"
                items={materials.filter((m) => EXAM_TYPES.includes(m.type))}
                emptyText={`No exam materials uploaded yet for ${MODULE_TITLES[moduleName]}.`}
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
