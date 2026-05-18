-- ─── OH Feedback: hosting-agent feedback request + form ─────────────────────
-- When another agent hosts Dana's open house, we send them a feedback request
-- 1 hour before the OH. Their response is stored in oh_feedback, emailed to
-- Dana, and appended to the seller-contact's notes.
--
-- 2026-05-17

CREATE TABLE IF NOT EXISTS oh_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  open_house_id UUID NOT NULL REFERENCES open_houses(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  hosting_agent_name  TEXT,
  hosting_agent_email TEXT,

  status TEXT NOT NULL DEFAULT 'requested',
  -- requested | submitted | expired

  request_sent_at TIMESTAMPTZ,
  request_sent_to TEXT,
  submitted_at    TIMESTAMPTZ,

  buyer_count          INT,
  buyer_interest_level TEXT,   -- high | medium | low | none
  price_feedback       TEXT,   -- too_high | fair | great_deal
  would_show_again     TEXT,   -- yes | maybe | no
  overall_impression   TEXT,
  liked                TEXT,
  concerns             TEXT,
  general_comments     TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oh_feedback_open_house_id_idx ON oh_feedback(open_house_id);
CREATE INDEX IF NOT EXISTS oh_feedback_listing_id_idx    ON oh_feedback(listing_id);
CREATE INDEX IF NOT EXISTS oh_feedback_contact_id_idx    ON oh_feedback(contact_id);
CREATE INDEX IF NOT EXISTS oh_feedback_submitted_at_idx  ON oh_feedback(submitted_at);
CREATE INDEX IF NOT EXISTS oh_feedback_status_idx        ON oh_feedback(status);

-- Auto-update updated_at on UPDATE
CREATE OR REPLACE FUNCTION touch_oh_feedback_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_oh_feedback_updated_at ON oh_feedback;
CREATE TRIGGER trg_oh_feedback_updated_at
  BEFORE UPDATE ON oh_feedback
  FOR EACH ROW EXECUTE FUNCTION touch_oh_feedback_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE oh_feedback ENABLE ROW LEVEL SECURITY;

-- Public form needs to load a single feedback row by uuid (the email link).
-- The UUID itself is the bearer-token here.
CREATE POLICY "anon can read oh_feedback" ON oh_feedback
  FOR SELECT TO anon USING (true);

-- Authenticated users (Dana) can do anything.
CREATE POLICY "authenticated full access oh_feedback" ON oh_feedback
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inserts + updates from the public form go through the submit-oh-feedback
-- edge fn (service role) — anon never writes directly.

-- ─── Track feedback-request fire on open_houses ───────────────────────────
ALTER TABLE open_houses
  ADD COLUMN IF NOT EXISTS feedback_request_sent_at TIMESTAMPTZ;
