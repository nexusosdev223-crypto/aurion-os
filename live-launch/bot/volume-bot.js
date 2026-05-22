#!/usr/bin/env node
/**
 * GMFT Auto-Volume Bot  v1
 * ─────────────────────────────────────────────────────────────────────────────
 * Real pump.fun auto-buy / auto-sell using @pump-fun/pump-sdk v1.36
 *
 * Usage:
 *   node volume-bot.js start       — start continuous trading loop
 *   node volume-bot.js once buy    — single one-shot buy then exit
 *   node volume-bot.js once sell   — single one-shot sell then exit
 *   node volume-bot.js balance     — print wallet + token balance
 *   node volume-bot.js status      — print live state
 *   node volume-bot.js config      — print active config
 *
 * Requires:
 *   GMFT_TOKEN_MINT environment variable set, or token.mint in config.json
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} = require('@solana/web3.js');

const {
  PUMP_SDK,
  PUMP_PROGRAM_ID: PUMP_PID,
  bondingCurvePda,
  getBuyTokenAmountFromSolAmount,
  getSellSolAmountFromTokenAmount,
} = require('@pump-fun/pump-sdk');

const BN    = require('bn.js');

// ── Constants ─────────────────────────────────────────────────────────────────
const STATE_FILE  = path.join(__dirname, 'volume-bot-state.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// pump-fun fee recipients hardcoded from SDK (no import trickery needed)
const FEE_RECIPIENTS = [
  '62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV',
  '7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ',
  '7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX',
  '9rPYyANsfQZw3DnDmKE3YCQF5E8oD89UXoHn9JFEhJUz',
  'AVmoTthdrX6tKt4nDjco2D775W2YK3sDhxPcMmzUAmTY',
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM',
  'FWsW1xNtWscwNmKv6wVsU1iTzRN6wmmk3MjxRP5tT7hz',
  'G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP',
];
const BUYBACK_RECIPIENTS = [
  '5YxQFdt3Tr9zJLvkFccqXVUwhdTWJQc1fFg2YPbxvxeD',
  '9M4giFFMxmFGXtc3feFzRai56WbBqehoSeRE5GK7gf7',
  'GXPFM2caqTtQYC2cJ5yJRi9VDkpsYZXzYdwYpGnLmtDL',
  '3BpXnfJaUTiwXnJNe7Ej1rcbzqTTQUvLShZaWazebsVR',
  '5cjcW9wExnJJiqgLjq7DEG75Pm6JBgE1hNv4B2vHXUW6',
  'EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL',
  '5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD',
  'A7hAgCzFw14fejgCp387JUJRMNyz4j89JKnhtKU8piqW',
];

let config, state;
let wallet, connection, tokenMint;
let stopped = false;

// ══════════════════════════════════════════════════════════════════════════════
// helpers
// ══════════════════════════════════════════════════════════════════════════════

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error('[GMFT VolBot] No config.json. Copy config.json.example or create one.');
    process.exit(1);
  }
  config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { state = {}; }
  }
  state = {
    startTime: state.startTime   || Date.now(),
    startBalSol: state.startBalSol,
    dayStart:   state.dayStart   || Date.now(),
    daySpentSol: state.daySpentSol || 0,
    sessionBuys: state.sessionBuys || 0,
    sessionSells: state.sessionSells || 0,
    lastTx: state.lastTx || null,
  };
}

function saveState() { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); }

function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }
function log(m, c='\x1b[37m') { console.log(`\x1b[36m[${ts()}]\x1b[0m ${c}${m}\x1b[0m`); }
function ok(m)   { log(m, '\x1b[32m'); }
function warn(m) { log(m, '\x1b[33m'); }
function err(m)  { log(m, '\x1b[31m'); }
function buyLog(m) { log(m, '\x1b[32m'); }
function sellLog(m){ log(m, '\x1b[31m'); }

function rand(min, max) { return min + Math.random() * (max - min); }
function lamps(x)  { return Math.floor(x * LAMPORTS_PER_SOL); }
function solStr(l) { return (l / LAMPORTS_PER_SOL).toFixed(6); }
function toBn(x)   { return new BN(typeof x === 'bigint' ? x : Number(x) * 1e9, 10); }

function shortSig(s) { return s ? s.slice(0, 8) + '…' + s.slice(-6) : '—'; }
function gSig(s)     { return s ? '\x1b[32m' + shortSig(s) + '\x1b[0m' : '—'; }

function randomFeeRecipient() { return new PublicKey(FEE_RECIPIENTS[Math.floor(Math.random() * FEE_RECIPIENTS.length)]); }
function randomBuybackRecipient() { return new PublicKey(BUYBACK_RECIPIENTS[Math.floor(Math.random() * BUYBACK_RECIPIENTS.length)]); }

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ══════════════════════════════════════════════════════════════════════════════
// Keypair / connection
// ══════════════════════════════════════════════════════════════════════════════

function loadWallet(path) {
  if (!fs.existsSync(path)) {
    err('Keypair not found: ' + path);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(raw));
}

function getGlobalPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global')], PUMP_PID
  )[0];
}

function getFeeConfigPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('fee_config')], PUMP_PID
  )[0];
}

async function solBalance()  { return solBal(wallet.publicKey); }
async function solBal(pk)    { const r = await connection.getBalance(pk, 'confirmed'); return r; }

async function gmftBalance() {
  try {
    const ata = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey, false);
    const info = await connection.getAccountInfo(ata, 'confirmed');
    if (!info) return 0n;
    // SPL Token Account: balance at UNSIGNED offset 64 (NOT little-endian!)
    const buf = Buffer.from(info.data);
    const amount = buf.readBigUInt64LE(64);
    return amount;
  } catch { return 0n; }
}

// ══════════════════════════════════════════════════════════════════════════════
// On-chain state facsimile (decode raw account buffer manually)
// ══════════════════════════════════════════════════════════════════════════════

function u64(buf, off) { return BigInt('0x' + Buffer.from(buf.slice(off, off+8)).toString('hex')); }
function u16(buf, off) { return buf[off] + (buf[off+1] << 8); }

async function fetchGlobal() {
  const pda = getGlobalPDA();
  const info = await connection.getAccountInfo(pda, 'confirmed');
  if (!info) return null;
  const d = info.data; Buffer.from(d);
  return {
    virtualSolReserves:   u64(d, 8),
    virtualTokenReserves: u64(d, 16),
    realSolReserves:      u64(d, 24),
    realTokenReserves:    u64(d, 32),
    tokenTotalSupply:     u64(d, 40),
    complete:             d[48] === 1,
    feeConfig:            u16(d, 56),
    protocolFeeBps:       u16(d, 58),
    creatorFeeBps:        u16(d, 60),
  };
}

async function fetchBondingCurve() {
  const pda = bondingCurvePda(tokenMint);
  const info = await connection.getAccountInfo(pda, 'confirmed');
  if (!info) return null;
  const d = info.data;
  const { PublicKey } = require('@solana/web3.js');
  return {
    virtualTokenReserves:   u64(d, 8),
    virtualQuoteReserves:   u64(d, 16),
    realTokenReserves:      u64(d, 24),
    realQuoteReserves:      u64(d, 32),
    // tokenTotalSupply not stored here — fetch global for that
    complete:               d[48] === 1,
    creator:                new PublicKey(d.slice(136, 168)),
    quoteMint:              new PublicKey(d.slice(168, 200)),
    isMayhemMode:           d[200] === 1,
    // Fee sharing
    feeConfig:            u16(d, 208),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Build buy/sell instructions using PumpSdk directly
// ══════════════════════════════════════════════════════════════════════════════

async function buildBuyInstruction(global, curve, solLamports) {
  /**
   * PumpSdk's buy flow — v1 bonding curve:
   *
   * pump program buys tokens by sending SOL to the bonding curve.
   * The instruction requires:
   *   - global: global state PDA
   *   - mint: the token mint
   *   - bondingCurve: its PDA
   *   - seller / user (us)
   *   - associatedUser: TokenMetadata ATA
   *   - feeRecipient: random pump-fun fee wallet
   *   - creatorVault: creator_receiver (also receives fees)
   *   - tokenProgram: TOKEN_PROGRAM_ID
   *
   * Instead of fighting Anchor, we build the instruction with `sendCompiledIx`.
   */

  const { PublicKey, Transaction, VersionedTransaction, sendTransaction: _sendTx } = require('@solana/web3.js');

  const mint         = tokenMint;
  const user         = wallet.publicKey;
  const feeRecipient = randomFeeRecipient();
  const buybackFee   = randomBuybackRecipient();
  const creator      = curve.creator;
  const bcPda        = bondingCurvePda(mint);
  const associatedUser = getAssociatedTokenAddressSync(mint, user, false);
  const creatorVaultAta = getAssociatedTokenAddressSync(
    new PublicKey('So11111111111111111111111111111111111111112'), creator, false
  );

  // Get PUMP program IDL bytes
  const programId = PUMP_PID;

  // Build instruction calls via PUMP_SDK (which wraps Anchor program methods)
  // The cleanest way: call PUMP_SDK methods to get Instruction objects
  // (these are Anchor-provider-free, they just build Instruction objects)

  const globalPda = getGlobalPDA();
  const feeConfigPda = getFeeConfigPDA();

  // Decode the pump.idl discriminator for "buy"
  const IDL_BUY_DISCR = [0x66,0x3f,0x98,0x1c,0xe8,0x51,0x4e,0x40];

  // --- Build the raw instruction by composing accounts manually ---
  // pump.buy(amount, sol_amount, isBuy) layout:
  //   accounts:
  //     feeRecipient   WRITABLE  signer=false
  //     mint           WRITABLE  signer=false
  //     associatedUser WRITABLE  signer=false
  //     user           WRITABLE  signer=true (signer is wallet.publicKey)
  //     creatorVault   WRITABLE  signer=false
  //     tokenProgram   READONLY  signer=false
  //     systemProgram  READONLY  signer=false
  //     associatedTokenProgram READONLY signer=false
  //     bondingCurve   READONLY  signer=false   ← v2 does this differently
  //     buybackFeeRecipient WRITABLE signer=false
  //
  // PUMP_SDK getBuyInstructionRaw builds via Anchor:
  //   self.pumpProgram.methods.buy(amount, solAmount, { 0: true }).accountsPartial({ ... })

  // Use PUMP_SDK directly:
  const solAmountBn = new BN(solLamports);
  const tokenAmountBn = toBn(0); // 0 in v1 → "buy as much as bonding curve gives"

  // Fetch real accounts needed to call getBuyInstructionRaw
  const [globalAcc, curveAcc] = await Promise.all([
    fetchGlobal(),
    fetchBondingCurve(),
  ]);

  if (!curveAcc) throw new Error('Bonding curve not found — is the token mint correct?');

  // Manually call getBuyInstructionRaw via pump-sdk internals
  // getBuyInstructionRaw → getBuyInstructionInternal → offlinePumpProgram.methods.buy
  // We call it with correct args directly on the singleton

  const feeRecipientPk = randomFeeRecipient();
  const buybackFeePk   = randomBuybackRecipient();
  const associatedUserPk = getAssociatedTokenAddressSync(mint, wallet.publicKey, false);

  // Call the private-ish getBuyInstructionINTERNAL via the public wrapper:
  const { TransactionInstruction: IX } = require('@solana/web3.js');
  const { IdlInstruction } = require('@pump-fun/pump-sdk/dist/index.js');

  // Decode bonding curve for price estimate
  const buyTokenEst = globalAcc && curveAcc
    ? getBuyTokenAmountFromSolAmount({
        amount:       solAmountBn,
        bondingCurve: curveAcc,
        global:       globalAcc,
      })
    : toBn(0);

  // Build via SDK
  // PumpSdk exposes getBuyInstructionRaw as a public method on the singleton
  // It takes: { user, mint, creator, solAmount, amount, feeRecipient, buybackFeeRecipient, tokenProgram }
  // amount is the amount of tokens to buy, solAmount is max SOL. Using 0 for unbounded.
  let rawIx;
  try {
    rawIx = await PUMP_SDK.getBuyInstructionRaw({
      user:                  wallet.publicKey,
      mint,
      creator:               curveAcc.creator,
      amount:                0n,              // 0 = buy max for solAmount
      solAmount:             solAmountBn,
      feeRecipient:          feeRecipientPk,  // pump-fun SDK picks random internally
      buybackFeeRecipient:   buybackFeePk,
      tokenProgram:          TOKEN_PROGRAM_ID,
    });
  } catch (e) {
    err('getBuyInstructionRaw failed: ' + e.message);
    throw e;
  }

  return { instruction: rawIx, estimateTokens: buyTokenEst };
}

