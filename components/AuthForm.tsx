'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { useSettings } from '@/lib/useSettings';
import { cardClass, inputClass, labelClass } from '@/lib/ui';
import { firstPulseOpen } from '@/lib/firstPulse';
import FirstPulseBadge from './brand/FirstPulseBadge';
import { trackClient } from '@/lib/analytics/client';

function safeRedirect(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

/** Map Supabase Auth errors to user-safe copy (generic catch was hiding rate limits). */
function authErrorMessage(err: unknown, mode: 'sign-in' | 'sign-up'): string {
  const raw = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '';
  const message = raw.toLowerCase();
  const status = err && typeof err === 'object' && 'status' in err ? Number((err as { status: unknown }).status) : 0;
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';

  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('email rate limit') ||
    message.includes('over_email_send_rate_limit')
  ) {
    return mode === 'sign-up'
      ? 'Too many confirmation emails were sent just now. Wait about 10 minutes, then try again — or sign in if you already created an account.'
      : 'Too many emails were sent just now. Please wait a few minutes before requesting another.';
  }
  if (
    status === 409 ||
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
    return 'An account with this email already exists. Please sign in or reset your password.';
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('least') || message.includes('characters'))) {
    return 'Choose a stronger password (at least 8 characters).';
  }
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }
  if (message.includes('confirm') || message.includes('verified') || message.includes('not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (message.includes('redirect') && message.includes('url')) {
    return 'Sign-up is misconfigured (redirect URL). Contact support.';
  }
  if (message.includes('database error')) {
    return 'We could not finish creating your account. Please try again in a minute.';
  }
  if (raw && raw.length < 160 && !message.includes('fetch')) {
    return raw;
  }
  return 'We could not complete that request. Please check your details and try again.';
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
  const [acceptedLegal, setAcceptedLegal] = useState(false);
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
    setInfo('');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setCooldown(60);
    if (resendError) setError(authErrorMessage(resendError, 'sign-up'));
    else setInfo('Confirmation email sent. Check your inbox and spam folder.');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setInfo('');
    if (isSignUp && !settings.registration_open) { setError('Registration is currently closed. Please try again later.'); return; }
    if (isSignUp && password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (isSignUp && !universityId.trim()) { setError('Enter your university ID.'); return; }
    if (isSignUp && password !== confirm) { setError('Passwords do not match.'); return; }
    if (isSignUp && !acceptedLegal) { setError('Please accept the Terms of Use and Privacy Policy to create an account.'); return; }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (isSignUp) {
        // Server path auto-confirms so signup does not hit Supabase's ~2 emails/hour built-in cap.
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            name: name.trim(),
            university_id: universityId.trim(),
            accepted_legal: acceptedLegal,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
        if (!response.ok) {
          throw Object.assign(new Error(payload.error || 'We could not create your account.'), { status: response.status });
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;
        trackClient('signup', { method: 'password' });
        router.replace(redirect);
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (authError) {
          const message = authError.message.toLowerCase();
          setError(authErrorMessage(authError, 'sign-in'));
          if (message.includes('confirm') || message.includes('verified') || message.includes('not confirmed')) setCanResend(true);
          return;
        }
        trackClient('login', { method: 'password' });
        router.replace(redirect);
      }
    } catch (err) {
      setError(authErrorMessage(err, isSignUp ? 'sign-up' : 'sign-in'));
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message).toLowerCase() : '';
      if (isSignUp && (message.includes('rate limit') || message.includes('over_email_send'))) {
        setCanResend(true);
        setInfo('If you already signed up a moment ago, wait a bit then use Resend — or try signing in.');
      }
    } finally { setLoading(false); }
  };

  const otherHref = `${isSignUp ? '/sign-in' : '/sign-up'}${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
  return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
    <div className={`${cardClass} w-full max-w-md p-8`}>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{confirmationPending ? 'Check your email' : isSignUp ? settings.site_content.auth.signUpTitle : settings.site_content.auth.signInTitle}</h1>
      <p className="mb-6 mt-1 text-slate-500 dark:text-slate-400">{confirmationPending ? `We sent a confirmation link to ${email}.` : isSignUp ? settings.site_content.auth.signUpHelp : settings.site_content.auth.signInHelp}</p>
      {isSignUp && !confirmationPending && settings.registration_open && firstPulseOpen() && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-nile/20 bg-gradient-to-r from-brand-nile/5 to-brand-indigo/10 p-3.5 dark:border-brand-teal/20 dark:from-brand-nile/10 dark:to-brand-indigo/20">
          <FirstPulseBadge />
          <div className="min-w-0 text-sm">
            <p className="font-bold text-slate-900 dark:text-white">Sign up is free now</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Beta students get the First Pulse badge on their profile.</p>
            <p dir="rtl" lang="ar" className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">سجّل ببلاش دلوقتي وخد بادج First Pulse</p>
          </div>
        </div>
      )}
      {!isSignUp && params.get('confirmed') === '1' && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Email confirmed. You can sign in now.</p>}
      {!isSignUp && params.get('password_reset') === '1' && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Password updated. Sign in with your new password.</p>}
      {!isSignUp && params.get('message') === 'session-expired' && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Your session expired. Sign in again to continue where you left off.</p>}
      {!confirmationPending && (!isSignUp || settings.registration_open) && <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && <div><label className={labelClass} htmlFor="name">Full name</label><input id="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} /></div>}
        {isSignUp && <div><label className={labelClass} htmlFor="university-id">University ID</label><input id="university-id" required maxLength={64} value={universityId} onChange={(e) => setUniversityId(e.target.value)} autoComplete="off" className={inputClass} placeholder="Enter your MUST university ID" /></div>}
        <div><label className={labelClass} htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} /></div>
        <div><label className={labelClass} htmlFor="password">Password</label><input id="password" type="password" required minLength={isSignUp ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignUp ? 'new-password' : 'current-password'} className={inputClass} /></div>
        {isSignUp && <div><label className={labelClass} htmlFor="confirm">Confirm password</label><input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputClass} /></div>}
        {isSignUp && (
          <label htmlFor="accept-legal" className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm leading-5 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <input
              id="accept-legal"
              type="checkbox"
              required
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <span>
              I confirm I am at least 15 years old and agree to the{' '}
              <Link href="/terms" target="_blank" className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-cyan-300">Terms of Use</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-cyan-300">Privacy Policy</Link>.
            </span>
          </label>
        )}
        {!isSignUp && <Link className="block text-sm text-blue-600 hover:underline dark:text-cyan-300" href="/forgot-password">Forgot password?</Link>}
        {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        {info && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{info}</p>}
        {canResend && <button type="button" onClick={resend} disabled={cooldown > 0} className="w-full text-sm font-semibold text-blue-600 disabled:opacity-50">{cooldown ? `Resend confirmation in ${cooldown}s` : 'Resend confirmation email'}</button>}
        <button type="submit" disabled={loading || (isSignUp && (!settings.registration_open || !acceptedLegal))} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:bg-slate-400">{loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}</button>
      </form>}
      {error && confirmationPending && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {confirmationPending && <button onClick={resend} disabled={cooldown > 0} className="mt-3 w-full rounded-xl border px-4 py-2 text-sm disabled:opacity-50">{cooldown ? `Resend email in ${cooldown}s` : 'Resend confirmation email'}</button>}
      {isSignUp && !settings.registration_open && !confirmationPending && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Registration is currently closed. <Link href="/sign-in" className="font-semibold underline">Sign in</Link>.</div>}
      {!confirmationPending && (!isSignUp || settings.registration_open) && <p className="mt-6 text-center text-sm text-slate-500">{isSignUp ? 'Already have an account?' : "Don't have an account?"} <Link href={otherHref} className="font-semibold text-blue-600 hover:underline">{isSignUp ? 'Sign in' : 'Sign up'}</Link></p>}
    </div>
  </main>;
}
