-- Lofty webhook receiver scaffold (Dana 2026-05-07: NO Zapier, direct
-- API + webhooks only — but waiting on Lofty support to enable API access
-- on her plan).
--
-- This table captures every webhook POST so the moment Dana pastes our
-- receiver URL into Lofty's settings, we start seeing real payloads. The
-- mapper logic (contacts upsert, lead status sync) ships in a follow-up
-- once we know Lofty's actual schema.
--
-- Applied 2026-05-07 via Management API.

CREATE TABLE IF NOT EXISTS lofty_inbound_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type            TEXT,                    -- e.g. 'lead.created', 'lead.status_changed' (best-effort from payload)
  source_ip             INET,
  headers               JSONB,                   -- relevant headers Lofty sends (signature, request id, etc.)
  raw_payload           JSONB NOT NULL,          -- the entire body as-received
  signature             TEXT,                    -- HMAC or token from headers, if present
  signature_valid       BOOLEAN,                 -- NULL until we know how Lofty signs requests
  processed_at          TIMESTAMPTZ,             -- set when the mapper has handled this row
  processed_action      TEXT,                    -- contact_created | contact_updated | skipped_duplicate | skipped_unknown_event | error
  processed_contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
  error                 TEXT
);

CREATE INDEX IF NOT EXISTS lofty_inbound_events_received_at_idx
  ON lofty_inbound_events(received_at DESC);
CREATE INDEX IF NOT EXISTS lofty_inbound_events_unprocessed_idx
  ON lofty_inbound_events(received_at) WHERE processed_at IS NULL;

COMMENT ON TABLE lofty_inbound_events IS
  'Raw audit log of every webhook POST received from Lofty. Mapping/processing decisions happen separately so we can replay events after the mapper changes.';
COMMENT ON COLUMN lofty_inbound_events.processed_action IS
  'NULL until processed. Then: contact_created | contact_updated | skipped_duplicate | skipped_unknown_event | error';
COMMENT ON COLUMN lofty_inbound_events.signature_valid IS
  'NULL until we know how Lofty signs requests. After we have docs: true if HMAC matches, false if not, NULL if unsigned.';
