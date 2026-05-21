import { supabase, isValidSupabaseConfig } from "../../../../lib/supabase";
import { bootProxyLayer } from "../../../../lib/proxy";
import {
  enforceComplianceGate,
  auditGateDecision,
  MAX_DRAWDOWN,
} from "../../../../lib/compliance_gate";

// ─────────────────────────────────────────────────────────────────────────────
// 🌐 VPN BOUNCE — ACTIVATED BEFORE ANY NETWORK CALL
// ─────────────────────────────────────────────────────────────────────────────
// bootProxyLayer  installs the global fetch shim and wires the proxy agent.
// Import-dedup (no-op after first run) so calling this here is idempotent.
bootProxyLayer();

interface VelocityMetrics {
  circulatingSupply: number;
  volume24h: number;
  tokenVelocity24h: number;
  healthIndex: string;
}

// ── CACHING LAYER ────────────────────────────────────────────────────────────
let metricsCache: { data: VelocityMetrics; timestamp: number } | null = null;
const METRICS_CACHE_TTL = 30_000; // 30 seconds

const ollamaCache: { [key: string]: { decision: string; timestamp: number } } =
  {};
const OLLAMA_CACHE_TTL = 5 * 60_000; // 5 minutes

let isExecuting = false;

async function fetchLiveMetrics(): Promise<VelocityMetrics> {
  const now = Date.now();
  if (metricsCache && now - metricsCache.timestamp < METRICS_CACHE_TTL) {
    return metricsCache.data;
  }

  const resp = await fetch("http://localhost:3000/api/metrics/velocity");
  if (!resp.ok) throw new Error(`Failed to fetch metrics: ${resp.status}`);
  const data = await resp.json();
  metricsCache = { data: data.metrics, timestamp: now };
  return data.metrics;
}

async function askOllama(metrics: VelocityMetrics): Promise<string> {
  const cacheKey = `${metrics.volume24h}-${metrics.tokenVelocity24h}-${metrics.healthIndex}`;
  const now = Date.now();

  if (
    ollamaCache[cacheKey] &&
    now - ollamaCache[cacheKey].timestamp < OLLAMA_CACHE_TTL
  ) {
    return ollamaCache[cacheKey].decision;
  }

  const prompt = `You are the AURION OS Autonomous Pilot Engine. Analyze these 24h token metrics and determine if the network requires an automated liquidity injection or market order rebalancing.

  METRICS:
  - 24h Trading Volume: ${metrics.volume24h}
  - Token Velocity 24h: ${metrics.tokenVelocity24h}
  - Network Health Index: ${metrics.healthIndex}

  Respond with a single, clear, concise decision log starting with either [BALANCE_MARKET] or [HOLD_STABLE] followed by your reasoning.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  const resp = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5-coder:7b",
      prompt: prompt,
      stream: false,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!resp.ok) throw new Error(`Ollama API error: ${resp.status}`);
  const data = await resp.json();

  ollamaCache[cacheKey] = { decision: data.response, timestamp: now };
  return data.response;
}

async function runExecutionLoop() {
  const TIMER_INTERVAL = 60000;
  const logConsole = (msg: string) =>
    console.log(`[AURION-EXECUTOR] [${new Date().toISOString()}] ${msg}`);

  setInterval(async () => {
    if (isExecuting) {
      logConsole("Skipping execution - previous run still in progress");
      return;
    }

    if (!isValidSupabaseConfig() || !supabase) {
      logConsole("Supabase not configured — skipping execution cycle.");
      isExecuting = true;
      isExecuting = false;
      return;
    }

    isExecuting = true;
    try {
      logConsole("Fetching latest 24h token velocity metrics...");
      const metrics = await fetchLiveMetrics();

      logConsole(
        `Metrics loaded. Velocity: ${metrics.tokenVelocity24h}, Health: ${metrics.healthIndex}.` +
          " Sending to Ollama...",
      );
      const agentDecision = await askOllama(metrics);

      logConsole(`Ollama responded: ${agentDecision}`);
      logConsole("Logging agent decision to Supabase (aurion_ledger)...");

      const orderType = agentDecision.includes("[BALANCE_MARKET]")
        ? "BUY"
        : "HOLD";
      const amount = orderType === "BUY" ? 5000 : 0;
      const marketCap = 10_000_000;
      const intent = `[AURION] ${orderType} — ${amount > 0 ? "Inject liquidity" : "Maintain position"} per agent analysis`;

      // ── COMPLIANCE GATE ────────────────────────────────────────────────────
      const gateOk = await enforceComplianceGate();
      if (!gateOk && orderType === "BUY") {
        // Gate refused — log blocked intent, do NOT execute
        const snapshot = await (
          await import("../../../../lib/compliance_gate")
        ).getEconomicSnapshot();
        await auditGateDecision({
          orderType: orderType,
          amount: 0,
          marketCap,
          agentLog: `[BLOCKED ${agentDecision}] Compliance gate refused — drawdown exceeds ${(MAX_DRAWDOWN * 100).toFixed(0)}% limit.`,
          intent,
          drawdownPct: snapshot.drawdownPct,
          gatePassed: false,
          executionResult: "BLOCKED",
        });
        logConsole("Trade BLOCKED by compliance gate.");
      } else {
        const { error } = await supabase!.from("aurion_ledger").insert([
          {
            order_type: orderType,
            amount: amount,
            market_cap: marketCap,
            agent_log: `[AURION] Execution Loop: ${agentDecision}`,
            intent,
          },
        ]);

        if (error) throw error;
        logConsole("Successfully logged decision to ledger.");
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[AURION-ERROR] Failed in running execution loop: ${errMsg}`,
      );
    } finally {
      isExecuting = false;
    }
  }, TIMER_INTERVAL);
}

runExecutionLoop();
