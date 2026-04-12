-- ─────────────────────────────────────────────────────────────────────────────
-- AI Campaign Recommendations — Claude-powered optimization suggestions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_ai_recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step_index        INT,                -- null = campaign-level recommendation
  type              TEXT NOT NULL,       -- 'subject_line', 'email_body', 'cta', 'send_time', 'step_order', 'funnel'
  current_value     TEXT,
  suggested_value   TEXT,
  reasoning         TEXT,
  confidence        NUMERIC,            -- 0.0 to 1.0
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','applied','edited','dismissed','snoozed')),
  status_changed_at TIMESTAMPTZ,
  dismissed_until   TIMESTAMPTZ,        -- for snoozed items
  batch_id          TEXT,               -- groups recs from same analysis run
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_recs_campaign_idx ON campaign_ai_recommendations(campaign_id);
CREATE INDEX IF NOT EXISTS ai_recs_status_idx ON campaign_ai_recommendations(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ai_recs_batch_idx ON campaign_ai_recommendations(batch_id);
