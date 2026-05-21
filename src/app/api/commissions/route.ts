import { NextResponse } from 'next/server';
import { getTotalRevenue, getRecentCommissions, COMMISSION_RATE } from '@/lib/commissions';

export async function GET() {
  try {
    const [total, recent] = await Promise.all([
      getTotalRevenue(),
      getRecentCommissions(20),
    ]);

    const tradeCount = recent.length;
    const avgCommission = tradeCount > 0
      ? Math.round(total / tradeCount * 100) / 100
      : 0;

    return NextResponse.json({
      success:       true,
      totalRevenueUsd: Math.round(total * 100) / 100,
      commissionRate:  COMMISSION_RATE,
      tradeCount,
      avgCommissionPerTrade: avgCommission,
      recentLog: recent.slice(0, 20),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
