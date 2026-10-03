'use client';

import { useEffect, useState } from 'react';
import { Loader2, Printer, Sparkles } from 'lucide-react';
import type { Material, ModuleName } from '@/types';
import QuizComfortCard from './ComfortCard';
import { authenticatedHeaders, redirectAfterSessionExpiry } from '@/lib/authHeaders';

type Question = {
  id: string;
  question: string;
  options: { id: 'A'|'B'|'C'|'D'; text: string }[];
};
type Report = { module: ModuleName; score: number; isCorrect: boolean; feedback: string; diagnosticFocus: string; strengths: string[]; weaknesses: string[]; studyRecommendations: string[]; perQuestion?: { question_id: string; correct_answer: string; is_correct: boolean }[] };

function printReport(report: Report, question: Question) {
  try {
    const win = typeof window !== 'undefined' ? window.open('', '_blank', 'width=800,height=700') : null;
    if (win) {
      const doc = win.document;
      doc.title = 'MedAtlas Diagnostic Feedback';
      const style = doc.createElement('style');
      style.textContent = 'body{font:16px Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#172033}h1{color:#1d4ed8}li{margin:.5em 0}@media print{body{margin:0}}';
      doc.head.append(style);
      const main = doc.createElement('main');
      const h1 = doc.createElement('h1'); h1.textContent = 'MedAtlas Egypt · Quiz Feedback'; main.append(h1);
      const title = doc.createElement('h2'); title.textContent = report.module + ' diagnostic report'; main.append(title);
      const note = doc.createElement('p'); note.textContent = 'Not saved. Print or save it now.'; main.append(note);
      const q = doc.createElement('p'); q.textContent = question.question; main.append(q);
      const score = doc.createElement('p'); score.textContent = `Result: ${report.isCorrect ? 'Correct' : 'Review needed'} · ${report.score}%`; main.append(score);
      for (const [heading, value] of [['Feedback', report.feedback], ['Diagnostic focus', report.diagnosticFocus]] as const) {
        const h = doc.createElement('h3'); h.textContent = heading; main.append(h);
        const p = doc.createElement('p'); p.textContent = value; main.append(p);
      }
      for (const [heading, values] of [['Strengths', report.strengths], ['Review areas', report.weaknesses], ['Study recommendations', report.studyRecommendations]] as const) {
        if (!values.length) continue;
        const h = doc.createElement('h3'); h.textContent = heading; main.append(h);
        const ul = doc.createElement('ul');
        values.forEach((value) => { const li = doc.createElement('li'); li.textContent = value; ul.append(li); });
        main.append(ul);
      }
      doc.body.append(main);
      win.focus();
      win.setTimeout(() => { win.print(); win.close(); }, 200);
      return;
    }
  } catch {
    // fallback if window.open is blocked by iframe sandbox
  }
  if (typeof window !== 'undefined') {
    window.print();
  }
}

type QuizChoice = { id: string; title: string; quiz_number: number };

