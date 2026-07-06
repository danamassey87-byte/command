-- ────────────────────────────────────────────────────────────────────────────
-- 2026-07-06 — Let a deal be marked Closed / Recorded
-- The pipeline previously stopped at the "Closing" stage. P&L, Goals, the Closed
-- Deals map, and the SOP filters all expect status='closed', but nothing ever set
-- it. Add explicit terminal-close fields + a 'Closed' status so a recorded deal
-- (e.g. 9603 E Theia Dr — Don & Julie Neves) can be marked complete.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recorded_date     DATE,          -- deed recorded w/ county
  ADD COLUMN IF NOT EXISTS closed_at         TIMESTAMPTZ,   -- when marked closed in-app
  ADD COLUMN IF NOT EXISTS final_sale_price  NUMERIC;       -- confirmed COE price

COMMENT ON COLUMN transactions.recorded_date    IS 'Date the deed recorded with the county — deal is officially complete.';
COMMENT ON COLUMN transactions.closed_at        IS 'Timestamp the deal was marked Closed in Command.';
COMMENT ON COLUMN transactions.final_sale_price IS 'Confirmed final sale price at close of escrow.';
