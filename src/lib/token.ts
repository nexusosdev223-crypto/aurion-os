import { supabase } from './supabase';

export const AURION_CONFIG = {
  TOTAL_SUPPLY: 100000000, // 100M Fixed Supply
  DECIMALS: 18,
  MIN_VELOCITY_THRESHOLD: 0.1, // Stagnation floor
  MAX_VELOCITY_THRESHOLD: 0.8, // Volatility ceiling
};

/**
 * Calculates the current economic velocity of the token ecosystem
 * Formula: Velocity = (Total Transaction Volume in 24h) / Total Supply
 */
export async function calculateTokenVelocity(): Promise<{
  volume24h: number;
  velocity24h: number;
  healthIndex: 'STAGNANT' | 'STABLE' | 'VOLATILE';
}> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Query total transactional volume from the ledger
  const { data: transactions, error } = await supabase
    .from('aurion_ledger')
    .select('amount')
    .gte('created_at', twentyFourHoursAgo);

  if (error) throw error;

  const volume24h = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
  const velocity24h = volume24h / AURION_CONFIG.TOTAL_SUPPLY;

  let healthIndex: 'STAGNANT' | 'STABLE' | 'VOLATILE' = 'STABLE';
  if (velocity24h < AURION_CONFIG.MIN_VELOCITY_THRESHOLD) healthIndex = 'STAGNANT';
  if (velocity24h > AURION_CONFIG.MAX_VELOCITY_THRESHOLD) healthIndex = 'VOLATILE';

  return {
    volume24h,
    velocity24h: parseFloat(velocity24h.toFixed(6)),
    healthIndex
  };
}
