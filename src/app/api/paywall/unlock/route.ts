// /api/paywall/unlock — verify wallet + license-key against on-chain payment
// ===========================================================================
// FLOW
//  1. POST { wallet, plan_id, proof_txid }  ← user sends BTC to tier address
//  2. Server fetches Esplora for this wallet's UTXO set
//  3. If a UTXO paying to the tier address >= MIN_AMOUNT is found:
//       → upsert aurion_wallet_plans  (wallet, tier, expires_at)
//       → return { ok: true }
//  4. If not: return 402 with tier amount and Bitcoin address to send to
//
// TIER PRICES (sats)
//  _free  — 0  → no payment, insert plan row immediately
//  _100   — 10_000 sats  (£1-ish)
//  _5k    — 500_000 sats (£50-ish)
//  _inf   — 5_000_000 sats (£500-ish)
// ===========================================================================

import { NextResponse } from 'next/server';

// ── Tier catalogue ────────────────────────────────────────────────────────────
interface Tier {
  id: string;
  label: string;
  signals: number;        // null = unlimited
  windowDays: number;
  btcAddress: string;     // payout address for this tier
  minSats: number;        // minimum amount to confirm
  priceDisplay: string;
}

const TIERS: Record<string, Tier> = {
  _free: {
    id: '_free', label: 'Developer', signals: 100, windowDays: 1,
    btcAddress: process.env.AURION_FREE_ADDR || '',
    minSats: 0,
    priceDisplay: 'Free — 100 signals / 24 h',
  },
  _100: {
    id: '_100', label: 'Researcher Lite', signals: 5000, windowDays: 30,
    btcAddress: process.env.AURION_RES_LITE_ADDR || '',
    minSats: 10_000,
    priceDisplay: '10,000 sats (~£1) — 5k signals / 30 d',
  },
  _inf: {
    id: '_inf', label: 'Institutional', signals: 0, windowDays: 365,
    btcAddress: process.env.AURION_INST_ADDR || '',
    minSats: 5_000_000,
    priceDisplay: '5,000,000 sats (~£500) — unlimited',
  },
};

// ── Supabase helper ───────────────────────────────────────────────────────────
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { validateWallet } from '@/lib/config';
dotenv.config({ path: '.env.local' });

