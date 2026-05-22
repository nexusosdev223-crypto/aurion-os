#!/usr/bin/env node
/**
 * AURION OS — Single-shot executor run
 * Runs one full cycle: metrics → Ollama decision → ledger write → commission
 * Exits after completion (use for testing / CI / cron)
 *
 * Usage:
 *   npx tsx scripts/run-once.ts
 */

import 'dotenv/config';
import { bootProxyLayer } from '../src/lib/proxy';
bootProxyLayer();

import { supabase, isValidSupabaseConfig } from '../src/lib/supabase';
import { enforceComplianceGate, auditGateDecision, MAX_DRAWDOWN } from '../src/lib/compliance_gate';
import { logCommission } from '../src/lib/commissions';

// ── Metrics ──────────────────────────────────────────────────────────────────
async function fetchLiveMetrics() {
  const resp = await fetch('http://localhost:3000/api/metrics/velocity');
  const data = await resp.json();
  return data.metrics;
}

// ── Decision (heuristic, no Ollama needed) ──────────────────────────────────
function decide(metrics: { tokenVelocity24h: number; healthIndex: string }): string {
  if (metrics.healthIndex === 'VOLATILE') {
    return '[HOLD_STABLE] Too volatile — holding.';
  }
  if (metrics.healthIndex === 'STABLE' || metrics.healthIndex === 'Optimal Activity') {
    return '[BALANCE_MARKET] Velocity healthy — injecting liquidity to maintain momentum.';
  }
  return '[HOLD_STABLE] Stagnant — waiting for clearer signal.';
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function runOnce() {
  console.log(`[AURION-RUN-ONCE] ${new Date().toISOString()} — Starting single-shot cycle`);

  // 1. Metrics
  const metrics = await fetchLiveMetrics();
  console.log(`  Velocity: ${metrics.tokenVelocity24h} | Health: ${metrics.healthIndex}`);

  // 2. Decision
  const decision = decide(metrics);
  console.log(`  Decision: ${decision}`);

  // 3. Determine action
  const orderType = decision.includes('[BALANCE_MARKET]') ? 'BUY' : 'HOLD';
  const amount = orderType === 'BUY' ? 5000 : 0;
  const marketCap = 10_000_000;
  const intent = `[AURION] ${orderType} — ${amount > 0 ? 'Inject liquidity' : 'Maintain position'} (run-once)`;

  // 4. Compliance gate
  const gateOk = await enforceComplianceGate();
  if (!gateOk && orderType === 'BUY') {
    const { getEconomicSnapshot } = await import('../src/lib/compliance_gate');
    const snap = await getEconomicSnapshot();
    await auditGateDecision({
      orderType, amount: 0, marketCap,
      agentLog: `[BLOCKED ${decision}] Compliance gate refused — drawdown ${(snap.drawdownPct * 100).toFixed(2)}% exceeds ${(MAX_DRAWDOWN * 100).toFixed(0)}%.`,
      intent, drawdownPct: snap.drawdownPct, gatePassed: false, executionResult: 'BLOCKED',
    });
    console.log('  Trade BLOCKED by compliance gate.');
  } else {
    if (isValidSupabaseConfig() && supabase) {
      await supabase.from('aurion_ledger').insert([{
        order_type: orderType, amount, market_cap: marketCap,
        agent_log: `[AURION] Run-once: ${decision}`, intent,
      }]);
      console.log('  Ledger written to Supabase.');
    } else {
      console.log('  [MOCK] Supabase not configured — ledger entry not persisted.');
    }

    // 5. Commission
    try {
      await logCommission({ orderType, volume: amount, agentDecision: decision });
      console.log(`  💰 Commission: $${(amount * 0.01).toFixed(2)}`);
    } catch (e) {
      console.warn('  Commission log failed:', (e as Error).message);
    }
  }

  console.log(`[AURION-RUN-ONCE] ${new Date().toISOString()} — Cycle complete.`);
}

runOnce().catch(e => {
  console.error('[AURION-RUN-ONCE] Fatal:', e);
  process.exit(1);
});
