'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2, RefreshCw, PlusCircle, Layers } from 'lucide-react';
import { authenticatedHeaders } from '@/lib/authHeaders';
import { inputClass } from '@/lib/ui';

type MaterialOption = { id: string; module: string; title: string; raw_flashcard_text?: string | null };
type DeckRow = {
  id: string;
  module: string;
  lecture_title: string;
  deck_number: number;
  title: string;
  is_published: boolean;
};

export default function FlashcardManager() {
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [materialId, setMaterialId] = useState('');
  const [number, setNumber] = useState('1');
  const [title, setTitle] = useState('Flashcards 1');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const headers = await authenticatedHeaders();
    const [materialResponse, deckResponse] = await Promise.all([
      fetch('/api/admin/materials', { headers, cache: 'no-store' }),
      fetch('/api/admin/flashcards', { headers, cache: 'no-store' }),
    ]);
    const [materialData, deckData] = await Promise.all([materialResponse.json(), deckResponse.json()]);
    if (!materialResponse.ok) throw new Error(materialData.error || 'Could not load lectures.');
    if (!deckResponse.ok) throw new Error(deckData.error || 'Could not load decks.');
    const uniqueMaterials = new Map<string, MaterialOption>();
    for (const item of (materialData.materials || []) as MaterialOption[]) {
      if (item.id && item.module && item.title && !uniqueMaterials.has(`${item.module}\0${item.title}`)) {
        uniqueMaterials.set(`${item.module}\0${item.title}`, item);
      }
    }
    const nextMaterials = Array.from(uniqueMaterials.values());
    setMaterials(nextMaterials);
    setDecks(deckData.decks || []);
    setMaterialId((current) => current || nextMaterials[0]?.id || '');
  }, []);

  useEffect(() => {
    void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load flashcard data.'));
  }, [refresh]);

  const selected = materials.find((m) => m.id === materialId);
  const hasRaw = Boolean(selected?.raw_flashcard_text?.trim());

  const publishFromRaw = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/flashcards', {
        method: 'POST',
        headers: { ...(await authenticatedHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          deck_number: Number(number),
          title,
          from_raw: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not publish deck.');
      setMessage(`${result.deck.title} published (${result.card_count} cards).`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish deck.');
    } finally {
      setBusy(false);
    }
  };

  const removeDeck = async (deck: DeckRow) => {
    if (!window.confirm(`Delete “${deck.title}” from ${deck.lecture_title}?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/flashcards/${encodeURIComponent(deck.id)}`, {
        method: 'DELETE',
        headers: await authenticatedHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete deck.');
      await refresh();
      setMessage('Deck deleted.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete deck.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Flashcard Deck Manager</h2>
            <p className="mt-1 text-sm text-slate-500">
              Publish a structured deck from the material’s raw flashcard text (Q:/A:). Students also study the raw bank directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError('');
              void refresh().catch((cause) => setError(cause.message));
            }}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        <form onSubmit={publishFromRaw} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Lecture
              <select required value={materialId} onChange={(event) => setMaterialId(event.target.value)} className={`${inputClass} mt-1`}>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.module}] {item.title}
                    {item.raw_flashcard_text?.trim() ? ' · has raw bank' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">
                Deck number
                <input required min={1} max={100} type="number" value={number} onChange={(event) => setNumber(event.target.value)} className={`${inputClass} mt-1`} />
              </label>
              <label className="text-sm font-semibold">
                Deck title
                <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className={`${inputClass} mt-1`} />
              </label>
            </div>
          </div>
          <p className={`text-xs font-semibold ${hasRaw ? 'text-emerald-700' : 'text-amber-700'}`}>
            {hasRaw
              ? 'Raw flashcard text found on this material — ready to publish as a deck.'
              : 'No raw flashcard text on this material. Add it in Publish Material / Edit Material first.'}
          </p>
          <button
            type="submit"
            disabled={busy || !materialId || !hasRaw}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <Layers className="h-4 w-4" />
            {busy ? 'Publishing…' : 'Publish deck from raw text'}
          </button>
          <p className="text-xs text-slate-500">
            Or use <PlusCircle className="inline h-3 w-3" /> Create new material with a flashcard bank paste.
          </p>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
        <h3 className="font-bold">Published decks ({decks.length})</h3>
        <div className="mt-3 divide-y dark:divide-white/10">
          {decks.map((deck) => (
            <div key={deck.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold">
                  [{deck.module}] {deck.lecture_title}
                </p>
                <p className="text-xs text-slate-500">
                  Deck {deck.deck_number}: {deck.title} · {deck.is_published ? 'Published' : 'Draft'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeDeck(deck)}
                aria-label={`Delete ${deck.title}`}
                className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!decks.length && <p className="py-5 text-sm text-slate-500">No published flashcard decks yet.</p>}
        </div>
      </section>
    </div>
  );
}
