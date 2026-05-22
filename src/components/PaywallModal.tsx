"use client";

import { useState, useEffect, useRef } from "react";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface Tier {
  id: string;
  label: string;
  signals: number;
  windowDays: number;
  btcAddress: string;
  minSats: number;
  priceDisplay: string;
}

interface StatusResp {
  success: boolean;
  plan: string;
  tier: string;
  signals_used: number;
  signals_limit: number;
  window_start: string;
  expires_at: string | null;
  active: boolean;
}

type Stage = "select" | "wallet" | "invoice" | "verifying" | "done" | "failed";

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function satsToBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

function bip21Uri(addr: string, amountBtc: string): string {
  return `bitcoin:${addr}?amount=${amountBtc}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)} days ago`;
}

/* ── Tier catalogue (mirrors /api/paywall/plans) ─────────────────────────── */

const TIERS: Tier[] = [
  {
    id: "_inf",
    label: "Institutional",
    signals: 0,
    windowDays: 365,
    btcAddress: process.env.AURION_INST_ADDR || "",
    minSats: 5_000_000,
    priceDisplay: "5,000,000 sats (~£500) — unlimited",
  },
  {
    id: "_100",
    label: "Researcher Lite",
    signals: 5000,
    windowDays: 30,
    btcAddress: process.env.AURION_RES_LITE_ADDR || "",
    minSats: 10_000,
    priceDisplay: "10,000 sats (~£1) — 5k signals / 30 d",
  },
  {
    id: "_free",
    label: "Developer",
    signals: 100,
    windowDays: 1,
    btcAddress: process.env.AURION_FREE_ADDR || "",
    minSats: 0,
    priceDisplay: "Free — 100 signals / 24 h",
  },
];

/* ── Component ────────────────────────────────────────────────────────────── */

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
}

