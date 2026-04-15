-- On-Hold / Paused Contacts
-- Adds columns to track when a contact is put on hold, the reason, and when reactivated.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS on_hold_at       timestamptz  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS on_hold_reason   text         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reactivated_at   timestamptz  DEFAULT NULL;

-- Index for quick lookup of on-hold contacts
CREATE INDEX IF NOT EXISTS idx_contacts_on_hold ON contacts (on_hold_at) WHERE on_hold_at IS NOT NULL;
