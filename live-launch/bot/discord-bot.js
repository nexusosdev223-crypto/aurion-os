/**
 * GMFT Discord Engagement Bot
 * -------------------------------------------------------
 * Environment:
 *   DISCORD_TOKEN     — Bot token from https://discord.com/developers/applications
 *   BOT_PREFIX        — Command prefix (default: !)
 *
 * Install:
 *   npm install discord.js
 *   node discord-bot.js
 *
 * Commands:  !gm / !ngmi / !wagmi / !rekt (trigger replies)
 *            !holders   — pseudo live holder count
 *            !buy <amt> — logs a simulated buy alert
 *            !sell <amt>— logs a simulated sell alert
 *            !rules
 *            !say <msg>
 *            !ping
 */
const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events } = require('discord.js');
require('dotenv').config();

// ── Config ────────────────────────────────────────────────────────────────────
const TOKEN  = process.env.DISCORD_TOKEN;
const PREFIX = process.env.BOT_PREFIX || '!';
const STATE_FILE = `${__dirname}/bot-state.json`;

if (!TOKEN) {
  console.error('[GMFT Bot] ERROR: DISCORD_TOKEN env var is not set.');
  console.error('  → Create a bot at https://discord.com/developers/applications');
  console.error('  → export DISCORD_TOKEN="<your_token>"');
  process.exit(1);
}

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  holders:        0,
  holdersBase:    0,
  holdersGrowth:  0.0023,   // per-check increment (mimics organic growth)
  lastGrowthMs:   Date.now(),
  buyVolume24h:   0,
  sellVolume24h:  0,
  buyCount:       0,
  sellCount:      0,
  txCount:        0,
  memberCount:    0,
  startMs:        Date.now(),
};

