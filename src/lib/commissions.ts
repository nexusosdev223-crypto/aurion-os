import { supabase, isValidSupabaseConfig } from "./supabase";

export const COMMISSION_RATE = 0.01; // 1% gross margin per simulated trade

export interface CommissionLog {
  id?: string;
  order_type: string;
  amount: number;
  commission_usd: number;
  agent_decision: string;
  created_at?: string;
}

export async function logCommission(params: {
  orderType: string;
  volume: number;
  agentDecision: string;
}): Promise<CommissionLog> {
  const commissionUsd = Math.round(params.volume * COMMISSION_RATE * 100) / 100;

  if (!isValidSupabaseConfig()) {
    return {
      order_type: params.orderType,
      amount: params.volume,
      commission_usd: commissionUsd,
      agent_decision: params.agentDecision.slice(0, 200),
    };
  }

  const { data, error } = await supabase!
    .from("aurion_commissions")
    .insert([{
      order_type:      params.orderType,
      amount:          params.volume,
      commission_usd:  commissionUsd,
      agent_decision:  params.agentDecision.slice(0, 200),
    }])
    .select()
    .single();

  if (error) throw error;
  return data as CommissionLog;
}

export async function getTotalRevenue(): Promise<number> {
  if (!isValidSupabaseConfig()) return 0;

  const { data, error } = await supabase!
    .from("aurion_commissions")
    .select("commission_usd", { count: "exact", head: false });

  if (error || !data) return 0;
  return data.reduce((sum: number, row: { commission_usd: number }) => sum + row.commission_usd, 0);
}

export async function getRecentCommissions(limit: number = 20): Promise<CommissionLog[]> {
  if (!isValidSupabaseConfig()) return [];

  const { data, error } = await supabase!
    .from("aurion_commissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []) as CommissionLog[];
}
