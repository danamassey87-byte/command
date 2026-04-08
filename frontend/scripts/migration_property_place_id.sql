-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Google Places integration for properties
-- Adds place_id (canonical key), lat/lng, and formatted_address.
-- place_id becomes the preferred dedupe key — no more fuzzy matching.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS google_place_id   TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS latitude          NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude         NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS neighborhood      TEXT,
  ADD COLUMN IF NOT EXISTS county            TEXT;

-- Unique (partial) — prevents future duplicates on the SAME place_id.
-- NULL place_ids are allowed (legacy rows until backfill).
CREATE UNIQUE INDEX IF NOT EXISTS properties_google_place_id_unique
  ON properties(google_place_id)
  WHERE google_place_id IS NOT NULL;

-- Spatial index for lat/lng queries (map viewports, nearest-neighbor search)
CREATE INDEX IF NOT EXISTS properties_lat_lng_idx
  ON properties(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

NOTIFY pgrst, 'reload schema';
