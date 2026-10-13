'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, ExternalLink, Timer, Trophy } from 'lucide-react';
import { authenticatedHeaders, redirectAfterSessionExpiry } from '@/lib/authHeaders';
import { useSession } from '@/lib/useSession';
import { REP_CHALLENGE, challengePhase, type ChallengePhase } from '@/lib/repChallenge';
import AtlasCoin from '@/components/brand/AtlasCoin';
import SocialIcon from '@/components/brand/SocialIcon';

type ChallengeStatus = { phase: ChallengePhase; preview: boolean; formConfigured: boolean; formUrl: string | null; embedUrl: string | null; serverTime: string };

const cairoTime = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', ...options }).format(new Date(iso));

const RULES: [string, string][] = [
  ['Follow @medatlas_eg on Instagram and join our WhatsApp Channel', 'تابعنا على إنستجرام وانضم لقناة الواتساب'],
  [`${cairoTime(REP_CHALLENGE.opensAt, { weekday: 'long', day: 'numeric', month: 'long' })}: opens ${cairoTime(REP_CHALLENGE.opensAt, { hour: 'numeric', minute: '2-digit' })}, last entry ${cairoTime(REP_CHALLENGE.lastEntryAt, { hour: 'numeric', minute: '2-digit' })}`, 'يفتح 9:00 م، وآخر دخول 9:15 م'],
  [`${REP_CHALLENGE.questions} MCQs (cases included) on the 2 REP lectures · ${REP_CHALLENGE.minutes} minutes · one attempt`, `${REP_CHALLENGE.questions} سؤال منهم حالات مرضية، ${REP_CHALLENGE.minutes} دقيقة، ومحاولة واحدة`],
  ['Highest score wins. In a tie, the fastest time wins.', 'أعلى درجة تكسب، ولو في تعادل الأسرع يكسب'],
  ['Use the same email as your MedAtlas account. Only your first attempt counts.', 'استخدم نفس إيميل حسابك على MedAtlas، وأول محاولة بس اللي بتتحسب'],
  ['Winners are checked by university ID and Instagram, and announced with the answers on Friday 16 October, 8 PM.', 'هنتأكد من الفايزين ونعلنهم مع الإجابات الجمعة 16 أكتوبر 8 م'],
];

function useCountdown(target: number, offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [offset]);
  const left = Math.max(0, target - now);
  return { now, left, d: Math.floor(left / 864e5), h: Math.floor(left / 36e5) % 24, m: Math.floor(left / 6e4) % 60, s: Math.floor(left / 1e3) % 60 };
}

