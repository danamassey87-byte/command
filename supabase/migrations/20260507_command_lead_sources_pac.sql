-- Migration: Lead Sources + PAC attribution
-- Source: Data Model v2 §lead-sources block · README v2 §17.9 · Acceptance Tests Phase 9
-- Phase: v4 PR-2 (per .command-package/PLAN.md §6).
--
-- Append-only. The hard rule from Acceptance Tests Phase 9: a fee % change
-- must NEVER retroactively modify an already-locked LeadAttribution. The
-- schema enforces this by storing pct as a SNAPSHOT on lead_attributions
-- (not as a JOIN through lead_sources) — so updates to lead_sources.buyer_pct
-- only affect future arrivals, not in-flight contacts.
--
-- Seeds the 7 sources from v4 §1: CertiLeads · ClosingLeads · AtClosing ·
-- Movoto · Realty.com · LeadDeck · FastCashOffers.

-- ───────────────────────────────────────────────────────────────────────────
-- 1 · lead_sources
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_sources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,                  -- url-safe · 'certileads'
  display_name        TEXT NOT NULL,
  cost_model          TEXT NOT NULL,                         -- pay_at_close · monthly_subscription · free · cash_offer_routing
  monthly_fee_cents   INTEGER,                               -- when cost_model = monthly_subscription (e.g. Realty.com $2500 = 250000)
  buyer_pct           NUMERIC(5,2),                          -- % of GCI owed on buyer-side close
  seller_pct          NUMERIC(5,2),                          -- % of GCI owed on seller-side close
  attribution_window  TEXT NOT NULL DEFAULT 'per_deal',      -- per_deal · one_year · two_years · lifetime · none
  who_pays            TEXT NOT NULL DEFAULT 'agent',         -- agent · team · brokerage · split
  intake              JSONB NOT NULL DEFAULT '{}',           -- {method: email_forwarder|api_poll|webhook|csv|manual, config}
  dashboard_url       TEXT,                                  -- vendor's native console
  status              TEXT NOT NULL DEFAULT 'active',        -- active · paused · archived
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_sources_cost_model_chk CHECK (cost_model IN ('pay_at_close','monthly_subscription','free','cash_offer_routing')),
  CONSTRAINT lead_sources_attr_window_chk CHECK (attribution_window IN ('per_deal','one_year','two_years','lifetime','none')),
  CONSTRAINT lead_sources_who_pays_chk CHECK (who_pays IN ('agent','team','brokerage','split')),
  CONSTRAINT lead_sources_status_chk CHECK (status IN ('active','paused','archived'))
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_status ON lead_sources(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_lead_sources_cost_model ON lead_sources(cost_model);

ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all lead_sources" ON lead_sources;
CREATE POLICY "Allow all lead_sources" ON lead_sources FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE lead_sources IS 'PAC and subscription lead sources. Editable in /lead-sources. Changes to buyer_pct/seller_pct only affect FUTURE attributions — existing lead_attributions snapshot the pct at arrival.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2 · lead_attributions
-- ───────────────────────────────────────────────────────────────────────────
-- Link between a Contact and a LeadSource with the fee % LOCKED at arrival.
-- Survives contact re-engagement for the configured attribution window.
CREATE TABLE IF NOT EXISTS lead_attributions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  lead_source_id      UUID NOT NULL REFERENCES lead_sources(id) ON DELETE RESTRICT,
  acquired_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ,                            -- computed from source.attribution_window at insert; null = lifetime
  buyer_pct_locked    NUMERIC(5,2),                           -- snapshot — invariant: source.buyer_pct changes do NOT touch this
  seller_pct_locked   NUMERIC(5,2),                           -- snapshot
  is_primary          BOOLEAN NOT NULL DEFAULT TRUE,          -- which source wins for fee calc when multiple overlap; default = latest-still-valid
  source_lead_id      TEXT,                                   -- vendor's own lead id for reconciliation
  raw_payload         JSONB DEFAULT '{}',                     -- original intake body for audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_attr_contact ON lead_attributions(contact_id, acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_attr_source ON lead_attributions(lead_source_id, acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_attr_active ON lead_attributions(contact_id) WHERE is_primary = TRUE;
-- expires_at is queried at runtime: WHERE expires_at IS NULL OR expires_at > now().
-- A predicate-based partial index can't use now() (not IMMUTABLE), so we keep
-- this as a regular index on (contact_id, expires_at) — covers the same lookups.
CREATE INDEX IF NOT EXISTS idx_lead_attr_expires ON lead_attributions(contact_id, expires_at);
-- Only one primary attribution at a time per contact (partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lead_attr_primary_per_contact ON lead_attributions(contact_id) WHERE is_primary = TRUE;

ALTER TABLE lead_attributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all lead_attributions" ON lead_attributions;
CREATE POLICY "Allow all lead_attributions" ON lead_attributions FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE lead_attributions IS 'Per-contact attribution to a lead source with pct LOCKED at arrival. The Phase-9 invariant: lead_sources.buyer_pct/seller_pct edits do NOT propagate here.';
COMMENT ON COLUMN lead_attributions.buyer_pct_locked IS 'Snapshot of lead_sources.buyer_pct at acquired_at. Never updated by source pct changes.';
COMMENT ON COLUMN lead_attributions.seller_pct_locked IS 'Snapshot of lead_sources.seller_pct at acquired_at. Never updated by source pct changes.';

-- ───────────────────────────────────────────────────────────────────────────
-- 3 · referral_fees
-- ───────────────────────────────────────────────────────────────────────────
-- One row per fee owed on a closed deal. Auto-created from LeadAttribution
-- when a deal moves to "under contract" (status=suggested) and locked on
-- close (status=confirmed). User can override pct/fee with override_reason.
CREATE TABLE IF NOT EXISTS referral_fees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,  -- "deal" in Data Model v2 spec → 'transactions' in existing app
  lead_source_id      UUID NOT NULL REFERENCES lead_sources(id) ON DELETE RESTRICT,
  contact_id          UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  side                TEXT NOT NULL,                          -- buyer · seller
  gci_cents           INTEGER NOT NULL,                       -- agent's expected GCI on this side, in cents
  pct_applied         NUMERIC(5,2) NOT NULL,                  -- effective pct (from lead_attribution snapshot, or override)
  fee_cents           INTEGER NOT NULL,                       -- gci_cents × pct_applied / 100, rounded to cent
  status              TEXT NOT NULL DEFAULT 'suggested',      -- suggested · confirmed · paid · waived · disputed
  override_reason     TEXT,                                   -- required when pct_applied differs from lead_attribution snapshot
  paid_at             TIMESTAMPTZ,
  paid_method         TEXT,                                   -- check · wire · clearing-house · other
  reference           TEXT,                                   -- check #, wire ref, etc.
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at           TIMESTAMPTZ,                            -- set when status moves to confirmed; edits after this require audit_events row
  CONSTRAINT referral_fees_side_chk CHECK (side IN ('buyer','seller')),
  CONSTRAINT referral_fees_status_chk CHECK (status IN ('suggested','confirmed','paid','waived','disputed'))
);

CREATE INDEX IF NOT EXISTS idx_referral_fees_transaction ON referral_fees(transaction_id);
CREATE INDEX IF NOT EXISTS idx_referral_fees_source ON referral_fees(lead_source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_fees_status ON referral_fees(status) WHERE status IN ('suggested','confirmed');
CREATE INDEX IF NOT EXISTS idx_referral_fees_unpaid ON referral_fees(transaction_id) WHERE paid_at IS NULL AND status = 'confirmed';

ALTER TABLE referral_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all referral_fees" ON referral_fees;
CREATE POLICY "Allow all referral_fees" ON referral_fees FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE referral_fees IS 'PAC fee per closed deal. Status pipeline: suggested → confirmed → paid (or waived/disputed). Close action on the deal is gated until status moves out of suggested.';

-- ───────────────────────────────────────────────────────────────────────────
-- 4 · cash_offer_routings (FastCashOffers + future cash-offer vendors)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_offer_routings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id            UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  lead_source_id        UUID REFERENCES lead_sources(id) ON DELETE RESTRICT,  -- usually FastCashOffers
  property_address      TEXT,
  property_id           UUID REFERENCES properties(id) ON DELETE SET NULL,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  sla_due_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  fco_offer_cents       INTEGER,
  fco_offer_at          TIMESTAMPTZ,
  outcome               TEXT NOT NULL DEFAULT 'pending',      -- pending · accepted · declined · expired · withdrawn
  fallback_sequence_id  UUID,                                  -- enrolled on decline; FK target depends on campaigns module shape
  referral_fee_id       UUID REFERENCES referral_fees(id) ON DELETE SET NULL, -- if accepted, links the FCO payout fee
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cash_offer_outcome_chk CHECK (outcome IN ('pending','accepted','declined','expired','withdrawn'))
);

CREATE INDEX IF NOT EXISTS idx_cash_offer_contact ON cash_offer_routings(contact_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_offer_outcome ON cash_offer_routings(outcome) WHERE outcome = 'pending';
CREATE INDEX IF NOT EXISTS idx_cash_offer_sla ON cash_offer_routings(sla_due_at) WHERE outcome = 'pending';

ALTER TABLE cash_offer_routings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all cash_offer_routings" ON cash_offer_routings;
CREATE POLICY "Allow all cash_offer_routings" ON cash_offer_routings FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE cash_offer_routings IS 'Cash-offer-first routing. Submitted to FastCashOffers, 24h SLA. On decline, contact auto-enrolls in fallback (e.g. Traditional list) sequence.';

-- ───────────────────────────────────────────────────────────────────────────
-- 5 · Additive columns on existing tables (per Data Model v2 §lead-sources note)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS primary_attribution_id UUID REFERENCES lead_attributions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_primary_attribution ON contacts(primary_attribution_id) WHERE primary_attribution_id IS NOT NULL;

COMMENT ON COLUMN contacts.primary_attribution_id IS 'Auto-set to the latest is_primary=true lead_attribution. Maintained by app/trigger; nullable when contact has no PAC source.';

-- Existing app uses 'transactions' as the deal-equivalent table. Spec-name
-- "deal" maps to physical 'transactions' here.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS projected_referral_fee_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_referral_fee_cents    INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN transactions.projected_referral_fee_cents IS 'Sum of expected fees from active in-flight LeadAttributions × transaction.expected_gci × pct. Maintained by app on stage transitions. Shown on pipeline cards.';
COMMENT ON COLUMN transactions.actual_referral_fee_cents IS 'Sum of referral_fees with status=confirmed for this transaction. Gates the close action: cannot close while suggested fees remain.';

-- ───────────────────────────────────────────────────────────────────────────
-- 6 · Seed the 7 v1 lead sources
-- ───────────────────────────────────────────────────────────────────────────
-- IMPORTANT: percentages below are reasonable industry defaults pending Dana's
-- confirmation. CertiLeads buyer_pct=30/seller_pct=25 matches the value baked
-- into Acceptance Tests Phase 9. The other PAC vendors use the same shape as
-- placeholders. Realty.com is modeled as a monthly_subscription vendor (no
-- pct) per README §17.9. FastCashOffers uses cost_model=cash_offer_routing.
--
-- Dana should review/edit these in /lead-sources before going live.

INSERT INTO lead_sources (slug, display_name, cost_model, monthly_fee_cents, buyer_pct, seller_pct, attribution_window, who_pays, intake, dashboard_url, notes)
VALUES
  ('certileads', 'CertiLeads', 'pay_at_close', NULL,
   30.00, 25.00, 'per_deal', 'agent',
   '{"method":"email_forwarder","forward_to":"leads+certileads@command.dana.app","parser":"certileads-v1"}'::jsonb,
   'https://certileads.com/dashboard',
   'PAC vendor. Buyer 30% / Seller 25%. Per-deal attribution. Pcts are placeholder — confirm with vendor agreement.'),

  ('closingleads', 'ClosingLeads', 'pay_at_close', NULL,
   30.00, 25.00, 'per_deal', 'agent',
   '{"method":"email_forwarder","forward_to":"leads+closingleads@command.dana.app","parser":"closingleads-v1"}'::jsonb,
   NULL,
   'PAC vendor. Pcts are placeholder — confirm.'),

  ('atclosing', 'AtClosing', 'pay_at_close', NULL,
   30.00, 25.00, 'per_deal', 'agent',
   '{"method":"email_forwarder","forward_to":"leads+atclosing@command.dana.app","parser":"generic-pac-v1"}'::jsonb,
   NULL,
   'PAC vendor. Pcts are placeholder — confirm.'),

  ('movoto', 'Movoto', 'pay_at_close', NULL,
   35.00, 35.00, 'one_year', 'agent',
   '{"method":"api_poll","auth":"bearer","poll_minutes":15,"endpoint_env":"MOVOTO_API_BASE","key_env":"MOVOTO_API_KEY"}'::jsonb,
   'https://agent.movoto.com',
   'PAC vendor with one-year attribution window — re-engaged contacts within 12 mo of arrival still trigger the fee. Pcts are placeholder.'),

  ('realtycom', 'Realty.com', 'monthly_subscription', 250000,
   NULL, NULL, 'none', 'agent',
   '{"method":"webhook","webhook_path":"/api/webhooks/realtycom","secret_env":"REALTYCOM_WEBHOOK_SECRET"}'::jsonb,
   'https://agent.realty.com',
   'Monthly subscription ($2,500/mo). Leads are "free" after the monthly fee — no per-deal pct. Verify monthly_fee_cents reflects current invoice.'),

  ('leaddeck', 'LeadDeck', 'pay_at_close', NULL,
   30.00, 25.00, 'per_deal', 'agent',
   '{"method":"webhook","webhook_path":"/api/webhooks/leaddeck","secret_env":"LEADDECK_WEBHOOK_SECRET"}'::jsonb,
   NULL,
   'PAC vendor. Pcts are placeholder — confirm.'),

  ('fastcashoffers', 'FastCashOffers', 'cash_offer_routing', NULL,
   1.50, NULL, 'per_deal', 'agent',
   '{"method":"webhook+api","submit_endpoint_env":"FCO_SUBMIT_URL","status_endpoint_env":"FCO_STATUS_URL","key_env":"FCO_API_KEY","sla_hours":24,"fallback_sequence":"traditional-list-v1"}'::jsonb,
   'https://fastcashoffers.com/agent',
   'Cash-offer routing. 1.5% on accepted offers. 24h SLA. On decline, fallback to Traditional list sequence. Pct is placeholder — confirm with vendor agreement.')
ON CONFLICT (slug) DO NOTHING;
