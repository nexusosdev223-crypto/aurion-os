import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetches security and fragment variables from your local Docker node
    const { data: records, error } = await supabase
      .from('ledger_balances')
      .select('agent_id, current_balance')
      .not('agent_id', 'eq', 'brain_agent_01');

    if (error) throw error;

    return NextResponse.json({
      status: "ACTIVE",
      loopIntervalMs: 12000,
      activeFragments: records || [],
      obfuscationDepth: 4
    });
  } catch (err: any) {
    return NextResponse.json({ status: "STANDBY", error: err.message }, { status: 500 });
  }
}
