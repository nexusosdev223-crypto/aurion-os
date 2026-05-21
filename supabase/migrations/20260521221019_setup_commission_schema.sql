-- ─────────────────────────────────────────────────────────────────────────────
-- Aurion OS — Commission & Monetisation Schema
-- Run this once in the Supabase SQL editor (or supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.  Commission log — one row per trade, 1 % of gross volume
CREATE TABLE IF NOT EXISTS aurion_commissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type      text        NOT NULL,  -- BUY / SELL / INTENT / …
  amount          numeric     NOT NULL,  -- raw trade volume in AURION tokens
  commission_usd  numeric     NOT NULL,  -- 1 % of volume×USD price (USD value)
  agent_decision  text        NOT NULL,  -- trace of why this trade was taken
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 2.  Index for the revenue endpoint (total + recent)
CREATE INDEX IF NOT EXISTS idx_aurion_commissions_created
  ON aurion_commissions (created_at DESC);

-- 3.  Index for aggregations by order type
CREATE INDEX IF NOT EXISTS idx_aurion_commissions_ordertype
  ON aurion_commissions (order_type);

-- 4.  Enable RLS (drop the policy if you have an identical one already)
DROP POLICY IF EXISTS "Public read commissions" ON aurion_commissions;
CREATE POLICY "Public read commissions"
  ON aurion_commissions
  FOR SELECT
  USING (true);

ALTER TABLE aurion_commissions
  ENABLE ROW LEVEL SECURITY;
