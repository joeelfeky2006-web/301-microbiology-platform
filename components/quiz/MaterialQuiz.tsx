'use client';

import { useState } from 'react';
import { Loader2, Printer, Sparkles } from 'lucide-react';
import type { Material, ModuleName } from '@/types';
import QuizComfortCard from './ComfortCard';

type Question = {
  id: string;
  question: string;
  options: { id: 'A'|'B'|'C'|'D'; text: string }[];
  correctAnswer: 'A'|'B'|'C'|'D';
  explanation: string;
};
type Report = { module: ModuleName; score: number; isCorrect: boolean; feedback: string; diagnosticFocus: string; strengths: string[]; weaknesses: string[]; studyRecommendations: string[] };

function printReport(report: Report, question: Question) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=800,height=700');
  if (!win) return;
  const doc = win.document;
  doc.title = 'MedAtlas Diagnostic Feedback';
  const style = doc.createElement('style');
  style.textContent = 'body{font:16px Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#172033}h1{color:#1d4ed8}li{margin:.5em 0}@media print{body{margin:0}}';
  doc.head.append(style);
  const main = doc.createElement('main');
  const h1 = doc.createElement('h1'); h1.textContent = 'MedAtlas Egypt · Quiz Feedback'; main.append(h1);
  const title = doc.createElement('h2'); title.textContent = report.module + ' diagnostic report'; main.append(title);
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
}

export default function MaterialQuiz({ material }: { material: Material }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Question['correctAnswer'] | ''>('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/gemini/quiz-gen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: material.module,
          raw_quiz_text: material.raw_quiz_text || '',
          ai_context: material.ai_context || '',
          custom_system_prompt: material.custom_system_prompt || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load practice questions.');
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setIndex(0); setSelected(''); setReport(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load practice questions.'); }
    finally { setLoading(false); }
  };

  const question = questions?.[index];
  const submit = async () => {
    if (!question || !selected) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/gemini/quiz-eval', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: material.module, topic: material.title,
          question: question.question, correctAnswer: question.correctAnswer, selectedAnswer: selected,
          ai_context: material.ai_context || '', custom_system_prompt: material.custom_system_prompt || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not evaluate this answer.');
      setReport(data.report);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not evaluate this answer.'); }
    finally { setLoading(false); }
  };

  if (questions && questions.length === 0) return <QuizComfortCard />;

  return (
    <div className="mt-4 rounded-2xl border border-indigo-200 bg-white p-5 dark:border-indigo-900/50 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-bold text-slate-900 dark:text-white">Lecture Practice Quiz</h4>
        {!questions && <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Load practice questions
        </button>}
      </div>
      {!questions && !material.raw_quiz_text?.trim() && <div className="mt-4"><QuizComfortCard /></div>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
      {question && (
        <div className="mt-4 space-y-3">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{index + 1}. {question.question}</p>
          {question.options.map(option => (
            <label key={option.id} className="flex cursor-pointer gap-2 rounded-lg border p-3 text-sm dark:border-slate-700">
              <input type="radio" name={question.id} checked={selected === option.id} onChange={() => { setSelected(option.id); setReport(null); }} />
              <span><strong>{option.id}.</strong> {option.text}</span>
            </label>
          ))}
          {!report ? <button type="button" onClick={submit} disabled={!selected || loading} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Evaluating…' : 'Submit answer'}</button> : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="font-bold">{report.isCorrect ? 'Correct' : 'Keep reviewing'} · {report.score}%</p>
              <p className="mt-2 text-sm">{report.feedback}</p>
              <p className="mt-2 text-xs"><strong>Diagnostic focus:</strong> {report.diagnosticFocus}</p>
              <p className="mt-2 text-xs"><strong>Explanation:</strong> {question.explanation}</p>
              <button type="button" onClick={() => printReport(report, question)} className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><Printer className="h-4 w-4" /> Print / Save as PDF</button>
              {index + 1 < questions!.length && <button type="button" onClick={() => { setIndex(index + 1); setSelected(''); setReport(null); }} className="ml-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Next question</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
