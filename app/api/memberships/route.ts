import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { listUserMemberships, membershipCatalog } from '@/lib/payments/memberships';

export const dynamic = 'force-dynamic';

/** Authenticated: own memberships + public membership catalog (no recurring billing). */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;

  try {
    const memberships = await listUserMemberships(auth.userId);
    return Response.json(
      {
        recurring_billing: false,
        catalog: membershipCatalog(),
        memberships,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not load memberships.' },
      { status: 503 },
    );
  }
}
