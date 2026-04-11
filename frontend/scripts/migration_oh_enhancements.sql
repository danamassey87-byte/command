-- ─────────────────────────────────────────────────────────────────────────────
-- Open Houses enhancements:
--   1. host_reports: add pre_oh_activities, overall_feedback, groups_through, offer_interest text
--   2. open_houses: ensure hosted_by pattern works (agent_name already exists)
-- ─────────────────────────────────────────────────────────────────────────────

-- Follow-up tracking columns on open_houses
ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ;
ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS escalation_sent_at TIMESTAMPTZ;
ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS briefing_sent_at TIMESTAMPTZ;

-- Host report new fields (Dana's form)
ALTER TABLE host_reports ADD COLUMN IF NOT EXISTS pre_oh_activities TEXT;
ALTER TABLE host_reports ADD COLUMN IF NOT EXISTS overall_feedback TEXT;
ALTER TABLE host_reports ADD COLUMN IF NOT EXISTS groups_through INT DEFAULT 0;

-- Change offer_interest from boolean to text (yes/no/maybe) if it's still boolean
-- Safe: add new column, backfill, drop old
DO $$
BEGIN
  -- Only migrate if offer_interest is boolean
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'host_reports' AND column_name = 'offer_interest' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE host_reports ADD COLUMN IF NOT EXISTS offer_interest_text TEXT;
    UPDATE host_reports SET offer_interest_text = CASE
      WHEN offer_interest = true THEN 'yes'
      WHEN offer_interest = false THEN 'no'
      ELSE ''
    END;
    ALTER TABLE host_reports DROP COLUMN offer_interest;
    ALTER TABLE host_reports RENAME COLUMN offer_interest_text TO offer_interest;
  END IF;
END $$;
