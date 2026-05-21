"use client";

import { useEffect, useState } from 'react';
import LedgerView from '@/components/LedgerView';
import TransactionConsole from '@/components/TransactionConsole';
import CommissionBar from '@/components/CommissionBar';

interface Metrics {
  circulatingSupply: number;
  volume24h: number;
  tokenVelocity24h: number;
  healthIndex: string;
}

export default function Home() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  }, [refreshTrigger]);

  const handleGlobalRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 p-6 font-mono selection:bg-emerald-500 selection:text-black">
      {/* Header Core */}
      <header className="border-b border-neutral-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-emerald-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            AURION OS // V1.0.0-MVP
          </h1>
          <p className="text-xs text-neutral-500 mt-1">Autonomous Autopilot Token Velocity Engine</p>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded">
            <span className="text-neutral-500">CORE MODEL:</span> <span className="text-blue-400 font-bold">qwen2.5-coder:7b</span>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded">
            <span className="text-neutral-500">LEDGER SYNC:</span> <span className="text-emerald-400 font-bold">SUPABASE DB</span>
          </div>
        </div>
      </header>

      {/* Telemetry Matrix Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded shadow-sm">
          <p className="text-xs text-neutral-500 tracking-tight uppercase">Circulating Supply</p>
          <p className="text-lg font-bold text-neutral-100 mt-1">
            {loading ? "..." : metrics?.circulatingSupply?.toLocaleString() || "100,000,000"}
          </p>
          <div className="h-1 bg-neutral-800 w-full mt-3 rounded overflow-hidden">
            <div className="h-full bg-blue-500 w-full" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded shadow-sm">
          <p className="text-xs text-neutral-500 tracking-tight uppercase">24h Trade Volume</p>
          <p className="text-lg font-bold text-emerald-400 mt-1">
            {loading ? "..." : `${metrics?.volume24h?.toLocaleString() || 0} AURION`}
          </p>
          <div className="h-1 bg-neutral-800 w-full mt-3 rounded overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min((metrics?.volume24h || 0) / 100000, 100)}%` }} />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded shadow-sm">
          <p className="text-xs text-neutral-500 tracking-tight uppercase">Ecosystem Velocity</p>
          <p className="text-lg font-bold text-amber-400 mt-1">
            {loading ? "..." : metrics?.tokenVelocity24h || "0.0000"}
          </p>
          <div className="h-1 bg-neutral-800 w-full mt-3 rounded overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${Math.min((metrics?.tokenVelocity24h || 0) * 100, 100)}%` }} />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded shadow-sm">
          <p className="text-xs text-neutral-500 tracking-tight uppercase">Network Health State</p>
          <p className="text-lg font-bold text-purple-400 mt-1">
            {loading ? "..." : metrics?.healthIndex || "STABLE"}
          </p>
          <div className="h-1 bg-neutral-800 w-full mt-3 rounded overflow-hidden">
            <div className="h-full bg-purple-500 w-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Revenue / Commission Tracker */}
      <CommissionBar />

      {/* Primary Workspace Layout Splits */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
          <div className="bg-neutral-850 border-b border-neutral-800 px-4 py-2.5 flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-400 tracking-wider">REAL-TIME MULTI-AGENT GENERAL LEDGER</span>
            <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded uppercase">Live Feed</span>
          </div>
          <div className="p-4">
            <LedgerView />
          </div>
        </div>

        <div className="space-y-4">
          <TransactionConsole onSuccess={handleGlobalRefresh} />
        </div>
      </section>
    </main>
  );
}
