'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { cardClass, inputClass, labelClass } from '@/lib/ui';
import type { GroupSection } from '@/types';

// Only allow same-site relative paths (prevents open-redirect abuse).
function safeRedirect(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const isSignUp = mode === 'sign-up';
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const session = useSession();

  const [name, setName] = useState('');
  const [group, setGroup] = useState<GroupSection>('G1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // Already signed in? Skip the form.
  useEffect(() => {
    if (session) router.replace(redirect);
  }, [session, redirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (isSignUp && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim(), group_section: group },
            emailRedirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')}/sign-in`,
          },
        });
        if (err) throw err;

        // With email confirmation on, an already-registered email returns a user with no identities.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        if (data.session) {
          router.replace(redirect);
        } else {
          setInfo('Account created! Check your email for a confirmation link, then sign in.');
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.replace(redirect);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const otherHref = `${isSignUp ? '/sign-in' : '/sign-up'}${
    redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''
  }`;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className={`${cardClass} w-full max-w-md p-8`}>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mb-6 mt-1 text-slate-500 dark:text-slate-400">
          {isSignUp ? 'Sign up to access modules and materials.' : 'Sign in to access modules and materials.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className={labelClass} htmlFor="name">Full name</label>
                <input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="group">Group</label>
                <select id="group" value={group} onChange={(e) => setGroup(e.target.value as GroupSection)} className={inputClass}>
                  <option value="G1">G1</option>
                  <option value="G2">G2</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className={labelClass} htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} />
          </div>

          <div>
            <label className={labelClass} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className={inputClass}
            />
          </div>

          {isSignUp && (
            <div>
              <label className={labelClass} htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputClass} />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700"
          >
            {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <Link href={otherHref} className="font-semibold text-blue-600 hover:underline dark:text-cyan-300">
            {isSignUp ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
      </div>
    </main>
  );
}
