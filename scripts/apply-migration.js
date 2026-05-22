import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load service role from environment (do NOT hardcode secrets)
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) {
  console.error('SUPABASE_SERVICE_ROLE_KEY env var is required.');
  process.exit(1);
}

function runFile(label, sqlFile) {
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log(`\n── ${label} (${sqlFile}) ──────────────────────────────`);
  console.log(`\n── ${label} (${sqlFile}) ──────────────────────────────`);
  return (
    admin.rpc('run_sql', { sql })
      .then(({ error }) => {
        if (error) { console.log('  run_sql failed:', error.message); throw error; }
        console.log('  ✓ migration applied via run_sql');
      })
      .catch(() =>
        admin.rpc('execute_sql', { sql_query: sql })
          .then(({ error }) => {
            if (error) { console.log('  execute_sql failed:', error.message); throw error; }
            console.log('  ✓ migration applied via execute_sql');
          })
          .catch(() => {
            console.log('  Neither RPC available — paste below into Supabase SQL Editor:');
            console.log(sql);
            console.log('  ─────────────────────────────────────────');
          })
      )
  );
}

const admin = createClient(
  'https://fmqxrspopdvewgcyvsdn.supabase.co',
  SERVICE_ROLE,
  { global: { headers: { Authorization: 'Bearer ' + SERVICE_ROLE } } }
);

(async () => {
  try {
    await runFile('MIGRATION 1 — Commission schema', 'scripts/setup-commission-db.sql');
    await runFile('MIGRATION 2 — Paywall & licensing schema', 'scripts/setup-paywall-db.sql');
    console.log('\n✅ All migrations applied.');
    process.exit(0);
  } catch (e) {
    console.log('Error:', e.message);
    process.exit(1);
  }
})();
