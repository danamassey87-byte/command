-- Cross-cutting webhook replay protection (X1 from SECURITY_AUDIT_PUNCHLIST).
--
-- Every webhook receiver (resend-webhook today; lofty-webhook,
-- higgsfield-callback, replicate-notify, canva export-status next) writes
-- the provider's event id here BEFORE acting on the event. Insert collides
-- with the PK on replay → handler short-circuits as "already processed".
--
-- Resend signs with Svix and sends `svix-id` per delivery; Lofty's id will
-- be whatever it ends up exposing (until then we hash the body).
--
-- received_at is for retention sweeps; rows older than 90 days can be
-- purged by a cron without losing protection (Svix's own replay window is
-- only ~5 minutes).
CREATE TABLE IF NOT EXISTS webhook_events_seen (
  provider     TEXT        NOT NULL,
  event_id     TEXT        NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (provider, event_id)
);

-- Retention helper index.
CREATE INDEX IF NOT EXISTS webhook_events_seen_received_at_idx
  ON webhook_events_seen (received_at);

-- RLS: lock down to service role only. The blanket `Allow all` pattern from
-- 20260415_enable_rls_all_tables.sql is the wrong default here (per C1 in the
-- audit). No anon access at all — the table holds operational event IDs only.
ALTER TABLE webhook_events_seen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON webhook_events_seen FROM anon, authenticated;
GRANT  SELECT, INSERT ON webhook_events_seen TO service_role;
