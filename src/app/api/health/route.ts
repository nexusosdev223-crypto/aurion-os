import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'AURION OS',
    status: 'operational',
    routes: ['/', '/api/metrics/velocity', '/api/ledger', '/api/commissions', '/api/signal', '/api/sms', '/api/token/transfer'],
    commission_rate: '1% per BUY trade',
    signal_pricing: '$0.01 per signal (10 free)',
    uptime: process.uptime()
  });
}
