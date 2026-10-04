import { listPurchasablePackages, CREDIT_PACKAGES, formatPackagePrice } from '@/lib/payments/packages';
import { paymentsLiveEnabled } from '@/lib/payments/paymentService';

export const dynamic = 'force-dynamic';

/** Public catalog — prices/credits from central config. No secrets. */
export async function GET() {
  const packages = listPurchasablePackages().map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    credits: pkg.credits,
    price_cents: pkg.price_cents,
    currency: pkg.currency,
    price_label: formatPackagePrice(pkg),
    type: pkg.type,
  }));

  return Response.json(
    {
      live: paymentsLiveEnabled(),
      packages,
      catalog_note: 'Membership plans exist in config but are not purchasable until recurring billing ships.',
      all_package_ids: CREDIT_PACKAGES.map((pkg) => pkg.id),
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
