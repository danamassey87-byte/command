-- ─────────────────────────────────────────────────────────────────────────────
-- Newsletters — one-shot bulk email sends (separate from drip campaigns)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  name              TEXT NOT NULL,
  subject           TEXT,
  email_blocks      JSONB,
  email_settings    JSONB,
  body              TEXT,                -- plain text fallback
  template_id       TEXT,                -- which starter template was used
  send_via_domain   TEXT DEFAULT 'primary',
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
  scheduled_for     TIMESTAMPTZ,         -- null = not scheduled
  sent_at           TIMESTAMPTZ,
  recipient_filter  JSONB,               -- { segment: 'all', tags: [...], custom_ids: [...] }
  recipient_count   INT DEFAULT 0,
  -- Stats (updated by webhook)
  delivered_count   INT DEFAULT 0,
  opened_count      INT DEFAULT 0,
  clicked_count     INT DEFAULT 0,
  bounced_count     INT DEFAULT 0,
  unsubscribed_count INT DEFAULT 0,
  -- Soft delete
  deleted_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS newsletter_recipients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id     UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  name              TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','opened','clicked','bounced','complained','unsubscribed')),
  resend_email_id   TEXT,
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  open_count        INT DEFAULT 0,
  clicked_at        TIMESTAMPTZ,
  click_count       INT DEFAULT 0,
  bounced_at        TIMESTAMPTZ,
  bounce_type       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS newsletters_status_idx ON newsletters(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS newsletters_scheduled_idx ON newsletters(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS newsletter_recipients_newsletter_idx ON newsletter_recipients(newsletter_id);
CREATE INDEX IF NOT EXISTS newsletter_recipients_contact_idx ON newsletter_recipients(contact_id);
CREATE INDEX IF NOT EXISTS newsletter_recipients_status_idx ON newsletter_recipients(newsletter_id, status);
