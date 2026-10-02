import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface SponsorStats {
  impressions: number;
  clicks: number;
  couponCopies: number;
  lastUpdated: string;
}

// In-memory telemetry cache for high-speed edge tracking
let statsCache: SponsorStats = {
  impressions: 142,
  clicks: 12,
  couponCopies: 9,
  lastUpdated: new Date().toISOString(),
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'click', placement = 'inline', coupon = 'revivemicro301' } = body;

    if (action === 'impression') {
      statsCache.impressions += 1;
    } else if (action === 'coupon_copy') {
      statsCache.couponCopies += 1;
    } else {
      statsCache.clicks += 1;
    }

    statsCache.lastUpdated = new Date().toISOString();

    const ctr =
      statsCache.impressions > 0
        ? ((statsCache.clicks / statsCache.impressions) * 100).toFixed(1) + '%'
        : '0.0%';

    return NextResponse.json({
      success: true,
      actionRecorded: action,
      currentStats: {
        ...statsCache,
        ctr,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to track sponsor event' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const ctr =
    statsCache.impressions > 0
      ? ((statsCache.clicks / statsCache.impressions) * 100).toFixed(1) + '%'
      : '0.0%';

  return NextResponse.json({
    sponsor: 'Revive Medical Wear',
    couponCode: 'revivemicro301',
    metrics: {
      ...statsCache,
      ctr,
      benchmarkTarget: '6.0% - 10.0%',
    },
  });
}
