'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2, Upload, PlusCircle, RefreshCw } from 'lucide-react';
import { authenticatedHeaders } from '@/lib/authHeaders';
import { inputClass } from '@/lib/ui';

type MaterialOption = { id: string; module: string; title: string };
type QuizRow = {
  id: string;
  module: string;
  lecture_title: string;
  quiz_number: number;
  title: string;
  time_limit_minutes: number | null;
  is_published: boolean;
};
const example = JSON.stringify([{ question: 'Which organism is classically associated with this finding?', options: [{ id: 'A', text: 'Option A' }, { id: 'B', text: 'Option B' }, { id: 'C', text: 'Option C' }, { id: 'D', text: 'Option D' }], correctAnswer: 'A', explanation: 'Add a concise explanation.' }], null, 2);

export default function QuizManager() {
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [materialId, setMaterialId] = useState('');
  const [number, setNumber] = useState('1');
  const [title, setTitle] = useState('Quiz 1');
  const [timeLimit, setTimeLimit] = useState('');
  const [draft, setDraft] = useState(example);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const headers = await authenticatedHeaders();
    const [materialResponse, quizResponse] = await Promise.all([
      fetch('/api/admin/materials', { headers, cache: 'no-store' }),
      fetch('/api/admin/quizzes', { headers, cache: 'no-store' }),
    ]);
    const [materialData, quizData] = await Promise.all([materialResponse.json(), quizResponse.json()]);
    if (!materialResponse.ok) throw new Error(materialData.error || 'Could not load lectures.');
    if (!quizResponse.ok) throw new Error(quizData.error || 'Could not load quizzes.');
    const uniqueMaterials = new Map<string, MaterialOption>();
    for (const item of (materialData.materials || []) as MaterialOption[]) {
      if (item.id && item.module && item.title && !uniqueMaterials.has(`${item.module}\0${item.title}`)) uniqueMaterials.set(`${item.module}\0${item.title}`, item);
    }
    const nextMaterials = Array.from(uniqueMaterials.values());
    setMaterials(nextMaterials);
    setQuizzes(quizData.quizzes || []);
    setMaterialId((current) => current || nextMaterials[0]?.id || '');
  }, []);

  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load quiz data.')); }, [refresh]);

  const createQuiz = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const questions = JSON.parse(draft);
      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { ...(await authenticatedHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          quiz_number: Number(number),
          title,
          time_limit_minutes: timeLimit.trim() === '' ? null : Number(timeLimit),
          questions,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save quiz.');
      setMessage(`${result.quiz.title} was added.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enter valid JSON quiz data.'); }
    finally { setBusy(false); }
  };

  const removeQuiz = async (quiz: QuizRow) => {
    if (!window.confirm(`Delete “${quiz.title}” from ${quiz.lecture_title}?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/quizzes/${encodeURIComponent(quiz.id)}`, { method: 'DELETE', headers: await authenticatedHeaders() });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete quiz.');
      await refresh(); setMessage('Quiz deleted.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete quiz.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Multi-Quiz Manager</h2><p className="mt-1 text-sm text-slate-500">Create multiple structured quizzes for each lecture. Leave time blank for untimed-only quizzes.</p></div><button type="button" onClick={() => { setError(''); void refresh().catch((cause) => setError(cause.message)); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
      <form onSubmit={createQuiz} className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Lecture<select required value={materialId} onChange={(event) => setMaterialId(event.target.value)} className={`${inputClass} mt-1`}>{materials.map((item) => <option key={item.id} value={item.id}>[{item.module}] {item.title}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">Quiz number<input required min={1} max={100} type="number" value={number} onChange={(event) => setNumber(event.target.value)} className={`${inputClass} mt-1`}/></label>
            <label className="text-sm font-semibold">Quiz title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className={`${inputClass} mt-1`}/></label>
          </div>
        </div>
        <label className="block text-sm font-semibold">Timed quiz (minutes, optional)
          <input min={1} max={180} type="number" value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} placeholder="Leave blank for untimed only" className={`${inputClass} mt-1`} />
          <span className="mt-1 block text-xs font-normal text-slate-500">Students can still choose an untimed attempt when a limit is set.</span>
        </label>
        <label className="block text-sm font-semibold">Questions JSON <span className="font-normal text-slate-500">(1–200 MCQs; four options A–D per question)</span><textarea required rows={14} value={draft} onChange={(event) => setDraft(event.target.value)} className={`${inputClass} mt-1 font-mono text-xs`} /></label>
        <div className="flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><Upload className="h-4 w-4"/>Load JSON file<input type="file" accept="application/json,.json" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setDraft(await file.text()); event.currentTarget.value = ''; }}/></label><button type="submit" disabled={busy || !materialId} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><PlusCircle className="h-4 w-4"/>{busy ? 'Saving…' : 'Create quiz'}</button></div>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}{message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
      <details className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Show JSON example</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 dark:bg-slate-950">{example}</pre></details>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900"><h3 className="font-bold">Saved quizzes ({quizzes.length})</h3><div className="mt-3 divide-y dark:divide-white/10">{quizzes.map((quiz) => <div key={quiz.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">[{quiz.module}] {quiz.lecture_title}</p><p className="text-xs text-slate-500">Quiz {quiz.quiz_number}: {quiz.title} · {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min timed option` : 'Untimed only'} · {quiz.is_published ? 'Published' : 'Draft'}</p></div><button type="button" disabled={busy} onClick={() => void removeQuiz(quiz)} aria-label={`Delete ${quiz.title}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4"/></button></div>)}{!quizzes.length && <p className="py-5 text-sm text-slate-500">No structured quizzes have been created yet.</p>}</div></section>
  </div>;
}
