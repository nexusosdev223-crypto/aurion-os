import LedgerCard from '../src/components/LedgerCard';
import ShadowVaultCard from '../src/components/ShadowVaultCard';
import { TOKEN_CONFIG } from '../src/app/token-config';

export default function Home() {
  const nameText = TOKEN_CONFIG.name + " Central Node";
  const logoMark = TOKEN_CONFIG.logoMark;
  const symbolText = TOKEN_CONFIG.symbol;
  const capText = TOKEN_CONFIG.bondingCurve.targetCapSol + " SOL";

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex flex-col p-6 font-mono">
      {/* Header Frame */}
      <header className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-900 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
            <span>{nameText}</span>
            <span className="text-emerald-500 font-normal text-lg">{logoMark}</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Autonomous Agent Network • Core v1.0.0</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-md text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400">DOCKER STACK: ONLINE</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-md text-[10px]">
            <span className="text-zinc-500">SYMBOL:</span>
            <span className="text-emerald-400 font-bold">{symbolText}</span>
          </div>
        </div>
      </header>

      {/* Main Content Workspace Layout */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Financial Column */}
        <div className="md:col-span-1 space-y-4">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Financial Integrity</div>
          <LedgerCard />
        </div>

        {/* Systems Columns */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-1">Agent Subsystems</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Brain Agent */}
              <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">brain_agent_01</span>
                  <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 border border-zinc-800 rounded">Master Core</span>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-600 uppercase">Engine Target</div>
                  <div className="text-sm text-zinc-300">Autonomous Autopilot</div>
                </div>
                <div className="pt-2 flex items-center justify-between text-[10px] border-t border-zinc-900">
                  <span className="text-zinc-500">Target Cap</span>
                  <span className="text-zinc-300">{capText}</span>
                </div>
              </div>

              {/* Shadow Vault */}
              <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">shadow_vault_loop</span>
                  <span className="text-[10px] bg-emerald-950/30 text-emerald-400 px-2 py-0.5 border border-emerald-900/50 rounded">Active</span>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-600 uppercase">Fragmentation State</div>
                  <div className="text-sm text-emerald-400">Loop Script Synchronized</div>
                </div>
                <div className="pt-2 flex items-center justify-between text-[10px] border-t border-zinc-900">
                  <span className="text-zinc-500">Wallet Obfuscation</span>
                  <span className="text-emerald-500 font-bold">MONITORING</span>
                </div>
                
                {/* THE NEW LIVE TRACKER COMPONENT IS INJECTED HERE */}
                <ShadowVaultCard />
              </div>

            </div>
          </div>

          {/* Secure Environment Banner */}
          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
            <span className="text-xs text-zinc-500">Local node network reporting clean operational execution loops.</span>
            <span className="text-[10px] bg-zinc-900 text-emerald-400 px-2 py-1 border border-zinc-800 rounded uppercase tracking-wider font-bold">
              Secure Environment
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