async function buildSellInstruction(global, curve, tokenAmountBn) {
  const mint        = tokenMint;
  const user        = wallet.publicKey;
  const feeRecipient     = randomFeeRecipient();
  const buybackFee       = randomBuybackRecipient();
  const creator          = curve.creator;
  const associatedUser   = getAssociatedTokenAddressSync(mint, user, false);

  // Price estimate
  const sellSolEst = global && curve
    ? getSellSolAmountFromTokenAmount({ amount: tokenAmountBn, bondingCurve: curve, global })
    : new BN(0);

  try {
    const rawIx = await PUMP_SDK.getSellInstructionRaw({
      user:                  user,
      mint,
      creator:               creator,
      amount:                tokenAmountBn,
      solAmount:             sellSolEst,  // min expected SOL out
      feeRecipient,
      buybackFeeRecipient:   buybackFee,
      tokenProgram:          TOKEN_PROGRAM_ID,
      cashback:              false,
    });
    return { instruction: rawIx, estimateSol: sellSolEst };
  } catch (e) {
    err('getSellInstructionRaw failed: ' + e.message);
    throw e;
  }
}

// send a single instruction as a v0 transaction
async function sendIx(ix, label = 'Trade') {
  const latest = await connection.getLatestBlockhash('confirmed');
  const tx = new VersionedTransaction(TransactionMessage.compileMessage({
    payerKey:          wallet.publicKey,
    recentBlockhash:   latest.blockhash,
    instructions:      [ix],
  }));
  tx.sign([wallet]);
  try {
    const { value: sig } = await connection.sendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 2,
    });
    await connection.confirmTransaction(sig, 'confirmed');
    return { ok: true, sig };
  } catch (e) {
    return { ok: false, sig: null, err: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Buy / Sell actions
// ══════════════════════════════════════════════════════════════════════════════

async function doBuy(solAmount) {
  const { minSolBuy, maxSolBuy } = config.trading;
  solAmount = Math.max(parseFloat(minSolBuy), Math.min(parseFloat(maxSolBuy), solAmount));

  // Wallet balance guard
  const bal = await solBal(wallet.publicKey);
  const minReserve = lamps(parseFloat(config.safety.minReserveSol));
  if (bal < lamps(solAmount) + minReserve) {
    warn(`Insufficient SOL: bal=${solStr(bal)} need=${solStr(lamps(solAmount)+minReserve)}`);
    return { ok: false };
  }

  ok(`→ BUY attempt: ${solAmount} SOL`);

  const [global, curve] = await Promise.all([fetchGlobal(), fetchBondingCurve()]);
  if (!curve) {
    err('Bonding curve not found at PDA for this mint. Is the token live?');
    return { ok: false };
  }

  try {
    const { instruction, estimateTokens } = await buildBuyInstruction(global, curve, lamps(solAmount));
    const { ok, sig, err: e } = await sendIx(instruction, 'BUY');
    if (ok) {
      buyLog(`[BUY] ${solAmount} SOL → GMFT  tx=${gSig(sig)}`);
      state.sessionBuys++;
      state.lastBuy = { sol: solAmount, sig, ts: Date.now() };
    } else {
      err(`[BUY] FAILED: ${e || 'unknown error'}`);
    }
    saveState();
    return { ok, sig, error: e, estimateTokens };
  } catch (e) {
    err('[BUY] Exception: ' + e.message);
    return { ok: false, error: e.message };
  }
}

async function doSell(pctOrTokens) {
  let sellTokens;
  const bal = await gmftBalance();
  if (typeof pctOrTokens === 'number' && pctOrTokens < 1 && bal > 0n) {
    // Interpret as fraction (e.g. 0.1 = sell 10%)
    sellTokens = BigInt(Math.floor(Number(bal) * pctOrTokens));
  } else {
    sellTokens = BigInt(pctOrTokens || bal);
  }
  sellTokens = sellTokens > bal ? bal : sellTokens;
  if (sellTokens === 0n) { warn('[SELL] No GMFT to sell.'); return { ok: false }; }

  ok(`→ SELL attempt: ${sellTokens.toString()} GMFT`);

  const [global, curve] = await Promise.all([fetchGlobal(), fetchBondingCurve()]);
  if (!curve) { err('[SELL] Bonding curve not found'); return { ok: false }; }

  try {
    const { instruction, estimateSol } = await buildSellInstruction(global, curve, sellTokens);
    const { ok, sig, err: e } = await sendIx(instruction, 'SELL');
    if (ok) {
      sellLog(`[SELL] ${sellTokens.toString()} GMFT → ~${solStr(Number(estimateSol))} SOL  tx=${gSig(sig)}`);
      state.sessionSells++;
      state.sessionVolumeSol += Number(estimateSol) / LAMPORTS_PER_SOL;
      state.lastSell = { tokens: sellTokens.toString(), sig, ts: Date.now() };
    } else {
      err(`[SELL] FAILED: ${e || 'unknown error'}`);
    }
    saveState();
    return { ok, sig, error: e, estimateSol };
  } catch (e) {
    err('[SELL] Exception: ' + e.message);
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Status
// ══════════════════════════════════════════════════════════════════════════════

async function printStatus() {
  const sol = await solBalance(wallet.publicKey);
  const tok = await gmftBalance();
  const [globalVal, curveVal] = await Promise.all([fetchGlobal(), fetchBondingCurve()]);
  ok(`─ Wallet: ${wallet.publicKey.toString()}`);
  log(`  SOL:        ${solStr(sol)}  (${sol} lamps)  (${sol.toFixed(6)} SOL)\n` +
      `  GMFT:       ${tok.toString()} raw`);

  if (globalVal) {
    log(`  BC virtual SOL:    ${globalVal.virtualSolReserves.toString()}`);
    log(`  BC virtual tokens: ${globalVal.virtualTokenReserves.toString().slice(0,18) + '…'}`);
  }
  if (curveVal) {
    log(`  Curve complete:    ${curveVal.complete}`);
    log(`  Curve creator:     ${curveVal.creator.toString()}`);
  }
  log(`  Session buys:  ${state.sessionBuys}   sells: ${state.sessionSells}   vol=${state.sessionVolumeSol.toFixed(5)} SOL`);
  if (state.lastBuy)  log(`  Last BUY:  ${state.lastBuy.sol}SOL @ ${new Date(state.lastBuy.ts).toISOString()}`);
  if (state.lastSell) log(`  Last SELL: ${state.lastSell.tokens}GMFT @ ${new Date(state.lastSell.ts).toISOString()}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// Trading Loop
// ══════════════════════════════════════════════════════════════════════════════

async function tradingLoop() {
  ok('═'.repeat(58));
  ok('  GMFT Auto-Volume Bot — ACTIVE');
  ok('  Token:  ' + tokenMint.toString());
  ok('  Wallet: ' + wallet.publicKey.toString());
  ok('═'.repeat(58));

  let nextBuy  = Date.now() + rand(config.trading.minIntervalBuySec, config.trading.maxIntervalBuySec) * 1000;
  let nextSell = Date.now() + rand(config.trading.minIntervalSellSec, config.trading.maxIntervalSellSec) * 1000;
  let stopLossHit = false;

  while (!stopped) {
    const now = Date.now();

    // Daily window reset
    if (now - state.dayStart > 86_400_000) {
      state.dayStart = now;
      state.daySpentSol = 0;
      ok('── Daily SOL counter reset ──');
    }

    // Emergency stop loss
    if (!stopLossHit) {
      const bal = await solBalance(wallet.publicKey) / LAMPORTS_PER_SOL;
      const start = state.startBalSol || bal;
      const lossPct = ((start - bal) / start) * 100;
      if (lossPct >= parseFloat(config.safety.emergencyStopLossPercent)) {
        err(`STOP LOSS: ${lossPct.toFixed(1)}% loss exceeds ${config.safety.emergencyStopLossPercent}%`);
        stopped = true;
        break;
      }
    }

    // ── BUY window ─────────────────────────────────────────────────────────
    if (now >= nextBuy) {
      const { minSolBuy, maxSolBuy, buyWeight } = config.trading;
      if (Math.random() < buyWeight) {
        const spend = rand(minSolBuy, maxSolBuy);
        const dailyPct = (state.daySpentSol / parseFloat(config.safety.maxSolPerDay)) * 100;
        if (dailyPct >= 100) {
          warn(`Daily buy cap reached (${state.daySpentSol.toFixed(4)} SOL). Sleeping 1h.`);
          nextBuy = now + 3_600_000;
        } else {
          ok(`[LOOP] BUY phase: ${spend} SOL`);
          const { ok: success } = await doBuy(spend);
          if (success) state.daySpentSol += spend;
        }
      } else {
        log('  [LOOP] buy slot — skipped (random hold)');
      }
      nextBuy = now + rand(config.trading.minIntervalBuySec, config.trading.maxIntervalBuySec) * 1000;
    }

    // ── SELL window ────────────────────────────────────────────────────────
    if (now >= nextSell) {
      const bal = await gmftBalance();
      if (bal > 0n) {
        const sellPct = rand(0.02, parseFloat(config.trading.sellRate || 0.15));
        if (Math.random() < 0.50) {
          ok(`[LOOP] SELL phase: ${bal.toString()} GMFT → sell~${(sellPct * 100).toFixed(0)}%`);
          await doSell(sellPct);
        } else {
          log('  [LOOP] sell slot — skipped (random hold)');
        }
      }
      nextSell = now + rand(config.trading.minIntervalSellSec, config.trading.maxIntervalSellSec) * 1000;
    }

    // ── Heartbeat ──────────────────────────────────────────────────────────
    if (Math.floor(now / 60_000) % (config.safety.logRatePerMinute || 2) === 0) {
      await printStatus();
    }

    await delay(1_000);
  }

  warn('\n── Volume bot stopped. Final state:');
  await printStatus();
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════

function init() {
  loadConfig();
  loadState();

  const kpPath = process.env.WALLET_KEYPAIR || config.wallet?.keypairPath || '~/.config/solana/id.json';
  const rpcUrl = process.env.RPC_URL     || config.wallet?.rpcUrl || 'https://api.mainnet-beta.solana.com';

  wallet     = loadWallet(kpPath);
  connection = new Connection(rpcUrl, { commitment: 'confirmed' });

  const mintStr = process.env.GMFT_TOKEN_MINT || (config?.token?.mint);
  if (!mintStr || mintStr.startsWith('DEPLOY')) {
    err('GMFT_TOKEN_MINT not set.');
    err('  export GMFT_TOKEN_MINT=<your_token_address>');
    err('  or set token.mint in config.json');
    process.exit(1);
  }
  tokenMint = new PublicKey(mintStr);
  ok('Wallet: ' + wallet.publicKey.toString());
  ok('Token:  ' + tokenMint.toString());
  ok('RPC:    ' + rpcUrl);
}

process.on('SIGINT',  () => { warn('\nSIGINT — graceful stop after current op.'); stopped = true; });
process.on('SIGTERM', () => { warn('\nSIGTERM — stopping.'); stopped = true; });

const cmd  = process.argv[2] || 'start';
const sub  = process.argv[3] || '';

(async () => {
  try {
    if (cmd !== 'start') {
      loadConfig();
      loadState();
      init();

      switch (cmd) {
        case 'balance':
          await printStatus();
          break;
        case 'status':
          console.log(JSON.stringify(state, null, 2));
          break;
        case 'config':
          console.log(JSON.stringify(config, null, 2));
          break;
        case 'once':
          if (sub === 'sell') {
            const amt = BigInt(process.argv[4] || '0');
            const res = await doSell(amt);
            process.exit(res.ok ? 0 : 1);
          } else {
            const amt = parseFloat(process.argv[4] || config.trading.minSolBuy);
            const res = await doBuy(amt);
            process.exit(res.ok ? 0 : 1);
          }
          break;
        default:
          err('Unknown command: ' + cmd);
          console.log('Usage: node volume-bot.js {start|status|config|once buy [sol]|once sell [amount]|balance}');
          process.exit(1);
      }
      process.exit(0);
    }

    // 'start' — trading loop
    init();
    const startingSolBal = await solBal(wallet.publicKey);
    state.startBalSol = startingSolBal / LAMPORTS_PER_SOL;
    ok('Starting SOL: ' + solStr(startingSolBal));
    const startingTokBal = await gmftBalance();
    ok(`Starting GMFT: ${startingTokBal.toString()}`);
    await tradingLoop();
  } catch (e) {
    err('Fatal: ' + e.message);
    console.error(e);
    process.exit(1);
  }
})();
