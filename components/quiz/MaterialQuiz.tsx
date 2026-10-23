'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Clock, Loader2, Printer, Sparkles, X } from 'lucide-react';
import type { Material, ModuleName } from '@/types';
import QuizComfortCard from './ComfortCard';
import CollapsiblePanel from '@/components/ui/CollapsiblePanel';
import { authenticatedHeaders, redirectAfterSessionExpiry } from '@/lib/authHeaders';

type ChoiceId = 'A' | 'B' | 'C' | 'D' | 'E';

type Question = {
  id: string;
  question: string;
  options: { id: ChoiceId; text: string }[];
  correctAnswer?: ChoiceId | '';
  explanation?: string;
};

type QuizMode = 'exam' | 'practice';

type PerQuestion = {
  question_id: string;
  question: string;
  is_correct: boolean;
  student_answer: string;
  correct_answer: string;
  explanation?: string;
};

type Report = {
  module: ModuleName;
  score: number;
  isCorrect: boolean;
  feedback: string;
  diagnosticFocus: string;
  strengths: string[];
  weaknesses: string[];
  studyRecommendations: string[];
  perQuestion?: PerQuestion[];
};

type QuizChoice = {
  id: string;
  title: string;
  quiz_number: number;
  time_limit_minutes: number | null;
};

type Phase = 'lobby' | 'active' | 'report';

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function printFullReport(report: Report, quizTitle: string) {
  try {
    const win = typeof window !== 'undefined' ? window.open('', '_blank', 'width=900,height=700') : null;
    if (win) {
      const doc = win.document;
      doc.title = 'MedAtlas Quiz Report';
      const style = doc.createElement('style');
      style.textContent = 'body{font:15px Arial,sans-serif;max-width:820px;margin:32px auto;padding:0 20px;color:#172033}h1{color:#1d4ed8}h2{margin-top:1.4em}.ok{color:#047857}.bad{color:#b91c1c}li{margin:.4em 0}@media print{body{margin:0}}';
      doc.head.append(style);
      const main = doc.createElement('main');
      const h1 = doc.createElement('h1'); h1.textContent = 'MedAtlas Egypt · Quiz Report'; main.append(h1);
      const h2 = doc.createElement('h2'); h2.textContent = `${quizTitle} · ${report.module}`; main.append(h2);
      const note = doc.createElement('p'); note.textContent = 'Not saved on the server. Print or save this page now.'; main.append(note);
      const score = doc.createElement('p');
      const scoreLabel = doc.createElement('strong');
      scoreLabel.textContent = 'Score:';
      score.append(scoreLabel, ` ${report.score}%`);
      main.append(score);
      const feedback = doc.createElement('p'); feedback.textContent = report.feedback; main.append(feedback);
      if (report.weaknesses?.length) {
        const h = doc.createElement('h3'); h.textContent = 'Review areas'; main.append(h);
        const ul = doc.createElement('ul');
        report.weaknesses.forEach((value) => { const li = doc.createElement('li'); li.textContent = value; ul.append(li); });
        main.append(ul);
      }
      if (report.studyRecommendations?.length) {
        const h = doc.createElement('h3'); h.textContent = 'Study recommendations'; main.append(h);
        const ul = doc.createElement('ul');
        report.studyRecommendations.forEach((value) => { const li = doc.createElement('li'); li.textContent = value; ul.append(li); });
        main.append(ul);
      }
      const listHeading = doc.createElement('h3'); listHeading.textContent = 'Question review'; main.append(listHeading);
      (report.perQuestion || []).forEach((row, index) => {
        const block = doc.createElement('div');
        block.style.marginBottom = '1rem';
        const q = doc.createElement('p');
        const qStrong = doc.createElement('strong');
        qStrong.textContent = `${index + 1}. ${row.question}`;
        q.append(qStrong);
        const ans = doc.createElement('p');
        ans.className = row.is_correct ? 'ok' : 'bad';
        ans.textContent = `Your answer: ${row.student_answer} · Correct: ${row.correct_answer}${row.is_correct ? ' ✓' : ''}`;
        block.append(q, ans);
        if (row.explanation) {
          const exp = doc.createElement('p');
          exp.textContent = row.explanation;
          block.append(exp);
        }
        main.append(block);
      });
      doc.body.append(main);
      win.focus();
      win.setTimeout(() => { win.print(); }, 200);
      return;
    }
  } catch { /* print fallback */ }
  if (typeof window !== 'undefined') window.print();
}

