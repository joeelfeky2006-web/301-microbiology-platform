/**
 * Prefer opaque distinct ids. Never send raw emails to analytics.
 * Uses Web Crypto when available; Node crypto fallback on server.
 */
export async function anonymizeUserId(userId: string | null | undefined): Promise<string | undefined> {
  const id = typeof userId === 'string' ? userId.trim() : '';
  if (!id) return undefined;
  const payload = `medatlas:${id}`;
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const data = new TextEncoder().encode(payload);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHash } = require('crypto') as typeof import('crypto');
    return createHash('sha256').update(payload).digest('hex').slice(0, 32);
  } catch {
    return undefined;
  }
}
