-- ============================================================================
-- Command Phase 1 · Core new tables
-- Additive only — no drops, no renames, no breaking changes.
-- ============================================================================

-- ─── Interactions (unified contact timeline) ─────────────────────────────────
-- Replaces the limited communication_log as the canonical activity stream.
-- communication_log is NOT dropped — it stays for backwards-compat reads.
CREATE TABLE IF NOT EXISTS interactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE,
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  deal_id       UUID REFERENCES transactions(id) ON DELETE SET NULL,
  kind          TEXT NOT NULL,
    -- call · text · email-sent · email-open · email-click · showing
    -- oh-signin · form-fill · note · slack-post · transact-milestone
  channel       TEXT,
    -- gmail · resend · imessage · lofty · command · slack · transact
    -- bio-link · oh-kiosk
  body          TEXT,
  metadata      JSONB DEFAULT '{}',
  at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_id      UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interactions_contact    ON interactions(contact_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_property   ON interactions(property_id, at DESC) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_deal       ON interactions(deal_id, at DESC) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_kind       ON interactions(kind);
CREATE INDEX IF NOT EXISTS idx_interactions_at         ON interactions(at DESC);

-- ─── Checklist system ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
    -- oh · listing · buyer · expired · seller-consult · vendor · content · onboarding
  steps         JSONB NOT NULL DEFAULT '[]',
    -- Each step: {id, label, section, order, system, mirror_rule?, asset_ref?, deep_link?, offset_days?}
    -- system: command · transact · lofty · blotato · slack · resend · mls
  version       INT NOT NULL DEFAULT 1,
  owner_id      UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS checklist_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  parent_kind   TEXT NOT NULL,   -- oh · deal · listing · property
  parent_id     UUID NOT NULL,
  step_states   JSONB NOT NULL DEFAULT '{}',
    -- {step_id: {done: bool, done_at: timestamp, source: text}}
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  owner_id      UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_runs_parent ON checklist_runs(parent_kind, parent_id);
CREATE INDEX IF NOT EXISTS idx_checklist_runs_template ON checklist_runs(template_id);

-- ─── Synced system state ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lofty_sync_state (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind   TEXT NOT NULL,   -- contact · tag · note
  entity_id     UUID NOT NULL,
  lofty_id      TEXT NOT NULL,
  last_pulled   TIMESTAMPTZ,
  last_pushed   TIMESTAMPTZ,
  conflict      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_kind, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_lofty_sync_conflict ON lofty_sync_state(entity_kind) WHERE conflict IS NOT NULL;

CREATE TABLE IF NOT EXISTS transact_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   TEXT NOT NULL UNIQUE,
  deal_id       UUID REFERENCES transactions(id) ON DELETE SET NULL,
  milestones    JSONB DEFAULT '[]',
  documents     JSONB DEFAULT '[]',
  last_synced   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transact_files_deal ON transact_files(deal_id);

CREATE TABLE IF NOT EXISTS notification_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source              TEXT NOT NULL,
    -- transact · studio · bio-link · oh-kiosk · compliance · cost-guard
    -- sentry · kpi · lofty · weather
  event               TEXT NOT NULL,
  destination         TEXT NOT NULL,         -- channel name or template
  payload_template    JSONB DEFAULT '{}',    -- Slack Block Kit
  interactive_actions JSONB DEFAULT '[]',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  owner_id            UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, event)
);

CREATE TABLE IF NOT EXISTS blotato_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id       TEXT UNIQUE,
  content_piece_id  UUID REFERENCES content_pieces(id) ON DELETE SET NULL,
  scheduled_for     TIMESTAMPTZ,
  platforms         TEXT[] DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'queued',
    -- queued · scheduled · posted · failed
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weather_forecasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast      JSONB NOT NULL,
  prep_flags    JSONB DEFAULT '[]',
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, forecast_date)
);

-- ─── Admin / observability ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service       TEXT NOT NULL,
  month         DATE NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  source        TEXT NOT NULL DEFAULT 'manual',   -- api · manual
  budget_cap    NUMERIC(12,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service, month)
);

CREATE TABLE IF NOT EXISTS system_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'info',    -- info · warn · err
  source        TEXT,
  body          TEXT,
  metadata      JSONB DEFAULT '{}',
  auto_recovered BOOLEAN DEFAULT false,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_source   ON system_events(source, created_at DESC);

CREATE TABLE IF NOT EXISTS background_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  schedule      TEXT,                            -- cron expression
  last_run      TIMESTAMPTZ,
  next_run      TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'ok',      -- ok · warn · err · syncing
  result        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_checks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind   TEXT NOT NULL,
  target_id     UUID NOT NULL,
  verdict       TEXT NOT NULL DEFAULT 'pass',    -- pass · warn · block
  rules_cited   JSONB DEFAULT '[]',
  override_reason TEXT,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_target ON compliance_checks(target_kind, target_id);
CREATE INDEX IF NOT EXISTS idx_compliance_verdict ON compliance_checks(verdict) WHERE verdict != 'pass';

-- ─── Media assets (content studio) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL,   -- clip · photo · audio · graphic · voiceover
  storage_url   TEXT NOT NULL,   -- Supabase Storage URL (not R2)
  thumbnail_url TEXT,
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  duration      NUMERIC,
  width         INT,
  height        INT,
  file_size     INT,
  tags          TEXT[] DEFAULT '{}',
  moods         TEXT[] DEFAULT '{}',
  ai_score      NUMERIC(3,2),
  shot_at       TIMESTAMPTZ,
  location      JSONB,          -- {lat, lng}
  owner_id      UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_media_assets_property ON media_assets(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_kind     ON media_assets(kind);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Match existing pattern: enable RLS with permissive "allow all" policies
-- (single-tenant app, real restrictions come later with Auth + team)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'interactions', 'checklist_templates', 'checklist_runs',
    'lofty_sync_state', 'transact_files', 'notification_rules',
    'blotato_posts', 'weather_forecasts',
    'cost_ledger', 'system_events', 'background_jobs', 'compliance_checks',
    'media_assets'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Allow all %1$s" ON %1$I FOR ALL USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END$$;
