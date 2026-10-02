import { supabase } from '@/lib/supabase';

export async function authenticatedHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  return headers;
}

/** Sign out a rejected/stale client session and send the student back to their current page after signing in. */
export async function redirectAfterSessionExpiry(): Promise<void> {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  await supabase.auth.signOut();
  const params = new URLSearchParams({ message: 'session-expired', redirect: returnTo.startsWith('/') ? returnTo : '/' });
  window.location.assign(`/sign-in?${params.toString()}`);
}
