const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config({ path: '.env.local' });

const args = process.argv.slice(2);
console.log("[AURION OS] Initializing Autopilot Engine...");

if (!args.includes('--agent=brain_agent_01')) {
    console.error("[ERROR] Unknown agent target.");
    process.exit(1);
}

console.log("[AGENT] brain_agent_01 active.");

// BABY STEP FIX: Provide explicit ws transport handler for Node 20 environment
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { persistSession: false },
        realtime: { transport: ws }
    }
);

async function syncLedger() {
    try {
        const { data, error } = await supabase
            .from('ledger_balances')
            .select('current_balance')
            .eq('agent_id', 'brain_agent_01')
            .single();

        if (error) throw error;

        console.log(`[LEDGER] Balance verified: ${parseInt(data.current_balance)}`);
        console.log("[SUCCESS] Synchronization complete.");
    } catch (err) {
        console.error("[ERROR] Failed to fetch balance from Supabase:", err.message);
    }
}

syncLedger();
