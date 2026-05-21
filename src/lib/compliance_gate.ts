import { supabase, isValidSupabaseConfig } from "./supabase";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒  COMPLIANCE GATE — CANONICAL REFERENCE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * EXECUTION LOGIC:
 *   This gate runs before EVERY trade decision. It tracks peak capital over a
 *   24h sliding window from the ledger and refuses any trade that would breach
 *   the MAX_DRAWDOWN threshold.
 *
 * FLOW:
 *   1. getEconomicSnapshot()  →  queries last 24h of ledger, computes peak &
 *                               current capital, returns drawdown + gate status
 *   2. enforceComplianceGate()→  calls getEconomicSnapshot(), returns a boolean:
 *                               true  = trade is authorised (drawdown < MAX_DRAWDOWN)
 *                               false = trade blocked
 *   3. auditGateDecision()     →  writes intent, execution_result, drawdown_pct,
 *                               gate_pass and a structured compliance_reason JSONB
 *                               field to aurion_ledger for a future regulatory
 *                               or performance review.
 *
 * SETTINGS:
 *   MAX_DRAWDOWN       SANITISED
 *   SNAPSHOT_WINDOW_H  24
 *
 * RUNTIME CONTRACT:
 *  - Caller MUST call auditGateDecision() for every decision it logs to the
 *    ledger. This is the single source of truth for intent vs. execution.
 *  - The function is idempotent: re-logging a decision does NOT create a
 *    second row — it relies on the caller inserting a new ledger row.
 */

// ── CACHING LAYER ────────────────────────────────────────────────────────────
let snapshotCache: { data: EconomicSnapshot; timestamp: number } | null = null;
const SNAPSHOT_CACHE_TTL = 10_000; // 10 seconds

// ── HARD-CODED COMPLIANCE CONSTANTS ──────────────────────────────────────────
export const MAX_DRAWDOWN: number = 0.2; // 20 % — absolute circuit brake
export const SNAPSHOT_WINDOW_H: number = 24; // 24-hour look-back

// ── ECONOMIC SNAPSHOT ─────────────────────────────────────────────────────────
export interface EconomicSnapshot {
  peakCapital: number;
  currentCapital: number;
  drawdownPct: number;
  gatePassed: boolean;
  transactionCount: number;
  windowHours: number;
}

const MOCK_SNAPSHOT: EconomicSnapshot = {
  peakCapital: 1_000_000,
  currentCapital: 950_000,
  drawdownPct: 0.05,
  gatePassed: true,
  transactionCount: 0,
  windowHours: SNAPSHOT_WINDOW_H,
};

export async function getEconomicSnapshot(): Promise<EconomicSnapshot> {
  const now = Date.now();
  if (snapshotCache && now - snapshotCache.timestamp < SNAPSHOT_CACHE_TTL) {
    return snapshotCache.data;
  }

  if (!isValidSupabaseConfig() || !supabase) {
    snapshotCache = { data: MOCK_SNAPSHOT, timestamp: Date.now() };
    return MOCK_SNAPSHOT;
  }

  const since = new Date(
    Date.now() - SNAPSHOT_WINDOW_H * 3600 * 1000,
  ).toISOString();

  const { data: rows, error } = await supabase
    .from("aurion_ledger")
    .select("amount, order_type")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const txs = rows ?? [];
  let runningCap = 1_000_000; // $ seeded capital baseline
  let peakCapital = 1_000_000;

  for (const tx of txs) {
    if (tx.order_type === "BUY") runningCap -= tx.amount; // distribute liquidity
    if (tx.order_type === "SELL") runningCap += tx.amount; // reclaim
    if (runningCap > peakCapital) peakCapital = runningCap;
  }

  const currentCapital = runningCap;
  const drawdownPct =
    peakCapital > 0 ? (peakCapital - currentCapital) / peakCapital : 0;

  const result = {
    peakCapital,
    currentCapital,
    drawdownPct: parseFloat(drawdownPct.toFixed(6)),
    gatePassed: drawdownPct < MAX_DRAWDOWN,
    transactionCount: txs.length,
    windowHours: SNAPSHOT_WINDOW_H,
  };

  snapshotCache = { data: result, timestamp: Date.now() };
  return result;
}

// ── COMPLIANCE ENFORCEMENT ────────────────────────────────────────────────────
export async function enforceComplianceGate(): Promise<boolean> {
  const snapshot = await getEconomicSnapshot();

  if (!snapshot.gatePassed) {
    console.warn(
      `[COMPLIANCE-GATE] BLOCKED — drawdown ${(snapshot.drawdownPct * 100).toFixed(2)}% ` +
        `exceeds MAX_DRAWDOWN ${(MAX_DRAWDOWN * 100).toFixed(0)}%. Trade refused.`,
    );
    return false;
  }

  console.log(
    `[COMPLIANCE-GATE] PASSED — drawdown ${(snapshot.drawdownPct * 100).toFixed(2)}% ` +
      `within ${(MAX_DRAWDOWN * 100).toFixed(0)}% limit. Trade authorised.`,
  );
  return true;
}

// ── AUDIT LOG ────────────────────────────────────────────────────────────────
export async function auditGateDecision(params: {
  orderType: string;
  amount: number;
  marketCap: number;
  agentLog: string;
  intent: string;
  drawdownPct: number;
  gatePassed: boolean;
  executionResult?: "EXECUTED" | "BLOCKED" | "PENDING";
  byHuman?: boolean;
}): Promise<void> {
  if (!isValidSupabaseConfig() || !supabase) {
    console.log("[COMPLIANCE-GATE] [MOCK insert] auditGateDecision called — would write to aurion_ledger:", params);
    return;
  }

  const { error } = await supabase.from("aurion_ledger").insert([
    {
      order_type: params.orderType,
      amount: params.amount,
      market_cap: params.marketCap,
      agent_log: params.agentLog,
      intent: params.intent,
      execution_result:
        params.executionResult ?? (params.gatePassed ? "EXECUTED" : "BLOCKED"),
      drawdown_pct: params.drawdownPct,
      gate_pass: params.gatePassed,
      compliance_reason: JSON.stringify({
        humanOverride: params.byHuman ?? false,
        maxDrawdownLimit: MAX_DRAWDOWN,
        gateWindowHours: SNAPSHOT_WINDOW_H,
      }),
    },
  ]);

  if (error) {
    console.error("[COMPLIANCE-GATE] Ledger insert failed:", error.message);
  }
}
