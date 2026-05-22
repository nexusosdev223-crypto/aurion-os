import { NextResponse } from 'next/server';
import { calculateTokenVelocity } from '@/lib/token';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient, SupabaseClient } from '@supabase/supabase-js';
function getSB(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.includes('REPLACE_WITH')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
const sb = getSB();

// ── Tier catalogue ─────────────────────────────────────────────────────────────
interface TierDef { signals: number; windowDays: number; minSats: number; btcAddress: string; priceDisplay: string; label?: string }
const TIERS: Record<string, TierDef> = {
  _inf:    { signals: 0,    windowDays: 365, minSats: 5_000_000,  btcAddress: process.env.AURION_INST_ADDR || '',     priceDisplay: '5M sats (~£500) — unlimited', label: 'Institutional' },
  _100:    { signals: 5000,  windowDays: 30,  minSats: 10_000,     btcAddress: process.env.AURION_RES_LITE_ADDR || '', priceDisplay: '10k sats (~£1) — 5k / 30 d', label: 'Researcher Lite' },
  _free:   { signals: 100,   windowDays: 1,   minSats: 0,          btcAddress: process.env.AURION_FREE_ADDR || '',     priceDisplay: 'Free — 100 / 24 h', label: 'Developer' },
};

declare global {
  var signalCounter: Map<string, number>;
}
if (!global.signalCounter) global.signalCounter = new Map();

// ── Window helpers ─────────────────────────────────────────────────────────────
function windowStart(windowDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - windowDays);
  return d.toISOString();
}
function windowExpired(start: string, windowDays: number): boolean {
  return Date.now() - new Date(start).getTime() > windowDays * 86400_000;
}

// ── Main handler ───────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.SIGNAL_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wallet  = request.headers.get('x-wallet') || 'anonymous';

  // ── 1. Look up wallet plan ──────────────────────────────────────────────────
  let planRow: { data: Record<string, unknown> | null; error: { message: string } | null } | null = null;
  if (sb) {
    try { planRow = await sb.from('aurion_wallet_plans').select('*').eq('wallet', wallet).single(); } catch { /* table may not exist yet */ }
  }

  const hasPaidPlan = planRow?.data != null && !planRow.error;
  const paidData = (hasPaidPlan ? planRow!.data as Record<string, unknown> : null);
  const tierId   = hasPaidPlan ? (paidData!.plan_id as string) : '_free';
  const tier     = TIERS[tierId] || TIERS._free;
  const used     = hasPaidPlan ? ((paidData!.signals_used as number) || 0) : (global.signalCounter.get(wallet) || 0);

  // ── 2. Check window expiry → reset counter ──────────────────────────────────
  if (hasPaidPlan && paidData) {
    const ws = (paidData.window_start as string) || windowStart(tier.windowDays);
    if (windowExpired(ws, tier.windowDays)) {
      if (sb) await sb.from('aurion_wallet_plans').update({ signals_used: 0, window_start: new Date().toISOString() }).eq('wallet', wallet);
    }
    // Re-read after reset
    try {
      const refreshed = await sb!.from('aurion_wallet_plans').select('*').eq('wallet', wallet).single();
      if (refreshed.data) {
        const r = refreshed.data as Record<string, unknown>;
        const usedAfterReset = (r.signals_used as number) || 0;
        const rLimit = r.signals_limit as number | null;
        if (rLimit !== null && usedAfterReset >= rLimit) {
    return NextResponse.json({
      error: 'Plan limit reached', plan: tierId, tier: (tier as TierDef & { label: string }).label,
      used: usedAfterReset, limit: rLimit,
      reset_at: new Date(new Date(r.window_start as string).getTime() + (tier.windowDays * 86400_000)).toISOString(),
      invoice: { btcAddress: tier.btcAddress, minSats: tier.minSats, priceDisplay: tier.priceDisplay, amountBtc: (tier.minSats / 100_000_000).toFixed(8) },
      billing_invoice: `/api/paywall/unlock`,
    }, { status: 402 });
        }
      }
    } catch { /* silently skip on failure */ }
  }

  // ── 3. Check signal limit ───────────────────────────────────────────────────
  if (tier.signals > 0 && used >= tier.signals) {
    return NextResponse.json({
      error: 'Payment required', plan: tierId, tier: (tier as TierDef & { label?: string }).label || tierId,
      used, limit: tier.signals,
      message: `Signal limit reached for ${(tier as TierDef & { label?: string }).label || tierId} plan.`,
      invoice: { btcAddress: tier.btcAddress, minSats: tier.minSats, priceDisplay: tier.priceDisplay, amountBtc: (tier.minSats / 100_000_000).toFixed(8) },
      billing_invoice: `/api/paywall/unlock`,
    }, { status: 402 });
  }

  // ── 4. Serve signal ─────────────────────────────────────────────────────────
  try {
    const metrics = await calculateTokenVelocity();
    const velocity = metrics.velocity24h;
    const health   = metrics.healthIndex;

    let decision: string;
    if (health === 'STAGNANT' || velocity < 0.1) {
      const amount = Math.floor(Math.random() * 4900) + 100;
      decision = JSON.stringify({ action: 'STIMULATE', amount, reason: `Velocity ${velocity} below threshold — injecting liquidity` });
    } else {
      decision = JSON.stringify({ action: 'HOLD', amount: 0, reason: `Health index ${health} — maintaining position` });
    }

    // ── 5. Increment counter ──────────────────────────────────────────────────
    if (hasPaidPlan && paidData && sb) {
      await sb.from('aurion_signal_log').insert([{ wallet, tier: tierId, action: JSON.parse(decision).action }]);
      await sb.from('aurion_wallet_plans').update({ signals_used: (paidData.signals_used as number) + 1 }).eq('wallet', wallet);
    } else {
      global.signalCounter.set(wallet, used + 1);
    }

    return NextResponse.json({ success: true, signal: decision, used: used + 1, limit: tier.signals || null, plan: tierId });
  } catch {
    return NextResponse.json({ success: false, error: 'Signal computation failed' }, { status: 500 });
  }
}
