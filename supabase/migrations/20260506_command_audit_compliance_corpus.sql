-- Migration: audit_events · compliance_overrides · compliance_rules (AZ corpus)
-- Source: Data Model v2 §audit, AZ Compliance Rules §3+§5
-- Phase: v4 Phase 0 / 5 prerequisite — every advertising claim is gated by the
-- compliance pipeline. Before today, ComplianceCheck.jsx ran a thin client-side
-- regex; now we have the schema for the real RAG-grounded gate + override audit.
--
-- Append-only. No drops. RLS turned on with a permissive single-tenant policy
-- (matches the pattern in 20260415_enable_rls_all_tables.sql + Phase 1 core).

-- ───────────────────────────────────────────────────────────────────────────
-- 1 · audit_events
-- ───────────────────────────────────────────────────────────────────────────
-- Every mutation. Append-only. Indexed for replay. From Data Model v2 §audit.
-- We log to both audit_events (hot, queryable) and (eventually) R2 cold storage
-- on a 7-day rollover, but that's a future job — for now Postgres is enough.

CREATE TABLE IF NOT EXISTS audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID,                                -- user.id when human; null when system
  actor_kind    TEXT NOT NULL DEFAULT 'user',        -- user · system · integration
  target_kind   TEXT NOT NULL,                       -- 'contact' · 'deal' · 'compliance_check' · etc.
  target_id     UUID,                                -- nullable: bulk ops, system-level
  action        TEXT NOT NULL,                       -- 'create' · 'update' · 'delete' · 'override' · 'export' · etc.
  diff          JSONB DEFAULT '{}',                  -- {before: {...}, after: {...}}
  ip            INET,
  user_agent    TEXT,
  anomaly_score NUMERIC(4,3),                        -- nullable; flagged when ≥ 0.7
  at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_kind, target_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor  ON audit_events(actor_id, at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_events_at     ON audit_events(at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_anomaly ON audit_events(anomaly_score DESC) WHERE anomaly_score IS NOT NULL;

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all audit_events" ON audit_events;
CREATE POLICY "Allow all audit_events" ON audit_events FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE audit_events IS 'Append-only audit trail. Every mutation across the app. 90-day retention; older rows roll to R2.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2 · compliance_overrides
-- ───────────────────────────────────────────────────────────────────────────
-- Separate audit table for BLOCK-verdict overrides — per AZ Compliance Rules §5.
-- Sits alongside compliance_checks.override_reason (which captures the latest
-- override inline). This table preserves the full chain of overrides if Dana
-- amends a reason or a broker reviewer adds a follow-up note.

CREATE TABLE IF NOT EXISTS compliance_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id        UUID NOT NULL REFERENCES compliance_checks(id) ON DELETE CASCADE,
  overridden_by   UUID,                              -- auth.users.id when known
  reason          TEXT NOT NULL,
  broker_notified BOOLEAN NOT NULL DEFAULT TRUE,     -- always posts to #compliance Slack
  broker_approved BOOLEAN,                           -- nullable until broker reacts (when policy = 'require-broker')
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_overrides_check ON compliance_overrides(check_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_overrides_pending ON compliance_overrides(broker_approved) WHERE broker_approved IS NULL;

ALTER TABLE compliance_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all compliance_overrides" ON compliance_overrides;
CREATE POLICY "Allow all compliance_overrides" ON compliance_overrides FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE compliance_overrides IS 'Audit trail of every BLOCK-verdict override. Append-only. Mirrors compliance_checks.override_reason inline field and adds broker-approval state.';

-- ───────────────────────────────────────────────────────────────────────────
-- 3 · compliance_rules — AZ rule corpus (deterministic checks)
-- ───────────────────────────────────────────────────────────────────────────
-- Stores the 12 AZ-ADV-001..012 rules in queryable form. The compliance edge
-- function uses these for the deterministic regex/structural checks BEFORE
-- the more expensive RAG + Sonnet call (which retrieves from pgvector embeddings
-- of the full ADRE Law Book / advertising guidance / Dec 2025 revisions PDFs).
--
-- Authoritative source: ship/AZ Compliance Rules.html §3.

CREATE TABLE IF NOT EXISTS compliance_rules (
  id            TEXT PRIMARY KEY,                    -- 'AZ-ADV-001' etc.
  jurisdiction  TEXT NOT NULL DEFAULT 'AZ',          -- 'AZ' · 'federal' · 'real-broker'
  citation      TEXT,                                -- 'R4-28-502' · 'RESPA §8' · etc.
  title         TEXT NOT NULL,
  rule_text     TEXT NOT NULL,
  applies_to    TEXT[],                              -- 'social' · 'reel-caption' · 'email' · etc.
  default_verdict TEXT NOT NULL DEFAULT 'block',     -- pass · warn · block
  detector      JSONB,                               -- {kind: 'regex', pattern: '/.../i'} or {kind: 'llm', prompt_key: '...'}
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  effective_at  DATE,                                -- 2025-12-13 for the revision rules
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_active ON compliance_rules(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_compliance_rules_jurisdiction ON compliance_rules(jurisdiction);

ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all compliance_rules" ON compliance_rules;
CREATE POLICY "Allow all compliance_rules" ON compliance_rules FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE compliance_rules IS 'AZ ADRE rule corpus + federal overlay. Deterministic checks. RAG over ingested PDFs adds context; this table is the authoritative rule list.';

-- Seed the 12 AZ rules from ship/AZ Compliance Rules.html
-- Use IF NOT EXISTS pattern so re-running the migration is safe.
INSERT INTO compliance_rules (id, jurisdiction, citation, title, rule_text, applies_to, default_verdict, detector, effective_at)
VALUES
  ('AZ-ADV-001', 'AZ', 'A.A.C. R4-28-502',
   'Clear & prominent broker name',
   'All advertising must display the employing broker''s legal name or registered DBA in a clear and prominent manner.',
   ARRAY['social','reel-caption','story','carousel','email','listing-description','bio-link','yard-sign','mailer','flyer'],
   'block',
   '{"kind":"presence","field":"settings.broker_legal_name","scope":"first_view_frame"}'::jsonb,
   '2025-12-13'),

  ('AZ-ADV-002', 'AZ', 'Dec 13 2025 revision',
   'No-scroll, no-expand visibility',
   'Broker identification may not be placed in a region that requires scrolling, tapping "more," or clicking through. On Instagram captions the broker name must appear before the ~125-character truncation point.',
   ARRAY['social','reel-caption','story','carousel'],
   'block',
   '{"kind":"position","platforms":["instagram","tiktok","facebook"],"max_chars_before_broker":125}'::jsonb,
   '2025-12-13'),

  ('AZ-ADV-003', 'AZ', 'Dec 13 2025 revision',
   'AI-generated ads are regulated',
   'AI-generated and AI-assisted advertising falls under R4-28-502. Designated brokers may be held responsible for AI-generated content under their supervision.',
   ARRAY['social','reel-caption','email','listing-description','bio-link','flyer'],
   'warn',
   '{"kind":"meta","field":"author","value":"ai-drafted"}'::jsonb,
   '2025-12-13'),

  ('AZ-ADV-004', 'AZ', 'A.R.S. Title 32 Ch. 20',
   'Owner permission required for property ads',
   'Owner permission is required before placing signs or advertising a specific property. Applies to listing teasers, "coming soon" posts, drone footage, and open-house promos.',
   ARRAY['social','reel-caption','story','flyer','yard-sign','listing-description'],
   'block',
   '{"kind":"reference_check","field":"property.listing_agreement.advertising_consent","required":true}'::jsonb,
   NULL),

  ('AZ-ADV-005', 'AZ', 'A.R.S. Title 32 Ch. 20',
   'Special disclosures when advertising another agent''s listing',
   'Special disclosures apply when advertising another licensee''s listings or transaction history. Posting another agent''s listing as if it''s yours, or claiming a sale you cooperated on without proper disclosure, is a violation.',
   ARRAY['social','reel-caption','story','email','listing-description'],
   'block',
   '{"kind":"regex_with_context","pattern":"my (new |latest )?listing|just sold|just listed","negate_when_role":"listing_agent"}'::jsonb,
   NULL),

  ('AZ-ADV-006', 'AZ', 'A.R.S. § 32-2153',
   'No false or misleading claims',
   'Agents may not make false, misleading, or deceptive statements. Includes unverifiable superlatives ("#1 agent in Scottsdale"), value guarantees, and timeline promises without substantiation.',
   ARRAY['social','reel-caption','story','email','listing-description','bio-link','flyer','yard-sign'],
   'block',
   '{"kind":"regex","pattern":"guarantee(d)?|#1|top \\d+|no\\.? ?1|fastest|best in|only agent","flags":"i"}'::jsonb,
   NULL),

  ('AZ-ADV-007', 'AZ', 'Dec 13 2025 revision',
   'Material adverse facts disclosure (expanded)',
   'Disclosure duties extend beyond clients. Material adverse facts must be disclosed even if not technical property defects.',
   ARRAY['social','listing-description','flyer','email'],
   'warn',
   '{"kind":"reference_check","field":"property.disclosures.material_facts","require_referenced_in_content":true}'::jsonb,
   '2025-12-13'),

  ('AZ-ADV-008', 'federal', 'Fair Housing Act',
   'Fair Housing Act compliance',
   'No preference, limitation, or discrimination based on race, color, religion, sex (including gender identity and sexual orientation per HUD), familial status, national origin, or disability.',
   ARRAY['social','reel-caption','story','carousel','email','listing-description','bio-link','flyer','yard-sign','mailer'],
   'block',
   '{"kind":"classifier","model":"fair-housing","threshold":0.7,"common_traps":["great for young families","walking distance to","exclusive","traditional","safe neighborhood"]}'::jsonb,
   NULL),

  ('AZ-ADV-009', 'federal', 'RESPA §8',
   'No kickbacks or referral fees for settlement services',
   'RESPA §8 prohibits giving or receiving a thing of value for the referral of settlement service business. No cash rebates, gift cards, or credits for referrals to lenders, title, inspectors, or escrow.',
   ARRAY['social','reel-caption','email','bio-link','flyer','mailer'],
   'block',
   '{"kind":"regex_with_vendor","pattern":"refer(ral)?.*(fee|reward|cash|\\$\\d|credit|gift card)","flags":"i","vendor_categories":["lender","title","inspector","appraiser","escrow"]}'::jsonb,
   NULL),

  ('AZ-ADV-010', 'AZ', 'A.A.C. R4-28-502',
   'Testimonial truthfulness',
   'Testimonials must be truthful, represent actual client experience, and cannot be fabricated or materially edited. If implying typical results, those results must be substantiated.',
   ARRAY['social','reel-caption','email','listing-description','bio-link'],
   'warn',
   '{"kind":"reference_check","field":"testimonials.source_id","require_signed_release":true}'::jsonb,
   NULL),

  ('AZ-ADV-011', 'AZ', 'A.A.C. R4-28-502',
   'Team names must comply',
   'Team names cannot obscure or replace the employing broker''s identification. The team name must appear with broker identification in the same frame.',
   ARRAY['social','reel-caption','story','carousel','email','listing-description','bio-link','flyer','yard-sign','mailer'],
   'block',
   '{"kind":"team_name_with_broker","team_field":"settings.team_name","broker_field":"settings.broker_legal_name"}'::jsonb,
   '2025-12-13'),

  ('AZ-ADV-012', 'AZ', 'A.R.S. § 32-2122',
   'Cross-state advertising clarity',
   'Licensees may only advertise the purchase, sale, or lease of Arizona property if licensed in Arizona. Out-of-state geographic targeting may surface a jurisdictional question.',
   ARRAY['social','reel-caption','email','listing-description','bio-link','mailer'],
   'warn',
   '{"kind":"jurisdiction","licensed_states_field":"settings.licensed_states","detect_geo_in_copy":true}'::jsonb,
   NULL)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 4 · cost_ledger budget cap defaults
-- ───────────────────────────────────────────────────────────────────────────
-- Pre-create the current-month rows for the services we know about, with the
-- README §12 default of $600/mo total split sensibly. Idempotent — only
-- inserts if (service, month) doesn't already exist (UNIQUE constraint
-- enforces that anyway).
INSERT INTO cost_ledger (service, month, amount, source, budget_cap)
VALUES
  ('anthropic',     date_trunc('month', now())::date, 0, 'api', 400.00),
  ('openai',        date_trunc('month', now())::date, 0, 'api',  50.00),
  ('elevenlabs',    date_trunc('month', now())::date, 0, 'api',  20.00),
  ('openweathermap',date_trunc('month', now())::date, 0, 'api',  10.00),
  ('resend',        date_trunc('month', now())::date, 0, 'api',  20.00),
  ('twilio',        date_trunc('month', now())::date, 0, 'api',  30.00),
  ('total',         date_trunc('month', now())::date, 0, 'api', 600.00)
ON CONFLICT (service, month) DO NOTHING;

COMMENT ON COLUMN cost_ledger.budget_cap IS 'Hard monthly cap. 80% → #system warn, 95% → #system @dana, 100% → reject new requests. README §12.';
