import 'server-only';

/**
 * Next.js App Router can cache undici `fetch` on the server. Supabase-js uses
 * fetch under the hood, so cached REST responses can hide newly uploaded rows
 * (e.g. CNS lectures) until the process restarts. Always bypass the data cache.
 */
export function supabaseNoStoreFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, { ...init, cache: 'no-store' });
}
