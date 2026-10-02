'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { useSettings } from '@/lib/useSettings';
import { cardClass, inputClass, labelClass } from '@/lib/ui';

function safeRedirect(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '');
}

export default function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const isSignUp = mode === 'sign-up';
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const session = useSession();
  const { settings } = useSettings();
  const [name, setName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => { if (session && !confirmationPending) router.replace(redirect); }, [session, redirect, router, confirmationPending]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    if (cooldown || !email) return;
    setError('');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setCooldown(60);
    setInfo(resendError ? 'We could not send the email right now. Please try again in a minute.' : 'Confirmation email sent. Check your inbox and spam folder.');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setInfo('');
    if (isSignUp && !settings.registration_open) { setError('Registration is currently closed. Please try again later.'); return; }
    if (isSignUp && password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (isSignUp && !universityId.trim()) { setError('Enter your university ID.'); return; }
    if (isSignUp && password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { name: name.trim(), university_id: universityId.trim() }, emailRedirectTo: `${siteUrl()}/sign-in?confirmed=1` },
        });
        if (authError) throw authError;
        if (data.user && data.user.identities?.length === 0) {
          setError('An account with this email already exists. Please sign in or reset your password.'); return;
        }
        setConfirmationPending(true); setCooldown(60);
        setInfo('Check your inbox for a confirmation link. You can resend it in 60 seconds.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) {
          const message = authError.message.toLowerCase();
          if (message.includes('confirm') || message.includes('verified')) setError('Please confirm your email before signing in.');
          else if (message.includes('invalid login') || message.includes('credentials')) setError('Email or password is incorrect.');
          else setError('We could not sign you in. Please check your details and try again.');
          if (message.includes('confirm') || message.includes('verified')) setCanResend(true);
          return;
        }
        router.replace(redirect);
      }
    } catch {
      setError('We could not complete that request. Please check your details and try again.');
    } finally { setLoading(false); }
  };

  const otherHref = `${isSignUp ? '/sign-in' : '/sign-up'}${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
  return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
    <div className={`${cardClass} w-full max-w-md p-8`}>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{confirmationPending ? 'Check your email' : isSignUp ? settings.site_content.auth.signUpTitle : settings.site_content.auth.signInTitle}</h1>
      <p className="mb-6 mt-1 text-slate-500 dark:text-slate-400">{confirmationPending ? `We sent a confirmation link to ${email}.` : isSignUp ? settings.site_content.auth.signUpHelp : settings.site_content.auth.signInHelp}</p>
      {!isSignUp && params.get('confirmed') === '1' && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Email confirmed. You can sign in now.</p>}
      {!isSignUp && params.get('password_reset') === '1' && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Password updated. Sign in with your new password.</p>}
      {!isSignUp && params.get('message') === 'session-expired' && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Your session expired. Sign in again to continue where you left off.</p>}
      {!confirmationPending && (!isSignUp || settings.registration_open) && <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && <div><label className={labelClass} htmlFor="name">Full name</label><input id="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} /></div>}
        {isSignUp && <div><label className={labelClass} htmlFor="university-id">University ID</label><input id="university-id" required maxLength={64} value={universityId} onChange={(e) => setUniversityId(e.target.value)} autoComplete="off" className={inputClass} placeholder="Enter your MUST university ID" /></div>}
        <div><label className={labelClass} htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} /></div>
        <div><label className={labelClass} htmlFor="password">Password</label><input id="password" type="password" required minLength={isSignUp ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignUp ? 'new-password' : 'current-password'} className={inputClass} /></div>
        {isSignUp && <div><label className={labelClass} htmlFor="confirm">Confirm password</label><input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputClass} /></div>}
        {!isSignUp && <Link className="block text-sm text-blue-600 hover:underline dark:text-cyan-300" href="/forgot-password">Forgot password?</Link>}
        {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        {info && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{info}</p>}
        {canResend && !isSignUp && <button type="button" onClick={resend} disabled={cooldown > 0} className="w-full text-sm font-semibold text-blue-600 disabled:opacity-50">{cooldown ? `Resend confirmation in ${cooldown}s` : 'Resend confirmation email'}</button>}
        <button type="submit" disabled={loading || (isSignUp && !settings.registration_open)} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:bg-slate-400">{loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}</button>
      </form>}
      {error && confirmationPending && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {confirmationPending && <button onClick={resend} disabled={cooldown > 0} className="mt-3 w-full rounded-xl border px-4 py-2 text-sm disabled:opacity-50">{cooldown ? `Resend email in ${cooldown}s` : 'Resend confirmation email'}</button>}
      {isSignUp && !settings.registration_open && !confirmationPending && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Registration is currently closed. <Link href="/sign-in" className="font-semibold underline">Sign in</Link>.</div>}
      {!confirmationPending && (!isSignUp || settings.registration_open) && <p className="mt-6 text-center text-sm text-slate-500">{isSignUp ? 'Already have an account?' : "Don't have an account?"} <Link href={otherHref} className="font-semibold text-blue-600 hover:underline">{isSignUp ? 'Sign in' : 'Sign up'}</Link></p>}
    </div>
  </main>;
}
