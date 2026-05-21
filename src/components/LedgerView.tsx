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

  if (loading) return <div className="p-6 text-zinc-400 animate-pulse">Syncing with aurion_ledger...</div>;
  if (error) return <div className="p-6 text-red-400 bg-red-950/20 border border-red-900 rounded-lg">Error: {error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">AURION OS Ledger</h1>
          <p className="text-sm text-zinc-400">Real-time multi-agent transaction history & metrics</p>
        </div>
        <div className="px-3 py-1 bg-emerald-950/50 border border-emerald-800 text-emerald-400 text-xs font-mono rounded-full animate-pulse">
          Engine Live
        </div>
      </div>

      <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-950">
        <table className="w-full text-left text-sm font-mono">
          <tbody className="divide-y divide-zinc-850 text-zinc-300">
            {ledger.length === 0 ? (
              <tr><td className="p-8 text-center text-zinc-500">No records found.</td></tr>
            ) : (
              ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-zinc-900/50">
                  <td className="p-4 text-zinc-500 text-xs">{new Date(entry.created_at).toLocaleTimeString()}</td>
                  <td className="p-4">{entry.order_type}</td>
                  <td className="p-4">${Number(entry.market_cap).toLocaleString()}</td>
                  <td className="p-4 text-amber-400">{entry.token_velocity}x</td>
                  <td className="p-4 text-zinc-400 text-xs truncate max-w-md">{entry.agent_log}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
