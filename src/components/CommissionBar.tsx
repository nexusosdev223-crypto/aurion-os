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
    success: false, totalRevenueUsd: 0,
    commissionRate: 0.01, tradeCount: 0, avgCommissionPerTrade: 0,
  });

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await fetch('/api/commissions');
        const data = await res.json();
        if (data.success) setRevenue(data);
      } catch { /* keep last value */ }
    };
    fetchRevenue();
    const id = setInterval(fetchRevenue, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border border-emerald-900/60 bg-emerald-950/30 rounded-lg p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] text-emerald-600 uppercase tracking-widest mb-1">Revenue Operations</p>
          <p className="text-3xl font-black text-emerald-400">
            ${revenue.totalRevenueUsd.toFixed(2)}
            <span className="text-xs font-normal text-emerald-700 ml-2">USD realised</span>
          </p>
        </div>

        <div className="flex gap-6 text-xs">
          <div className="text-center">
            <p className="text-neutral-500 uppercase tracking-widest mb-1">Commission Rate</p>
            <p className="text-emerald-400 font-bold text-lg">{(revenue.commissionRate * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-neutral-500 uppercase tracking-widest mb-1">Simulated Trades</p>
            <p className="text-amber-400 font-bold text-lg">{revenue.tradeCount}</p>
          </div>
          <div className="text-center">
            <p className="text-neutral-500 uppercase tracking-widest mb-1">Avg / Trade</p>
            <p className="text-blue-400 font-bold text-lg">${revenue.avgCommissionPerTrade.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
