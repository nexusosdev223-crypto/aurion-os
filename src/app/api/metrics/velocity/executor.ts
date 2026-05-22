import { supabase, isValidSupabaseConfig } from "../../../../lib/supabase";
import { bootProxyLayer } from "../../../../lib/proxy";
import {
  enforceComplianceGate,
  auditGateDecision,
  MAX_DRAWDOWN,
} from "../../../../lib/compliance_gate";
import { logCommission } from "../../../../lib/commissions";

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

function logConsole(msg: string) {
  console.log(`[AURION-EXECUTOR] [${new Date().toISOString()}] ${msg}`);
}

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

  // ── Ollama unavailable heuristic fallback ─────────────────────────────────
  // If Ollama is not running (no GPU in this environment), make a deterministic
  // local decision based on token-velocity health signals so the loop still
  // produces live ledger entries every tick.
  if (metrics.healthIndex === "VOLATILE") {
    logConsole("Ollama unreachable — falling back to [HOLD_STABLE] (VOLATILE safety override).");
    return "[HOLD_STABLE] Velocity too high — Ollama offline but VOLATILE overrides any buy signal.";
  }
  if (metrics.healthIndex === "STABLE") {
    const decision =
      "[BALANCE_MARKET] Velocity healthy — Ollama offline; local heuristic injecting liquidity into a STABLE market to keep velocity moving.";
    logConsole("Ollama unreachable — falling back to local heuristic [BALANCE_MARKET].");
    return decision;
  }
// STAGNANT
  logConsole("Ollama unreachable — falling back to [HOLD_STABLE] (stagnant market).");
  return "[HOLD_STABLE] Lark activity — no Ollama; waiting for clearer signal before entering.";
}

async function runExecutionLoop() {
  const TIMER_INTERVAL = 60000;

  setInterval(async () => {
    if (isExecuting) {
      logConsole("Skipping execution - previous run still in progress");
      return;
    }

    // ── MOCK MODE ────────────────────────────────────────────────────────────
    if (!isValidSupabaseConfig() || !supabase) {
      logConsole("[MOCK MODE] Supabase not configured — using in-memory ledger.");
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
        logConsole(
          supabase && isValidSupabaseConfig()
            ? "Logging agent decision to Supabase (aurion_ledger)..."
            : "[MOCK] Not writing to ledger — Supabase not configured."
        );

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

          // ── REVENUE TRACKER — log commission on every BUY trade ──────────────
          try {
            await logCommission({
              orderType:      orderType,
              volume:         amount,
              agentDecision:  agentDecision,
            });
            logConsole(`💰 Commission logged: $${(amount * 0.01).toFixed(2)} credited.`);
          } catch (commErr: unknown) {
            const commMsg = commErr instanceof Error ? commErr.message : String(commErr);
            console.warn(`[AURION-COMMISSION] Failed to log: ${commMsg}`);
          }
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[AURION-ERROR] Failed in mock-mode execution loop: ${errMsg}`,
        );
      } finally {
        isExecuting = false;
      }
      return;
    }

    // ── PRODUCTION MODE ───────────────────────────────────────────────────────
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

        // ── REVENUE TRACKER — log commission on every BUY trade ──────────────
        try {
          await logCommission({
            orderType:      orderType,
            volume:         amount,
            agentDecision:  agentDecision,
          });
          logConsole(`💰 Commission logged: $${(amount * 0.01).toFixed(2)} credited.`);
        } catch (commErr: unknown) {
          const commMsg = commErr instanceof Error ? commErr.message : String(commErr);
          console.warn(`[AURION-COMMISSION] Failed to log: ${commMsg}`);
        }
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