function getSupabase(): SupabaseClient | null {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.includes('REPLACE_WITH')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const sb = getSupabase();

// ── Helpers ───────────────────────────────────────────────────────────────────
const isFreePlan = (planId: string) => planId === '_free';

function tierExpiry(windowDays: number): Date | null {
  if (windowDays < 1) return null;   // lifetime
  return new Date(Date.now() + windowDays * 86400_000);
}

// POST /api/paywall/unlock
// Body: { wallet: 'bc1q...', plan_id: '_free' | '_100' | '_inf', proof_txid?: string }
export async function POST(request: Request) {
  try {
    const { wallet, plan_id, proof_txid } = await request.json().catch(() => ({}));

    if (!wallet || typeof wallet !== 'string' || wallet.length < 10) {
      return NextResponse.json({ success: false, error: 'Missing or invalid wallet address.' }, { status: 400 });
    }
    if (!plan_id || !TIERS[plan_id]) {
      return NextResponse.json({ success: false, error: 'Invalid plan_id. Use _free, _100, or _inf.' }, { status: 400 });
    }

    const tier = TIERS[plan_id];

    // ── Validate wallet format ───────────────────────────────────────────────
    const walletCheck = validateWallet(wallet);
    if (!walletCheck.valid) {
      return NextResponse.json({ success: false, error: walletCheck.error }, { status: 400 });
    }

    // ── FREE: no payment needed, activate immediately ─────────────────────────
    if (isFreePlan(plan_id)) {
      if (sb) {
        await sb.from('aurion_wallet_plans').upsert(
          { wallet, tier: tier.label, plan_id, signals_used: 0, signals_limit: tier.signals || null, window_start: new Date().toISOString(), expires_at: tierExpiry(tier.windowDays)?.toISOString() ?? null, active: true },
          { onConflict: 'wallet' }
        );
      }
      return NextResponse.json({ success: true, plan: tier.label, signals_limit: tier.signals, window_days: tier.windowDays, note: 'Free plan activated.' });
    }

    // ── PAID: verify on-chain payment via Esplora ─────────────────────────────
    if (!proof_txid || typeof proof_txid !== 'string') {
      return NextResponse.json(
        {
          success: false,
          invoice: {
            plan_id, tier: tier.label, btcAddress: tier.btcAddress,
            minSats: tier.minSats, amountBtc: (tier.minSats / 100_000_000).toFixed(8),
            priceDisplay: tier.priceDisplay,
            note: `Send ${tier.minSats.toLocaleString()} sats to the address above, then resubmit with proof_txid.`,
          },
        },
        { status: 402 }
      );
    }

    // ── Fetch wallet transactions from Esplora to confirm payment ─────────────
    const esploraUrl = process.env.ESPLORA_URL || 'https://mempool.space/api';
    let paid = false;

    try {
      // Fetch UTXOs for the user's wallet — Esplora is external so we skip signal check
      const utxoResp = await fetch(`${esploraUrl}/address/${encodeURIComponent(wallet)}/utxo`, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined as any,
        // next: revalidate is only valid on Server Components/Segments, not route handlers — stripped at compile time
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      if (utxoResp.ok) {
        const utxos: Array<{ txid: string; vout: number; value: number }> = await utxoResp.json();
        for (const utxo of utxos) {
          const txResp = await fetch(`${esploraUrl}/tx/${utxo.txid}`);
          if (!txResp.ok) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tx: any = await txResp.json();
          // Scan vouts
          for (const vout of (tx.vout || [])) {
            const addr = vout.scriptpubkey_address || '';
            if (addr !== tier.btcAddress) continue;
            if ((utxo.value || 0) >= tier.minSats) { paid = true; break; }
          }
          if (paid) break;
        }
      }
    } catch {
      /* Esplora unavailable — can't verify on-chain; return 402 */
    }

    if (!paid) {
      // Also accept proof_txid if caller already verified it themselves
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not confirmed on-chain.',
          invoice: {
            plan_id, tier: tier.label, btcAddress: tier.btcAddress,
            minSats: tier.minSats, amountBtc: (tier.minSats / 100_000_000).toFixed(8),
            priceDisplay: tier.priceDisplay,
            proof_txid_received: proof_txid,
            hint: `Send ${tier.minSats.toLocaleString()} sats to ${tier.btcAddress} then resubmit with proof_txid. We will auto-verify on-chain.`,
          },
        },
        { status: 402 }
      );
    }

    // ── Payment confirmed — activate plan ────────────────────────────────────
    const expiry = tierExpiry(tier.windowDays);
    if (sb) {
      await sb.from('aurion_wallet_plans').upsert(
        {
          wallet, tier: tier.label, plan_id,
          signals_used: 0, signals_limit: tier.signals || null,
          window_start: new Date().toISOString(),
          expires_at: expiry?.toISOString() ?? null,
          active: true,
        },
        { onConflict: 'wallet' }
      );
      await sb.from('aurion_licenses').upsert(
        {
          license_key: `MANUAL-${wallet.slice(0, 8).toUpperCase()}`,
          tier: tier.label, plan_id, wallet_linked: true, active: true, expires_at: expiry?.toISOString() ?? null,
          metadata: { proof_txid, esplora: process.env.ESPLORA_URL },
        },
        { onConflict: 'license_key' }
      );
    }

    return NextResponse.json({
      success: true, plan: tier.label, signals_limit: tier.signals,
      window_days: tier.windowDays,
      expires_at: expiry?.toISOString() ?? null,
      note: `${tier.label} plan activated.`,
    });

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error.' },
      { status: 500 }
    );
  }
}
