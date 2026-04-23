-- Migration: OH Prospecting — alter oh_outreach, add attempts + templates tables
-- Created: 2026-04-23

-- ============================================================
-- 1. ALTER oh_outreach — add new columns
-- ============================================================
ALTER TABLE oh_outreach
  ADD COLUMN IF NOT EXISTS mls_number       TEXT,
  ADD COLUMN IF NOT EXISTS price            NUMERIC,
  ADD COLUMN IF NOT EXISTS date_listed      DATE,
  ADD COLUMN IF NOT EXISTS photo_url        TEXT,
  ADD COLUMN IF NOT EXISTS city             TEXT,
  ADD COLUMN IF NOT EXISTS co_agent_name    TEXT,
  ADD COLUMN IF NOT EXISTS co_agent_phone   TEXT,
  ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_date   DATE,
  ADD COLUMN IF NOT EXISTS open_house_id    UUID REFERENCES open_houses(id),
  ADD COLUMN IF NOT EXISTS listing_url      TEXT;

-- ============================================================
-- 2. Migrate legacy status values
-- ============================================================
UPDATE oh_outreach SET status = 'approved' WHERE status = 'accepted';
UPDATE oh_outreach SET status = 'said_no'  WHERE status = 'declined';

-- ============================================================
-- 3. oh_outreach_attempts — log every contact attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS oh_outreach_attempts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id     UUID        NOT NULL REFERENCES oh_outreach(id) ON DELETE CASCADE,
  attempt_date    TIMESTAMPTZ DEFAULT NOW(),
  contact_method  TEXT        CHECK (contact_method IN ('email','text','phone','door','letter')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. oh_outreach_templates — reusable message templates
-- ============================================================
CREATE TABLE IF NOT EXISTS oh_outreach_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  subject     TEXT,
  body        TEXT,
  is_default  BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_oh_outreach_mls_number
  ON oh_outreach(mls_number);

CREATE INDEX IF NOT EXISTS idx_oh_outreach_attempts_outreach_id
  ON oh_outreach_attempts(outreach_id);

-- ============================================================
-- 6. RLS — enable and add policies for authenticated users
-- ============================================================
ALTER TABLE oh_outreach_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE oh_outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view oh_outreach_attempts"
  ON oh_outreach_attempts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert oh_outreach_attempts"
  ON oh_outreach_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update oh_outreach_attempts"
  ON oh_outreach_attempts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete oh_outreach_attempts"
  ON oh_outreach_attempts FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view oh_outreach_templates"
  ON oh_outreach_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert oh_outreach_templates"
  ON oh_outreach_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update oh_outreach_templates"
  ON oh_outreach_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete oh_outreach_templates"
  ON oh_outreach_templates FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 7. Seed default templates
-- ============================================================
INSERT INTO oh_outreach_templates (name, subject, body, is_default) VALUES
(
  'Initial Outreach',
  'Open House Request — {{address}}',
  'Hi {{agent_name}},

I noticed your listing at {{address}} and would love the opportunity to host an open house for you. I specialize in the {{city}} market and have a strong track record of generating quality traffic and leads.

Would you be open to discussing this? I am happy to share my open house plan and marketing strategy at your convenience.

Looking forward to hearing from you!

Best,
Dana Massey',
  true
),
(
  'Follow-Up',
  'Following Up — Open House at {{address}}',
  'Hi {{agent_name}},

I wanted to follow up on my earlier message about hosting an open house at {{address}}. I understand things get busy, so I wanted to check back in case my note slipped through.

If you are still looking for someone to host, I would love to chat. No pressure at all — just let me know either way.

Thanks!
Dana Massey',
  true
),
(
  'Thank You',
  'Thank You — {{address}} Open House',
  'Hi {{agent_name}},

Thank you so much for giving me the opportunity to host the open house at {{address}}! I will make sure everything runs smoothly and keep you updated on traffic and any leads that come through.

If there is anything specific you would like me to cover or any materials you want displayed, just let me know.

Looking forward to it!

Dana Massey',
  true
);
