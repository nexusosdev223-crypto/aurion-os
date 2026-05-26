'use client';
import { useEffect, useState } from 'react';

export default function ShadowVaultCard() {
  const [vaults, setVaults] = useState<any[]>([]);

  useEffect(() => {
    const fetchVaults = async () => {
      try {
        const res = await fetch('/api/shadow-vault');
        if (res.ok) {
          const data = await res.json();
          setVaults(data.activeFragments || []);
        }
      } catch (err) {
        console.error("Shadow vault fetch failed", err);
      }
    };

    fetchVaults();
    const interval = setInterval(fetchVaults, 5000); // 5-second background polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2 pt-2 border-t border-zinc-900 mt-3">
      <div className="text-[10px] text-zinc-600 font-mono uppercase mb-2">Live Node Balances</div>
      {vaults.length === 0 ? (
        <div className="text-xs text-zinc-500 font-mono">Syncing nodes...</div>
      ) : (
        vaults.map((vault) => (
          <div key={vault.agent_id} className="flex justify-between items-center bg-zinc-900 px-2 py-1.5 rounded text-[10px] font-mono">
            <span className="text-zinc-400">{vault.agent_id}</span>
            <span className="text-emerald-400 font-bold">{vault.current_balance}</span>
          </div>
        ))
      )}
    </div>
  );
}
