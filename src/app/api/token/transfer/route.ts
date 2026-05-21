import { NextResponse } from 'next/server';
import { supabase, isValidSupabaseConfig } from '@/lib/supabase';
import { enforceComplianceGate, auditGateDecision, MAX_DRAWDOWN } from '@/lib/compliance_gate';

export async function POST(request: Request) {
  try {
    const { orderType, amount, marketCap, logMessage, intentOnly, intentMessage } = await request.json();

    if (!orderType) {
      return NextResponse.json({ success: false, error: 'Missing orderType' }, { status: 400 });
    }

    // amount is required for trade semantics; for intent-only logging we allow missing/undefined
    if (!intentOnly && typeof amount !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing numeric amount' }, { status: 400 });
    }

    // Supabase not configured — return mock response so the UI stays functional
    if (!isValidSupabaseConfig()) {
      const gateOk = await enforceComplianceGate();
      const mockTx = {
        order_type: orderType,
        amount: amount ?? 0,
        market_cap: marketCap ?? 10_000_000,
        agent_log: logMessage ?? `Mock transaction: ${orderType}`,
        intent: `[MOCK] ${orderType}`,
        created_at: new Date().toISOString(),
        id: 0,
      };
      if (!gateOk) {
        await auditGateDecision({
          orderType, amount: 0, marketCap: marketCap ?? 10_000_000,
          agentLog: `[MOCK BLOCKED] Compliance gate refused — drawdown exceeds MAX_DRAWDOWN.`,
          intent: `[MOCK] ${orderType}`, drawdownPct: 0, gatePassed: false, executionResult: "BLOCKED", byHuman: true,
        });
        return NextResponse.json({ success: false, error: 'Compliance gate refused (mock mode).', transaction: mockTx }, { status: 402 });
      }
      await auditGateDecision({
        orderType, amount: amount ?? 0, marketCap: marketCap ?? 10_000_000,
        agentLog: `[MOCK] Transaction executed in mock mode.`, intent: `[MOCK] ${orderType}`,
        drawdownPct: 0, gatePassed: true, executionResult: "EXECUTED", byHuman: true,
      });
      return NextResponse.json({ success: true, transaction: mockTx });
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

    // Optional: operator intent-only logging (no mint/trade semantics)
    if (intentOnly) {
      const intent = intentMessage ? String(intentMessage) : `[MANUAL] Operator intent log`;

      const { data, error } = await supabase!.from('aurion_ledger')
        .insert([
          {
            order_type: orderType || 'INTENT',
            amount: typeof amount === 'number' ? amount : 0,
            market_cap: marketCap || 10_000_000,
            agent_log: logMessage || `Operator intent: ${intent}`,
            intent: intent,
          }
        ])
        .select();

      if (error) throw error;

      await auditGateDecision({
        orderType:      orderType || 'INTENT',
        amount:         typeof amount === 'number' ? amount : 0,
        marketCap:      marketCap || 10_000_000,
        agentLog:       logMessage || `Operator intent: ${intent}`,
        intent,
        drawdownPct:    0,
        gatePassed:     true,
        executionResult:'EXECUTED',
        byHuman:        true,
      });

      return NextResponse.json({ success: true, transaction: data[0] });
    }

    const { data, error } = await supabase!.from('aurion_ledger')
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