export default function PaywallModal({
  open,
  onClose,
  onUnlocked,
}: PaywallModalProps) {
  /* state */
  const [stage, setStage] = useState<Stage>("select");
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* reset on open — use callback ref to avoid cascade */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        setStage("select");
        setSelectedTier(null);
        setWallet("");
        setStatus(null);
        setErrorMsg("");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  /* ── Stage handlers ──────────────────────────────────────────────────────── */

  function selectTier(tier: Tier) {
    setSelectedTier(tier);
    setStage("wallet");
  }

  async function goToInvoice() {
    setErrorMsg("");
    if (!wallet || wallet.trim().length < 10) {
      setErrorMsg("Enter a valid Bitcoin wallet address.");
      return;
    }
    if (!selectedTier) return;

    // Fetch current plan for this wallet
    try {
      const res = await fetch(
        `/api/paywall/status?wallet=${encodeURIComponent(wallet)}`
      );
      const json = (await res.json()) as StatusResp;
      if (json.success) setStatus(json);
    } catch {
      /* ignore */
    }

    setStage("invoice");
  }

  async function skipProofAndUnlock() {
    if (!selectedTier || !wallet) return;
    setStage("verifying");
    setErrorMsg("");

    try {
      const res = await fetch("/api/paywall/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          plan_id: selectedTier.id,
          proof_txid: wallet, // honorary unlock for non-BTC flow
        }),
      });
      const json = (await res.json()) as { success: boolean; plan?: string; error?: string };
      if (json.success) {
        setStage("done");
        onUnlocked?.();
      } else {
        setErrorMsg(json.error || "Unlock failed.");
        setStage("invoice");
      }
    } catch {
      setErrorMsg("Network error. Try again.");
      setStage("invoice");
    }
  }

  async function verifyPayment() {
    if (!selectedTier || !wallet) return;
    setStage("verifying");
    setErrorMsg("");

    try {
      const res = await fetch("/api/paywall/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, plan_id: selectedTier.id }),
      });
      const json = (await res.json()) as { success: boolean; plan?: string; error?: string };

      if (json.success) {
        setStage("done");
        onUnlocked?.();
      } else {
        setErrorMsg(json.error || "Payment not confirmed yet.");
        setStage("invoice");
      }
    } catch {
      setErrorMsg("Network error.");
      setStage("invoice");
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */

  if (!open) return null;

  const isFree = selectedTier?.id === "_free";
  const amountBtc =
    selectedTier && selectedTier.minSats > 0
      ? satsToBtc(selectedTier.minSats)
      : "0.00000000";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl border border-surface-700/60 bg-surface-900 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div>
            <h2 className="text-lg font-bold text-surface-100 tracking-tight">
              {stage === "done"
                ? "Plan Activated"
                : stage === "invoice"
                  ? "Payment Invoice"
                  : "Activate Plan"}
            </h2>
            <p className="text-[11px] text-surface-500 mt-0.5">
              Bitcoin on-chain · Esplora-verified · No KYC
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-px bg-surface-800/60 mx-6" />

        <div className="px-6 pt-5 pb-6 max-h-[min(80vh,640px)] overflow-y-auto">
          {/* ══════════════════════════════════════════════════════════════════
              STAGE: select tier
          ═══════════════════════════════════════════════════════════════════ */}
          {stage === "select" && (
            <div className="space-y-3">
              {TIERS.map((tier) => {
                const popular = tier.id === "_100";
                return (
                  <button
                    key={tier.id}
                    onClick={() => selectTier(tier)}
                    className={`w-full text-left relative rounded-xl border p-4 transition-all duration-200 hover:border-emerald-500/40 ${
                      popular
                        ? "border-emerald-500/25 bg-emerald-950/20"
                        : "border-surface-700/60 bg-surface-800/40"
                    }`}
                  >
                    {popular && (
                      <span className="absolute -top-2 right-4 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white tracking-wider">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-surface-100">{tier.label}</p>
                        <p className="text-[11px] text-surface-500 mt-0.5">
                          {tier.priceDisplay}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-emerald-400">
                          {tier.minSats === 0
                            ? "Free"
                            : `${(tier.minSats / 100_000_000).toFixed(8)} BTC`}
                        </p>
                        {tier.signals > 0 && (
                          <p className="text-[10px] text-surface-600 font-mono mt-0.5">
                            {tier.signals.toLocaleString()} signals
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE: wallet input
          ═══════════════════════════════════════════════════════════════════ */}
          {stage === "wallet" && (
            <div className="space-y-4">
              <button
                onClick={() => setStage("select")}
                className="flex items-center gap-1.5 text-[11px] text-surface-500 hover:text-emerald-400 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Change plan
              </button>

              <div className="rounded-xl bg-surface-800/50 border border-surface-700/60 p-4">
                <p className="text-xs text-surface-400 leading-relaxed">
                  Selected: <span className="font-bold text-emerald-400">{selectedTier?.label}</span>{" "}
                  — {selectedTier?.priceDisplay}
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.18em] text-surface-500 font-bold mb-2">
                  Bitcoin Wallet Address
                </label>
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => {
                    setWallet(e.target.value);
                    setErrorMsg("");
                  }}
                  placeholder="bc1q… or 1A1zP1…"
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-3 text-sm font-mono text-surface-200 placeholder-surface-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-colors"
                />
              </div>

              <button
                onClick={goToInvoice}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 transition-all shadow-lg shadow-emerald-500/15 active:scale-[0.98]"
              >
                Continue to Invoice
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE: invoice
          ═══════════════════════════════════════════════════════════════════ */}
          {stage === "invoice" && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setStage("wallet");
                  setErrorMsg("");
                }}
                className="flex items-center gap-1.5 text-[11px] text-surface-500 hover:text-emerald-400 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back
              </button>

              {/* Invoice display */}
              <div className="rounded-xl bg-gradient-to-br from-amber-950/30 via-surface-900 to-surface-900 border border-amber-900/30 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] text-amber-400 uppercase font-bold tracking-wider">
                    On-chain Invoice
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                </div>

                {/* Amount */}
                <div className="text-center mb-5">
                  <p className="text-4xl font-mono font-bold text-amber-400 leading-none">
                    {amountBtc}
                  </p>
                  <p className="text-[11px] text-amber-700 font-mono mt-1">
                    {selectedTier?.minSats.toLocaleString()} sats
                  </p>
                  <p className="text-[11px] text-surface-500 mt-1">
                    {selectedTier?.priceDisplay}
                  </p>
                </div>

                {/* BTC address */}
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-surface-500 font-bold mb-2">
                    Pay to (Bitcoin)
                  </p>
                  <div className="flex items-center gap-2 bg-surface-950/80 border border-surface-700/60 rounded-lg px-3 py-2.5">
                    <span className="flex-1 text-[11px] text-surface-300 font-mono truncate">
                      {selectedTier?.btcAddress}
                    </span>
                    <CopyButton text={selectedTier?.btcAddress || ""} />
                  </div>
                </div>

                {/* Wallet display */}
                <div className="mt-3 pt-3 border-t border-surface-800/40">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-surface-500 mb-1">Your Wallet</p>
                  <p className="text-[11px] text-surface-400 font-mono truncate">{wallet}</p>
                </div>

                {/* Current plan snapshot */}
                {status && (
                  <div className="mt-3 pt-3 border-t border-surface-800/40">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-surface-500 mb-1">Current Plan</p>
                    <p className="text-sm font-bold text-surface-200">
                      {status.tier}
                      <span className="text-[11px] text-surface-500 ml-2 font-normal">
                        {status.signals_used}/{status.signals_limit ?? "∞"} used
                        {status.window_start && (
                          <> · window started {timeAgo(status.window_start)}</>
                        )}
                      </span>
                    </p>
                  </div>
                )}
              </div>

{/* Actions */}
              {isFree ? (
                <button
                  onClick={skipProofAndUnlock}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 transition-all shadow-lg shadow-emerald-500/15 active:scale-[0.98]"
                >
                  Activate Free Plan
                </button>
              ) : (
                <div className="space-y-3">
                  <a
                    href={bip21Uri(selectedTier?.btcAddress || "", amountBtc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm py-3 transition-all shadow-lg shadow-amber-500/15 active:scale-[0.98]"
                  >
                    Open in Wallet
                  </a>
                  <button
                    onClick={verifyPayment}
                    className="w-full rounded-xl border border-surface-600 text-surface-300 hover:border-emerald-500/40 hover:text-emerald-400 font-bold text-sm py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    I&apos;ve Sent It — Verify Payment
                  </button>
                  <p className="text-[10px] text-surface-600 text-center">
                    Bitcoin transactions need ~1 block (~10 min) to confirm.
                  </p>
                </div>
              )}

              {/* Error feedback */}
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/15 border border-red-900/25">
                  <svg className="h-4 w-4 text-red-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-[11px] text-red-400 leading-relaxed">{errorMsg}</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE: verifying
          ═══════════════════════════════════════════════════════════════════ */}
          {stage === "verifying" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-surface-700 border-t-amber-400" />
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border border-amber-400/20" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-surface-200">Verifying on-chain</p>
                <p className="text-[11px] text-surface-500 mt-1">
                  Scanning Esplora for wallet{" "}
                  <span className="text-surface-400 font-mono">
                    {wallet.slice(0, 8)}…{wallet.slice(-4)}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE: done
          ═══════════════════════════════════════════════════════════════════ */}
          {stage === "done" && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400">Plan Activated</p>
                <p className="text-[11px] text-surface-500 mt-1 max-w-xs">
                  {selectedTier?.label} is now active.{" "}
                  {selectedTier?.signals
                    ? `${selectedTier.signals.toLocaleString()} signals / ${selectedTier.windowDays} days`
                    : "Unlimited signals"}
                  .
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2.5 transition-all shadow-lg shadow-emerald-500/15"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Copy button sub-component ────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="shrink-0 p-1.5 rounded-lg text-surface-500 hover:text-emerald-400 hover:bg-surface-800 transition-colors"
      title="Copy address"
    >
      {copied ? (
        <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
        </svg>
      )}
    </button>
  );
}
