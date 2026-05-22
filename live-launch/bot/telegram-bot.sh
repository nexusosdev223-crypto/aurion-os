#!/usr/bin/env bash
# =============================================================================
# GMFT Telegram Engagement Bot
# Standalone bash + curl poller — no Python, no npm, no external deps.
# Configure: export TELEGRAM_BOT_TOKEN="<your_botfather_token>"
# =============================================================================
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
: "${TELEGRAM_BOT_TOKEN:=}"       # Required — get from @BotFather
STATE_FILE="${HOME}/.gmft_bot_state.json"
POLL_INTERVAL=2                  # seconds between update checks
UPDATES_OFFSET=0

# ── Colour helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "[${CYAN}$(date +%H:%M:%S)${NC}] $*" >&2; }
ok()   { echo -e "[${GREEN}$(date +%H:%M:%S)${NC}] $*" >&2; }
warn() { echo -e "[${YELLOW}$(date +%H:%M:%S)${NC}] $*" >&2; }
err()  { echo -e "[${RED}$(date +%H:%M:%S)${NC}] $*" >&2; }

# ── Pre-flight ──────────────────────────────────────────────────────────────
if [[ -z "${TELEGRAM_BOT_TOKEN}" ]]; then
  err "TELEGRAM_BOT_TOKEN is not set. Get one from @BotFather on Telegram."
  err "  export TELEGRAM_BOT_TOKEN=\"<your_token>\""
  exit 1
fi

BOT_API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

# ── State helpers ────────────────────────────────────────────────────────────
# State schema: { "offset": N, "members": N, "group_id": N }

state_get() {
  local key="$1"
  if [[ -f "${STATE_FILE}" ]]; then
    python3 -c "import json; d=json.load(open('${STATE_FILE}')); print(d.get('${key}',''))" 2>/dev/null \
      || python -c "import json; d=json.load(open('${STATE_FILE}')); print(d.get('${key}',''))" 2>/dev/null \
      || echo ""
  else
    echo ""
  fi
}

state_set() {
  local key="$1"; local val="$2"
  local tmp
  if [[ -f "${STATE_FILE}" ]]; then
    tmp=$(python3 -c "
import json, sys
d=json.load(open('${STATE_FILE}'))
d['${key}']=${val}
json.dump(d, open('${STATE_FILE}','w'))
" 2>/dev/null || python -c "
import json, sys
d=json.load(open('${STATE_FILE}'))
d['${key}']=${val}
json.dump(d, open('${STATE_FILE}','w'))
" 2>/dev/null || true)
  else
    echo "{\"offset\":${UPDATES_OFFSET},\"${key}\":${val}}" > "${STATE_FILE}"
  fi
}

state_init() {
  if [[ ! -f "${STATE_FILE}" ]]; then
    echo "{\"offset\":${UPDATES_OFFSET},\"members\":0,\"group_id\":-100}" > "${STATE_FILE}"
    ok "Created state file at ${STATE_FILE}"
  fi
}

# ── Telegram API helpers ─────────────────────────────────────────────────────
tg_get() {
  curl -sS --max-time 10 "${BOT_API}/${1}?${*:2}" 2>/dev/null
}

tg_send() {
  local method="$1"; shift
  tg_get "${method}" "$@"
}

tg_post() {
  local method="$1"; shift
  local chat_id="$1"; shift
  local text="$1"; shift
  curl -sS --max-time 15 \
    -X POST "${BOT_API}/${method}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg cid "${chat_id}" --arg t "${text}" '{chat_id: ($cid|tonumber), text: $t, parse_mode: "Markdown"}')" \
    2>/dev/null
}

# ── JSON helpers (no jq dependency — use python3) ────────────────────────────
json_field() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2',''))"
}

json_message() {
  echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}))"
}

# ── Keyword replies ──────────────────────────────────────────────────────────
TRIGGERS=$(cat <<'JSON'
{
  "gm":       "GMFT Gang! GM, legendary early holder! GM is the way. HODL tight. GMFT 🗡️🔥",
  "goodmorning": "*GMFT Gang! Gm early = bags later. Legendary degen!*",
  "ngmi":     "*Not here, warrior. This is GMFT land. Gm or leave.*",
  "wagmi":    "*Always been WAGMI — community vibes winning. GMFT forever.*",
  "rekt":     "rekt is tuition payment — graduates join GMFT gang. Stay strong, boa.",
  "gmft":     "*GMFT forever. Legend. 🗡️*",
  "gmftt":    "*GMFT — legendary call. The forever gang.*"
}
JSON
)

