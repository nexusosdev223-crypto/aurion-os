import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const TOTAL_CIRCULATING_SUPPLY = 100000000;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: transactions, error } = await supabase
      .from('aurion_ledger')
      .select('amount')
      .gte('created_at', twentyFourHoursAgo);
    if (error) throw error;
    const totalVolume24h = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const tokenVelocity24h = totalVolume24h / TOTAL_CIRCULATING_SUPPLY;
    return NextResponse.json({
      success: true,
      metrics: {
        circulatingSupply: TOTAL_CIRCULATING_SUPPLY,
        volume24h: totalVolume24h,
        tokenVelocity24h: parseFloat(tokenVelocity24h.toFixed(4)),
        healthIndex: tokenVelocity24h > 0.5 ? 'High Activity' : 'Stagnant'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}