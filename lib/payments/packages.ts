/**
 * Central credit-pack catalog. Change prices/credits here — do not hardcode in UI.
 * Phase 7/8: one-time packs only. Recurring memberships are deferred.
 */

export type PackageType = 'free' | 'one_time' | 'membership';

export type CreditPackage = {
  id: string;
  name: string;
  description: string;
  credits: number;
  /** Minor units (e.g. piastres). 10000 = 100.00 EGP */
  price_cents: number;
  currency: 'EGP';
  type: PackageType;
  /** Shown in student UI when payments go live */
  active: boolean;
  /** Membership metadata (unused until recurring billing) */
  membership?: {
    plan: string;
    period_days: number;
  };
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
    description: 'Placeholder membership — recurring billing not enabled.',
    credits: 800,
    price_cents: 15_000,
    currency: 'EGP',
    type: 'membership',
    active: false,
    membership: { plan: 'pro_monthly', period_days: 30 },
  },
];

export function getPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((item) => item.id === id);
}

/** Packages students may attempt to buy when payments go live. */
export function listPurchasablePackages(): CreditPackage[] {
  return CREDIT_PACKAGES.filter((item) => item.active && item.type === 'one_time' && item.credits > 0 && item.price_cents > 0);
}

export function formatPackagePrice(pkg: CreditPackage): string {
  const major = (pkg.price_cents / 100).toFixed(pkg.price_cents % 100 === 0 ? 0 : 2);
  return `${major} ${pkg.currency}`;
}
