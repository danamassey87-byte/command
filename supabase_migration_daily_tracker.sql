-- Daily Business Tracker migration
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS daily_activity (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE UNIQUE NOT NULL,
  calls_made    INTEGER NOT NULL DEFAULT 0,
  texts_sent    INTEGER NOT NULL DEFAULT 0,
  doors_knocked INTEGER NOT NULL DEFAULT 0,
  emails_sent   INTEGER NOT NULL DEFAULT 0,
  appts_set     INTEGER NOT NULL DEFAULT 0,
  offers_written INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_targets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_calls   INTEGER NOT NULL DEFAULT 50,
  weekly_texts   INTEGER NOT NULL DEFAULT 30,
  weekly_doors   INTEGER NOT NULL DEFAULT 20,
  weekly_emails  INTEGER NOT NULL DEFAULT 20,
  weekly_appts   INTEGER NOT NULL DEFAULT 5,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed one default targets row
INSERT INTO activity_targets (weekly_calls, weekly_texts, weekly_doors, weekly_emails, weekly_appts)
SELECT 50, 30, 20, 20, 5
WHERE NOT EXISTS (SELECT 1 FROM activity_targets);
