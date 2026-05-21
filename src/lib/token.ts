import { supabase } from "./supabase";

export const AURION_CONFIG = {
  TOTAL_SUPPLY: 100000000, // 100M Fixed Supply
  DECIMALS: 18,
  MIN_VELOCITY_THRESHOLD: 0.1, // Stagnation floor
  MAX_VELOCITY_THRESHOLD: 0.8, // Volatility ceiling
};

function isValidSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && !key.includes("REPLACE_WITH_REAL"));
}

// ── CACHING LAYER ────────────────────────────────────────────────────────────
let velocityCache: {
  data: {
    volume24h: number;
    velocity24h: number;
    healthIndex: "STAGNANT" | "STABLE" | "VOLATILE";
  };
  timestamp: number;
} | null = null;
const VELOCITY_CACHE_TTL = 60_000; // 1 minute

/**
 * Calculates the current economic velocity of the token ecosystem
 * Formula: Velocity = (Total Transaction Volume in 24h) / Total Supply
 */
export async function calculateTokenVelocity(): Promise<{
  volume24h: number;
  velocity24h: number;
  healthIndex: "STAGNANT" | "STABLE" | "VOLATILE";
}> {
  const now = Date.now();
  if (velocityCache && now - velocityCache.timestamp < VELOCITY_CACHE_TTL) {
    return velocityCache.data;
  }

  if (!isValidSupabaseConfig()) {
    return {
      volume24h: 42500000,
      velocity24h: 0.425,
      healthIndex: "STABLE",
    };
  }

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  // Query total transactional volume from the ledger
  const { data: transactions, error } = await supabase!
    .from("aurion_ledger")
    .select("amount")
    .gte("created_at", twentyFourHoursAgo);

  if (error) throw error;

  const volume24h =
    transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
  const velocity24h = volume24h / AURION_CONFIG.TOTAL_SUPPLY;

  let healthIndex: "STAGNANT" | "STABLE" | "VOLATILE" = "STABLE";
  if (velocity24h < AURION_CONFIG.MIN_VELOCITY_THRESHOLD)
    healthIndex = "STAGNANT";
  if (velocity24h > AURION_CONFIG.MAX_VELOCITY_THRESHOLD)
    healthIndex = "VOLATILE";

  const result = {
    volume24h,
    velocity24h: parseFloat(velocity24h.toFixed(6)),
    healthIndex,
  };

  velocityCache = { data: result, timestamp: now };
  return result;
}
