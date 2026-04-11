-- ============================================================================
-- Content Composer & Publishing — adds publish queue for Blotato integration,
-- extends content_platform_posts with scheduling/media/hashtag columns.
-- Safe to run multiple times.
-- ============================================================================

-- ─── Extend content_platform_posts ─────────────────────────────────────────
ALTER TABLE content_platform_posts
  ADD COLUMN IF NOT EXISTS media_urls      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS scheduled_for   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blotato_post_id TEXT,
  ADD COLUMN IF NOT EXISTS hashtags        TEXT,
  ADD COLUMN IF NOT EXISTS char_count      INTEGER DEFAULT 0;

-- Relax the status check to include publishing + failed states
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_platform_posts_status_check'
  ) THEN
    ALTER TABLE content_platform_posts
      DROP CONSTRAINT content_platform_posts_status_check;
  END IF;
  ALTER TABLE content_platform_posts
    ADD CONSTRAINT content_platform_posts_status_check
    CHECK (status IN ('draft','scheduled','publishing','published','failed'));
END $$;

CREATE INDEX IF NOT EXISTS idx_cpp_scheduled ON content_platform_posts(scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_cpp_blotato   ON content_platform_posts(blotato_post_id)
  WHERE blotato_post_id IS NOT NULL;

-- ─── Publish Queue ─────────────────────────────────────────────────────────
-- Tracks every Blotato publish/schedule attempt with retry logic.
CREATE TABLE IF NOT EXISTS content_publish_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_post_id  UUID NOT NULL REFERENCES content_platform_posts(id) ON DELETE CASCADE,
  blotato_post_id   TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','uploading_media','publishing','published','failed','cancelled')),
  scheduled_for     TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  error_message     TEXT,
  retry_count       INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pq_status    ON content_publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_pq_scheduled ON content_publish_queue(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pq_platform  ON content_publish_queue(platform_post_id);

-- ─── Add avatar_id to content_pieces ───────────────────────────────────────
ALTER TABLE content_pieces
  ADD COLUMN IF NOT EXISTS avatar_id UUID REFERENCES client_avatars(id) ON DELETE SET NULL;

-- ─── Recreate the rollup view with new columns ────────────────────────────
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
  cp.avatar_id,
  cp.status,
  COUNT(pp.id)                         AS platform_count,
  COALESCE(SUM(pp.views), 0)          AS total_views,
  COALESCE(SUM(pp.reach), 0)          AS total_reach,
  COALESCE(SUM(pp.impressions), 0)    AS total_impressions,
  COALESCE(SUM(pp.likes), 0)          AS total_likes,
  COALESCE(SUM(pp.comments), 0)       AS total_comments,
  COALESCE(SUM(pp.shares), 0)         AS total_shares,
  COALESCE(SUM(pp.saves), 0)          AS total_saves,
  COALESCE(SUM(pp.clicks), 0)         AS total_clicks
FROM content_pieces cp
LEFT JOIN content_platform_posts pp ON pp.content_id = cp.id
GROUP BY cp.id;

-- ─── Add topics column to content_pillars if missing ──────────────────────
ALTER TABLE content_pillars
  ADD COLUMN IF NOT EXISTS topics TEXT[];
