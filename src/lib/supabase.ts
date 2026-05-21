import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Config guard ─────────────────────────────────────────────────────────────
export function isValidSupabaseConfig(): boolean {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && anon && !anon.includes("REPLACE_WITH_REAL"));
}

export function createSupabase(): SupabaseClient | null {
  if (!isValidSupabaseConfig()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export const supabase = createSupabase();
