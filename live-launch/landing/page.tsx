'use client';

import { useState, useEffect, useRef } from 'react';

// ── Counters that simulate live community data ──────────────────────────────
function useGmftCounter() {
  // base values — the "truth" behind the counter is local
  // every page visit is a fresh simulated session
  const [holders, setHolders]   = useState(1_212);
  const [buys, setBuys]         = useState(8_431);
  const [txs, setTxs]           = useState(12_847);
  const startedAt               = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1_000);
      // holders grow roughly 1 every 2 minutes of real-time
      setHolders((h) => h + Math.floor(elapsed / 120));
      // buys grow faster
      setBuys((b)  => b + Math.floor(elapsed / 180));
      // txs always higher than buys (includes sells)
      setTxs((t)   => t + Math.floor(elapsed / 150));
    };
    const id = setInterval(tick, 5_000);
    return () => clearInterval(id);
  }, []);

  return { holders, buys, txs };
}

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

// ── Pulsing GMFT Hero text ─────────────────────────────────────────────────
function GmftHero() {
  return (
    <span
      className="
        relative inline-block
        animate-pulse-slow
      "
      style={{
        background: 'linear-gradient(90deg,#22c55e 0%,#4ade80 35%,#22c55e 65%,#16a34a 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation:
          'textShimmer 3s ease-in-out infinite, gmftPulse 2s ease-in-out infinite',
      }}
    >
      GMFT
    </span>
  );
}

// ── Sub-badge row ──────────────────────────────────────────────────────────
function BadgeRow() {
  const badges = [
    { label: 'LP Renounced', emoji: '🔒', colour: 'text-emerald-400 border-emerald-500/30' },
    { label: '0% Tax',      emoji: '💸', colour: 'text-emerald-300 border-emerald-500/25' },
    { label: 'Fair Launch', emoji: '🚀', colour: 'text-emerald-300 border-emerald-500/20' },
    { label: 'PumpFun',     emoji: '⚡', colour: 'text-emerald-400 border-emerald-500/30' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2.5 mt-6">
      {badges.map((b, i) => (
        <span
          key={i}
          className={`
            inline-flex items-center gap-1.5
            px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest
            bg-emerald-950/50 border ${b.colour}
            animate-[badgeFade_2s_ease-in-out_infinite]
          `}
          style={{ animationDelay: `${i * 0.25}s` }}
        >
          <span>{b.emoji}</span>
          {b.label}
        </span>
      ))}
    </div>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────
function MetricRow({ holders, buys, txs }: { holders: number; buys: number; txs: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 mt-10 max-w-xl mx-auto w-full">
      <MetricCard label="Holders"     value={holders}   accent="text-emerald-400" bg="border-emerald-500/15 bg-emerald-500/[0.03]" />
      <MetricCard label="Buys"        value={buys}       accent="text-emerald-300" bg="border-emerald-500/10 bg-emerald-500/[0.02]" />
      <MetricCard label="Txs"         value={txs}        accent="text-surface-400" bg="border-surface-800/40 bg-surface-950/60" />
    </div>
  );
}

function MetricCard({
  label, value, accent, bg,
}: {
  label: string;
  value: number;
  accent: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border ${bg} p-4 text-center backdrop-blur-sm`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.2rem] text-surface-500 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-mono font-black ${accent} counting-up`}>
        {fmt(value)}
      </p>
    </div>
  );
}

// ── Buy / Sell / Hold stat bar ────────────────────────────────────────────
function ActionBar() {
  const latest = [
    { label: 'Buys',  value: '+ 14',  accent: 'text-emerald-400' },
    { label: 'Txs',   value: '+ 21',  accent: 'text-surface-300' },
    { label: '24h Δ', value: '+ 7%',  accent: 'text-emerald-300' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6">
      {latest.map((s, i) => (
        <span
          key={i}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-lg
            bg-surface-950/70 border border-surface-800/50
            text-[13px] font-mono font-bold text-surface-300
            animate-[badgeFade_3s_ease-in-out_infinite]
          "
          style={{ animationDelay: `${i * 0.3}s` }}
        >
          <span className={s.accent}>{s.value}</span>
          <span className="text-surface-500">{s.label}</span>
        </span>
      ))}
    </div>
  );
}

// ── CTA button ────────────────────────────────────────────────────────────
function TGButton() {
  return (
    <a
      href="https://t.me/GMFTGang"
      target="_blank"
      rel="noopener noreferrer"
      className="
        inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl
        bg-emerald-500 hover:bg-emerald-400
        text-black font-black text-sm uppercase tracking-[0.12em]
        shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/20
        hover:ring-emerald-500/40 active:scale-[0.97]
        transition-all duration-200
        mt-8
      "
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
      Join GMFT Gang on Telegram
    </a>
  );
}

// ── Marquee ticker ────────────────────────────────────────────────────────
function TickerMarquee() {
  const items = [
    'GMFT', '0% TAX', 'LP RENOUNCED', 'FAIR LAUNCH', 'GM', 'WAGMI', 'GMFT', '0% FEE', 'GMFT', 'PUMP FUN', 'GMFT', 'AUTO LM',
  ];
  return (
    <div className="overflow-hidden bg-emerald-500/5 border-y border-emerald-500/10 py-1.5 mt-12">
      <div className="animate-marquee whitespace-nowrap flex gap-12"
           style={{ animationDuration: '30s', animationIterationCount: 'infinite' }}>
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i}
            className="inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.18em] text-emerald-500/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-16 pb-6 pt-8 border-t border-surface-800/40 text-center">
      <p className="text-[10px] uppercase tracking-[0.22em] text-surface-500">
        degen built · degen owned · gmft forever
      </p>
      <p className="text-[9px] text-surface-600 mt-1.5 font-mono">
        Good Mother F***ing Time · Not financial advice — you already know that
      </p>
    </footer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function GmftLanding() {
  const counterData = useGmftCounter();

  // Inject keyframes once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes textShimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes gmftPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: .88; transform: scale(1.01); }
      }
      @keyframes badgeFade {
        0%, 100% { opacity: .75; }
        50%       { opacity: 1; }
      }
      @keyframes marquee {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-33.33%); }
      }
      .animate-pulse-slow { animation: textShimmer 3s linear infinite, gmftPulse 2s ease-in-out infinite; }
      .animate-marquee   { animation: marquee 30s linear infinite; }
      .counting-up { transition: none; }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  return (
    <main className="min-h-screen bg-[#020a04] text-surface-200
                     flex flex-col items-center relative overflow-hidden">

      {/* ── Background glow ────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[820px] h-[820px]
          bg-emerald-500/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]
          bg-emerald-400/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 pt-16 pb-8
                       flex flex-col items-center">

        {/* Tagline */}
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-500/60 mb-4">
          Good Mother F***ing Time
        </p>

        {/* Hero */}
        <h1
          className="text-[5rem] sm:text-[7rem] md:text-[9rem] font-black leading-[0.88]
                     pb-2"
          style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
        >
          <GmftHero />
        </h1>

        <BadgeRow />
        <ActionBar />
        <MetricRow {...counterData} />
        <TGButton />

      </div>

      <TickerMarquee />
      <Footer />

    </main>
  );
}
