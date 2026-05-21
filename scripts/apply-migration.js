const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const sql = fs.readFileSync('scripts/setup-commission-db.sql', 'utf8');
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcXhyc3BvcGR2ZXdnY3l2c2RuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk2OTc5MCwiZXhwIjoyMDk1NDQ1NzkwfQ.uL3e7zkNwjfDpoTr0XQf-XkK8i3l7kK-kfDQkaSS90g';

console.log('Running migration via service role RPC...');

(async () => {
  // Service role client
  const admin = createClient(
    'https://fmqxrspopdvewgcyvsdn.supabase.co',
    SERVICE_ROLE,
    { global: { headers: { Authorization: 'Bearer ' + SERVICE_ROLE } } }
  );
  try {
    const { error } = await admin.rpc('run_sql', { sql });
    if (error) {
      console.log('RPC run_sql not available:', error.message);
      console.log('Attempting via PostgREST direct...');
      // fallback: try execute_sql
      const { error: e2 } = await admin.rpc('execute_sql', { sql_query: sql });
      if (e2) {
        console.log('execute_sql also not available:', e2.message);
        console.log('Writing SQL to temp file for manual execution.');
        console.log('Run this in Supabase SQL Editor:');
        console.log(sql);
        process.exit(1);
      } else {
        console.log('SUCCESS via execute_sql');
        process.exit(0);
      }
    } else {
      console.log('SUCCESS via run_sql');
      process.exit(0);
    }
  } catch(e) {
    console.log('Error:', e.message);
    console.log('\n--- RAW SQL TO PASTE INTO SUPABASE SQL EDITOR ---\n');
    console.log(sql);
    console.log('--- END ---\n');
    process.exit(1);
  }
})();
