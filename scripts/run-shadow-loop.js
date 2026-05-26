// BABY STEP FIX: Trick Supabase client check to bypass Node 20 WebSocket requirement
global.WebSocket = class {}; 

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const SHADOW_WALLETS = [
  { id: 'shadow_vault_alpha', label: 'Tier-1 Liquidity Splitter' },
  { id: 'shadow_vault_bravo', label: 'Tier-2 Dynamic Buffer' },
  { id: 'shadow_vault_charlie', label: 'Tier-3 Obfuscation Hop' },
  { id: 'shadow_vault_delta', label: 'Tier-4 Cold Settlement Node' }
];

async function executeFragmentationCycle() {
  console.log(`\n[${new Date().toISOString()}] 🔄 STARTING SHADOW WALLET FRAGMENTATION LOOP...`);
  
  try {
    const { data: brainAgent, error: fetchError } = await supabase
      .from('ledger_balances')
      .select('current_balance')
      .eq('agent_id', 'brain_agent_01')
      .single();

    if (fetchError) throw fetchError;
    
    const currentMasterBalance = brainAgent.current_balance;
    console.log(`[*] Master Core Balance (brain_agent_01): ${currentMasterBalance}`);

    if (currentMasterBalance <= 1000) {
      console.log(`[!] Master balance low. Standing by for threshold accumulation.`);
      return;
    }

    for (const wallet of SHADOW_WALLETS) {
      const randomChunk = Math.floor(Math.random() * (450 - 150 + 1)) + 150;
      console.log(`[➔] Fragmenting ${randomChunk} to ${wallet.id} (${wallet.label})`);

      // BABY STEP FIX: Removed the 'updated_at' column so it matches your local Docker schema exactly
      const { error: upsertError } = await supabase
        .from('ledger_balances')
        .upsert({ 
          agent_id: wallet.id, 
          current_balance: randomChunk
        }, { onConflict: 'agent_id' });

      if (upsertError) throw upsertError;
    }

    console.log(`[✓] Fragmentation cycle executed successfully. All tiers updated.`);

  } catch (error) {
    console.error(`[𝘅] Fragmentation engine runtime failure:`, error.message);
  }
}

console.log("=========================================");
console.log("AURION OS SHADOW WALLET LOOPER ACTIVATED");
console.log("Interval Horizon: 12 seconds per sequence");
console.log("=========================================");

executeFragmentationCycle();
setInterval(executeFragmentationCycle, 12000);
