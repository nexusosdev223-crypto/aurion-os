"use client";

import { useState } from 'react';

interface TokenGenome {
  name: string;
  symbol: string;
  supply: string;
  decimals: number;
  description: string;
  twitter: string;
  telegram: string;
}

function ChecklistItem({ done, text }: { done: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-800 text-surface-600'}`}>
        {done ? '✓' : '○'}
      </span>
      <span className={done ? 'text-surface-300' : 'text-surface-500'}>{text}</span>
    </li>
  );
}

export default function PumpFunLaunchpad() {
  const [genome, setGenome] = useState<TokenGenome>({
    name: '',
    symbol: '',
    supply: '1000000000',
    decimals: 9,
    description: '',
    twitter: '',
    telegram: '',
  });
  const [copied, setCopied] = useState<string | null>(null);

  const generateMemeName = () => {
    const prefixes = ['Doge', 'Pepe', 'Shiba', 'Moon', 'Cheems', 'Apu', 'Nyan', 'Babydoge', 'Floki', 'Samoyed'];
    const suffixes = ['Inu', 'Coin', 'Token', 'Finance', 'Swap', 'DAO', 'Gem', 'Rocket', 'King'];
    const verbs = ['to the', 'lambo', 'moon', 'mars', 'win', 'rich', 'fomo', 'ape'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    
    const name = `${prefix}${suffix}`;
    const symbol = name.replace(/[^A-Z]/g, '').slice(0, 6).toUpperCase();
    const desc = `${prefix} just ${verb} — join the movement.`;
    
    setGenome({ ...genome, name, symbol, description: desc });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="border border-surface-800 rounded-xl p-4 bg-surface-900/50">
        <h3 className="text-sm font-bold text-emerald-400 mb-3">Token Genome Generator</h3>
        
        <button
          onClick={generateMemeName}
          className="w-full mb-3 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
        >
          Generate Meme Token
        </button>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-surface-500 block mb-1">Name</label>
            <input
              type="text"
              value={genome.name}
              onChange={(e) => setGenome({ ...genome, name: e.target.value })}
              className="w-full bg-surface-950 border border-surface-700 rounded px-2 py-1 text-xs font-mono"
              placeholder="Token name"
            />
          </div>
          <div>
            <label className="text-[10px] text-surface-500 block mb-1">Symbol</label>
            <input
              type="text"
              value={genome.symbol}
              onChange={(e) => setGenome({ ...genome, symbol: e.target.value.toUpperCase() })}
              className="w-full bg-surface-950 border border-surface-700 rounded px-2 py-1 text-xs font-mono"
              placeholder="SYMBOL"
            />
          </div>
        </div>

        <div className="mt-2">
          <label className="text-[10px] text-surface-500 block mb-1">Description</label>
          <textarea
            value={genome.description}
            onChange={(e) => setGenome({ ...genome, description: e.target.value })}
            className="w-full bg-surface-950 border border-surface-700 rounded px-2 py-1 text-xs font-mono resize-none h-16"
            placeholder="Token story/narrative"
          />
        </div>
      </div>

      <div className="border border-surface-800 rounded-xl p-4 bg-surface-900/50">
        <h3 className="text-sm font-bold text-emerald-400 mb-3">Community Setup</h3>
        
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-surface-500 block mb-1">Telegram Link</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={genome.telegram}
                onChange={(e) => setGenome({ ...genome, telegram: e.target.value })}
                className="flex-1 bg-surface-950 border border-surface-700 rounded px-2 py-1 text-xs font-mono"
                placeholder="t.me/yourtoken"
              />
              {genome.telegram && (
                <button
                  onClick={() => copyToClipboard(genome.telegram, 'telegram')}
                  className="px-2 rounded bg-surface-800 text-surface-400 hover:text-surface-200 text-xs"
                >
                  {copied === 'telegram' ? '✓' : 'Copy'}
                </button>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-[10px] text-surface-500 block mb-1">Twitter Link</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={genome.twitter}
                onChange={(e) => setGenome({ ...genome, twitter: e.target.value })}
                className="flex-1 bg-surface-950 border border-surface-700 rounded px-2 py-1 text-xs font-mono"
                placeholder="twitter.com/yourtoken"
              />
              {genome.twitter && (
                <button
                  onClick={() => copyToClipboard(genome.twitter, 'twitter')}
                  className="px-2 rounded bg-surface-800 text-surface-400 hover:text-surface-200 text-xs"
                >
                  {copied === 'twitter' ? '✓' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-surface-800 rounded-xl p-4 bg-surface-900/50">
        <h3 className="text-sm font-bold text-emerald-400 mb-3">Pre-Launch Checklist</h3>
        
        <ul className="space-y-1.5">
          <ChecklistItem done={!!genome.name} text="Token name decided" />
          <ChecklistItem done={!!genome.symbol} text="Symbol ready (3-6 chars)" />
          <ChecklistItem done={!!genome.description} text="Narrative/story crafted" />
          <ChecklistItem done={false} text="Create Telegram group" />
          <ChecklistItem done={false} text="Create Twitter account" />
          <ChecklistItem done={false} text="Design token logo (Canva free)" />
          <ChecklistItem done={false} text="Create 5-10 memes" />
          <ChecklistItem done={false} text="Write token narrative" />
        </ul>
      </div>

      <div className="border border-emerald-500/20 rounded-xl p-3 bg-emerald-500/5">
        <p className="text-[10px] text-emerald-400 font-mono">
          <span className="font-bold">LAUNCH SEQUENCE:</span> Create group → Post memes → Build 20+ members → Launch on pump.fun → Renounce & lock LP → Promote in 20 groups
        </p>
      </div>

      <div className="border border-surface-800 rounded-xl p-3 bg-surface-900/50">
        <p className="text-[10px] text-surface-500 font-mono mb-1">
          <span className="text-emerald-400">Token Address Template:</span>
        </p>
        <p className="text-[9px] font-mono text-surface-600 break-all">
          {genome.symbol ? `${genome.symbol.toLowerCase()}XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` : 'SYMBOLXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'}
        </p>
        <button
          onClick={() => copyToClipboard('Replace with actual token address after launch', 'address')}
          className="mt-1 text-[10px] text-emerald-400 hover:underline"
        >
          Copy template
        </button>
      </div>
    </div>
  );
}