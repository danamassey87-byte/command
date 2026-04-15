-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Google Calendar sync log + ensure user_settings supports google_tokens
-- ─────────────────────────────────────────────────────────────────────────────

-- Table to track which app records have been synced to Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_sync_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type   text NOT NULL,              -- 'open_house' | 'buyer_showing'
  source_id     uuid NOT NULL,              -- ID of the open_houses or buyer_showings row
  google_event_id   text NOT NULL,          -- Google Calendar event ID
  google_calendar_id text NOT NULL DEFAULT 'primary',
  sync_direction    text NOT NULL DEFAULT 'push',  -- 'push' | 'pull'
  last_synced_at    timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(source_type, source_id)
);

-- Index for quick lookups by source
CREATE INDEX IF NOT EXISTS idx_gcal_sync_source
  ON google_calendar_sync_log(source_type, source_id);

-- Index for lookups by google event ID
CREATE INDEX IF NOT EXISTS idx_gcal_sync_google_event
  ON google_calendar_sync_log(google_event_id);
