'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  FileText,
  Volume2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { cardClass } from '@/lib/ui';
import { MODULE_TITLES, MATERIAL_TYPE_LABELS, type Material, type ModuleName } from '@/types';
import { useModuleProgress } from '@/lib/progress';

interface ModuleProgressTrackerProps {
  materials: Material[];
  className?: string;
}

const MODULE_ACCENTS: Record<
  ModuleName,
  {
    barColor: string;
    bgTrack: string;
    textColor: string;
    badgeBg: string;
    border: string;
  }
> = {
  CNS: {
    barColor: 'bg-violet-600',
    bgTrack: 'bg-violet-100 dark:bg-violet-950/60',
    textColor: 'text-violet-700 dark:text-violet-300',
    badgeBg: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800',
    border: 'border-violet-200 dark:border-violet-900/40',
  },
  URS: {
    barColor: 'bg-cyan-500',
    bgTrack: 'bg-cyan-100 dark:bg-cyan-950/60',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    badgeBg: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:ring-cyan-800',
    border: 'border-cyan-200 dark:border-cyan-900/40',
  },
  REP: {
    barColor: 'bg-rose-500',
    bgTrack: 'bg-rose-100 dark:bg-rose-950/60',
    textColor: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800',
    border: 'border-rose-200 dark:border-rose-900/40',
  },
};

export default function ModuleProgressTracker({
  materials,
  className = '',
}: ModuleProgressTrackerProps) {
  const { completedIds, toggle, isComplete, stats, markMultiple, resetProgress } =
    useModuleProgress(materials);
  const [expandedModule, setExpandedModule] = useState<ModuleName | null>('URS');

  const toggleExpand = (mod: ModuleName) => {
    setExpandedModule(expandedModule === mod ? null : mod);
  };

  const getMaterialsForModule = (mod: ModuleName) => {
    return materials.filter((m) => m.module === mod);
  };

  const getPerformanceMilestone = (percent: number) => {
    if (percent === 100) return { label: 'Exam Ready! Complete Mastery', color: 'text-emerald-600' };
    if (percent >= 75) return { label: 'High Momentum — Final Review', color: 'text-blue-600' };
    if (percent >= 40) return { label: 'Solid Progress — Keep Going', color: 'text-cyan-600' };
    return { label: 'Begin Studying & Marking Completed', color: 'text-slate-500' };
  };

  const milestone = getPerformanceMilestone(stats.percent);

  return (
    <section className={`${cardClass} overflow-hidden border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/80 ${className}`}>
      {/* Tracker Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Student Module Progress
            </h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-950 dark:text-cyan-300">
              Live Tracker
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Mark lectures, practicals, and OSPE study guides as completed to monitor your syllabus completion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Overall Micro 301
            </p>
            <p className="font-mono text-xl font-black text-slate-900 dark:text-white">
              {stats.completed} <span className="text-sm font-normal text-slate-400">/ {stats.total}</span>{' '}
              <span className="text-base text-blue-600 dark:text-cyan-300">({stats.percent}%)</span>
            </p>
          </div>

          {stats.completed > 0 && (
            <button
              type="button"
              onClick={resetProgress}
              title="Reset all completed checkboxes"
              className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Global Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={milestone.color}>{milestone.label}</span>
          <span className="font-mono text-slate-500">{stats.percent}% Finished</span>
        </div>
        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 transition-all duration-500 ease-out"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>

      {/* Module Breakdown Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {(['CNS', 'URS', 'REP'] as ModuleName[]).map((mod) => {
          const modStats = stats.byModule[mod];
          const accent = MODULE_ACCENTS[mod];
          const isExpanded = expandedModule === mod;
          const modMaterials = getMaterialsForModule(mod);

          return (
            <div
              key={mod}
              className={`rounded-2xl border transition-all ${
                isExpanded ? `${accent.border} shadow-sm bg-slate-50/50 dark:bg-slate-800/40` : 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/20'
              }`}
            >
              {/* Module Header Card */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold ring-1 ${accent.badgeBg}`}>
                    {mod}
                  </span>
                  <div className="text-right">
                    <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                      {modStats.completed}/{modStats.total}
                    </span>
                    <span className={`ml-1 text-xs font-bold ${accent.textColor}`}>
                      ({modStats.percent}%)
                    </span>
                  </div>
                </div>

                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {MODULE_TITLES[mod]}
                </h3>

                {/* Individual Module Progress Bar */}
                <div className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${accent.bgTrack}`}>
                  <div
                    className={`h-full rounded-full ${accent.barColor} transition-all duration-300`}
                    style={{ width: `${modStats.percent}%` }}
                  />
                </div>

                {/* Footer Controls */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleExpand(mod)}
                    className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    <span>Checklist ({modMaterials.length})</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  <Link
                    href={`/modules/${mod}`}
                    className={`flex items-center gap-1 font-bold ${accent.textColor} hover:underline`}
                  >
                    <span>Open Module</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Collapsible Materials Checklist */}
              {isExpanded && (
                <div className="border-t border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-slate-900/60 rounded-b-2xl space-y-2 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/5 text-[11px]">
                    <span className="font-bold text-slate-400 uppercase">Interactive Checklist</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = modMaterials.map((m) => m.id);
                        const allDone = allIds.every((id) => isComplete(id));
                        markMultiple(allIds, !allDone);
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:underline dark:text-cyan-300"
                    >
                      {modStats.completed === modStats.total ? 'Unmark All' : 'Mark All Done'}
                    </button>
                  </div>

                  {modMaterials.length === 0 ? (
                    <p className="text-center py-4 text-xs italic text-slate-400">
                      No materials found for this module.
                    </p>
                  ) : (
                    modMaterials.map((item) => {
                      const completed = isComplete(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          className={`flex items-start gap-2.5 rounded-xl p-2 cursor-pointer transition-colors ${
                            completed
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-slate-600 dark:text-slate-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            className="mt-0.5 flex-shrink-0 text-slate-400 transition hover:text-emerald-500"
                            aria-label={`Toggle ${item.title}`}
                          >
                            {completed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-semibold leading-tight line-clamp-2 ${
                                completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                            >
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {MATERIAL_TYPE_LABELS[item.type] ?? item.type}
                              </span>
                              {item.format === 'audio' ? (
                                <Volume2 className="h-3 w-3 text-indigo-500" />
                              ) : (
                                <FileText className="h-3 w-3 text-rose-500" />
                              )}
                            </div>
                          </div>

                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Open resource"
                            className="text-slate-400 hover:text-blue-600 p-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
