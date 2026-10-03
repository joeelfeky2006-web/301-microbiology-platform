'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  Stethoscope,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Loader2,
  FileText,
} from 'lucide-react';
import { cardClass } from '@/lib/ui';
import { authenticatedHeaders, redirectAfterSessionExpiry } from '@/lib/authHeaders';
import { MODULE_TITLES, type ModuleName } from '@/types';
import AiDisclaimer from '@/components/ai/AiDisclaimer';
import MaterialQuiz from '@/components/quiz/MaterialQuiz';
import SharedContextSelector, { type ContextFile } from '@/components/ai/SharedContextSelector';

interface AILearningStudioProps {
  initialModule?: ModuleName;
  embedded?: boolean;
}

export default function AILearningStudio({
  initialModule = 'URS',
  embedded = false,
}: AILearningStudioProps) {
  const [activeTab, setActiveTab] = useState<'case' | 'summary' | 'eval'>('case');
  const [selectedModule, setSelectedModule] = useState<ModuleName>(initialModule);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [customTopic, setCustomTopic] = useState('');
  const [creditNotice, setCreditNotice] = useState<string | null>(null);
  const [retrySeconds, setRetrySeconds] = useState(0);


  // Case Study State
  const [caseStudy, setCaseStudy] = useState<any>(null);
  const [caseSeal, setCaseSeal] = useState('');
  const [caseResult, setCaseResult] = useState<{ correct: boolean; correctId: string; explanation: string; clinicalPearls: string[] } | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Summary State
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Quiz Eval State (Server-Graded to prevent network answer leakage)

  // Lecture Raw Feed State
  const [moduleMaterials, setModuleMaterials] = useState<ContextFile[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [rawFeedText, setRawFeedText] = useState<string>('');
  const [useCustomRawFeed, setUseCustomRawFeed] = useState<boolean>(false);

  useEffect(() => {
    if (!retrySeconds) return;
    const timer = window.setTimeout(() => setRetrySeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  const updateContextFiles = useCallback((files: ContextFile[]) => setModuleMaterials(files), []);
  useEffect(() => { setSelectedMaterialId(''); }, [selectedModule]);

  const fetchCaseStudy = async () => {
    setCreditNotice(null);
    if (retrySeconds > 0) return;
    if (!selectedMaterialId || useCustomRawFeed) {
      setCreditNotice('Choose a lecture with AI context to generate a case study.');
      return;
    }

    setCaseLoading(true);
    setSelectedOption(null);
    setRevealed(false);
    setCaseSeal('');
    setCaseResult(null);
    try {
      const res = await fetch('/api/gemini/case-study', {
        method: 'POST',
        headers: await authenticatedHeaders(),
        body: JSON.stringify({
          topic: customTopic.trim() || undefined,
          difficulty,
          material_id: selectedMaterialId,
        }),
      });
      const data = await res.json();
      if (res.status === 401) { await redirectAfterSessionExpiry(); return; }
      window.dispatchEvent(new Event('credits_updated'));
      if (data.kind === 'busy') setRetrySeconds(60);
      if (data.caseStudy && typeof data.sealed === 'string') {
        setCaseStudy(data.caseStudy);
        setCaseSeal(data.sealed);
      } else if (data.kind === 'fallback') {
        setCreditNotice('This lecture does not have AI context yet.');
      } else if (data.message) {
        setCreditNotice(data.message);
      }
    } catch {
      setCreditNotice("Dr. Atlas is catching his breath. Let's give it another try in a moment!");
    } finally {
      setCaseLoading(false);
    }
  };

  const checkCaseAnswer = async () => {
    if (!selectedOption || !caseSeal || revealed || checkLoading) return;
    setCheckLoading(true);
    setCreditNotice(null);
    try {
      const res = await fetch('/api/gemini/case-study/check', {
        method: 'POST',
        headers: await authenticatedHeaders(),
        body: JSON.stringify({ sealed: caseSeal, choice: selectedOption }),
      });
      const data = await res.json();
      if (res.status === 401) { await redirectAfterSessionExpiry(); return; }
      if (!res.ok || typeof data.correct !== 'boolean') {
        setCreditNotice('Could not check this answer right now. Please try again.');
        return;
      }
      setCaseResult({
        correct: data.correct,
        correctId: String(data.correctId || ''),
        explanation: String(data.explanation || ''),
        clinicalPearls: Array.isArray(data.clinicalPearls) ? data.clinicalPearls.map((item: unknown) => String(item)) : [],
      });
      setRevealed(true);
    } catch (error) {
      console.error('Case study check failed:', error);
      setCreditNotice('Could not check this answer right now. Please try again.');
    } finally {
      setCheckLoading(false);
    }
  };

  const fetchSummary = async (topicToUse?: string) => {
    setCreditNotice(null);
    if (retrySeconds > 0) return;
    if (!selectedMaterialId || useCustomRawFeed) {
      setCreditNotice('Choose a lecture with AI context or question bank to create a summary.');
      return;
    }

    setSummaryLoading(true);
    const targetTopic = topicToUse || customTopic.trim() || `${MODULE_TITLES[selectedModule]} Core Pathogens`;
    try {
      const res = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: await authenticatedHeaders(),
        body: JSON.stringify({
          topic: targetTopic,
          material_id: selectedMaterialId,
        }),
      });
      const data = await res.json();
      if (res.status === 401) { await redirectAfterSessionExpiry(); return; }
      window.dispatchEvent(new Event('credits_updated'));
      if (data.kind === 'busy') setRetrySeconds(60);
      if (data.summary) {
        setSummary(data.summary);
      } else if (data.kind === 'fallback') {
        setCreditNotice('This lecture does not have AI context or a question bank yet.');
      } else if (data.message) {
        setCreditNotice(data.message);
      }
    } catch {
      setCreditNotice("Dr. Atlas is catching his breath. Let's give it another try in a moment!");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <section className={`${cardClass} overflow-hidden border border-indigo-200 dark:border-indigo-900/40 p-6 md:p-8 bg-gradient-to-b from-white via-indigo-50/20 to-white dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950`}>
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-white/10 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              MedAtlas Egypt: Micro 301 AI Study Studio
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-900/40 dark:text-cyan-300">
              Micro 301
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Interactive medical case vignettes, high-yield lecture summaries, and automated diagnostic quiz evaluation.
          </p>
          {/* Academic Calibration Tag & Disclaimer */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-cyan-300 ring-1 ring-indigo-200 dark:ring-indigo-900/60">
              <BookOpen className="h-3 w-3 text-indigo-600 dark:text-cyan-400" />
              <span>Focused microbiology learning with structured AI feedback</span>
            </div>
            <AiDisclaimer className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/60" />
          </div>
        </div>

        {/* Module Switcher & Live Credits */}
        <div className="flex flex-wrap items-center gap-2">
          {(['URS', 'CNS', 'REP'] as ModuleName[]).map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => {
                setSelectedModule(mod);
                setCaseStudy(null);
                setSummary(null);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                selectedModule === mod
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {mod} — {MODULE_TITLES[mod]}
            </button>
          ))}
        </div>
      </div>

      {/* Credit Notice Alert */}
      {creditNotice && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 font-bold text-xs">!</span>
            <span>{creditNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setCreditNotice(null)}
            className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            ✕
          </button>
        </div>
      )}
      {retrySeconds > 0 && <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">Try again in {retrySeconds}s.</p>}

      {/* Tabs */}
      <div className="mt-6 flex border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('case')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'case'
              ? 'border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          Clinical Case Studies
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'summary'
              ? 'border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Syllabus & Lecture Summarizer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('eval')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'eval'
              ? 'border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Intelligent Quiz Evaluator
        </button>
      </div>

      {/* Tab 1: Case Studies */}
      {activeTab === 'case' && (
        <div className="mt-6 space-y-6">
          {/* Lecture Raw Feed Input / Selector */}
          <div className="rounded-2xl border border-indigo-200/80 bg-white p-4 dark:border-indigo-900/60 dark:bg-slate-900/70 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Lecture Raw Feed Source:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Generate a case strictly from admin-provided lecture context
                </span>
              </div>
              <button
                type="button"
                disabled
                className="text-[11px] font-bold text-slate-400"
              >
                Admin-managed lecture source
              </button>
            </div>

            {!useCustomRawFeed ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <SharedContextSelector value={selectedMaterialId} onChange={setSelectedMaterialId} module={selectedModule} onFilesChange={updateContextFiles} placeholder="Choose a lecture with AI context" />
                {selectedMaterialId && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Lecture Context Linked
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  rows={3}
                  value={rawFeedText}
                  onChange={(e) => setRawFeedText(e.target.value)}
                  placeholder="Paste raw lecture transcription, professor emphases, or slide points here (e.g. 'Dr. Mohamed emphasized that in CNS infections, Neisseria endotoxin triggers petechial lesions while Streptococcus pneumoniae causes rusty sputum...')"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {rawFeedText.trim() && (
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ Custom lecture feed active ({rawFeedText.length} characters) — AI will construct cases directly from this feed.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-white/5 dark:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Difficulty:
              </span>
              {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                    difficulty === lvl
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}

              <input
                type="text"
                placeholder="Optional topic (e.g. Pyelonephritis, Meningitis, Syphilis)"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:w-64"
              />
            </div>

            <button
              type="button"
              disabled={caseLoading || retrySeconds > 0 || !selectedMaterialId}
              onClick={fetchCaseStudy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {caseLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Case...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Case Vignette
                </>
              )}
            </button>
          </div>

          {!caseStudy && !caseLoading && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-white/10">
              <Stethoscope className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-3 text-lg font-bold text-slate-800 dark:text-slate-200">
                Ready to review a {MODULE_TITLES[selectedModule]} patient case?
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Click &ldquo;Generate Case Vignette&rdquo; above to receive a full simulated clinical scenario with vitals, lab workup, and diagnostic challenge questions.
              </p>
              <button
                type="button"
                onClick={fetchCaseStudy}
                className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
              >
                Load {selectedModule} Case Study
              </button>
            </div>
          )}

          {caseStudy && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4 dark:border-white/10">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {caseStudy.title}
                  </h3>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-cyan-300">
                    {MODULE_TITLES[selectedModule]}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-slate-800/40">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Patient Profile</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {caseStudy.patient?.demographics}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-slate-800/40">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Chief Complaint & History</p>
                      <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                        {caseStudy.patient?.chiefComplaint}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-slate-800/40">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Physical Examination</p>
                      <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                        {caseStudy.patient?.physicalExam}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-white/5 dark:bg-slate-800/40">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-cyan-400">
                      Microbiology & Diagnostic Findings
                    </p>
                    <ul className="mt-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {caseStudy.patient?.labFindings?.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-bold text-indigo-600 dark:text-cyan-400">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Question Section */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-cyan-400">
                    <HelpCircle className="h-5 w-5" />
                    <h4 className="font-bold text-sm uppercase tracking-wide">
                      Clinical Vignette Question
                    </h4>
                  </div>
                  <p className="mt-2 font-medium text-slate-900 dark:text-white">
                    {caseStudy.question}
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {caseStudy.options?.map((opt: any) => {
                      const isSelected = selectedOption === opt.id;
                      const showResult = revealed && !!caseResult;
                      const isCorrectOption = showResult && opt.id === caseResult.correctId;
                      const isWrongSelected = showResult && isSelected && !caseResult.correct;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={revealed || checkLoading}
                          onClick={() => setSelectedOption(opt.id)}
                          className={`flex w-full items-start justify-between rounded-xl border p-3.5 text-left text-sm transition-all disabled:cursor-default ${
                            !showResult && isSelected
                              ? 'border-blue-500 bg-blue-50/80 text-blue-900 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-white'
                              : !showResult
                              ? 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200'
                              : 'border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200'
                          } ${
                            isCorrectOption
                              ? '!border-emerald-500 !bg-emerald-50/80 text-emerald-900 dark:!bg-emerald-950/40 dark:text-emerald-300'
                              : ''
                          } ${
                            isWrongSelected
                              ? '!border-red-500 !bg-red-50/80 text-red-900 dark:!bg-red-950/40 dark:text-red-300'
                              : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 font-bold text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>

                          {isCorrectOption && (
                            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                          )}
                          {isWrongSelected && (
                            <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    {!revealed ? (
                      <button
                        type="button"
                        disabled={!selectedOption || !caseSeal || checkLoading}
                        onClick={() => { void checkCaseAnswer(); }}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {checkLoading ? 'Checking…' : 'Check my answer'}
                      </button>
                    ) : (
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {caseResult?.correct
                          ? 'Correct — review the explanation below.'
                          : 'Not quite — review the explanation below.'}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={fetchCaseStudy}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Next Case
                    </button>
                  </div>

                  {revealed && caseResult && (
                    <div className="mt-4 space-y-3 rounded-xl border border-emerald-300/40 bg-emerald-50/60 p-4 text-xs dark:border-emerald-500/30 dark:bg-emerald-950/30">
                      <div>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">
                          Clinical Explanation:
                        </span>{' '}
                        <span className="text-slate-700 dark:text-slate-300">
                          {caseResult.explanation}
                        </span>
                      </div>

                      {caseResult.clinicalPearls.length > 0 && (
                        <div className="mt-2 border-t border-emerald-200 pt-2 dark:border-emerald-800/40">
                          <span className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                            <Lightbulb className="h-3.5 w-3.5" /> MUST 301 Exam Pearls:
                          </span>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700 dark:text-slate-300">
                            {caseResult.clinicalPearls.map((pearl: string, idx: number) => (
                              <li key={idx}>{pearl}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Syllabus Summarizer */}
      {activeTab === 'summary' && (
        <div className="mt-6 space-y-6">
          {/* Lecture Raw Feed Input / Selector */}
          <div className="rounded-2xl border border-indigo-200/80 bg-white p-4 dark:border-indigo-900/60 dark:bg-slate-900/70 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Lecture Raw Feed Source:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Summarize key diagnostic hallmarks and algorithms from a selected lecture
                </span>
              </div>
              <button
                type="button"
                disabled
                className="text-[11px] font-bold text-slate-400"
              >
                Admin-managed lecture source
              </button>
            </div>

            {!useCustomRawFeed ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <SharedContextSelector value={selectedMaterialId} onChange={setSelectedMaterialId} module={selectedModule} onFilesChange={updateContextFiles} placeholder="Choose a lecture with AI context" />
                {selectedMaterialId && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Lecture Feed Active
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  rows={3}
                  value={rawFeedText}
                  onChange={(e) => setRawFeedText(e.target.value)}
                  placeholder="Paste lecture transcription or professor review points to generate an exam-calibrated syllabus summary..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {rawFeedText.trim() && (
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ Custom feed active ({rawFeedText.length} chars) — summary will extract key facts from this raw feed.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Quick Topics:</span>
              {[
                { label: 'E. coli & Acute Pyelonephritis', mod: 'URS' as ModuleName },
                { label: 'Proteus & Struvite Stones', mod: 'URS' as ModuleName },
                { label: 'Meningococcal Meningitis', mod: 'CNS' as ModuleName },
                { label: 'Treponema & Syphilis', mod: 'REP' as ModuleName },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setSelectedModule(chip.mod);
                    setCustomTopic(chip.label);
                    setSelectedMaterialId('');
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={summaryLoading || retrySeconds > 0 || !selectedMaterialId}
              onClick={() => fetchSummary()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-50"
            >
              {summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Summarize {MODULE_TITLES[selectedModule]}
            </button>
          </div>

          {!summary && !summaryLoading && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-white/10">
              <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Generate high-yield lecture summaries and pathogen comparison cards for {MODULE_TITLES[selectedModule]}.
              </p>
              <button
                type="button"
                onClick={() => fetchSummary()}
                disabled={!selectedMaterialId || retrySeconds > 0}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Summarize Now
              </button>
            </div>
          )}

          {summary && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {summary.topic} — {summary.moduleTitle}
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    High Yield
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {summary.overview}
                </p>

                {/* Pathogens Table / Cards */}
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {summary.keyPathogens?.map((pathogen: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4.5 dark:border-white/10 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold italic text-base text-blue-700 dark:text-cyan-300">
                          {pathogen.name}
                        </h4>
                        <span className="text-[10px] font-semibold uppercase text-slate-500">
                          Pathogen #{idx + 1}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {pathogen.classification}
                      </p>

                      <div className="mt-3 space-y-2 text-xs">
                        <div>
                          <strong className="text-slate-700 dark:text-slate-300">Culture & Media:</strong>{' '}
                          <span className="text-slate-600 dark:text-slate-400">{pathogen.cultureMedia}</span>
                        </div>
                        <div>
                          <strong className="text-slate-700 dark:text-slate-300">Virulence:</strong>{' '}
                          <span className="text-slate-600 dark:text-slate-400">
                            {pathogen.virulenceFactors?.join(', ')}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-700 dark:text-slate-300">Diseases:</strong>{' '}
                          <span className="text-slate-600 dark:text-slate-400">{pathogen.clinicalManifestation}</span>
                        </div>
                        <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5 dark:bg-emerald-950/40">
                          <strong className="text-emerald-800 dark:text-emerald-300">Drug of Choice:</strong>{' '}
                          <span className="text-emerald-700 dark:text-emerald-200">{pathogen.treatment}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Exam Traps */}
                {summary.examTraps?.length > 0 && (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs dark:border-amber-500/30 dark:bg-amber-950/30">
                    <h5 className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                      <Lightbulb className="h-4 w-4" /> Common MUST 301 Exam Traps & Misconceptions:
                    </h5>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-950 dark:text-amber-200">
                      {summary.examTraps.map((trap: string, i: number) => (
                        <li key={i}>{trap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Lecture question bank */}
      {activeTab === 'eval' && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lecture Question Bank</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Questions and answer keys come from the selected lecture’s admin-supplied question bank.</p>
          {selectedMaterialId ? <MaterialQuiz material={moduleMaterials.find((item) => item.id === selectedMaterialId)!} /> : <p className="rounded-xl border border-dashed p-5 text-sm text-slate-600 dark:text-slate-300">Select a lecture above to practice its question bank.</p>}
        </div>
      )}
    </section>
  );
}
