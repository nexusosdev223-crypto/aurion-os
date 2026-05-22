-- ─────────────────────────────────────────────────────────────────────────────
-- Aurion OS — Paywall & Licensing Schema
-- This layer lets you sell tiers without Stripe or any third-party gateway.
-- License keys are generated server-side, verified on-chain, then written
-- to `aurion_wallet_plans` which `/api/signal` consults before every reply.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- HOW IT WORKS
--  1. Caller hits /api/paywall/unlock  → pastes license_key + wallet
--  2. Server checks aurion_licenses — key must be ACTIVE and tier must match
--  3. Server upserts a row in aurion_wallet_plans  (wallet, tier, expires_at)
--  4. /api/signal reads aurion_wallet_plans first; plan quotas override the
--     old hard-coded free/10 logic
--
-- TIERS
--  FREE (DEV)      — 100  signals / 24 h
--  RESEARCH (LITE) — 5,000 signals / 30 d   ← sold via BTCPay / LN / address
--  INSTITUTIONAL   — ∞     signals / ∞       ← enterprise license
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. License catalogue (generated / sold off-platform) ─────────────────────
CREATE TABLE IF NOT EXISTS aurion_licenses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key  text        NOT NULL UNIQUE,               -- e.g. AUR-RES-XXXXX
  tier         text        NOT NULL CHECK (tier IN ('FREE','RESEARCH','INSTITUTIONAL')),
  plan_id      text        NOT NULL,                       -- _100, _5000, _inf
  wallet_linked boolean    NOT NULL DEFAULT false,          -- set true on unlock
  active       boolean     NOT NULL DEFAULT true,
  expires_at   timestamptz,                                -- NULL = lifetime
  metadata     jsonb       DEFAULT '{}'::jsonb,             -- payment_ref, txid, etc.
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aurion_licenses_key
  ON aurion_licenses (license_key);
CREATE INDEX IF NOT EXISTS idx_aurion_licenses_tier
  ON aurion_licenses (tier);
CREATE INDEX IF NOT EXISTS idx_aurion_licenses_wallet_linked
  ON aurion_licenses (wallet_linked);

-- Audit trigger — keep updated_at fresh
DROP TRIGGER IF EXISTS set_updated_at_licenses ON aurion_licenses;
CREATE TRIGGER set_updated_at_licenses
  BEFORE UPDATE ON aurion_licenses
  FOR EACH ROW EXECUTE FUNCTION (now());


-- ── 2. Wallet → active plan (read by /api/signal on every call) ───────────────
CREATE TABLE IF NOT EXISTS aurion_wallet_plans (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet          text         NOT NULL UNIQUE,               -- wallet address hex
  license_key     text         REFERENCES aurion_licenses(license_key),
  tier            text         NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE','RESEARCH','INSTITUTIONAL')),
  plan_id         text         NOT NULL DEFAULT '_100',        -- _100 / _5000 / _inf
  signals_used    integer      NOT NULL DEFAULT 0,
  signals_limit   integer,                                 -- NULL = unlimited
  window_start    timestamptz  NOT NULL DEFAULT now(),       -- last 24 h / 30 d window
  expires_at      timestamptz,                              -- NULL = lifetime
  active          boolean      NOT NULL DEFAULT true,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aurion_wallet_plans_wallet
  ON aurion_wallet_plans (wallet);
CREATE INDEX IF NOT EXISTS idx_aurion_wallet_plans_tier
  ON aurion_wallet_plans (tier);


-- ── 3. Per-wallet signal-usage log (anti-abuse; rate-limit reset) ─────────────
CREATE TABLE IF NOT EXISTS aurion_signal_log (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet      text         NOT NULL,
  tier        text         NOT NULL DEFAULT 'FREE',
  action      text         NOT NULL,               -- STIMULATE / HOLD / BLOCK
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aurion_signal_log_wallet_created
  ON aurion_signal_log (wallet, created_at DESC);


-- ── 4. RLS — public read for plans; service-role write only ───────────────────
DROP POLICY IF EXISTS "Public read wallet plans" ON aurion_wallet_plans;
CREATE POLICY "Public read wallet plans"
  ON aurion_wallet_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read signal log" ON aurion_signal_log;
CREATE POLICY "Public read signal log"
  ON aurion_signal_log FOR SELECT USING (true);

ALTER TABLE aurion_wallet_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aurion_signal_log      ENABLE ROW LEVEL SECURITY;
