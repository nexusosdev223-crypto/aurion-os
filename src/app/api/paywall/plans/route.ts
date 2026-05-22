import { NextResponse } from 'next/server';

// GET /api/paywall/plans — tier catalogue
const TIERS = [
  {
    id: '_inf', label: 'Institutional', signals: 0, windowDays: 365,
    btcAddress: process.env.AURION_INST_ADDR || '',
    priceBtc: '0.05000000',
    priceDisplay: '5,000,000 sats (~£500) — unlimited',
  },
  {
    id: '_100', label: 'Researcher Lite', signals: 5000, windowDays: 30,
    btcAddress: process.env.AURION_RES_LITE_ADDR || '',
    priceBtc: '0.00010000',
    priceDisplay: '10,000 sats (~£1) — 5k signals / 30 d',
  },
  {
    id: '_free', label: 'Developer', signals: 100, windowDays: 1,
    btcAddress: process.env.AURION_FREE_ADDR || '',
    priceBtc: '0',
    priceDisplay: 'Free — 100 signals / 24 h',
  },
];

export async function GET() {
  return NextResponse.json({ success: true, tiers: TIERS });
}