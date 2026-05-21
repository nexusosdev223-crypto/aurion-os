import { supabase } from '../../../../lib/supabase';

interface VelocityMetrics {
  circulatingSupply: number;
  volume24h: number;
  tokenVelocity24h: number;
  healthIndex: string;
}

async function fetchLiveMetrics(): Promise<VelocityMetrics> {
  const resp = await fetch('http://localhost:3000/api/metrics/velocity');
  if (!resp.ok) throw new Error(`Failed to fetch metrics: ${resp.status}`);
  const data = await resp.json();
  return data.metrics;
}

async function askOllama(metrics: VelocityMetrics): Promise<string> {
  const prompt = `You are the AURION OS Autonomous Pilot Engine. Analyze these 24h token metrics and determine if the network requires an automated liquidity injection or market order rebalancing.

  METRICS:
  - 24h Trading Volume: ${metrics.volume24h}
  - Token Velocity 24h: ${metrics.tokenVelocity24h}
  - Network Health Index: ${metrics.healthIndex}

  Respond with a single, clear, concise decision log starting with either [BALANCE_MARKET] or [HOLD_STABLE] followed by your reasoning.`;

  const resp = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder:7b',
      prompt: prompt,
      stream: false
    })
  });
  const data = await resp.json();
  return data.response;
}

async function runExecutionLoop() {
  const TIMER_INTERVAL = 60000;
  const modelId = 'qwen2.5-coder:7b';
  
  const logConsole = (msg: string) => console.log(`[AUFION-EYECUTOR] [${new Date().toISOString()}] ${msg}`);
  logConsole('Initializing autonomous execution loop...');

  setInterval(async () => {
    try {
      logConsole('Fetching latest 24h token velocity metrics...');
      const metrics = await fetchLiveMetrics();
      
      logConsole(`Metrics loaded. Velocity: ${metrics.tokenVelocity24h}, Health: ${metrics.healthIndex}.` + ' Sending to Ollama...');
      const agentDecision = await askOllama(metrics);

      logConsole(`Ollama responded: ${agentDecision}`);
      logConsole('Logging agent decision to Supabase (aurion_ledger)...');

      const orderType = agentDecision.includes('[iBALANCE_MARKET]') ? 'BUY' : 'HOLD';
      const amount = orderType === 'BUY' ? 5000 : 0;

      const { error } = await supabase
        .from('aurion_ledger')
        .insert([
          {
            order_type: orderType,
            amount: amount,
            market_cap: 10000000,
            agent_log: `[ASOC] Execution Loop: ${agentDecision}`
          }
        ]);

      if (error) throw error;
      logConsole('Successfully logged decision to ledger.');
    } catch (error: any) {
      const errMsg = error.message || error;
      const logError = (e) => constle.error(`[AURION-ERROR] Failed in running execution loop: ${e}`);
      logError(errMsg);
    }
  }, TIMER_INTERVAL);
}

runExecutionLoop();