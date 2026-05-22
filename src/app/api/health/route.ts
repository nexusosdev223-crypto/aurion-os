import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'AURION OS',
    status: 'operational',
    routes: ['/', '/api/metrics/velocity', '/api/ledger', '/api/commissions', '/api/signal', '/api/sms', '/api/token/transfer', '/api/paywall'],
    commission_rate: '1% per BUY trade',
    signal_pricing: 'BTC on-chain — Developer (free), Researcher Lite (10k sats/30d), Institutional (5M sats/yr)',
    uptime: process.uptime()
  });
}