should_reply() {
  local text_lower="$(echo "$1" | tr '[:upper:]' '[:lower:]')"
  echo "${TRIGGERS}" | python3 -c "
import sys, json
rules = json.load(sys.stdin)
for k, v in rules.items():
    if '${text_lower}'.strip() in [k] or '${text_lower}'.strip().split()[0] == k:
        print(v)
        sys.exit(0)
"
}

# ── Commands ─────────────────────────────────────────────────────────────────
cmd_start() {
  local chat_id="$1"
  local member_count="$2"
  tg_send "sendMessage" \
    chat_id="${chat_id}" \
    text="*GMFT Gang Bot Online* ✅

👑 *Welcome to GMFT — Good Mother F***ing Time*

The one command anti-NGMI community bot.
You are early. Stay early.

Holders currently: *${member_count}*

/gm — claim your legendary status
/rules — gang constitution
/members — live holder count
/renounced — lp status display

Drop a gm in this group — the bot will see it."
    parse_mode="Markdown" \
    disable_web_page_preview="true"
}

cmd_rules() {
  local chat_id="$1"
  tg_send "sendMessage" chat_id="${chat_id}" text="*GMFT Gang Rules* ☠️

1. Gm or you're irrelevant.
2. No NGMI copium tolerated.
3. Chart talk is low-conviction; gm is high-conviction.
4. No rugs — lp renounced at tick 0. we eat our own cooking.
5. HODL is default. Selling = weakness.
6. Memes are free advertising. Make good ones.
7. If you're rekt — post the tx link. Community heals.
8. Welcome the new holders. Don't gatekeep alpha.
9. No CEX shilling before we're there first.
10. The dev is you. Own it.

Violation = time-out.
Repeat = handcuffed to the chart.

*GMFT. Legend or leave.*" parse_mode="Markdown" disable_web_page_preview="true"
}

cmd_members() {
  local chat_id="$1"; local count="$2"
  tg_send "sendMessage" chat_id="${chat_id}" \
    text="*Holders: ${count}* 👑\n_Members currently tracked._\ngm means you count." \
    parse_mode="Markdown" disable_web_page_preview="true"
}

cmd_say() {
  local chat_id="$1"; local msg="$2"
  tg_send "sendMessage" chat_id="${chat_id}" text="${msg}" disable_web_page_preview="true"
}

cmd_renounced() {
  local chat_id="$1"
  tg_send "sendMessage" chat_id="${chat_id}" \
    text="*LP Status: ✅ Renounced & Locked* 🔒\n\n0% tax = forever\nLP burned = no exit ramp\nwe dev through the opposition\n\nGMFT forever. rug = not in dictionary." \
    parse_mode="Markdown" disable_web_page_preview="true"
}

# ── Auto-increment members on /start ────────────────────────────────────────
increment_member() {
  local current
  current="$(state_get 'members')"
  current="${current:-0}"
  ((current++))
  state_set "members" "${current}"
}

