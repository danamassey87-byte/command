-- ============================================================================
-- Price Reduction Tracking — listing_price_history table, trigger, analytics
-- Safe to run multiple times.
-- ============================================================================

-- ─── listing_price_history ──────────────────────────────────────────────────
-- Every price change on a listing is logged here — reductions, increases, or
-- corrections. The trigger on listings.current_price auto-inserts rows so
-- changes are never missed, but manual entries are also supported (e.g. when
-- backfilling from MLS).
CREATE TABLE IF NOT EXISTS listing_price_history (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ DEFAULT now(),
  listing_id             UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  previous_price         NUMERIC NOT NULL,
  new_price              NUMERIC NOT NULL,
  reduction_amount       NUMERIC GENERATED ALWAYS AS (previous_price - new_price) STORED,
  reduction_pct          NUMERIC GENERATED ALWAYS AS (
    CASE WHEN previous_price > 0
      THEN ROUND(((previous_price - new_price) / previous_price) * 100, 2)
      ELSE 0
    END
  ) STORED,
  change_number          INTEGER NOT NULL DEFAULT 1,
  reason                 TEXT,
  changed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes                  TEXT,
  -- Track whether this was auto-logged by the trigger or manually entered
  source                 TEXT NOT NULL DEFAULT 'manual'
                           CHECK (source IN ('manual', 'trigger', 'mls_sync'))
);

CREATE INDEX IF NOT EXISTS idx_lph_listing   ON listing_price_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_lph_changed   ON listing_price_history(changed_at);

-- ─── Add current_price + close_price to listings if missing ─────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS current_price NUMERIC,
  ADD COLUMN IF NOT EXISTS close_price   NUMERIC;

-- Backfill: set current_price = list_price where it's NULL
UPDATE listings SET current_price = list_price
WHERE current_price IS NULL AND list_price IS NOT NULL;

-- ─── Trigger: auto-log price changes ────────────────────────────────────────
-- Fires AFTER UPDATE on listings when current_price changes. Inserts a row
-- into listing_price_history so every price change is captured even if Dana
-- edits the listing form directly without going through the modal.
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
DECLARE
  prev_count INTEGER;
BEGIN
  -- Only fire when current_price actually changes and both values are non-null
  IF OLD.current_price IS NOT NULL
     AND NEW.current_price IS NOT NULL
     AND OLD.current_price != NEW.current_price
  THEN
    -- Count existing changes for this listing to set change_number
    SELECT COALESCE(MAX(change_number), 0) INTO prev_count
    FROM listing_price_history
    WHERE listing_id = NEW.id;

    INSERT INTO listing_price_history (
      listing_id, previous_price, new_price, change_number, source, changed_at
    ) VALUES (
      NEW.id, OLD.current_price, NEW.current_price, prev_count + 1, 'trigger', now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop + recreate to ensure latest version
DROP TRIGGER IF EXISTS trg_log_price_change ON listings;
CREATE TRIGGER trg_log_price_change
  AFTER UPDATE OF current_price ON listings
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- ─── Analytics view: listing_price_analytics ────────────────────────────────
-- Pre-computed per-listing price reduction stats for the analytics dashboard.
CREATE OR REPLACE VIEW listing_price_analytics AS
SELECT
  l.id                                          AS listing_id,
  l.property_id,
  l.contact_id,
  l.list_price                                  AS original_list_price,
  l.current_price,
  l.close_price,
  l.status,
  l.list_date,
  l.close_date,
  l.dom,
  p.address,
  p.city,
  p.zip,
  -- Price reduction stats
  COALESCE(ph.reduction_count, 0)               AS reduction_count,
  COALESCE(ph.total_reduction_amount, 0)        AS total_reduction_amount,
  CASE WHEN l.list_price > 0
    THEN ROUND(((l.list_price - COALESCE(l.current_price, l.list_price)) / l.list_price) * 100, 2)
    ELSE 0
  END                                            AS total_reduction_pct,
  -- Sale-to-list ratio (only meaningful for closed listings)
  CASE WHEN l.status = 'closed' AND l.list_price > 0 AND l.close_price > 0
    THEN ROUND((l.close_price / l.list_price) * 100, 2)
    ELSE NULL
  END                                            AS sale_to_list_pct,
  -- Avg days between reductions
  ph.avg_days_between_reductions,
  ph.first_reduction_at,
  ph.last_reduction_at
FROM listings l
LEFT JOIN properties p ON p.id = l.property_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                    AS reduction_count,
    SUM(CASE WHEN reduction_amount > 0 THEN reduction_amount ELSE 0 END) AS total_reduction_amount,
    MIN(changed_at)                             AS first_reduction_at,
    MAX(changed_at)                             AS last_reduction_at,
    CASE WHEN COUNT(*) > 1
      THEN ROUND(
        EXTRACT(EPOCH FROM (MAX(changed_at) - MIN(changed_at))) / (COUNT(*) - 1) / 86400, 1
      )
      ELSE NULL
    END                                         AS avg_days_between_reductions
  FROM listing_price_history ph_inner
  WHERE ph_inner.listing_id = l.id
    AND ph_inner.new_price < ph_inner.previous_price  -- only actual reductions
) ph ON true
WHERE l.deleted_at IS NULL;