export default function MaterialQuiz({ material }: { material: Pick<Material, 'id' | 'module' | 'title'> }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Question['options'][number]['id'] | ''>('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [quizChoices, setQuizChoices] = useState<QuizChoice[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [selectedQuizTitle, setSelectedQuizTitle] = useState('');

  useEffect(() => {
    if (!retrySeconds) return;
    const timer = window.setTimeout(() => setRetrySeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  useEffect(() => {
    let cancelled = false;
    const checkAvailability = async () => {
      try {
        const headers = await authenticatedHeaders();
        const structuredResponse = await fetch('/api/quizzes?material_id=' + encodeURIComponent(material.id), { headers, cache: 'no-store' });
        const structured = await structuredResponse.json();
        if (structuredResponse.status === 401) { await redirectAfterSessionExpiry(); return; }
        if (!structuredResponse.ok) throw new Error(structured.error || 'Could not check quizzes.');
        if (Array.isArray(structured.quizzes) && structured.quizzes.length) {
          if (!cancelled) { setQuizChoices(structured.quizzes); setSelectedQuizId(structured.quizzes[0].id); setAvailable(true); }
          return;
        }
        const response = await fetch('/api/quiz/bank?material_id=' + encodeURIComponent(material.id), { headers, cache: 'no-store' });
        const data = await response.json();
        if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
        if (!cancelled && data.kind === 'fallback') { setQuestions([]); setAvailable(false); }
        else if (!cancelled) setAvailable(Array.isArray(data.questions));
      } catch {
        if (!cancelled) {
          setAvailable(true);
          setError('Could not check this lecture’s quiz bank. Try loading it again.');
        }
      }
    };
    checkAvailability();
    return () => { cancelled = true; };
  }, [material.id]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const headers = await authenticatedHeaders();
      if (quizChoices.length) {
        if (!selectedQuizId) { setError('Choose one of the available quizzes.'); return; }
        const response = await fetch(`/api/quizzes/${encodeURIComponent(selectedQuizId)}`, { headers, cache: 'no-store' });
        const data = await response.json();
        if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
        if (!response.ok) { setError(data.error || 'Could not load this quiz.'); return; }
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setSelectedQuizTitle(data.quiz?.title || 'Practice Quiz');
        setIndex(0); setSelected(''); setReport(null);
        return;
      }
      const response = await fetch('/api/quiz/bank?material_id=' + encodeURIComponent(material.id), { headers });
      const data = await response.json();
      if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
      window.dispatchEvent(new Event('credits_updated'));
      if (!response.ok) { setError(typeof data.message === 'string' ? data.message : 'Practice questions are temporarily unavailable.'); return; }
      if (data.kind === 'fallback') { setQuestions([]); return; }
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setIndex(0); setSelected(''); setReport(null);
    } catch { setError('Practice questions are temporarily unavailable.'); }
    finally { setLoading(false); }
  };

  const question = questions?.[index];
  const submit = async () => {
    if (!question || !selected) return;
    setLoading(true); setError('');
    try {
      const headers = await authenticatedHeaders();
      const response = await fetch('/api/gemini/quiz-eval', {
        method: 'POST', headers,
        body: JSON.stringify({
          ...(selectedQuizId ? { quiz_id: selectedQuizId } : { material_id: material.id }), answers: [{ qid: question.id, choice: selected }],
        }),
      });
      const data = await response.json();
      if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
      if (!response.ok) {
        if (data.kind === 'busy') setRetrySeconds(60);
        setError(typeof data.message === 'string' ? data.message : 'Dr. Atlas is catching his breath. Let’s give it another try in a moment!');
        if (data.report) setReport(data.report);
        return;
      }
      setReport(data.report);
    } catch { setError('Dr. Atlas is catching his breath. Let’s give it another try in a moment!'); }
    finally { setLoading(false); }
  };

  if (questions && questions.length === 0) return <QuizComfortCard />;

  return (
    <div className="mt-4 rounded-2xl border border-indigo-200 bg-white p-5 dark:border-indigo-900/50 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-bold text-slate-900 dark:text-white">Lecture Practice Quiz</h4>{selectedQuizTitle && <p className="mt-1 text-xs text-slate-500">{selectedQuizTitle}</p>}</div>
        {!questions && available && <div className="flex flex-wrap items-center gap-2">
          {quizChoices.length > 0 && <select aria-label="Choose a quiz" value={selectedQuizId} onChange={(event) => { setSelectedQuizId(event.target.value); setQuestions(null); setSelectedQuizTitle(''); }} className="rounded-xl border bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">{quizChoices.map((quiz) => <option key={quiz.id} value={quiz.id}>Quiz {quiz.quiz_number}: {quiz.title}</option>)}</select>}
          <button type="button" onClick={load} disabled={loading || (quizChoices.length > 0 && !selectedQuizId)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {quizChoices.length ? 'Start selected quiz' : 'Load practice questions'}
          </button>
        </div>}
      </div>
      {available === null && <p className="mt-3 text-xs text-slate-500">Checking lecture question bank…</p>}
      {error && <div role="alert" className="mt-3 text-sm text-rose-600"><p>{error}</p>{retrySeconds > 0 && <p className="mt-1 text-xs">Try again in {retrySeconds}s.</p>}{report && <button type="button" onClick={submit} disabled={loading || retrySeconds > 0 || !selected} className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{retrySeconds > 0 ? `Try again in ${retrySeconds}s` : 'Retry feedback'}</button>}</div>}
      {question && (
        <div className="mt-4 space-y-3">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{index + 1}. {question.question}</p>
          {question.options.map(option => (
            <label key={option.id} className="flex cursor-pointer gap-2 rounded-lg border p-3 text-sm dark:border-slate-700">
              <input type="radio" name={question.id} checked={selected === option.id} onChange={() => { setSelected(option.id); setReport(null); }} />
              <span><strong>{option.id}.</strong> {option.text}</span>
            </label>
          ))}
          {!report ? <button type="button" onClick={submit} disabled={!selected || loading || retrySeconds > 0} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Evaluating…' : retrySeconds > 0 ? `Try again in ${retrySeconds}s` : 'Submit answer'}</button> : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="font-bold">{report.isCorrect ? 'Correct' : 'Keep reviewing'} · {report.score}%</p>
              <p className="mt-2 text-sm">{report.feedback}</p>
              <p className="mt-2 text-xs"><strong>Diagnostic focus:</strong> {report.diagnosticFocus}</p>
            <p className="mt-2 text-xs font-semibold">Not saved. Print or save it now.</p>
            {report.perQuestion?.[0] && <p className="mt-2 text-xs"><strong>Answer key:</strong> {report.perQuestion[0].correct_answer}</p>}
            <button type="button" onClick={() => printReport(report, question)} className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><Printer className="h-4 w-4" /> Print / Save as PDF</button>
              {index + 1 < questions!.length && <button type="button" onClick={() => { setIndex(index + 1); setSelected(''); setReport(null); }} className="ml-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Next question</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
