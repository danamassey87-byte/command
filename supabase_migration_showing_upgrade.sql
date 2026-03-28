-- Showing Session Upgrade migration
-- Run in Supabase SQL Editor

ALTER TABLE showings
  ADD COLUMN IF NOT EXISTS prep_notes        TEXT,
  ADD COLUMN IF NOT EXISTS buyer_feedback    TEXT,
  ADD COLUMN IF NOT EXISTS feedback_price    TEXT,
  ADD COLUMN IF NOT EXISTS feedback_condition TEXT,
  ADD COLUMN IF NOT EXISTS would_offer       BOOLEAN,
  ADD COLUMN IF NOT EXISTS follow_up_sent    BOOLEAN NOT NULL DEFAULT FALSE;
