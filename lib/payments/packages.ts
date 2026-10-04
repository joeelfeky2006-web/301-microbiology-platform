/**
 * Central package + membership catalog.
 * Change prices / credits / allocations here — do not hardcode in UI.
 * Recurring billing is NOT implemented (Phase 8 prepares the model only).
 */

export type PackageType = 'free' | 'one_time' | 'membership';

export type MembershipPlanConfig = {
  /** Stable plan key stored on user_memberships.plan */
  plan: string;
  /** Billing period length when recurring ships */
  period_days: number;
  /** Bonus credits granted at period start (manual or future webhook) */
  monthly_credit_allocation: number;
};

export type CreditPackage = {
  id: string;
  name: string;
  description: string;
  /**
   * One-time: credits granted on purchase.
   * Membership: same as monthly_credit_allocation for display convenience.
   * Free: 0 (uses daily/monthly free buckets instead).
   */
  credits: number;
  /** Minor units (piastres). 10000 = 100.00 EGP */
  price_cents: number;
  currency: 'EGP';
  type: PackageType;
  /** Listed for purchase when payments go live (one_time) or membership signup later */
  active: boolean;
  membership?: MembershipPlanConfig;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Daily and monthly free AI allowance (no purchase).',
    credits: 0,
    price_cents: 0,
    currency: 'EGP',
    type: 'free',
    active: true,
  },
  {
    id: 'midterm_pack',
    name: 'Midterm Pack',
    description: 'One-time bonus credits for Midterm prep.',
    credits: 500,
    price_cents: 10_000,
    currency: 'EGP',
    type: 'one_time',
    active: true,
  },
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    description: 'Smaller one-time top-up.',
    credits: 150,
    price_cents: 4_000,
    currency: 'EGP',
    type: 'one_time',
    active: true,
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Monthly membership placeholder — recurring billing not enabled; staff may assign manually.',
    credits: 800,
    price_cents: 15_000,
    currency: 'EGP',
    type: 'membership',
    active: true,
    membership: {
      plan: 'pro_monthly',
      period_days: 30,
      monthly_credit_allocation: 800,
    },
  },
];

export function getPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((item) => item.id === id);
}

export function getMembershipPackage(plan: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(
    (item) => item.type === 'membership' && item.membership?.plan === plan,
  );
}

/** One-time packs students may buy when PAYMENTS_LIVE. */
export function listPurchasablePackages(): CreditPackage[] {
  return CREDIT_PACKAGES.filter(
    (item) => item.active && item.type === 'one_time' && item.credits > 0 && item.price_cents > 0,
  );
}

/** Membership plans (catalog). Not auto-billed. */
export function listMembershipPackages(): CreditPackage[] {
  return CREDIT_PACKAGES.filter((item) => item.type === 'membership' && item.membership);
}

export function formatPackagePrice(pkg: CreditPackage): string {
  if (pkg.price_cents <= 0) return 'Free';
  const major = (pkg.price_cents / 100).toFixed(pkg.price_cents % 100 === 0 ? 0 : 2);
  return `${major} ${pkg.currency}`;
}

export function publicPackageView(pkg: CreditPackage) {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    credits: pkg.credits,
    price_cents: pkg.price_cents,
    currency: pkg.currency,
    price_label: formatPackagePrice(pkg),
    type: pkg.type,
    active: pkg.active,
    membership: pkg.membership
      ? {
          plan: pkg.membership.plan,
          period_days: pkg.membership.period_days,
          monthly_credit_allocation: pkg.membership.monthly_credit_allocation,
        }
      : null,
  };
}
