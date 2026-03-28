-- ============================================================================
-- Mileage Log v2 — Add address columns + source tracking
-- Run in Supabase SQL Editor
-- ============================================================================

-- Add start/end address and source columns
ALTER TABLE mileage_log
  ADD COLUMN IF NOT EXISTS start_address text,
  ADD COLUMN IF NOT EXISTS end_address   text,
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'manual',      -- 'manual' | 'showing' | 'open_house' | 'listing_appt'
  ADD COLUMN IF NOT EXISTS source_id     uuid,                       -- FK to showing_sessions, open_houses, etc.
  ADD COLUMN IF NOT EXISTS round_trip    boolean DEFAULT true;
