# GMFT Live-Launch Toolkit

> **GMFT** — Good Mother F***ing Time
> Anti-NGMI · Degenerate Mood · PumpFun Launch Infrastructure

This repo is the full deployable launch package for the GMFT token.
It encompasses state management, community growth ops, bot engagement,
quick-deploy puppetry scripts, and a living landing page — all in one.

---

## What's Inside

```
live-launch/
├── token-bio.json              # Token metadata schema (fill at and after launch)
├── community-plan.md           # 7-day pre-launch community growth plan
├── token-setup.sh              # Step-by-step pump.fun hardness script (bash)
├── README.md                   # This file
├── bot/
│   ├── telegram-bot.sh         # Curl-only Telegram engagement bot
│   └── discord-bot.js          # discord.js Discord engagement bot
├── landing/
│   └── page.tsx                # Next.js GMFT Gang landing page component
└── meme-arsenal/
    ├── gmft-type-1.txt … gmft-type-5.txt   # Ready-to-post meme copy
    ├── telegram-reply-list.txt             # Copy-paste CQ responses
    └── airdrop-script.txt                  # Airdrop distribution formula
```

---

## Quick Start

### 1. Token Setup

```bash
cd /workspaces/aurion-os/live-launch
bash token-setup.sh
```

The script walks you through:
- PumpFun token creation (name, supply, tax, supply, image)
- 0% tax confirmation
- Immediately-scheduled LP renounce after graduation
- Wallet address crossing checks (solana wallet certification)

---

### 2. Telegram Bot

```bash
# 1. Open Telegram → @BotFather → /newbot
# 2. Paste the token into the environment:
export TELEGRAM_BOT_TOKEN="<token_from_botfather>"

# 3. Add the bot to your GMFT group, grant admin (optional but helps with anti-spam)

# 4. Run:
cd /workspaces/aurion-os/live-launch/bot
bash telegram-bot.sh
```

The bot stores its polling offset in `~/.gmft_bot_state.json` — restart safely,
it picks up where it left off.

Commands:
| Command | Action |
|---------|--------|
| `!start` | Wakes the bot + increments member count |
| `!rules` | Posts GMFT gang constitution |
| `!members` | Live holder count |
| `!say <msg>` | Echo message into chat |

Auto-reply triggers (no prefix needed — just type in the group):
`gm`, `ngmi`, `wagmi`, `rekt`, `gmft`

---

### 3. Discord Bot

```bash
# 1. Create bot at https://discord.com/developers/applications
# 2. Invite to FGuild (OAuth → URL generator → bot + send_messages)
# 3. Export token:
export DISCORD_TOKEN="<your_bot_token>"

# 4. Install dep (discord.js only):
npm install discord.js

# 5. Run:
node live-launch/bot/discord-bot.js
```

Commands:
| Command | Action |
|---------|--------|
| `!gm` / `!ngmi` / `!wagmi` / `!rekt` | Auto-reply triggers |
| `!holders` | Live pseudo holder stats (grows over time) |
| `!say <msg>` | Speak as the bot |
| `!buy` / `!sell <amt>` | Drops simulated buy/sell alerts |
| `!rules` | Posts gang rules |
| `!bool` | Full token state dump (holders, buys, sells, LP status) |

---

### 4. Landing Page

The Next.js landing page (`landing/page.tsx`) integrates directly into the existing app.

For integration into the Next.js app at `/workspaces/aurion-os`:

**Option A — Render as a Next.js app route component:**

```tsx
// In src/app/page.tsx — replace the current page.tsx body
// or add to a separate route file (e.g. /gmft/page.tsx):
import GmftLanding from '@/live-launch/landing/page';

// export default GmftLanding;
// Then visit /gmft
```

**Option B — Mark it as a new Next.js app route:**

```bash
mkdir -p src/app/gmft
cp live-launch/landing/page.tsx src/app/gmft/page.tsx
npm run dev
# Visit /gmft
```

The page is `"use client"` and includes:
- Big animated GMFT hero with shimmer gradient
- Pulsing green badge bundle (LP Renounced · 0% Tax · Fair Launch · PumpFun)
- Counter row: Holders | Buys | Txs (counts up from ~1k simulated base)
- Buy/Tx action bar
- Telegram join CTA → https://t.me/GMFTGang
- Infinite ticker strip at bottom
- Fully stateless — no API needed, counters tick on client

---

### 5. Deploy the Landing

```bash
# From the aurion-os root
npm run build
npx vercel deploy

# Environment for production:
export PULSE_FUN_API=<set-if-connected>
npm run start
# Visit https://gmft.gg (configured vercel domain)
```

---

## Meme Arsenal

```
meme-arsenal/
├── gmft-type-1.txt   # The aos introduction meme (vapor)
├── gmft-type-2.txt   # The family dinner scenario
├── gmft-type-3.txt   # The ngmi cocaine metaphor
├── gmft-type-4.txt   # The reality vs google query
├── gmft-type-5.txt   # The jeepney driver pov (classic PH degen)
├── telegram-reply-list.txt  # 15 copy-paste TG CQ replies
└── airdrop-script.txt       # Holders × fiat delta × volume ratio
```

Post one per content session (see `community-plan.md`).

---

## Daily Operation (GMFT Gang Automation)

```bash
# Morning run-all
cd /workspaces/aurion-os/live-launch
bash token-setup.sh                                  # sanity check
bash bot/telegram-bot.sh                & # in a tmux/screen session
node  bot/discord-bot.js                & # in a tmux/screen session
npm run build && npx vercel deploy --prod          # push landing
```

Logs: Telegram bot writes to `stderr` (logged to tmux/screen pane).  
Discord bot writes to `stdout`.  
State: Telegram bot → `~/.gmft_bot_state.json`.  
Discord bot → `live-launch/bot/bot-state.json`.

---

## Safety & Risk

This toolkit is for **educational purposes**.  
PumpFun tokens launch on Solana mainnet — you bear full token risk.

Hardening checklist before real money:
- [ ] Test `token-setup.sh` on devnet first (`solana config --url devnet`)
- [ ] LP burn history confirmed on Solscan before announcements
- [ ] Community governance in place before any large sell
- [ ] Telegram + Discord bots deployed in discreet parallel sessions

---

## Architecture Summary

```
/telegram-bot.sh        Pure bash + curl. No npm, no pip, no Python for API.
                          JSON parsing delegates to python3 (for robustness) —
                          minimal stdlib dependency. Poll-and-loop model.

/discord-bot.js          Node.js 18+. Single entry point. discord.js v14+.
                          Simulated buy/sell alerts are in-memory per session.
                          State persists to JSON for continuity.

/page.tsx                Next.js 16 app router. "use client" SPA.
                          No external API dependencies. CSS-in-JS via Tailwind v4.
                          Animations via CSS keyframes (no framer-motion dep).
```

---

**GMFT forever. 🗡️ Gm or don't reply.**
