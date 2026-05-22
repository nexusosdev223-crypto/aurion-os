const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcXhyc3BvcGR2ZXdnY3l2c2RuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk2OTc5MCwiZXhwIjoyMDk1NDQ1NzkwfQ.uL3e7zkNwjfDpoTr0XQf-XkK8i3l7kK-kfDQkaSS90g';

function runFile(label, sqlFile) {
  const sql = fs.readFileSync(sqlFile, 'utf8');
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
