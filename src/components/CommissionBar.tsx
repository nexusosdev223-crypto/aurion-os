"use client";

import { useState, useEffect } from 'react';

interface CommissionSummary {
  success: boolean;
  totalRevenueUsd: number;
  commissionRate: number;
  tradeCount: number;
  avgCommissionPerTrade: number;
}

export default function CommissionBar() {
  const [revenue, setRevenue] = useState<CommissionSummary>({
    success: false,
    totalRevenueUsd: 0,
    commissionRate: 0.01,
    tradeCount: 0,
    avgCommissionPerTrade: 0,
  });

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await fetch('/api/commissions');
        const data = await res.json();
        if (data.success) setRevenue(data);
      } catch {
        /* keep last */
      }
    };
    fetchRevenue();
    const id = setInterval(fetchRevenue, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-900/25 bg-gradient-to-r from-emerald-950/40 via-emerald-950/15 to-transparent mb-6">
      {/* Inner glow accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent" />
      <div className="relative px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left — Revenue highlight */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-600 font-bold mb-1.5">
            Revenue Operations
          </p>
          <p className="text-[2rem] font-bold font-mono text-emerald-400 leading-none tracking-tight">
            ${revenue.totalRevenueUsd.toFixed(2)}
            <span className="text-xs font-normal text-emerald-700 ml-2.5">USD realised</span>
          </p>
        </div>

        {/* Right — KPI pills */}
        <div className="flex items-center gap-5 sm:gap-7">
          <Kpi
            label="Commission Rate"
            value={`${(revenue.commissionRate * 100).toFixed(0)}%`}
            colour="text-emerald-400"
          />
          <Kpi
            label="Simulated Trades"
            value={revenue.tradeCount.toString()}
            colour="text-amber-400"
          />
          <Kpi
            label="Avg / Trade"
            value={`$${revenue.avgCommissionPerTrade.toFixed(2)}`}
            colour="text-blue-400"
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  colour,
}: {
  label: string;
  value: string;
  colour: string;
}) {
  return (
    <div className="text-right sm:text-center min-w-[72px]">
      <p className="text-[9px] uppercase tracking-[0.2em] text-surface-500 mb-1">
        {label}
      </p>
      <p className={`text-xl font-mono font-bold leading-tight ${colour}`}>{value}</p>
    </div>
  );
}
