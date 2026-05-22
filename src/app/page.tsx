"use client";

import { useEffect, useState } from 'react';
import LedgerView from '@/components/LedgerView';
import CommissionBar from '@/components/CommissionBar';
import PaywallModal from '@/components/PaywallModal';
import PumpFunLaunchpad from '@/components/PumpFunLaunchpad';

interface Metrics {
  circulatingSupply: number;
  volume24h: number;
  tokenVelocity24h: number;
  healthIndex: string;
}

function VelocityBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0) * 100, 100);
  const colour =
    value < 0.1
      ? 'bg-amber-400'
      : value > 0.8
        ? 'bg-red-400'
        : 'bg-emerald-400';
  return (
    <div className="h-1 w-full rounded-full bg-surface-800/50 overflow-hidden">
      <div
        className={`h-full ${colour} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
  bar,
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  bar?: number;
  badge?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-surface-800/60 bg-surface-900/70 p-5 transition-all duration-300 hover:border-emerald-500/30 hover:bg-surface-900">
      {/* Top-fade hover glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-500" />
      {badge && (
        <span className="absolute top-3 right-3 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-950/80 border border-surface-800 text-surface-400 uppercase tracking-wider">
          {badge}
        </span>
      )}
      <p className="text-[10px] uppercase tracking-[0.18em] text-surface-500 mb-2.5">
        {label}
      </p>
      <p className={`text-[1.75rem] font-bold font-mono ${accent} leading-[1.1] tracking-tight`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-surface-500 mt-1.5 font-mono">{sub}</p>}
      {bar !== undefined && <div className="mt-5"><VelocityBar value={bar} /></div>}
    </div>
  );
}

export default function Home() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const [planStatus, setPlanStatus] = useState<{ plan: string; tier: string; signals_used: number; signals_limit: number } | null>(null);

  // ── Plan status (lightweight poll) ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchPlan() {
      try {
        const res = await fetch('/api/paywall/plans');
        const j = await res.json();
        if (j.success && !cancelled) setPlanStatus({ plan: '_free', tier: 'Developer', signals_used: 0, signals_limit: 100 });
      } catch { /* silent fail — defaults show */ }
    }
    fetchPlan();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/metrics/velocity');
        const data = await res.json();
        if (data.success) setMetrics(data.metrics);
      } catch (err) {
        console.error("Failed to load telemetry meters", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const isStable  = metrics?.healthIndex === 'STABLE';
  const isVolatile = metrics?.healthIndex === 'VOLATILE';
  const isStagnant = metrics?.healthIndex === 'STAGNANT';
  const healthAccent = isVolatile ? 'text-red-400' : isStagnant ? 'text-amber-400' : 'text-emerald-400';
  const velocityAccent = (metrics?.tokenVelocity24h ?? 0) < 0.1
    ? 'text-amber-400'
    : (metrics?.tokenVelocity24h ?? 0) > 0.8
      ? 'text-red-400'
      : 'text-emerald-400';

  return (
    <main className="min-h-screen bg-surface-950 text-surface-200 p-6 font-sans selection:bg-emerald-500/30">
      {/* ─── Header ─────────────────────────────────────── */}
      <header className="relative border-b border-surface-800 pb-5 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Brand mark */}
            <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/10">
              <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.08em] text-surface-50 leading-tight">
                AURION <span className="text-emerald-400 font-black">OS</span>
              </h1>
              <p className="text-[11px] text-surface-500 mt-0.5 tracking-[0.12em]">
                Autonomous Autopilot Token Velocity Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {metrics && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400">
                <span className={`h-1.5 w-1.5 rounded-full ${isStable ? 'bg-emerald-400' : isVolatile ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
                {isStable ? 'STABLE' : isVolatile ? 'VOLATILE' : isStagnant ? 'STAGNANT' : metrics.healthIndex}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-surface-950/80 border border-surface-800 text-surface-400 font-mono font-semibold">
              qwen2.5-coder:7b
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400/80 font-semibold">
              ● SUPABASE
            </span>
            {/* Plan status + upgrade button */}
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-950/80 border border-surface-800 text-surface-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-surface-600" />
              {planStatus
                ? `${planStatus.tier} · ${planStatus.signals_used}/${planStatus.signals_limit ?? '∞'}`
                : 'Developer'}
            </span>
            <button
              onClick={() => setPlanOpen(true)}
              className="px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-900/40 hover:border-emerald-600/50 transition-colors"
            >
              ↑ Upgrade
            </button>
          </div>
        </div>
      </header>

      {/* ─── Metrics ────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Circulating Supply"
          value={loading ? '—' : (metrics?.circulatingSupply ?? 0).toLocaleString()}
          sub="100M fixed cap"
          accent="text-surface-100"
        />
        <StatTile
          label="24h Trade Volume"
          value={loading ? '—' : `${(metrics?.volume24h ?? 0).toLocaleString()} AUR`}
          accent="text-emerald-400"
          bar={metrics ? metrics.volume24h / 100000 : 0}
          badge="24H"
        />
        <StatTile
          label="Token Velocity"
          value={loading ? '—' : (metrics?.tokenVelocity24h ?? 0).toFixed(4)}
          sub="volume ÷ supply"
          accent={velocityAccent}
          bar={metrics ? metrics.tokenVelocity24h : 0}
          badge="V24H"
        />
        <StatTile
          label="Network Health"
          value={loading ? '—' : metrics?.healthIndex ?? '—'}
          accent={healthAccent}
        />
      </section>

      {/* ─── Revenue Bar ────────────────────────────────── */}
      <CommissionBar />

      {/* ─── Workspace ───────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        {/* Ledger */}
        <div className="lg:col-span-2 rounded-xl border border-surface-800/60 bg-surface-900/70 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-800 bg-surface-950/50">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-surface-400">
                General Ledger
              </h2>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Feed
            </span>
          </div>
          <div className="p-4">
            <LedgerView />
          </div>
        </div>

        {/* Transaction Console + PumpFun Launchpad */}
        <div className="rounded-xl border border-surface-800/60 bg-surface-900/70 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-800 bg-surface-950/50">
            <svg className="h-4 w-4 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a12.032 12.032 0 01-.997.006c-.784 0-1.552-.11-2.28-.328a16.048 16.048 0 00-.988-.126c-.263-.096-.57-.158-.895-.203-.325-.046-.66-.067-1.003-.067H4.5a4.5 4.5 0 000 9h3.25" />
            </svg>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-surface-400">
              PumpFun Launchpad
            </h2>
          </div>
          <div className="p-4">
            <PumpFunLaunchpad />
          </div>
        </div>
      </section>

      <PaywallModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        onUnlocked={() => {
          /* Plan was upgraded — status will refresh on next poll */
        }}
      />
    </main>
  );
}
