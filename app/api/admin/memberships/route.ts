import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '@/lib/apiAuth';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/admin';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { membershipCatalog, resolvePlanDefaults } from '@/lib/payments/memberships';

export const dynamic = 'force-dynamic';

async function authorizeSuperAdmin(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return { response: identity.response } as const;

  let role = identity.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'student';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (url && anonKey && token) {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await client.rpc('get_current_user_role');
    if (data === 'super_admin' || data === 'editor') role = data;
  }
  if (role !== 'super_admin') {
    return { response: Response.json({ error: 'Super admin access is required.' }, { status: 403 }) } as const;
  }
  return { identity, role } as const;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeSuperAdmin(request);
  if ('response' in auth) return auth.response;
  return Response.json(
    { recurring_billing: false, catalog: membershipCatalog() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Manually assign a membership (beta path — no Paymob recurring).
 * Body: { email, plan, grant_credits?, reason?, period_days?, monthly_credit_allocation? }
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeSuperAdmin(request);
  if ('response' in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const plan = typeof body.plan === 'string' ? body.plan.trim().toLowerCase() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : 'manual membership assign';
  const grantCredits = body.grant_credits !== false;
  const defaults = resolvePlanDefaults(plan);
  if (!email || !defaults) {
    return Response.json({ error: 'Provide a valid email and known membership plan (e.g. pro_monthly).' }, { status: 400 });
  }

  const periodDays =
    typeof body.period_days === 'number' && Number.isInteger(body.period_days)
      ? body.period_days
      : defaults.periodDays;
  const allocation =
    typeof body.monthly_credit_allocation === 'number' && Number.isInteger(body.monthly_credit_allocation)
      ? body.monthly_credit_allocation
      : defaults.monthlyCreditAllocation;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const token = request.headers.get('authorization')!.replace(/^Bearer\s+/i, '');
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.rpc('assign_user_membership', {
    p_target_email: email,
    p_plan: defaults.plan,
    p_period_days: periodDays,
    p_monthly_credit_allocation: allocation,
    p_grant_credits: grantCredits,
    p_reason: reason,
  });

  if (error) {
    const msg = error.message || 'Could not assign membership.';
    const status = /not authorized|Authentication/i.test(msg) ? 403 : /not found/i.test(msg) ? 404 : 400;
    return Response.json({ error: msg }, { status });
  }

  // Optional: return fresh row via service role
  const admin = createSupabaseAdmin();
  let membership = null;
  if (admin && data) {
    const { data: row } = await admin.from('user_memberships').select('*').eq('id', data).maybeSingle();
    membership = row;
  }

  return Response.json(
    { ok: true, membership_id: data, membership, recurring_billing: false },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  );
}
