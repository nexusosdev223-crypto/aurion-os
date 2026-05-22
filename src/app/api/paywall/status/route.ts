import { NextResponse } from 'next/server';

// GET /api/paywall/status — wallet plan + remaining signals
// Query:    ?wallet=bc1q...
// ─────────────────────────────────────────────────────────────────────────────
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient, SupabaseClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSB(): SupabaseClient | null {
  if (!url || !key || key.includes('REPLACE_WITH')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: '?wallet= required' }, { status: 400 });

  const sb = getSB();
  if (!sb) {
    const walletUpper = wallet.toUpperCase();
    return NextResponse.json({
      success: true,
      wallet: walletUpper,
      plan: 'FREE', tier: 'Developer',
      signals_used: 0, signals_limit: 100,
      window_start: new Date().toISOString(),
      expires_at: null, active: true,
      source: 'default',
    });
  }

  try {
    const { data: plan, error } = await sb
      .from('aurion_wallet_plans')
      .select('*')
      .eq('wallet', wallet)
      .single();

    if (error || !plan) {
      // No plan row yet — treat as FREE default
      return NextResponse.json({
        success: true, wallet, plan: 'FREE', tier: 'Developer',
        signals_used: 0, signals_limit: 100,
        window_start: new Date().toISOString(),
        expires_at: null, active: true,
        source: 'default',
      });
    }

    return NextResponse.json({
      success: true, wallet: plan.wallet,
      plan: plan.plan_id, tier: plan.tier,
      signals_used: plan.signals_used,
      signals_limit: plan.signals_limit,
      window_start: plan.window_start,
      expires_at: plan.expires_at,
      active: plan.active,
      source: 'db',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
