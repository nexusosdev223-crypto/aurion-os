import { NextResponse } from 'next/server';

// POST /api/signal/install — check wallet plan or trigger install
// Body: { wallet: 'bc1q...', plan_id?: '_free' | '_100' | '_inf', license_key?: string }
// ─────────────────────────────────────────────────────────────────────────────
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient, SupabaseClient } from '@supabase/supabase-js';
function getSB(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.includes('REPLACE_WITH')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const TIERS: Record<string, { label: string; signals: number; windowDays: number; btcAddress: string; minSats: number; priceDisplay: string }> = {
  _inf:    { label: 'Institutional',   signals: 0,    windowDays: 365, btcAddress: process.env.AURION_INST_ADDR || '',     minSats: 5_000_000, priceDisplay: '5,000,000 sats (~£500) — unlimited' },
  _100:    { label: 'Researcher Lite', signals: 5000,  windowDays: 30,  btcAddress: process.env.AURION_RES_LITE_ADDR || '', minSats: 10_000,     priceDisplay: '10,000 sats (~£1) — 5k signals / 30 d' },
  _free:   { label: 'Developer',       signals: 100,   windowDays: 1,   btcAddress: process.env.AURION_FREE_ADDR || '',     minSats: 0,          priceDisplay: 'Free — 100 signals / 24 h' },
};

export async function POST(request: Request) {
  const { wallet, plan_id } = await request.json().catch(() => ({}));

  if (!wallet || typeof wallet !== 'string' || wallet.length < 10) {
    return NextResponse.json({ error: 'Valid wallet address required.' }, { status: 400 });
  }

  const requestedPlan = plan_id || '_free';
  const tier = TIERS[requestedPlan];
  const sb = getSB();

  // ── Check existing plan ─────────────────────────────────────────────────────
  if (sb) {
    try {
      const { data: existing } = await sb.from('aurion_wallet_plans').select('*').eq('wallet', wallet).single();
      if (existing) {
        return NextResponse.json({
          success: true, wallet: existing.wallet,
          plan: existing.plan_id, tier: existing.tier,
          signals_used: existing.signals_used,
          signals_limit: existing.signals_limit,
          window_start: existing.window_start,
          expires_at: existing.expires_at ?? null,
          already_active: true,
        });
      }
    } catch { /* table likely doesn't exist yet — fall through */ }
  }

  // ── FREE plan — activate immediately ────────────────────────────────────────
  if (requestedPlan === '_free') {
    const expiry = tier.windowDays >= 1 ? new Date(Date.now() + tier.windowDays * 86400_000).toISOString() : null;
    if (sb) {
      await sb.from('aurion_wallet_plans').upsert({
        wallet, tier: tier.label, plan_id: '_free',
        signals_used: 0, signals_limit: tier.signals,
        window_start: new Date().toISOString(),
        expires_at: expiry,
        active: true,
      }, { onConflict: 'wallet' });
    }
    return NextResponse.json({
      success: true, plan: '_free', tier: tier.label,
      signals_limit: tier.signals, window_days: tier.windowDays,
      note: 'Free plan activated. Enjoy 100 signals / 24 h.',
    });
  }

  // ── PAID plan — return invoice for user to complete payment ──────────────────
  return NextResponse.json({
    success: false,
    requires_payment: true,
    invoice: {
      plan_id: requestedPlan, tier: tier.label,
      btcAddress: tier.btcAddress,
      minSats: tier.minSats,
      amountBtc: (tier.minSats / 100_000_000).toFixed(8),
      priceDisplay: tier.priceDisplay,
    },
    message: `Activating ${tier.label} plan. Send ${(tier.minSats / 100_000_000).toFixed(8)} BTC to the tier address above, then submit proof_txid via POST /api/paywall/unlock to confirm.`,
  }, { status: 402 });
}
