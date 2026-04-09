-- ============================================================================
-- Content Stats & Tracking — adds per-post metrics + links to properties,
-- listings, open houses, and pillars so every post can be tracked and rolled
-- up by pillar / channel / property / client.
-- Safe to run multiple times.
-- ============================================================================

-- ─── content_pieces: ensure tracking columns ────────────────────────────────
ALTER TABLE content_pieces
  ADD COLUMN IF NOT EXISTS channel        TEXT,
  ADD COLUMN IF NOT EXISTS content_type   TEXT,
  ADD COLUMN IF NOT EXISTS launch_day     INTEGER,
  ADD COLUMN IF NOT EXISTS listing_id     UUID REFERENCES listings(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_id    UUID REFERENCES properties(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS open_house_id  UUID REFERENCES open_houses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id     UUID REFERENCES contacts(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order     INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_content_pieces_date          ON content_pieces(content_date);
CREATE INDEX IF NOT EXISTS idx_content_pieces_listing       ON content_pieces(listing_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_property      ON content_pieces(property_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_open_house    ON content_pieces(open_house_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_pillar        ON content_pieces(pillar_id);

-- ─── content_platform_posts: per-post stats columns ────────────────────────
ALTER TABLE content_platform_posts
  ADD COLUMN IF NOT EXISTS views             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stats_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stats_source      TEXT DEFAULT 'manual';

-- Relax the platform check so we can also track blog / pinterest / gmb / threads
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_platform_posts_platform_check'
  ) THEN
    ALTER TABLE content_platform_posts
      DROP CONSTRAINT content_platform_posts_platform_check;
  END IF;
  ALTER TABLE content_platform_posts
    ADD CONSTRAINT content_platform_posts_platform_check
    CHECK (platform IN (
      'instagram','facebook','tiktok','youtube','linkedin','email',
      'twitter','stories','blog','gmb','pinterest','threads','nextdoor'
    ));
END $$;

-- ─── Rollup view: per-piece totals across all platforms ────────────────────
CREATE OR REPLACE VIEW content_piece_stats AS
SELECT
  cp.id,
  cp.title,
  cp.content_date,
  cp.pillar_id,
  cp.channel,
  cp.listing_id,
  cp.property_id,
  cp.open_house_id,
  cp.status,
  COUNT(pp.id)               AS platform_count,
  COALESCE(SUM(pp.views), 0)       AS total_views,
  COALESCE(SUM(pp.reach), 0)       AS total_reach,
  COALESCE(SUM(pp.impressions), 0) AS total_impressions,
  COALESCE(SUM(pp.likes), 0)       AS total_likes,
  COALESCE(SUM(pp.comments), 0)    AS total_comments,
  COALESCE(SUM(pp.shares), 0)      AS total_shares,
  COALESCE(SUM(pp.saves), 0)       AS total_saves,
  COALESCE(SUM(pp.clicks), 0)      AS total_clicks
FROM content_pieces cp
LEFT JOIN content_platform_posts pp ON pp.content_id = cp.id
GROUP BY cp.id;