# ── Main poll loop ───────────────────────────────────────────────────────────
poll_loop() {
  log "GMFT Telegram Bot — polling loop started"
  log "State file: ${STATE_FILE}"

  # Resolve offset
  UPDATES_OFFSET="$(state_get 'offset')"
  UPDATES_OFFSET="${UPDATES_OFFSET:-0}"

  # Register bot identity
  local bot_info
  bot_info=$(tg_send "getMe")
  local bot_username
  bot_username=$(echo "${bot_info}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('username','GMFTBot'))")
  ok "Logged in as @${bot_username}"

  while true; do
    local updates
    updates=$(tg_send "getUpdates" offset="${UPDATES_OFFSET}" timeout=10 limit=50)

    # Count updates received
    local update_count
    update_count=$(echo "${updates}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('result',[])))")

    if [[ "${update_count}" -gt 0 ]]; then
      echo "${updates}" | python3 -c "
import sys, json, subprocess, os

data = json.load(sys.stdin)
results = data.get('result',[])
state_file = '${STATE_FILE}'
bot_token = '${TELEGRAM_BOT_TOKEN}'
offs = '${UPDATES_OFFSET}'

def tg_get(method, **params):
    q = '&'.join(f'{k}={v}' for k,v in params.items())
    r = __import__('subprocess').run(
        ['curl','-sS',f'https://api.telegram.org/bot{bot_token}/{method}?{q}'],
        capture_output=True, text=True, timeout=10)
    return r.stdout

def tg_post_json(method, **payload):
    import json as j
    r = __import__('subprocess').run(
        ['curl','-sS','-X','POST',f'https://api.telegram.org/bot{bot_token}/{method}',
         '-H','Content-Type: application/json','-d',j.dumps(payload)],
        capture_output=True, text=True, timeout=15)
    return r.stdout

def tg_send_message(chat_id, text, parse=''):
    payload = {'chat_id': chat_id, 'text': text, 'disable_web_page_preview': True}
    if parse:
        payload['parse_mode'] = parse
    tg_post_json('sendMessage', **payload)

def update_state(**kw):
    os.path.exists(state_file) or open(state_file,'w').write('{}')
    s = j.load(open(state_file))
    s.update(kw)
    j.dump(s, open(state_file,'w'))

reply_map = {
    'gm': '*GMFT Gang!* GM early = bags later. Legendary degen! GM 🗡️🔥',
    'good morning': '*GMFT Gang!* Gm, legendary early holder. stay degen.',
    'ngmi': '*Not here. This is GMFT land. Gm or leave.*',
    'wagmi': '*Always WAGMI — community vibes winning. GMFT forever.*',
    'rekt': 'rekt is tuition. GMFT is graduation. gm if you survived the market.',
    'gmft': '*GMFT forever.*',
    'gmft!': '*GMFT — legendary call forever gang.*',
}

member_count = 0
if os.path.exists(state_file):
    existing = j.load(open(state_file))
    member_count = existing.get('members', 0)

for upd in results:
    mid = upd.get('update_id', 0)
    msg = upd.get('message') or upd.get('edited_message')
    if not msg: continue

    chat_id = msg['chat']['id']
    text = (msg.get('text') or '').strip()
    lower = text.lower()

    # /start
    if lower == '/start' or lower == '/start@${bot_username}'.lower():
        member_count += 1
        update_state(members=member_count)
        tg_send_message(chat_id, f\"*GMFT Gang Bot Online* ✅\n\nWelcome to GMFT — Good Mother F***ing Time\nHolders: *{member_count}*\n\n/gm — claim legendary status\n/rules — gang constitution\n/members — live holder count\n/renounced — lp status\n\nDrop a gm — the bot sees it.\")
        continue

    # /rules
    if lower == '/rules' or lower == '/rules@${bot_username}'.lower():
        tg_send_message(chat_id, '*GMFT Gang Rules* \\n1. Gm or irrelevant\\n2. No NGMI copium\\n3. Chart talk = low conviction; gm = high\\n4. No rugs — lp renounced tick 0\\n5. hodl default\\n6. Memes = free ads\\n7. if rekt post tx — community heals\\n8. No CEX shills pre-launch\\n9. Dev is you\\n10. Legend or leave.')
        continue

    # /members
    if lower == '/members' or lower == '/members@${bot_username}'.lower():
        tg_send_message(chat_id, f'*Holders: {member_count}*')
        continue

    # /say
    if lower.startswith('/say'):
        reply_text = text[5:].strip() or 'GMFT!'
        tg_send_message(chat_id, reply_text)
        continue

    # /renounced
    if lower == '/renounced' or lower == '/renounced@${bot_username}'.lower():
        tg_send_message(chat_id, '*LP Status: ✅ Renounced & Locked*\\n0% tax = forever\\nLP burned = no exit ramp\\nGMFT forever.')
        continue

    # keyword auto-replies
    for key, val in reply_map.items():
        if lower == key or lower.startswith(key + ' ') or lower == key + '!':
            tg_send_message(chat_id, val, parse='Markdown')
            break

# mark offset
max_id = max([u.get('update_id',0) for u in results], default=0)
print(max_id)
" > /dev/null

      # Capture the new offset from python subprocess
      local new_offset
      new_offset=$(echo "${updates}" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('result',[])
print(max([u.get('update_id',0) for u in r], default=${UPDATES_OFFSET}))
")
      if [[ "${new_offset}" -gt "${UPDATES_OFFSET}" ]]; then
        UPDATES_OFFSET="${new_offset}"
        state_set "offset" "${UPDATES_OFFSET}"
      fi
    fi

    sleep "${POLL_INTERVAL}"
  done
}

# ── Entrypoint ───────────────────────────────────────────────────────────────
trap "log 'Shutting down…'" EXIT INT TERM

state_init
poll_loop
