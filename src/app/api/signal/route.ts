import { NextResponse } from 'next/server';
import { calculateTokenVelocity } from '@/lib/token';

const SIGNAL_PRICE_USD = 0.01;
const FREE_LIMIT = 10;

declare global {
  var signalCounter: Map<string, number>;
}

if (!global.signalCounter) {
  global.signalCounter = new Map();
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.SIGNAL_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wallet = request.headers.get('x-wallet') || 'anonymous';
  const used = global.signalCounter.get(wallet) || 0;

  if (used >= FREE_LIMIT) {
    return NextResponse.json({
      error: 'Payment required',
      message: `Free limit of ${FREE_LIMIT} signals reached`,
      pay_link: process.env.STRIPE_SIGNAL_PRODUCT || 'https://buy.stripe.com/test_14k3cxaQf7fQ5yE5nn',
      price_usd: SIGNAL_PRICE_USD
    }, { status: 402 });
  }

  try {
    const metrics = await calculateTokenVelocity();
    const velocity = metrics.velocity24h;
    const health = metrics.healthIndex;

    let decision: string;
    if (health === 'STAGNANT' || velocity < 0.1) {
      const amount = Math.floor(Math.random() * 4900) + 100;
      decision = JSON.stringify({
        action: 'STIMULATE',
        amount,
        reason: `Velocity ${velocity} below threshold - injecting liquidity`
      });
    } else {
      decision = JSON.stringify({
        action: 'HOLD',
        amount: 0,
        reason: `Health index ${health} - maintaining position`
      });
    }

    global.signalCounter.set(wallet, used + 1);
    return NextResponse.json({ success: true, signal: decision, used: used + 1, limit: FREE_LIMIT });
  } catch {
    return NextResponse.json({ success: false, error: 'Signal computation failed' }, { status: 500 });
  }
}