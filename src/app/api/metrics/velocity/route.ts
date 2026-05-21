import { NextResponse } from 'next/server';
import { calculateTokenVelocity, AURION_CONFIG } from '@/lib/token';

export async function GET() {
  try {
    const velocityData = await calculateTokenVelocity();
    return NextResponse.json({
      success: true,
      metrics: {
        circulatingSupply: AURION_CONFIG.TOTAL_SUPPLY,
        volume24h: velocityData.volume24h,
        tokenVelocity24h: velocityData.velocity24h,
        healthIndex: velocityData.healthIndex === 'STABLE' ? 'Optimal Activity' : velocityData.healthIndex
      }
    });
   } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