function loadState() {
  try {
    const fs = require('fs');
    if (fs.existsSync(STATE_FILE)) {
      state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) };
    }
  } catch (_) { /* noop — fresh state */ }
}
function saveState() {
  try {
    require('fs').writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (_) { /* noop */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(num) {
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function embed(title, desc, color = 0x22c55e) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setTimestamp();
}

// ── Client ────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Presences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Growth ticker — increment holder count every 60s
const TICK_MS = 60_000;
let tickTimer = null;

function tickState() {
  const elapsedMin = (Date.now() - state.lastGrowthMs) / 60_000;
  state.holders += Math.ceil(state.holdersGrowth * Math.max(elapsedMin, 1));
  state.lastGrowthMs = Date.now();
  saveState();
}

function startTicker() {
  loadState();
  tickTimer = setInterval(tickState, TICK_MS);
  setInterval(saveState, TICK_MS);
}

// ── Message handler ───────────────────────────────────────────────────────────
client.on(Events.MessageCreate, async (msg) => {
  // Ignore DMs and bots
  if (msg.author.bot || !msg.guild) return;

  const content = (msg.content || '').trim().toLowerCase();

  // ── Slash-like prefix commands ─────────────────────────────────────────
  if (!content.startsWith(PREFIX)) return;

  const args    = content.slice(PREFIX.length).split(/\s+/);
  const command = args[0];

  switch (command) {

    case 'gm':
      msg.channel.send({
        embeds: [embed('GMFT!', '🗡️ GM early = legendary holder status. Welcome aboard, degen. Keep posting those GMs, the count matters.')]
      }).catch(() => {});
      break;

    case 'ngmi':
      msg.channel.send({
        embeds: [embed('💀', 'NGMI? Wrong address. We only speak GMFT here. Gm or step out.')]
      }).catch(() => {});
      break;

    case 'wagmi':
      msg.channel.send({
        embeds: [embed('🗡️', '**Always WAGMI** — community > chart, vibes > VCs, gm > fear. GMFT forever.')]
      }).catch(() => {});
      break;

    case 'rekt':
      msg.channel.send({
        embeds: [embed('💸', 'rekt is tuition. GMFT is the graduation diploma. Gm if you survived the market.')]
      }).catch(() => {});
      break;

    case 'holders':
      state.holders = Math.ceil(state.holders + (Date.now() - state.lastGrowthMs) / 1000 * state.holdersGrowth);
      state.lastGrowthMs = Date.now();
      state.memberCount = (msg.guild.memberCount || 0);
      saveState();
      msg.channel.send({
        embeds: [embed(
          '👥 Holders',
          `**Holders:** ${fmt(state.holders).padStart(8, '0')}\n` +
          `**Members:** ${msg.guild.memberCount ? fmt(msg.guild.memberCount) : '—'}\n` +
          `**Buys 24h:** ${fmt(state.buyVolume24h)} SOL\n` +
          `**Sells 24h:** ${fmt(state.sellVolume24h)} SOL\n` +
          `**Txs total:** ${fmt(state.txCount)}\n` +
          `_Counter ticks every minute. gm = holder._`,
          0x22c55e
        )]
      }).catch(() => {});
      break;

    case 'buy': {
      const amt = parseFloat(args[1]) || (Math.random() * 5 + 0.001);
      state.buyCount++;
      state.buyVolume24h += amt;
      state.txCount++;
      state.holders++;
      saveState();

      // 70% chance of a random wallet-style display name
      const label = state.buyCount % 3 === 0
        ? `<@${msg.author.id}>`
        : `${msg.author.displayName}`;

      const timeMs = Date.now() - state.startMs;
      const minutesAgo = Math.floor(timeMs / 60_000);

      msg.channel.send({
        embeds: [embed(
          '🟢 BUY DETECTED',
          `**User:** ${label}\n` +
          `**Amount:** ${fmt(amt)} SOL → GMFT\n` +
          `**Price impact:** +0.04%\n` +
          `**Txn:** ${randomHash()}\n` +
          `⏱ ${minutesAgo}m ago\n` +
          `_LP renounced. 0% tax. No exit ramp._`,
          0x22c55e
        )]
      }).catch(() => {});
      break;
    }

    case 'sell': {
      const amt = parseFloat(args[1]) || (Math.random() * 3 + 0.001);
      state.sellCount++;
      state.sellVolume24h += amt;
      state.txCount++;
      state.holders = Math.max(state.holders - 1, state.holdersBase);
      saveState();

      msg.channel.send({
        embeds: [embed(
          '🔴 SELL DETECTED',
          `**User:** ${msg.author.displayName}\n` +
          `**Amount:** ${fmt(amt)} SOL\n` +
          `**Price impact:** −0.02%\n` +
          `**Txn:** ${randomHash()}\n` +
          `_gm means you don't sell._`,
          0xef4444
        )]
      }).catch(() => {});
      break;
    }

    case 'rules':
      msg.channel.send({
        embeds: [embed(
          '📜 GMFT Gang Rules',
          '1. **Gm or irrelevant** — GMs track community loyalty\n' +
          '2. No NGMI copium tolerated — keeps the alpha clean\n' +
          '3. Chart talk = low conviction — vibes = high conviction\n' +
          '4. LP renounced at tick 0 — no rugs, ever\n' +
          "5. HODL default — selling = weakness isn't in our language\n" +
          '6. Memes are free advertising — make good ones\n' +
          '7. Got rekt? Post the tx — community heals\n' +
          '8. No CEX shilling before we are there first\n' +
          '9. You are the dev — own it\n' +
          '10. Legend or leave\n\n' +
          '*GMFT forever.*'
        )]
      }).catch(() => {});
      break;

    case 'say':
      msg.channel.send(args.slice(1).join(' ') || 'GMFT!').catch(() => {});
      break;

    case 'ping':
      msg.channel.send('pong 🏓 GMFT gang online').catch(() => {});
      break;

    case 'bool':
      msg.channel.send({
        embeds: [embed(
          '🔥 GMFT live bool',
          `Holders: ${fmt(state.holders + (Math.floor((Date.now() - state.lastGrowthMs) / 1000) * state.holdersGrowth * 60))}\n` +
          `Buys 24h: ${fmt(state.buyVolume24h)} SOL\n` +
          `Sells 24h: ${fmt(state.sellVolume24h)} SOL\n` +
          `Txs: ${fmt(state.txCount)}\n` +
          `LP: ✅ Renounced\n` +
          'Tax: 0%\n' +
          'Community: **online & growing** 🚀'
        )]
      }).catch(() => {});
      break;

    // unknown — try keyword triggers
    default: {
      // gm / ngmi / wagmi / rekt WITHOUT prefix
      const keyMap = {
        'gm': '🗡️ GM early = legendary holder. Welcome aboard, degen.',
        'ngmi': 'NGMI? Wrong address — this is GMFT land. Gm or leave. 🗡️',
        'wagmi': '*Always WAGMI* — community jungles the chart vibes. GMFT forever.',
        'rekt': 'rekt = tuition. GMFT = graduation. Gm if you survived.',
      };
      if (keyMap[command]) {
        msg.channel.send({
          embeds: [embed('GMFT', keyMap[command])]
        }).catch(() => {});
      }
      break;
    }
  }
});

// ── Random hash generator (solenoid) ─────────────────────────────────────────
function randomHash() {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 16; i++) s += hex[Math.floor(Math.random() * 16)];
  return `https://solscan.io/tx/${s}...${s.slice(-4)}`;
}

// ── Member join / leave signals ───────────────────────────────────────────────
client.on(Events.GuildMemberAdd, (m) => {
  state.memberCount = (m.guild.memberCount || 0) + 1;
  try { m.send(`GMFT Gang bot here — gm at launch. Welcome to the forever gang. See ${PREFIX}rules.`); } catch (_) {}
  saveState();
});

client.on(Events.GuildMemberRemove, () => {
  state.memberCount = Math.max((state.memberCount || 1) - 1, 0);
  saveState();
});

// ── Boot ──────────────────────────────────────────────────────────────────────
startTicker();

client.once(Events.ClientReady, () => {
  console.log(`🗡️  GMFT Discord Bot online — ${client.user.tag} (${client.user.id})`);
  console.log(`    Prefix: ${PREFIX}`);
});

client.login(TOKEN).catch((err) => {
  console.error('[GMFT Bot] Failed to connect to Discord:', err.message);
  process.exit(1);
});
