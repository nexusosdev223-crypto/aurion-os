import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// BABY STEP FIX: Force Next.js to skip caching and read live data on every poll
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ledger_balances')
      .select('agent_id, current_balance')
      .eq('agent_id', 'brain_agent_01')
      .single();

    if (error) throw error;

    return NextResponse.json(data || { agent_id: 'brain_agent_01', current_balance: 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
