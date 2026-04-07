-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add listing agreement date columns
-- Adds the columns the Sellers page reads/writes for tracking when listing
-- agreements were signed and when they expire.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table listings add column if not exists agreement_signed_date  date;
alter table listings add column if not exists agreement_expires_date date;

-- Force PostgREST to reload its schema cache so the new columns are visible
-- to the frontend immediately (otherwise you'll see "Could not find the
-- 'agreement_expires_date' column of 'listings' in the schema cache").
notify pgrst, 'reload schema';