export default function RepChallengePage() {
  const session = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<ChallengeStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const response = await fetch('/api/rep-challenge', { headers: await authenticatedHeaders(), cache: 'no-store' });
      if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
      const payload = (await response.json()) as ChallengeStatus;
      if (!response.ok) throw new Error('Could not load the challenge.');
      setOffset(Date.parse(payload.serverTime) - Date.now());
      setStatus(payload);
      // Once the exam is on screen it stays mounted, so the entry deadline never interrupts a student mid-exam.
      if (payload.embedUrl) setEmbedUrl((current) => current || payload.embedUrl);
      if (payload.formUrl) setFormUrl((current) => current || payload.formUrl);
      setError('');
    } catch {
      setError('We could not load the challenge right now. Refresh the page in a moment.');
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    if (session === null) router.replace('/sign-in?redirect=%2Frep-challenge');
    if (session) void load();
  }, [session, router, load]);

  const opens = Date.parse(REP_CHALLENGE.opensAt);
  const { now, d, h, m, s } = useCountdown(opens, offset);
  const phase = challengePhase(now);

  const lastPhase = useRef<ChallengePhase | null>(null);
  useEffect(() => {
    if (!session || embedUrl) return;
    if (lastPhase.current && lastPhase.current !== phase) void load();
    lastPhase.current = phase;
    if (phase !== 'open') return;
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
  }, [phase, session, embedUrl, load]);

  if (session === undefined || (session && !status && !error)) {
    return <main className="mx-auto max-w-4xl p-6"><p className="text-sm text-slate-500">Loading the challenge…</p></main>;
  }

  const date = cairoTime(REP_CHALLENGE.opensAt, { weekday: 'long', day: 'numeric', month: 'long' });
  const window_ = `${cairoTime(REP_CHALLENGE.opensAt, { hour: 'numeric', minute: '2-digit' })} – ${cairoTime(REP_CHALLENGE.closesAt, { hour: 'numeric', minute: '2-digit' })}`;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-cyan-300"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>

        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1230] via-[#141B45] to-[#2B1640] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">Competition · مسابقة</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{REP_CHALLENGE.title}</h1>
          <p dir="rtl" className="mt-1 text-right text-lg font-semibold text-white/85 sm:text-left">{REP_CHALLENGE.titleAr}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><CalendarClock className="h-4 w-4 text-teal-300" />{date} · {window_} (Cairo)</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><Timer className="h-4 w-4 text-teal-300" />{REP_CHALLENGE.questions} MCQs · {REP_CHALLENGE.minutes} min</span>
          </div>
          <div className="mt-6 max-w-sm rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80"><Trophy className="h-4 w-4" />Winner · الفايز</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-black"><AtlasCoin className="h-7 w-7" />50 Atlas Credits</p>
          </div>
        </section>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}

        {status?.preview && !embedUrl && <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Admin preview: {status.formConfigured ? 'the form is configured.' : 'REP_CHALLENGE_FORM_URL is not set yet.'}</p>}

        {embedUrl ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
              <div><h2 className="font-bold text-slate-900 dark:text-white">The exam is open · الامتحان فتح</h2><p className="text-xs text-slate-500">Your {REP_CHALLENGE.minutes}-minute timer starts when you begin the form. Submit before it runs out.</p></div>
              {formUrl && <a href={formUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Open in a new tab<ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
            <iframe src={embedUrl} title={REP_CHALLENGE.title} className="block h-[80vh] min-h-[640px] w-full border-0 bg-white" allow="clipboard-write" />
            <p className="border-t border-slate-100 p-3 text-xs text-slate-500 dark:border-white/5">If the form does not load on your phone, use “Open in a new tab”. Only your first attempt counts.</p>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
            {phase === 'upcoming' && (
              <>
                <p className="text-sm font-semibold text-slate-500">The exam opens here in · الامتحان هيفتح هنا بعد</p>
                <div className="mt-4 flex justify-center gap-3 font-mono">
                  {[[d, 'days'], [h, 'hours'], [m, 'min'], [s, 'sec']].map(([value, label]) => (
                    <div key={label} className="w-16 rounded-xl bg-slate-100 py-3 dark:bg-slate-800 sm:w-20"><p className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">{String(value).padStart(2, '0')}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p></div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500">Keep this page open or come back at {cairoTime(REP_CHALLENGE.opensAt, { hour: 'numeric', minute: '2-digit' })}. Last entry {cairoTime(REP_CHALLENGE.lastEntryAt, { hour: 'numeric', minute: '2-digit' })}.</p>
              </>
            )}
            {phase === 'open' && <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">The exam link is loading. If it doesn’t appear in a few seconds, refresh the page.</p>}
            {phase === 'entry-closed' && <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Entry closed at {cairoTime(REP_CHALLENGE.lastEntryAt, { hour: 'numeric', minute: '2-digit' })}. If you already started, finish and submit in your open form. <span dir="rtl" className="block">الدخول قفل. لو بدأت خلّص وسلّم.</span></p>}
            {phase === 'ended' && <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">The challenge has ended. Winners and answers: Friday 16 October, 8 PM on Instagram. <span dir="rtl" className="block">التحدي خلص، والنتيجة الجمعة 8 م على إنستجرام.</span></p>}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-6">
          <h2 className="font-bold text-slate-900 dark:text-white">Rules · القواعد</h2>
          <ol className="mt-4 space-y-3">
            {RULES.map(([en, ar], index) => (
              <li key={en} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">{index + 1}</span>
                <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{en}</p><p dir="rtl" className="text-left text-xs text-slate-500">{ar}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={REP_CHALLENGE.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"><SocialIcon network="instagram" />Follow @medatlas_eg</a>
            <a href={REP_CHALLENGE.whatsappChannel} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"><SocialIcon network="whatsapp" />Join the WhatsApp Channel</a>
          </div>
        </section>
      </div>
    </main>
  );
}
