import 'server-only';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type CaseSealPayload = {
  correctId: string;
  explanation: string;
  clinicalPearls: string[];
  exp: number;
};

function deriveKey(): Buffer {
  const secret = process.env.CASE_SEAL_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error('CASE_SEAL_SECRET is not configured');
  }
  return createHash('sha256').update(secret).digest();
}

function toBase64Url(buffer: Buffer) {
  return buffer.toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url');
}

/** Seal grading payload with AES-256-GCM. Stateless; nothing is stored. */
export function sealCaseAnswer(payload: Omit<CaseSealPayload, 'exp'>, ttlMs = 30 * 60 * 1000): string {
  const body: CaseSealPayload = { ...payload, exp: Date.now() + ttlMs };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(body), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(encrypted)}`;
}

export function openCaseSeal(sealed: string): CaseSealPayload {
  const parts = sealed.split('.');
  if (parts.length !== 3) throw new Error('Invalid sealed token');
  const [ivPart, tagPart, dataPart] = parts;
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(), fromBase64Url(ivPart));
  decipher.setAuthTag(fromBase64Url(tagPart));
  const decrypted = Buffer.concat([decipher.update(fromBase64Url(dataPart)), decipher.final()]);
  const payload = JSON.parse(decrypted.toString('utf8')) as CaseSealPayload;
  if (!payload || typeof payload.correctId !== 'string' || typeof payload.exp !== 'number') {
    throw new Error('Invalid sealed payload');
  }
  if (Date.now() > payload.exp) throw new Error('Sealed token expired');
  return {
    correctId: payload.correctId,
    explanation: typeof payload.explanation === 'string' ? payload.explanation : '',
    clinicalPearls: Array.isArray(payload.clinicalPearls) ? payload.clinicalPearls.map((item) => String(item)) : [],
    exp: payload.exp,
  };
}
