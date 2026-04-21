-- ============================================================================
-- Command · Column additions to existing tables
-- Additive only — no drops, no renames. Existing columns stay as-is.
-- ============================================================================

-- ─── contacts ─────���──────────────────────────────────────────────────────────
-- Existing: id, name, email, phone, type, source, stage, city, state, zip,
--   deleted_at, archived_at, on_hold_at, on_hold_reason, reactivated_at,
--   bba_signed_date, bba_expiration_date, pre_approval_amount, lender_name,
--   budget_min, budget_max, last_reply_scan_at, reply_count
--
-- Command adds: tier, lofty_id, looking_for, voice_notes, timezone,
--   do_not_contact, first_name, last_name

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;
  -- Existing `name` column kept for backwards-compat.
  -- Populate first_name/last_name from name where possible:

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'warm';
  -- hot · warm · nurture · cold · past
  -- Separate from `stage` — tier = engagement temperature, stage = pipeline position

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lofty_id TEXT;
  -- External ID for bidirectional Lofty sync

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS looking_for JSONB;
  -- {beds, baths, areas:[], must_haves:[], nice_to_haves:[]}

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS voice_notes TEXT;
  -- Free-form notes; will be embedded for RAG search

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Phoenix';
  -- For drip timing + showing scheduling

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT false;
  -- Hard gate: respected by every send path (email, text, call, print)

CREATE INDEX IF NOT EXISTS idx_contacts_tier ON contacts(tier);
CREATE INDEX IF NOT EXISTS idx_contacts_lofty_id ON contacts(lofty_id) WHERE lofty_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_do_not_contact ON contacts(id) WHERE do_not_contact = true;

-- Backfill first_name / last_name from existing `name` column
UPDATE contacts
SET
  first_name = CASE
    WHEN name LIKE '% %' THEN split_part(name, ' ', 1)
    ELSE name
  END,
  last_name = CASE
    WHEN name LIKE '% %' THEN substring(name FROM position(' ' IN name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL AND name IS NOT NULL;

-- ─── properties ─────���────────────────────────────────────────────────────────
-- Command adds: role_for_dana, price_history jsonb
-- (photos already covered by image_urls; lat/lng already exist as latitude/longitude)

ALTER TABLE properties ADD COLUMN IF NOT EXISTS role_for_dana TEXT DEFAULT 'buyer-interest';
  -- my-listing · hosted · buyer-interest · comp-only · inspo

ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT '[]';
  -- [{date, price, source, event}]

ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id UUID;

-- ─── open_houses ──────���──────────────────────────────────────────────────────
-- Existing: sign_in_config (maps to Command's form_schema)
-- Command adds: kiosk_url, weather_forecast, prep_flags, status

ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS kiosk_url TEXT;
  -- Auto-generated public URL for QR sign-in

ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS weather_forecast JSONB;
  -- Cached OpenWeatherMap payload

ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS prep_flags JSONB DEFAULT '[]';
  -- AI-generated from forecast: [{flag, severity, suggestion}]

ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS oh_status TEXT DEFAULT 'scheduled';
  -- draft · scheduled · day-of · live · closed · archived
  -- Named oh_status to avoid conflict if `status` already exists

ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS owner_id UUID;

-- ─── transactions (deals) ───────────────────────────────────────────────────
-- Command's `deals` maps to existing `transactions` table.
-- Add the Command-specific columns that don't exist yet.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS side TEXT;
  -- buyer · seller · both

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transact_file_id TEXT;
  -- Synced external ID from Transact

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;
  -- Auto-created #buyer_… or #seller_… channel

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS key_dates JSONB;
  -- {uc, inspection, appraisal, clear_to_close, close}

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS checklist_run_id UUID REFERENCES checklist_runs(id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS owner_id UUID;

-- ─── oh_signins ──────────────────────���───────────────────────────────────────
-- Check if oh_signins exists; if not, create it per Command spec.
-- The existing app may use a different table name for OH sign-in data.
CREATE TABLE IF NOT EXISTS oh_signins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  open_house_id   UUID NOT NULL REFERENCES open_houses(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  raw_form        JSONB NOT NULL DEFAULT '{}',
  tier_at_signin  TEXT,             -- hot · warm · nurture (AI-scored)
  pushed_to_lofty_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oh_signins_oh ON oh_signins(open_house_id);
CREATE INDEX IF NOT EXISTS idx_oh_signins_contact ON oh_signins(contact_id) WHERE contact_id IS NOT NULL;

-- RLS for oh_signins
ALTER TABLE oh_signins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all oh_signins" ON oh_signins FOR ALL USING (true) WITH CHECK (true);

-- ─── tags + contact_tags ─────────────────────────────────────────────────────
-- Applied separately in 20260421_command_tags_and_contact_tags migration
-- See that file for the tags table + contact_tags M:N join.
