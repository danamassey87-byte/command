-- ============================================================================
-- Command v2 · Feature module tables
-- 8 modules: Relationships+ · Home-value · Team · SEO/AEO · Reviews
--            Print · Expired/FSBO · Post-close
-- ============================================================================

-- ─── Module 1: Relationships+ ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
    -- ig · fb · tt · li · x · yt · threads · pin · nd
  handle          TEXT,
  url             TEXT,
  following       BOOLEAN,        -- does Dana follow them
  follower        BOOLEAN,        -- do they follow Dana
  friend          BOOLEAN,        -- mutual where applicable
  verified        BOOLEAN DEFAULT false,
  match_source    TEXT DEFAULT 'manual',  -- ai-suggested · paste-url · manual · api
  last_activity_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, platform)
);

CREATE TABLE IF NOT EXISTS family_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  to_contact_id   UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
    -- spouse · partner · kid · parent · sibling · pet · co-buyer · extended
  since           DATE,
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_contact_id, to_contact_id, kind)
);

CREATE TABLE IF NOT EXISTS life_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
    -- birthday · anniversary · closing-anniv · kid-milestone · job-change
    -- baby · move · other
  occurs_on       DATE NOT NULL,
  recurring       BOOLEAN DEFAULT false,
  source          TEXT DEFAULT 'manual',
    -- contact-field · social-signal · transact · manual
  suggested_touch JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_events_date ON life_events(occurs_on);
CREATE INDEX IF NOT EXISTS idx_life_events_contact ON life_events(contact_id);

-- ─── Module 2: Home-value microsite ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seller_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  timeframe       TEXT,           -- now · 3mo · 6mo · 12mo · just-curious
  readiness_score NUMERIC(5,2),   -- 0–100
  signal_timeline JSONB DEFAULT '[]',
  drip_run_id     UUID,
  status          TEXT NOT NULL DEFAULT 'new',
    -- new · nurturing · hot · converted-to-deal · cold · unsubscribed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS valuations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  seller_lead_id  UUID REFERENCES seller_leads(id) ON DELETE SET NULL,
  avm_zillow      INT,
  avm_redfin      INT,
  avm_realtor     INT,
  avm_attom       INT,
  blend_midpoint  INT,
  blend_low       INT,
  blend_high      INT,
  human_adjusts   JSONB DEFAULT '[]',
  comps_used      UUID[] DEFAULT '{}',
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS microsite_drips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  branch          TEXT NOT NULL,  -- now · 3-6mo · curious
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS microsite_drip_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drip_id         UUID NOT NULL REFERENCES microsite_drips(id) ON DELETE CASCADE,
  step_order      INT NOT NULL,
  channel         TEXT NOT NULL,  -- email · sms · postcard · call-task
  offset_days     INT NOT NULL,
  template_ref    TEXT,
  pause_if        JSONB,          -- {replied, unsubscribed, deal-opened}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS microsite_drip_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_lead_id  UUID NOT NULL REFERENCES seller_leads(id) ON DELETE CASCADE,
  drip_id         UUID NOT NULL REFERENCES microsite_drips(id) ON DELETE CASCADE,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  step_states     JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Module 5: Reviews & referrals ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES transactions(id) ON DELETE SET NULL,
  platforms_asked TEXT[] DEFAULT '{}',
  sent_at         TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'queued',
    -- queued · sent · completed · declined · bounced
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  platform        TEXT NOT NULL,
  external_id     TEXT,
  url             TEXT,
  rating          SMALLINT,
  body            TEXT,
  posted_at       TIMESTAMPTZ,
  verified_at     TIMESTAMPTZ,
  sentiment_score NUMERIC(3,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_contact_id   UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referred_contact_id   UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id               UUID REFERENCES transactions(id) ON DELETE SET NULL,
  source                TEXT DEFAULT 'spontaneous',
    -- asked · spontaneous · bio-link · review-thread
  status                TEXT NOT NULL DEFAULT 'pending',
    -- pending · confirmed · rejected
  attributed_gci        NUMERIC(12,2),
  thank_you_sent_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Module 6: Print & delivery ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS print_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                  TEXT NOT NULL,  -- postcard · letter · handwritten-note · popby-tag
  provider              TEXT,           -- thanks-io · handwrytten · sendoso
  template_ref          TEXT,
  merge_data            JSONB DEFAULT '{}',
  recipient_contact_ids UUID[] DEFAULT '{}',
  cost_cents            INT,
  provider_order_id     TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',
    -- draft · submitted · printing · mailed · delivered · failed
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  print_order_id    UUID NOT NULL REFERENCES print_orders(id) ON DELETE CASCADE,
  contact_id        UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  address_validated BOOLEAN DEFAULT false,
  validation_errors JSONB,
  tracking_id       TEXT,
  mailed_at         TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Module 7: Expired + FSBO prospecting ───────────────────────────────────

CREATE TABLE IF NOT EXISTS expired_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  data_source     TEXT DEFAULT 'manual',
    -- vulcan · redx · landvoice · mls-expired · manual
  listed_price    INT,
  days_on_market  INT,
  withdrawn_at    TIMESTAMPTZ,
  cadence_step    INT DEFAULT 0,
  next_touch_at   TIMESTAMPTZ,
  dnc_checked     BOOLEAN DEFAULT false,
  dnc_result      TEXT,           -- clear · flagged · blocked
  status          TEXT NOT NULL DEFAULT 'new',
    -- new · contacted · appt-set · converted · dead
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fsbo_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  data_source     TEXT DEFAULT 'manual',
  listed_price    INT,
  days_on_market  INT,
  cadence_step    INT DEFAULT 0,
  next_touch_at   TIMESTAMPTZ,
  dnc_checked     BOOLEAN DEFAULT false,
  dnc_result      TEXT,
  status          TEXT NOT NULL DEFAULT 'new',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_outcomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_kind       TEXT NOT NULL,  -- expired · fsbo
  lead_id         UUID NOT NULL,
  dialed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_sec    INT,
  outcome         TEXT NOT NULL,
    -- connected · voicemail · no-answer · wrong · dnc-request · appt-set · hangup
  transcript_url  TEXT,
  coach_notes     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_outcomes_lead ON call_outcomes(lead_kind, lead_id);

-- ─── Module 8: Post-close · Client for life ─────────────────────────────────

CREATE TABLE IF NOT EXISTS client_for_life_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id         UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  cadence_template TEXT NOT NULL DEFAULT '5-year-standard',
    -- 5-year-standard · investor · sphere-vip
  status          TEXT NOT NULL DEFAULT 'active',
    -- active · paused · completed · opted-out
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_close_touches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID NOT NULL REFERENCES client_for_life_plans(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
    -- email · call-task · print · gift · review-ask · referral-ask
  scheduled_for   TIMESTAMPTZ NOT NULL,
  executed_at     TIMESTAMPTZ,
  outcome         TEXT,           -- done · skipped · auto-paused
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_close_touches_scheduled ON post_close_touches(scheduled_for)
  WHERE executed_at IS NULL;

-- ─── RLS for all v2 tables ──────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_profiles', 'family_links', 'life_events',
    'seller_leads', 'valuations',
    'microsite_drips', 'microsite_drip_steps', 'microsite_drip_runs',
    'review_requests', 'reviews', 'referrals',
    'print_orders', 'delivery_batches',
    'expired_leads', 'fsbo_leads', 'call_outcomes',
    'client_for_life_plans', 'post_close_touches'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Allow all %1$s" ON %1$I FOR ALL USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END$$;
