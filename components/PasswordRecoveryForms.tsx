'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cardClass, inputClass, labelClass } from '@/lib/ui';

function siteUrl() { return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, ''); }

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!cooldown) return; const t = window.setTimeout(() => setCooldown((n) => n - 1), 1000); return () => window.clearTimeout(t); }, [cooldown]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (cooldown) return; setLoading(true);
    try { await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${siteUrl()}/reset-password` }); } catch { /* always show the same response */ }
    setSent(true); setCooldown(60); setLoading(false);
  };
  return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6"><section className={`${cardClass} w-full max-w-md p-8`}>
    <h1 className="text-2xl font-bold">Forgot password?</h1><p className="my-3 text-sm text-slate-500">Enter your email and we’ll send password reset instructions if an account matches.</p>
    <form onSubmit={submit} className="space-y-4"><div><label className={labelClass} htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></div>
      {sent && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">If an account matches that email, reset instructions are on the way.</p>}
      <button disabled={loading || cooldown > 0} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50">{loading ? 'Sending…' : cooldown ? `Send again in ${cooldown}s` : 'Send reset link'}</button>
    </form><Link href="/sign-in" className="mt-5 block text-center text-sm text-blue-600">Back to sign in</Link>
  </section></main>;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [recovery, setRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const recoveryDetected = useRef(false);
  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY' && active) { recoveryDetected.current = true; setRecovery(true); setChecking(false); } });
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!active) return;
      const recoveryLink = params.get('type') === 'recovery' || (typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));
      setRecovery(Boolean(sessionData.session) && (recoveryLink || recoveryDetected.current));
      setChecking(false);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [params]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError('This reset link has expired or is invalid. Request a new link to continue.'); setSaving(false); return; }
    await supabase.auth.signOut(); router.replace('/sign-in?password_reset=1');
  };
  return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6"><section className={`${cardClass} w-full max-w-md p-8`}>
    <h1 className="text-2xl font-bold">Reset password</h1>
    {checking ? <p className="my-4 text-sm text-slate-500">Checking your reset link…</p> : !recovery ? <><p className="my-3 text-sm text-slate-600">This reset link is invalid or has expired.</p><Link href="/forgot-password" className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-white">Request a new reset link</Link></> :
      <form onSubmit={submit} className="mt-4 space-y-4"><div><label className={labelClass} htmlFor="password">New password</label><input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} /></div><div><label className={labelClass} htmlFor="confirm">Confirm password</label><input id="confirm" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button disabled={saving} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white">{saving ? 'Saving…' : 'Save new password'}</button></form>}
  </section></main>;
}
