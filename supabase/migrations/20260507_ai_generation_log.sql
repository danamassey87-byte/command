-- Lightweight audit log of every AI inference call (Replicate, Anthropic).
-- Powers the AI Spend dashboard widget so Dana can see month-to-date burn
-- across every model in one place.
--
-- Just cost + service + model + linkage — no payloads, no prompt text
-- bloat. The actual outputs live wherever they're meant to (media_assets
-- for images, content_pieces for text, etc).
--
-- Applied 2026-05-07 via Management API.

CREATE TABLE IF NOT EXISTS ai_generation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service         TEXT NOT NULL,                  -- replicate | anthropic | other
  model           TEXT,
  kind            TEXT,                           -- virtual_staging | generate_image | content_generation | cma_parse | host_report_followup | other
  prompt          TEXT,
  cost_cents      NUMERIC,
  listing_id      UUID REFERENCES listings(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  prediction_id   TEXT,
  succeeded       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generation_log_created_at_idx
  ON ai_generation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_generation_log_service_idx
  ON ai_generation_log(service, created_at DESC);

COMMENT ON TABLE ai_generation_log IS
  'Audit log of every AI inference call (Replicate, Anthropic, etc). Powers the AI Spend dashboard widget. Lightweight: cost + service + model only, no payloads.';
COMMENT ON COLUMN ai_generation_log.service IS
  'replicate | anthropic | other';
COMMENT ON COLUMN ai_generation_log.kind IS
  'virtual_staging | generate_image | content_generation | cma_parse | host_report_followup | other';
