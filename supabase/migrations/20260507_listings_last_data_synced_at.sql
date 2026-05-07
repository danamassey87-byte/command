-- Per-listing weekly data-sync timestamp.
--
-- ARMLS feed dropped 2026-05-07 (too expensive). Dana keeps listing
-- data current via a manual weekly review against the MLS portal.
-- This column powers a Dashboard "Stale Listings" widget that surfaces
-- active listings whose last_data_synced_at is null or > 7 days old —
-- one click marks the listing as just-synced.
--
-- Applied 2026-05-07 via Management API.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS last_data_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN listings.last_data_synced_at IS
  'Last time Dana confirmed price/status/DOM are still accurate vs the MLS portal. Used by the Stale Listings dashboard widget.';
