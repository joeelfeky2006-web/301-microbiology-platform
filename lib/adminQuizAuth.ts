import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/admin';

export async function authorizeQuizStaff(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return { response: identity.response } as const;
  let role = identity.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'student';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (url && anonKey && token) {
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data } = await client.rpc('get_current_user_role');
    if (data === 'super_admin' || data === 'editor') role = data;
  }
  if (role !== 'super_admin' && role !== 'editor') return { response: Response.json({ error: 'Staff access is required.' }, { status: 403 }) } as const;
  const admin = createSupabaseAdmin();
  if (!admin) return { response: Response.json({ error: 'Quiz management is unavailable.' }, { status: 503 }) } as const;
  return { identity, role, admin } as const;
}
