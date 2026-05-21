import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AURION_CONFIG } from '@/lib/token';

export async function POST(request: Request) {
  try {
    const { orderType, amount, marketCap, logMessage } = await request.json();

    if (!orderType || typeof amount !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing orderType or numeric amount' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('aurion_ledger')
      .insert([
        {
          order_type: orderType,
          amount: amount,
          market_cap: marketCap || 10000000,
          agent_log: logMessage || `Manual transaction processing of ${amount} AURION.`
        }
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, transaction: data[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
