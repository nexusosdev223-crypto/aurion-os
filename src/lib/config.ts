/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AURION OS — Runtime config guards (no deps)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function isValidSupabaseConfig(): boolean {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && anon && !anon.includes("REPLACE_WITH_REAL"));
}
