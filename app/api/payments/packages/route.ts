import {
  listPurchasablePackages,
  listMembershipPackages,
  CREDIT_PACKAGES,
  publicPackageView,
} from '@/lib/payments/packages';
import { paymentsLiveEnabled } from '@/lib/payments/paymentService';
import { trackServer } from '@/lib/analytics/server';

export const dynamic = 'force-dynamic';

/** Public catalog — prices/credits from central config. No secrets. */
export async function GET() {
  trackServer('package_viewed', { surface: 'api_packages' });
  return Response.json(
    {
      live: paymentsLiveEnabled(),
      recurring_billing: false,
      packages: listPurchasablePackages().map(publicPackageView),
      memberships: listMembershipPackages().map(publicPackageView),
      catalog_note: 'Membership plans are listed for transparency; recurring billing is not enabled. Staff may assign manually.',
      all_package_ids: CREDIT_PACKAGES.map((pkg) => pkg.id),
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