export default function MaterialQuiz({ material }: { material: Pick<Material, 'id' | 'module' | 'title'> }) {
  const [phase, setPhase] = useState<Phase>('lobby');
  const [quizChoices, setQuizChoices] = useState<QuizChoice[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [timedMode, setTimedMode] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Question['options'][number]['id'] | ''>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const [error, setError] = useState('');
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [mounted, setMounted] = useState(false);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);
  const quizIdRef = useRef(selectedQuizId);
  const quizModeRef = useRef(quizMode);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { quizIdRef.current = selectedQuizId; }, [selectedQuizId]);
  useEffect(() => { quizModeRef.current = quizMode; }, [quizMode]);

  const selectedMeta = quizChoices.find((quiz) => quiz.id === selectedQuizId) || null;
  const question = questions[index];
  const answeredCount = useMemo(
    () => questions.filter((item) => answers[item.id]).length,
    [answers, questions],
  );
  const practiceCorrectCount = useMemo(
    () => questions.filter((item) => {
      const choice = answers[item.id];
      return choice && item.correctAnswer && choice === item.correctAnswer;
    }).length,
    [answers, questions],
  );

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!retrySeconds) return;
    const timer = window.setTimeout(() => setRetrySeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const headers = await authenticatedHeaders();
        const response = await fetch('/api/quizzes?material_id=' + encodeURIComponent(material.id), { headers, cache: 'no-store' });
        const data = await response.json();
        if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
        if (!response.ok) throw new Error('unavailable');
        const quizzes = (Array.isArray(data.quizzes) ? data.quizzes : []).map((quiz: QuizChoice) => ({
          ...quiz,
          time_limit_minutes: typeof quiz.time_limit_minutes === 'number' ? quiz.time_limit_minutes : null,
        }));
        if (!cancelled) {
          setQuizChoices(quizzes);
          setSelectedQuizId(quizzes[0]?.id || '');
          setAvailable(quizzes.length > 0);
          if (quizzes[0]?.time_limit_minutes) setTimedMode(false);
        }
      } catch {
        if (!cancelled) { setAvailable(false); setError('Could not check quizzes for this lecture. Please try again.'); }
      }
    })();
    return () => { cancelled = true; };
  }, [material.id]);

  useEffect(() => {
    if (phase !== 'active') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [phase]);

  const finishPracticeLocally = () => {
    const activeQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;
    const perQuestion: PerQuestion[] = activeQuestions.map((item) => {
      const student = currentAnswers[item.id] || '';
      const correct = item.correctAnswer || '';
      return {
        question_id: item.id,
        question: item.question,
        is_correct: Boolean(student && correct && student === correct),
        student_answer: student || '—',
        correct_answer: correct || '—',
        explanation: item.explanation || undefined,
      };
    });
    const correctCount = perQuestion.filter((row) => row.is_correct).length;
    const score = activeQuestions.length ? Math.round((correctCount / activeQuestions.length) * 100) : 0;
    setReport({
      module: material.module,
      score,
      isCorrect: score >= 70,
      feedback: `Practice complete — ${correctCount}/${activeQuestions.length} correct. Answers were revealed as you went; nothing was submitted for grading.`,
      diagnosticFocus: 'Self-paced practice',
      strengths: [],
      weaknesses: [],
      studyRecommendations: [],
      perQuestion,
    });
    setPhase('report');
    setSecondsLeft(null);
  };

  const finishQuiz = async (timedOut = false) => {
    if (quizModeRef.current === 'practice') {
      finishPracticeLocally();
      return;
    }
    const activeQuestions = questionsRef.current;
    const activeQuizId = quizIdRef.current;
    if (submittingRef.current || !activeQuizId || !activeQuestions.length) return;
    submittingRef.current = true;
    setLoading(true); setError('');
    try {
      const currentAnswers = answersRef.current;
      const payload = activeQuestions.map((item) => ({ qid: item.id, choice: currentAnswers[item.id] || '' }));
      const headers = await authenticatedHeaders();
      const response = await fetch('/api/gemini/quiz-eval', {
        method: 'POST',
        headers,
        body: JSON.stringify({ quiz_id: activeQuizId, answers: payload, critique: false }),
      });
      const data = await response.json();
      if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
      if (!response.ok || !data.report) {
        console.error('Quiz score failed:', data);
        setError('Could not score this quiz. Please try submitting again.');
        return;
      }
      const nextReport = data.report as Report;
      if (timedOut) {
        nextReport.feedback = `Time is up. Unanswered questions were marked incorrect. ${nextReport.feedback}`;
      }
      setReport(nextReport);
      setPhase('report');
      setSecondsLeft(null);
    } catch {
      setError('Could not score this quiz. Please try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    if (phase !== 'active' || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setSecondsLeft(null);
      void finishQuiz(true);
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => (value == null ? value : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, secondsLeft]);

  const startQuiz = async () => {
    if (!selectedQuizId) { setError('Choose a quiz to begin.'); return; }
    setLoading(true); setError('');
    try {
      const headers = await authenticatedHeaders();
      const practiceQs = quizMode === 'practice' ? '?mode=practice' : '';
      const response = await fetch(`/api/quizzes/${encodeURIComponent(selectedQuizId)}${practiceQs}`, { headers, cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
      if (!response.ok) { console.error('Quiz load failed:', data); setError('Could not load this quiz. Please try again.'); return; }
      const nextQuestions: Question[] = (Array.isArray(data.questions) ? data.questions : []).map((item: Question) => {
        const correct = String(item.correctAnswer || '').trim().toUpperCase();
        return {
          id: item.id,
          question: item.question,
          options: item.options,
          correctAnswer: (['A', 'B', 'C', 'D', 'E'].includes(correct) ? correct : '') as Question['correctAnswer'],
          explanation: typeof item.explanation === 'string' ? item.explanation : '',
        };
      });
      if (!nextQuestions.length) { setError('This quiz has no questions yet.'); return; }
      const limit = typeof data.quiz?.time_limit_minutes === 'number' ? data.quiz.time_limit_minutes : null;
      submittingRef.current = false;
      setQuestions(nextQuestions);
      setQuizTitle(data.quiz?.title || selectedMeta?.title || 'Practice Quiz');
      setAnswers(Object.fromEntries(nextQuestions.map((item) => [item.id, ''])));
      setRevealed({});
      setIndex(0);
      setReport(null);
      setSecondsLeft(quizMode === 'exam' && timedMode && limit ? limit * 60 : null);
      setPhase('active');
    } catch {
      setError('Could not start this quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickPracticeAnswer = (questionId: string, choice: Question['options'][number]['id']) => {
    if (revealed[questionId]) return;
    setAnswers((current) => ({ ...current, [questionId]: choice }));
    setRevealed((current) => ({ ...current, [questionId]: true }));
  };

  const requestCritique = async () => {
    if (!selectedQuizId || !questions.length || critiqueLoading) return;
    setCritiqueLoading(true); setError('');
    try {
      const payload = questions.map((item) => ({ qid: item.id, choice: answers[item.id] || '' }));
      const headers = await authenticatedHeaders();
      const response = await fetch('/api/gemini/quiz-eval', {
        method: 'POST',
        headers,
        body: JSON.stringify({ quiz_id: selectedQuizId, answers: payload, critique: true }),
      });
      const data = await response.json();
      if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
      const { notifyCreditsUpdated } = await import('@/lib/creditsClient');
      notifyCreditsUpdated(data.credits);
      if (!response.ok) {
        if (data.kind === 'busy') setRetrySeconds(60);
        setError(typeof data.message === 'string' ? data.message : 'Dr. Atlas hit a temporary error. Try again in a moment.');
        if (data.report) setReport(data.report);
        return;
      }
      if (data.report) setReport(data.report);
    } catch {
      setError('Dr. Atlas hit a temporary error. Try again in a moment.');
    } finally {
      setCritiqueLoading(false);
    }
  };

  const exitToLobby = () => {
    setPhase('lobby');
    setQuestions([]);
    setReport(null);
    setRevealed({});
    setSecondsLeft(null);
    setError('');
  };

  if (available === false && !quizChoices.length) return <QuizComfortCard />;

  const lobby = (
    <CollapsiblePanel
      accent="indigo"
      title="Lecture quizzes"
      subtitle="Practice or exam · tap to open"
      meta={
        quizChoices.length > 0 ? (
          <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
            {quizChoices.length} available
          </span>
        ) : available === null ? (
          <span className="text-[10px] font-semibold uppercase text-slate-400">Checking…</span>
        ) : null
      }
    >
      <p className="mb-3 text-xs text-slate-500">Practice with instant feedback, or take an exam-style run scored at the end.</p>
      {available === null && <p className="text-xs text-slate-500">Checking available quizzes…</p>}
      {available && quizChoices.length > 0 && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Choose quiz
            <select
              aria-label="Choose a quiz"
              value={selectedQuizId}
              onChange={(event) => {
                setSelectedQuizId(event.target.value);
                setTimedMode(false);
              }}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              {quizChoices.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  Quiz {quiz.quiz_number}: {quiz.title}
                  {quiz.time_limit_minutes ? ` · up to ${quiz.time_limit_minutes} min` : ''}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <legend className="px-1 text-xs font-semibold">Mode</legend>
            <div className="mt-1 flex flex-wrap gap-3 text-xs">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="quiz-mode" checked={quizMode === 'practice'} onChange={() => { setQuizMode('practice'); setTimedMode(false); }} />
                Practice — see answers as you go
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="quiz-mode" checked={quizMode === 'exam'} onChange={() => setQuizMode('exam')} />
                Exam — score at the end
              </label>
            </div>
          </fieldset>
          {quizMode === 'exam' && selectedMeta?.time_limit_minutes ? (
            <fieldset className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <legend className="px-1 text-xs font-semibold">Timer</legend>
              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="quiz-timer" checked={!timedMode} onChange={() => setTimedMode(false)} />
                  Untimed
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="quiz-timer" checked={timedMode} onChange={() => setTimedMode(true)} />
                  Timed ({selectedMeta.time_limit_minutes} minutes)
                </label>
              </div>
            </fieldset>
          ) : quizMode === 'practice' ? (
            <p className="text-xs text-slate-500">Practice is untimed. Correct answers and explanations appear after each choice.</p>
          ) : (
            <p className="text-xs text-slate-500">This quiz is untimed.</p>
          )}
          <button
            type="button"
            onClick={() => { void startQuiz(); }}
            disabled={loading || !selectedQuizId}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {quizMode === 'practice' ? 'Start practice' : 'Enter exam mode'}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
    </CollapsiblePanel>
  );

  const isPractice = quizMode === 'practice';
  const questionRevealed = Boolean(question && revealed[question.id]);
  const practiceCorrect = Boolean(
    question?.correctAnswer && answers[question.id] && answers[question.id] === question.correctAnswer,
  );

  const activePanel = phase === 'active' && mounted && question ? createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-50 text-slate-900 dark:bg-lab-950 dark:text-slate-100">
      <header className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${secondsLeft != null && secondsLeft <= 60 ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isPractice ? 'Practice' : 'Exam'} · {material.module}
          </p>
          <h2 className="text-lg font-black">{quizTitle}</h2>
          <p className="text-xs text-slate-500">
            Question {index + 1} of {questions.length}
            {isPractice
              ? ` · Correct ${practiceCorrectCount}/${answeredCount || 0}`
              : ` · Answered ${answeredCount}/${questions.length}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {secondsLeft != null && (
            <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-black ${secondsLeft <= 60 ? 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'}`} aria-live="polite">
              <Clock className="h-5 w-5" />
              {formatClock(secondsLeft)}
              {secondsLeft <= 60 && <span className="text-xs font-bold uppercase">1 min left</span>}
            </div>
          )}
          <button type="button" onClick={exitToLobby} className="rounded-lg border px-3 py-2 text-xs font-semibold" aria-label="Exit quiz">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-6">
        <p className="text-base font-semibold leading-relaxed sm:text-lg">{question.question}</p>
        <div className="space-y-2">
          {question.options.map((option) => {
            const checked = answers[question.id] === option.id;
            const showKey = isPractice && questionRevealed;
            const isCorrectOpt = showKey && question.correctAnswer === option.id;
            const isWrongPick = showKey && checked && !isCorrectOpt;
            const optionClass = isCorrectOpt
              ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/30'
              : isWrongPick
                ? 'border-rose-500 bg-rose-50 dark:border-rose-400 dark:bg-rose-950/30'
                : checked
                  ? 'border-indigo-500 bg-indigo-50 dark:border-cyan-400 dark:bg-cyan-950/30'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
            return (
              <label
                key={option.id}
                className={`flex gap-3 rounded-xl border p-3.5 text-sm transition ${optionClass} ${showKey ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={checked}
                  disabled={isPractice && questionRevealed}
                  onChange={() => {
                    if (isPractice) pickPracticeAnswer(question.id, option.id);
                    else setAnswers((current) => ({ ...current, [question.id]: option.id }));
                  }}
                />
                <span><strong>{option.id}.</strong> {option.text}</span>
              </label>
            );
          })}
        </div>
        {isPractice && questionRevealed && (
          <div
            className={`rounded-xl border p-3 text-sm ${practiceCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100'}`}
            role="status"
          >
            <p className="font-bold">{practiceCorrect ? 'Correct' : `Incorrect — answer is ${question.correctAnswer || '—'}`}</p>
            {question.explanation ? <p className="mt-1 text-xs opacity-90">{question.explanation}</p> : null}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2">
          <button type="button" disabled={index === 0 || loading} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          {index + 1 < questions.length ? (
            <button
              type="button"
              disabled={loading || (isPractice && !questionRevealed)}
              onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={loading || (isPractice && !questionRevealed)} onClick={() => { void finishQuiz(false); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPractice ? 'Finish practice' : 'Submit quiz'}
            </button>
          )}
        </div>
      </footer>
    </div>,
    document.body,
  ) : null;

  const reportPanel = phase === 'report' && report && mounted ? createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-50 dark:bg-lab-950">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {quizMode === 'practice' ? 'Practice summary' : 'End-of-quiz report'}
            </p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{quizTitle}</h2>
          </div>
          <button type="button" onClick={exitToLobby} className="rounded-lg border px-3 py-2 text-xs font-semibold">Back to lecture</button>
        </div>

        <section className="rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-900 dark:bg-slate-900">
          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{report.score}%</p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{report.feedback}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">Not saved on the server. Print or download now if you want a copy.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => printFullReport(report, quizTitle)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            {quizMode === 'exam' && !report.isCorrect && (
              <button
                type="button"
                disabled={critiqueLoading || retrySeconds > 0}
                onClick={() => { void requestCritique(); }}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {critiqueLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {retrySeconds > 0 ? `Try critique in ${retrySeconds}s` : 'Get Dr. Atlas feedback (1 credit)'}
              </button>
            )}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
          {report.weaknesses?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold">Review areas</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{report.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {report.studyRecommendations?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold">Study recommendations</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{report.studyRecommendations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </section>

        <section className="mt-4 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white">Question review & answer key</h3>
          {(report.perQuestion || []).map((row, rowIndex) => (
            <article key={row.question_id} className={`rounded-xl border p-4 text-sm ${row.is_correct ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20'}`}>
              <p className="font-semibold">{rowIndex + 1}. {row.question}</p>
              <p className="mt-2 text-xs">Your answer: <strong>{row.student_answer}</strong> · Correct: <strong>{row.correct_answer}</strong></p>
              {row.explanation ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{row.explanation}</p> : null}
            </article>
          ))}
        </section>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {phase === 'lobby' && lobby}
      {activePanel}
      {reportPanel}
    </>
  );
}
