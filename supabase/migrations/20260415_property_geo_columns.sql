-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Ensure geo columns exist on properties table
-- Mirrors frontend/scripts/migration_property_place_id.sql — safe to re-run.
-- Adds lat/lng/google_place_id + indexes IF they don't already exist.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS google_place_id   TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS latitude          NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude         NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS neighborhood      TEXT,
  ADD COLUMN IF NOT EXISTS county            TEXT;

-- Unique constraint on place_id (NULLs allowed for legacy rows)
CREATE UNIQUE INDEX IF NOT EXISTS properties_google_place_id_unique
  ON properties(google_place_id)
  WHERE google_place_id IS NOT NULL;

-- Spatial index for lat/lng queries (map viewports, nearest-neighbor)
CREATE INDEX IF NOT EXISTS properties_lat_lng_idx
  ON properties(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

NOTIFY pgrst, 'reload schema';
