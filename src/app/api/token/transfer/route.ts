import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enforceComplianceGate, auditGateDecision, MAX_DRAWDOWN } from '@/lib/compliance_gate';

export async function POST(request: Request) {
  try {
    const { orderType, amount, marketCap, logMessage } = await request.json();

    if (!orderType || typeof amount !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing orderType or numeric amount' }, { status: 400 });
    }

    // ── COMPLIANCE GATE ────────────────────────────────────────────────────
    const gateOk = await enforceComplianceGate();
    if (!gateOk) {
      const { getEconomicSnapshot } = await import('@/lib/compliance_gate');
      const snapshot = await getEconomicSnapshot();
      await auditGateDecision({
        orderType:      orderType,
        amount:         0,
        marketCap:      marketCap ?? 10_000_000,
        agentLog:       `[BLOCKED] Compliance gate refused trade — drawdown ${(snapshot.drawdownPct * 100).toFixed(2)}% exceeds ${(MAX_DRAWDOWN * 100).toFixed(0)}% limit.`,
        intent:         `[MANUAL] Operator requested ${orderType} — ${amount} AURION.`,
        drawdownPct:    snapshot.drawdownPct,
        gatePassed:     false,
        executionResult:'BLOCKED',
        byHuman:        true,
      });
      return NextResponse.json({
        success: false,
        error: `Compliance gate refused — drawdown ${(snapshot.drawdownPct * 100).toFixed(2)}% exceeds ${(MAX_DRAWDOWN * 100).toFixed(0)}% limit. Trade cancelled.`,
      }, { status: 402 });
    }

    const { data, error } = await supabase
      .from('aurion_ledger')
      .insert([
        {
          order_type: orderType,
          amount: amount,
          market_cap: marketCap || 10000000,
          agent_log: logMessage || `Manual transaction processing of ${amount} AURION.`
        }
      ])
      .select();

    if (error) throw error;

    await auditGateDecision({
      orderType:      orderType,
      amount,
      marketCap:      marketCap ?? 10_000_000,
      agentLog:       logMessage ?? `Manual transaction processing of ${amount} AURION.`,
      intent:         `[MANUAL] Operator executed ${orderType} — ${amount} AURION.`,
      drawdownPct:    0,
      gatePassed:     true,
      executionResult:'EXECUTED',
      byHuman:        true,
    });

    return NextResponse.json({ success: true, transaction: data[0] });
   } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
