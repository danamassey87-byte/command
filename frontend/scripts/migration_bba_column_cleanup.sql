-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup: consolidate bba_expiry_date → bba_expiration_date
-- The contacts table may have both columns. Backfill the canonical one and drop the old.
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure the canonical column exists
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bba_expiration_date DATE;

-- Backfill: copy any data from the old column where the new one is null
UPDATE contacts
SET bba_expiration_date = bba_expiry_date
WHERE bba_expiration_date IS NULL
  AND bba_expiry_date IS NOT NULL;

-- Drop the old column (safe — all frontend now uses bba_expiration_date)
ALTER TABLE contacts DROP COLUMN IF EXISTS bba_expiry_date;
