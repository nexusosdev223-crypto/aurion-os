"use client";

import { useState } from 'react';

interface TransactionConsoleProps {
  onSuccess?: () => void;
}

export default function TransactionConsole({ onSuccess }: TransactionConsoleProps) {
  const [orderType, setOrderType] = useState('BUY');
  const [amount, setAmount] = useState('1000');
  const [logMessage, setLogMessage] = useState('Manual operator liquidity allocation.');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/token/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType,
          amount: Number(amount),
          marketCap: 10000000,
          logMessage: `[OPERATOR] ${logMessage}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error("Failed to direct transfer", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded">
      <h3 className="text-sm font-bold text-emerald-400 tracking-wider mb-3">OPERATOR TRANSACTION CONSOLE</h3>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block text-neutral-500 mb-1">ARMS_TYPE</label>
          <select 
            value={orderType} 
            onChange={(e) => setOrderType(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-1.5 rounded text-neutral-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="BUY">BUY (MINT)</option>
            <option value="SELL">SELL (BURN)</option>
            <option value="HOLD">HOLD (SIGNAL)</option>
          </select>
        </div>
        <div>
          <label className="block text-neutral-500 mb-1">QUANTITY (AURION)</label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-1.5 rounded text-neutral-200 focus:outline-none focus:border-emerald-500" 
          />
        </div>
        <div>
          <label className="block text-neutral-500 mb-1">LEDGER_MESSAGE</label>
          <input 
            type="text" 
            value={logMessage} 
            onChange={(e) => setLogMessage(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-1.5 rounded text-neutral-200 focus:outline-none focus:border-emerald-500" 
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold p-2 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "EXECUTING..." : "COMMIT_TRANSACTION"}
        </button>
        {success && <p className="text-emerald-400 text-center mt-2">[SUCCESS] Ledger block updated.</p>}
      </form>
    </div>
  );
}
