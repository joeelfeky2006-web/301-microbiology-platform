'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, BookOpen, CheckCircle2, Clock3, Mail, ShieldCheck, Sparkles, UserRound, Save } from 'lucide-react';
import { authenticatedHeaders, redirectAfterSessionExpiry } from '@/lib/authHeaders';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { MODULE_NAMES, MODULE_TITLES, type ModuleName } from '@/types';
import { hasFirstPulse } from '@/lib/firstPulse';
import AtlasCoin from '@/components/brand/AtlasCoin';
import FirstPulseBadge from '@/components/brand/FirstPulseBadge';

type ProfilePayload = {
  profile: { id: string; name: string; university_id: string; email: string; email_confirmed: boolean; created_at: string; last_sign_in_at: string | null };
  credits: { daily_remaining: number; daily_limit: number; monthly_remaining: number; monthly_limit: number; bonus_balance?: number };
  credits_available: boolean;
  history: { id: string; event_type: 'spend' | 'refund' | 'grant'; action: string; amount: number; daily_remaining: number; monthly_remaining: number; created_at: string }[];
  history_available: boolean;
};

const PREFERENCE_KEY = 'medatlas_profile_preferences';

export default function ProfilePage() {
  const session = useSession();
  const router = useRouter();
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preferredModule, setPreferredModule] = useState<ModuleName>('URS');
  const [compactCards, setCompactCards] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [profileNoticeType, setProfileNoticeType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (session === null) router.replace('/sign-in?redirect=%2Fprofile');
    if (session === undefined) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/profile', { headers: await authenticatedHeaders(), cache: 'no-store' });
        if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not load your profile.');
        if (!cancelled) {
          const profilePayload = payload as ProfilePayload;
          setData(profilePayload);
          setName(profilePayload.profile.name);
          setEmail(profilePayload.profile.email);
          setUniversityId(profilePayload.profile.university_id || '');
        }
      } catch (loadError) {
        console.error('Could not load profile:', loadError);
        if (!cancelled) setError('We could not load your profile right now. Please try again shortly.');
      } finally { if (!cancelled) setLoading(false); }
    };
    if (session) void load();
    return () => { cancelled = true; };
  }, [session, router]);

  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem(PREFERENCE_KEY) || '{}') as { preferredModule?: ModuleName; compactCards?: boolean };
      if (preferences.preferredModule && MODULE_NAMES.includes(preferences.preferredModule)) setPreferredModule(preferences.preferredModule);
      if (typeof preferences.compactCards === 'boolean') setCompactCards(preferences.compactCards);
    } catch { /* Keep safe defaults if browser storage is unavailable or malformed. */ }
  }, []);

  const savePreferences = () => {
    try {
      localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ preferredModule, compactCards }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch { setError('Your browser could not save these preferences.'); }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileNotice('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: await authenticatedHeaders(),
        body: JSON.stringify({ name, email, university_id: universityId }),
      });
      const payload = await response.json();
      if (response.status === 401) { await redirectAfterSessionExpiry(); return; }
      if (!response.ok) throw new Error(payload.error || 'Could not save your profile.');
      const authWithRefresh = supabase.auth as unknown as { refreshSession?: () => Promise<{ data: { session: unknown } }> };
      const refreshed = await authWithRefresh.refreshSession?.();
      const updated = { ...data!, profile: payload.profile as ProfilePayload['profile'] };
      setData(updated);
      setName(updated.profile.name);
      setUniversityId(updated.profile.university_id);
      setEmail(payload.email_change_pending ? email.trim() : updated.profile.email);
      setProfileNotice(payload.email_change_pending
        ? 'Profile saved. Confirm the email-change message sent by Supabase before the new email becomes active.'
        : 'Profile saved successfully.');
      setProfileNoticeType('success');

      // Dispatch event and update any stored local session so changes reflect immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile_saved', { detail: payload.profile }));
        try {
          const stored = localStorage.getItem('micro_atlas_session');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.user) {
              parsed.user.user_metadata = {
                ...parsed.user.user_metadata,
                name: updated.profile.name,
                university_id: updated.profile.university_id,
              };
              localStorage.setItem('micro_atlas_session', JSON.stringify(parsed));
            }
          }
        } catch {
          // ignore
        }
      }
      if (refreshed && !refreshed.data.session) console.warn('Profile saved, but the local session could not be refreshed.');
    } catch (saveError) {
      setProfileNotice(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
      setProfileNoticeType('error');
    } finally { setProfileSaving(false); }
  };

  if (session === undefined || loading) return <main className="mx-auto max-w-5xl p-6"><p className="text-sm text-slate-500">Loading your profile…</p></main>;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-cyan-300"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        <div className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 shadow-sm dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 sm:flex-row sm:items-center sm:p-8">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><UserRound className="h-7 w-7" /></span>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-300">Student profile</p><h1 className="mt-1 break-words text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">{data?.profile.name || session?.user?.user_metadata?.name || 'Your account'}</h1><p className="mt-1 flex items-center gap-2 break-all text-sm text-slate-600 dark:text-slate-300"><Mail className="h-4 w-4 shrink-0" />{data?.profile.email || session?.user?.email}</p>{data?.profile.university_id && <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">University ID: {data.profile.university_id}</p>}{hasFirstPulse(data?.profile.created_at ?? session?.user?.created_at) && <div className="mt-3 flex flex-wrap items-center gap-2"><FirstPulseBadge /><span className="text-xs text-slate-500 dark:text-slate-400">Joined during the beta</span></div>}</div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${data?.profile.email_confirmed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'}`}><ShieldCheck className="h-4 w-4" />{data?.profile.email_confirmed ? 'Email confirmed' : 'Email confirmation pending'}</div>
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-blue-600 dark:text-cyan-300" /><div><h2 className="font-bold text-slate-900 dark:text-white">Account details</h2><p className="text-xs text-slate-500">Keep your student information up to date.</p></div></div>
          {profileNotice && <p role={profileNoticeType === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-lg p-3 text-sm ${profileNoticeType === 'error' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>{profileNotice}</p>}
          <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Full name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email address<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /><span className="mt-1 block font-normal text-slate-500">Changing your email requires confirmation.</span></label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">University ID<input required maxLength={64} value={universityId} onChange={(event) => setUniversityId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>
            <div className="sm:col-span-2"><button type="submit" disabled={profileSaving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Save className="h-4 w-4" />{profileSaving ? 'Saving…' : 'Save account details'}</button></div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center gap-2"><AtlasCoin className="h-5 w-5" /><h2 className="font-bold text-slate-900 dark:text-white">Atlas Credits</h2></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Daily balance</p><p className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">{data?.credits_available ? data.credits.daily_remaining : 'Unavailable'}{data?.credits_available && <span className="text-sm text-slate-400"> / {data.credits.daily_limit}</span>}</p></div>
              <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/40"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly balance</p><p className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">{data?.credits_available ? data.credits.monthly_remaining : 'Unavailable'}{data?.credits_available && <span className="text-sm text-slate-400"> / {data.credits.monthly_limit}</span>}</p></div>
            </div>
            {data?.credits_available && (data.credits.bonus_balance || 0) > 0 && (
              <div className="mt-3 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Pack credits</p>
                <p className="mt-1 font-mono text-2xl font-black text-emerald-900 dark:text-emerald-200">+{data.credits.bonus_balance}</p>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">Free balances refresh on the daily and monthly reset schedule. Pack credits do not expire yet.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-300" /><h2 className="font-bold text-slate-900 dark:text-white">Learning preferences</h2></div>
            <label className="mt-4 block text-xs font-semibold text-slate-600 dark:text-slate-300">Preferred module</label>
            <select value={preferredModule} onChange={(event) => setPreferredModule(event.target.value as ModuleName)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">{MODULE_NAMES.map((name) => <option key={name} value={name}>{name} — {MODULE_TITLES[name]}</option>)}</select>
            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input type="checkbox" checked={compactCards} onChange={(event) => setCompactCards(event.target.checked)} className="rounded border-slate-300 text-blue-600" />Use compact dashboard cards</label>
            <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={savePreferences} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Save preferences</button>{saved && <span role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Saved on this device</span>}</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-200 p-5 dark:border-white/10"><Activity className="h-5 w-5 text-blue-600 dark:text-cyan-300" /><div><h2 className="font-bold text-slate-900 dark:text-white">Recent credit activity</h2><p className="text-xs text-slate-500">Latest 20 spend, refund, and grant events</p></div></div>
          {!data?.history_available ? <p className="p-5 text-sm text-amber-700 dark:text-amber-300">Credit history is not set up yet. The profile and account editor still work; ask an administrator to apply the credit-history migration.</p> : !data.history.length ? <p className="p-5 text-sm text-slate-500">No credit activity recorded yet.</p> : <ul className="divide-y divide-slate-100 dark:divide-white/5">{data.history.map((event) => <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.event_type === 'refund' || event.event_type === 'grant' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300'}`}>{event.event_type === 'spend' ? <Sparkles className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</span><div className="min-w-0"><p className="truncate text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">{event.action.replace('-', ' ')} · {event.event_type}</p><p className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" />{new Date(event.created_at).toLocaleString()}</p></div></div><div className="text-right"><p className={`font-mono text-sm font-bold ${event.event_type === 'spend' ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-700 dark:text-emerald-300'}`}>{event.event_type === 'spend' ? '−' : '+'}{event.amount} credit{event.amount === 1 ? '' : 's'}</p><p className="text-[10px] text-slate-500">{event.daily_remaining} daily · {event.monthly_remaining} monthly left</p></div></li>)}</ul>}
          <div className="border-t border-slate-100 p-4 dark:border-white/5"><Link href={`/modules/${preferredModule}`} className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:underline dark:text-cyan-300">Continue with {preferredModule} <ArrowLeft className="h-3.5 w-3.5 rotate-180" /></Link></div>
        </section>
      </div>
    </main>
  );
}
