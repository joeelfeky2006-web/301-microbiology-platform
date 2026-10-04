import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getMembershipPackage, listMembershipPackages } from './packages';

export type MembershipStatus = 'active' | 'cancelled' | 'expired' | 'paused';

export type UserMembership = {
  id: string;
  user_id: string;
  plan: string;
  status: MembershipStatus;
  started_at: string;
  expires_at: string;
  renews_at: string | null;
  monthly_credit_allocation: number;
  source: string;
  payment_order_id: string | null;
  metadata: Record<string, unknown>;
};

export function isMembershipActive(row: Pick<UserMembership, 'status' | 'expires_at'>, now = new Date()): boolean {
  if (row.status !== 'active') return false;
  const exp = Date.parse(row.expires_at);
  return Number.isFinite(exp) && exp > now.getTime();
}

export async function listUserMemberships(userId: string): Promise<UserMembership[]> {
  const admin = createSupabaseAdmin();
  if (!admin) throw new Error('Membership service is unavailable.');
  // Best-effort expire before read
  await admin.rpc('expire_memberships');
  const { data, error } = await admin
    .from('user_memberships')
    .select('id,user_id,plan,status,started_at,expires_at,renews_at,monthly_credit_allocation,source,payment_order_id,metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Could not load memberships. Apply supabase/memberships.sql if missing.');
  return (data || []) as UserMembership[];
}

export async function getActiveMembership(userId: string, plan?: string): Promise<UserMembership | null> {
  const rows = await listUserMemberships(userId);
  return (
    rows.find((row) => isMembershipActive(row) && (!plan || row.plan === plan)) || null
  );
}

export function membershipCatalog() {
  return listMembershipPackages().map((pkg) => ({
    package_id: pkg.id,
    plan: pkg.membership!.plan,
    name: pkg.name,
    description: pkg.description,
    price_cents: pkg.price_cents,
    currency: pkg.currency,
    period_days: pkg.membership!.period_days,
    monthly_credit_allocation: pkg.membership!.monthly_credit_allocation,
    recurring_billing: false,
    active: pkg.active,
  }));
}

export function resolvePlanDefaults(plan: string) {
  const pkg = getMembershipPackage(plan);
  if (!pkg?.membership) return null;
  return {
    packageId: pkg.id,
    plan: pkg.membership.plan,
    periodDays: pkg.membership.period_days,
    monthlyCreditAllocation: pkg.membership.monthly_credit_allocation,
  };
}
