/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AURION OS — Runtime config guards (no deps)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function isValidSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && anon && !anon.includes("REPLACE_WITH_REAL"));
}

export function isValidBtcAddress(addr: string): boolean {
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-zAC-HJ-NP-Z02-9]{11,71}$/.test(addr);
}

export function sanitizeString(input: string, maxLength = 500): string {
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, maxLength);
}

export function validateWallet(wallet: string): { valid: boolean; error?: string } {
  if (!wallet || typeof wallet !== 'string') return { valid: false, error: 'Missing wallet' };
  if (wallet.length < 26 || wallet.length > 90) return { valid: false, error: 'Invalid length' };
  if (!isValidBtcAddress(wallet)) return { valid: false, error: 'Invalid address format' };
  return { valid: true };
}

export function getEnvOrThrow(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}