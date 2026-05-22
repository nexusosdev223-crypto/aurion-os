---
title: "GMFT — Token Setup Guide"
---

# GMFT PumpFun Token Setup

This guide walks you through the complete pump.fun one-click launch flow, prepended with pre-check and post-launch closure. All steps run from one terminal window.

---

## Before You Begin

**Prerequisites:**
- Solana CLI installed (`solana --version`) and on PATH
- A funded Solana wallet (`solana config get-keypair` test or Phantom common)
- Wallet balance ≥ 0.01 SOL for fees + liquidity
- A pump.fun tradefee account (link via phantom/solflare if not already done)
- Read these instructions fully before executing anything

---

## Pre-Launch Wallet Assignments

**Primary dev wallet (where you will transact from):**

```
[FILL IN YOUR SOLANA WALLET ADDRESS HERE]
```

Send **exactly 0.01 SOL** to that address before running anything below.  
Pump.fun fee for token creation + LP deposit ≈ 0.005 SOL.  
Safety rail: keep ≥ 0.004 SOL in reserve for retries.

---

## Step 1 — Create the Token on PumpFun

You have two options:

### Option A: Phantom / Solflare Quick-Launch (recommended)

1. Open https://pump.fun/create in your wallet browser
2. Click **"Create new token"**
3. Fill in exactly:
   - **Name:** Good Mother F\*\*\*ing Time
   - **Ticker:** GMFT
   - **Image:** (upload your op-art warhead pfp — see meme-arsenal for art brief)
   - **Description:** Anti-NGMI community meme token. Gm or don't reply.
   - **Initial price:** leave default (bonding curve settings)
   - **Initial liquidity:** 0.5 SOL default
   - **Fee:** 0%
4. Approve all transactions in your wallet
5. **Copy the CA (contract address)** — paste it into the `contract.address` field of `token-bio.json`
6. **IMPORTANT:** After launch to collapse LP (see Step 3), paste the LP CA into `token-bio.json` too

### Option B: CLI via solana-agave (for script-kiddie degen mode)

```bash
# Install pump fun SDK locally
git clone https://github.com/solana/pump-fun-release.git pump-cli && cd pump-cli
cargo build --release

# Launch token (adjust .env with your wallet keypair)
export PUMPFUN_PRIVATE_KEY="$HOME/.config/solana/id.json"
export RPC_URL="https://api.mainnet-beta.solana.com"

./target/release/pump-cli create-token \
  --name "Good Mother F***ing Time" \
  --ticker "GMFT" \
  --description "Anti-NGMI community meme token. Gm or don't reply." \
  --image          "/path/to/gmft-art.png" \
  --initial-liquidity 0.5 \
  --fee-basis-points  0

# CA is printed in terminal — save it
```

---

## Step 2 — Pre-Launch Security Hardening (before price discovery)

|\#|Action|Expected Outcome|
|---|------|---------------|
|1|Set `fee_basis_points` to `0` via pump.fun UI or CLI| Take 0% tax, forever |
|2|Confirm no team-vest tokens created| You made it via single tx to bond curve |
|3|Disable sociallinks enabling future upgrades| PumpFun account → Settings → Revoke `Metaplex` authority |
| 4 | Bonding curve metadata freeze | Already done by pump.fun on create – no further action needed |

---

## Step 3 — Renounce LP After Graduation (Day 1 Post-Launch)

Once the bond curve graduates (sells to MSIGRADE — automatic at ~0.5 SOL board purchase), immediately:

```bash
# Using pump fun CLI — replace TX_ID with your graduated lp mint
./target/release/pump-cli burn-liquidity \
  --lp-mint <LP_MINT_ADDRESS> \
  --fee-payer <YOUR_WALLET_ADDRESS>

# Or use Pump.fun UI: Graduated → "Withdraw LP" → Burn button
```

After burn:
- ✅ Paste the new LP token address to `contract.lp_address`
- ✅ Set `lp_renounced = true` in `token-bio.json`

---

## Step 4 — Lock Announcement

Post this exact message in Telegram + Discord after LP burn:

```
🚨 GMFT LP BURNED 🚨

LP address: <paste_lp_tx>
LP supply burned: 100%
LP renounced: YES
Tax (buy): 0%
Tax (sell): 0%
Mint authority: RENOUNCED

Nobody — not even the dev — can create more.
Rug = not in our language.

GMFT forever.
```

---

## Step 5 — Solana Wallet — Send 0.01 SOL for LP and Launch Fees

**Wallet address (dev funding wallet):**

```
[FILL IN YOUR SOLANA WALLET ADDRESS HERE]
```

Send 0.01 SOL for:
- Bonding curve entry: 0.005 SOL
- LP seeding: 0.003 SOL reserve (adjusts by price)
- Gas retries: 0.002 SOL buffer

After sending, confirm balance:

```bash
solana balance <YOUR_WALLET_ADDRESS>
```

---

## Step 6 — Live Volume Incentivisation (Manual Cerebral Mode)

Run buy loops manually to keep pump.fun trending:

```
!buy 0.005    ([ ] in Discord)
!buy 0.003    (every 30 minutes initially)
!sell 0.0005  (modulate pressure — 12% sell ratio keeps the chart looking organic)
```

Do not exceed 10 SOL in total auto-buys per hour. Tracked.

---

## Step 7 — Final Checklist

- [ ] Token deployed on pump.fun
- [ ] CA recorded in `token-bio.json`
- [ ] 0% tax confirmed
- [ ] Telegram bot running (TELEGRAM_BOT_TOKEN set)
- [ ] Discord bot running (DISCORD_TOKEN set)
- [ ] Landing page deployed
- [ ] Community messages sent per `community-plan.md`
- [ ] LP burned + Tx hash posted publicly
- [ ] Holders tier targets active (see `community-plan.md`)
- [ ] `contract.lp_address` updated in `token-bio.json`

---

## After Launches — Monitoring What Matters

| Signal | Healthy |
|--------|---------|
| Holders growth rate | +50/hr minimum post-trending |
| GM:NGMI ratio in TG | > 10 GMs per 1 NGMI |
| Buy : Sell ratio | > 6:1 during trend |
| LP renounced | YES (tweet proof link) |
| Price ls discrepancy | pump.fun live < external dex speeds |

---

## Failure Modes & Response

| Problem | Fix |
|---------|-----|
| Caught up bonding curve | Reduce tax to 0.1%, call boosters immediately |
| LP not remaining after burn | Do NOT buy from external source — pull back, transparency article |
| Dev wallet drained | Revoke all sociallinks, lock all other accounts, initiate burn-new campaign |
| Coordinated FUD | Post GMFT Gang Rules in public — GM = immunity to FUD |
| CEX implosion promoting false volume | Everybody pump.fun chart for 24h with no sells |
