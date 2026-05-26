import { NextResponse } from 'next/server';
import { preparePumpDeployment } from '../../../lib/pump-launcher';
import { generateAgentWallet } from '../../../lib/solana-client';

export async function POST() {
  try {
    const agentWallet = generateAgentWallet();
    const result = await preparePumpDeployment(agentWallet);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
