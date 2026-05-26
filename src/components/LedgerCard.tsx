'use client';

import { useEffect, useState } from 'react';

interface LedgerData {
  agent_id: string;
  current_balance: number;
}

export default function LedgerCard() {
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      setLedger(data);
    } catch (err) {
      console.error('Failed to read local ledger endpoint:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-4 text-zinc-400 font-mono text-xs">Connecting to Node...</div>;

  return (
    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl max-w-sm w-full mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold tracking-wider uppercase text-zinc-500 font-mono">Aurion OS Core Ledger</h2>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 font-mono mb-1">Active Target Agent</div>
          <div className="text-sm font-mono text-zinc-300 bg-zinc-900/50 p-2 border border-zinc-900 rounded-md">
            {ledger?.agent_id || 'unknown'}
          </div>
        </div>
        <hr className="border-zinc-900 my-2" />
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 font-mono mb-1">Synchronized Balance</div>
          <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {ledger?.current_balance?.toLocaleString() || '0'}
          </div>
        </div>
      </div>
    </div>
  );
}
