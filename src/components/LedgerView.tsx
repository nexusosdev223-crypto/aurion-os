'use client';

import { useEffect, useState } from 'react';

interface LedgerEntry {
  id: string;
  order_type: string;
  market_cap: number;
  token_velocity: number;
  agent_log: string;
  created_at: string;
}

/* ── Order-type badge ────────────────────────────────────────────────────────── */
function OrderTypeBadge({ type }: { type: string }) {
  if (type === "INTENT") return <span className="text-surface-500 font-mono text-[11px]">INTENT</span>;
  const isBuy = type === "BUY";
  const isSell = type === "SELL";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
        isBuy
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : isSell
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-surface-800 text-surface-400 border border-surface-700"
      }`}
    >
      {type}
    </span>
  );
}

export default function LedgerView() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLedger() {
      try {
        const res = await fetch('/api/ledger');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load ledger');
        setLedger(json.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load ledger');
      } finally {
        setLoading(false);
      }
    }
    fetchLedger();
  }, []);

  if (loading)
    return (
      <div className="space-y-2 animate-pulse p-2" role="status" aria-label="Loading ledger">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-surface-800/40" />
        ))}
        <p className="sr-only">Loading ledger entries…</p>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center rounded-xl border border-red-900/30 bg-red-950/10">
        <svg className="h-7 w-7 text-red-500/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm font-semibold text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-[11px] text-surface-400 underline underline-offset-2 hover:text-surface-200 transition-colors"
        >
          Reload page
        </button>
      </div>
    );

  if (ledger.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" aria-label="Ledger is empty">
        <div className="p-3.5 rounded-2xl bg-surface-900 border border-surface-800/60">
          <svg className="h-7 w-7 text-surface-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-surface-300">Ledger empty</p>
          <p className="text-[11px] text-surface-500 mt-0.5 max-w-xs">
            Transactions will appear here as they are recorded on the blockchain.
          </p>
        </div>
      </div>
    );

  return (
      <div className="min-w-[640px]">
        {/* Column headers — same column widths as rows below */}
        <div className="hidden sm:grid grid-cols-[96px_1fr_88px_72px_1fr] gap-2 px-4 py-2 mb-0.5 text-[9px] uppercase tracking-[0.18em] text-surface-500/70 border-b border-surface-800/50 font-semibold">
          <span>Time</span>
          <span>Type</span>
          <span className="text-right">Market Cap</span>
          <span className="text-right">Velocity</span>
          <span className="truncate">Agent Log</span>
        </div>

        <div className="divide-y divide-surface-800/30">
          {ledger.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[96px_1fr_88px_72px_1fr] gap-2 px-4 py-2.5 items-center hover:bg-surface-800/25 transition-colors group"
            >
              <span className="text-[11px] text-surface-500 font-mono leading-snug">
                {new Date(entry.created_at).toLocaleTimeString()}
              </span>
              <div>
                <OrderTypeBadge type={entry.order_type} />
              </div>
              <span className="text-[11px] text-surface-300 font-mono text-right leading-snug">
                ${Number(entry.market_cap).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[11px] text-amber-400/80 font-mono text-right leading-snug">
                {typeof entry.token_velocity === "number"
                  ? entry.token_velocity.toFixed(4)
                  : "n/a"}
              </span>
              <span
                className="text-[11px] text-surface-500 truncate leading-snug group-hover:text-surface-400 transition-colors"
                title={entry.agent_log}
              >
                {entry.agent_log}
              </span>
            </div>
          ))}
        </div>
      </div>
  );
}
