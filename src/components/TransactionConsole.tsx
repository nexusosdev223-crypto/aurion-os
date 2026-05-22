"use client";

import { useState } from 'react';

interface TransactionConsoleProps {
  onSuccess?: () => void;
}

const ORDER_OPTIONS: { value: string; label: string; desc: string; colour: string; activeColour: string }[] = [
  { value: 'BUY',  label: 'BUY',  desc: 'Mint new supply', colour: 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500', activeColour: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'SELL', label: 'SELL', desc: 'Burn tokens',    colour: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15', activeColour: 'bg-red-600 text-white border-red-500 hover:bg-red-500' },
  { value: 'HOLD', label: 'HOLD', desc: 'Signal only',    colour: 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700', activeColour: 'bg-surface-700 text-surface-100 border-surface-600' },
];

export default function TransactionConsole({ onSuccess }: TransactionConsoleProps) {
  const [orderType, setOrderType] = useState('BUY');
  const [amount, setAmount] = useState('1000');
  const [logMessage, setLogMessage] = useState('Manual operator liquidity allocation.');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await fetch('/api/token/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType,
          amount: Number(amount),
          marketCap: 10_000_000,
          logMessage: `[OPERATOR] ${logMessage}`,
        }),
      });
      const data = await res.json();
      if (res.status === 402 && !data.success) {
        setFeedback({ type: 'error', message: data.error || 'Compliance gate blocked this trade.' });
        return;
      }
      if (data.success) {
        setFeedback({ type: 'success', message: 'Ledger block updated.' });
        setAmount('1000');
        setLogMessage('Manual operator liquidity allocation.');
        onSuccess?.();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Transaction failed.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error. Check connection.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Order Type */}
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-surface-500 font-bold mb-2">
          Order Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ORDER_OPTIONS.map((opt) => {
            const active = orderType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOrderType(opt.value)}
                className={`rounded-lg border p-2.5 text-center text-[10px] font-mono font-bold tracking-wider transition-all duration-200 ${
                  active ? opt.colour : opt.colour.includes('text-amber-400') ? "bg-surface-950 text-red-400 border-surface-700 hover:border-surface-600" : "bg-surface-950 text-surface-400 border-surface-700 hover:border-surface-600"
                }`}
                title={opt.desc}
              >
                {opt.label}
                <span className="block text-[9px] font-normal opacity-60 mt-0.5 normal-case tracking-normal">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-surface-500 font-bold mb-2">
          Quantity
        </label>
        <div className="relative">
          <input
            type="number"
            min={0}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-surface-950 border border-surface-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-surface-200 placeholder-surface-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-colors appearance-none"
            placeholder="0"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-surface-600 font-mono pointer-events-none">
            AURION
          </span>
        </div>
      </div>

      {/* Ledger Message */}
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-surface-500 font-bold mb-2">
          Ledger Message
        </label>
        <input
          type="text"
          value={logMessage}
          onChange={(e) => setLogMessage(e.target.value)}
          className="w-full bg-surface-950 border border-surface-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-surface-200 placeholder-surface-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-colors"
          placeholder="Describe this transaction…"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-2.5 transition-all duration-200 shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 active:scale-[0.98]"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            COMMITTING…
          </span>
        ) : (
          'COMMIT TRANSACTION'
        )}
      </button>

      {/* Feedback */}
      {feedback.message && (
        <p
          className={`text-[11px] font-mono text-center py-2 rounded-lg ${
            feedback.type === 'success'
              ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10'
              : 'text-red-400 bg-red-500/5 border border-red-500/10'
          }`}
        >
          {feedback.type === 'success' ? '✓ ' : '✕ '}
          {feedback.message}
        </p>
      )}
    </form>
  );
}
