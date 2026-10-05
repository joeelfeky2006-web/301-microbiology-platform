'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw, Layers } from 'lucide-react';
import type { Material } from '@/types';
import { authenticatedHeaders, redirectAfterSessionExpiry } from '@/lib/authHeaders';
import type { SrsRating } from '@/lib/flashcards/srs';

type DeckChoice = { id: string; title: string; deck_number: number };

type StudyCard = {
  id: string;
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  isNew?: boolean;
};

type Stats = { due: number; new: number; learned: number; total: number };

type Phase = 'lobby' | 'study' | 'done';

const RATINGS: { id: SrsRating; label: string; className: string }[] = [
  { id: 'again', label: 'Again', className: 'bg-rose-600 hover:bg-rose-700' },
  { id: 'hard', label: 'Hard', className: 'bg-amber-600 hover:bg-amber-700' },
  { id: 'good', label: 'Good', className: 'bg-emerald-600 hover:bg-emerald-700' },
  { id: 'easy', label: 'Easy', className: 'bg-blue-600 hover:bg-blue-700' },
];

export default function MaterialFlashcards({ material }: { material: Pick<Material, 'id' | 'module' | 'title'> }) {
  const [phase, setPhase] = useState<Phase>('lobby');
  const [decks, setDecks] = useState<DeckChoice[]>([]);
  const [hasRawBank, setHasRawBank] = useState(false);
  const [rawCardCount, setRawCardCount] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<'raw' | string>('');
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [deckId, setDeckId] = useState<string | null>(null);
  const [bankMaterialId, setBankMaterialId] = useState(material.id);
  const [loading, setLoading] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(0);

  const refreshLobby = useCallback(async () => {
    setError('');
    try {
      const headers = await authenticatedHeaders();
      const response = await fetch(`/api/flashcards?material_id=${encodeURIComponent(material.id)}`, {
        headers,
        cache: 'no-store',
      });
      const data = await response.json();
      if (response.status === 401) {
        await redirectAfterSessionExpiry();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'unavailable');
      const nextDecks = Array.isArray(data.decks) ? data.decks : [];
      const raw = Boolean(data.has_raw_bank);
      setDecks(nextDecks);
      setHasRawBank(raw);
      setRawCardCount(Number(data.raw_card_count) || 0);
      if (typeof data.material_id === 'string') setBankMaterialId(data.material_id);
      setAvailable(raw || nextDecks.length > 0);
      setSelected((current) => {
        if (current === 'raw' && raw) return 'raw';
        if (typeof current === 'string' && current && nextDecks.some((d: DeckChoice) => d.id === current)) return current;
        if (raw) return 'raw';
        return nextDecks[0]?.id || '';
      });
    } catch {
      setAvailable(false);
      setError('Could not check flashcards for this lecture.');
    }
  }, [material.id]);

  useEffect(() => {
    void refreshLobby();
  }, [refreshLobby]);

  const startSession = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const headers = await authenticatedHeaders();
      const url =
        selected === 'raw'
          ? `/api/flashcards/bank?material_id=${encodeURIComponent(bankMaterialId || material.id)}`
          : `/api/flashcards/${encodeURIComponent(selected)}`;
      const response = await fetch(url, { headers, cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) {
        await redirectAfterSessionExpiry();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Could not load cards.');
      const queue = Array.isArray(data.cards) ? data.cards : [];
      setCards(queue);
      setStats(data.stats || null);
      setSessionTitle(data.deck?.title || 'Flashcards');
      setDeckId(typeof data.deck?.id === 'string' ? data.deck.id : null);
      if (typeof data.deck?.material_id === 'string') setBankMaterialId(data.deck.material_id);
      setIndex(0);
      setFlipped(false);
      setReviewed(0);
      setPhase(queue.length ? 'study' : 'done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start study session.');
    } finally {
      setLoading(false);
    }
  };

  const rate = async (rating: SrsRating) => {
    const card = cards[index];
    if (!card || ratingBusy) return;
    setRatingBusy(true);
    setError('');
    try {
      const response = await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { ...(await authenticatedHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: bankMaterialId || material.id,
          deck_id: deckId,
          card_id: card.id,
          rating,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        await redirectAfterSessionExpiry();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Could not save review.');
      setReviewed((n) => n + 1);
      setFlipped(false);
      if (index + 1 >= cards.length) {
        setPhase('done');
      } else {
        setIndex((i) => i + 1);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save review.');
    } finally {
      setRatingBusy(false);
    }
  };

  if (available === null) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking flashcards…
      </div>
    );
  }

  if (!available) return null;

  const card = cards[index];

  return (
    <div className="mt-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-white p-4 dark:border-teal-900/40 dark:from-teal-950/30 dark:to-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-teal-900 dark:text-teal-200">
            <Layers className="h-4 w-4" /> Flashcards
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">Spaced repetition · free study</p>
        </div>
        {phase !== 'lobby' && (
          <button
            type="button"
            onClick={() => {
              setPhase('lobby');
              setCards([]);
              void refreshLobby();
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Lobby
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {phase === 'lobby' && (
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-semibold text-slate-600">
            Deck
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
            >
              {hasRawBank && (
                <option value="raw">
                  Material bank ({rawCardCount} cards)
                </option>
              )}
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  Deck {deck.deck_number}: {deck.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading || !selected}
            onClick={() => void startSession()}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Study due cards'}
          </button>
        </div>
      )}

      {phase === 'study' && card && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{sessionTitle}</span>
            <span>
              {index + 1} / {cards.length}
              {stats ? ` · ${stats.due} due · ${stats.new} new` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFlipped((v) => !v)}
            className="min-h-[160px] w-full rounded-xl border border-teal-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-400 dark:border-teal-900/50 dark:bg-slate-950"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-600">
              {flipped ? 'Answer' : 'Prompt'}
              {card.isNew ? ' · new' : ''}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-900 dark:text-slate-100">
              {flipped ? card.back : card.front}
            </p>
            {!flipped && card.hint && (
              <p className="mt-3 text-xs text-slate-500">Hint: {card.hint}</p>
            )}
            <p className="mt-4 text-center text-[11px] text-slate-400">
              Tap to {flipped ? 'hide answer' : 'reveal answer'}
            </p>
          </button>
          {flipped && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={ratingBusy}
                  onClick={() => void rate(item.id)}
                  className={`rounded-lg py-2 text-xs font-bold text-white disabled:opacity-50 ${item.className}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="mt-3 space-y-3 text-center">
          <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">
            {reviewed > 0 ? `Session complete — ${reviewed} card${reviewed === 1 ? '' : 's'} reviewed.` : 'Nothing due right now. Come back later.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase('lobby');
              void refreshLobby();
            }}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white"
          >
            Back to lobby
          </button>
        </div>
      )}
    </div>
  );
}
