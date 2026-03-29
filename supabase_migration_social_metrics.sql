-- ============================================================================
-- Social Metrics — Weekly platform stats for Social Dashboard
-- Run in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      text NOT NULL,                    -- 'instagram', 'facebook', 'tiktok', etc.
  week_of       date NOT NULL,                    -- Sunday of the metrics week
  followers     integer DEFAULT 0,
  followers_change integer DEFAULT 0,
  reach         integer DEFAULT 0,
  impressions   integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  likes         integer DEFAULT 0,
  comments      integer DEFAULT 0,
  shares        integer DEFAULT 0,
  saves         integer DEFAULT 0,
  posts_count   integer DEFAULT 0,
  -- Platform-specific JSON (stories_views, reels_plays, reviews, rating, clicks, etc.)
  extra         jsonb DEFAULT '{}',
  -- Top posts as JSON array [{type, caption, likes, comments, shares, saves}]
  top_posts     jsonb DEFAULT '[]',
  -- Best posting time as text
  best_time     text,
  -- Source of data
  source        text DEFAULT 'manual',            -- 'manual' | 'apify' | 'api'
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(platform, week_of)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_social_metrics_platform_week
  ON social_metrics(platform, week_of DESC);

-- ============================================================================
-- Social Dashboard Config — stored in user_settings
-- key = 'social_dashboard'
-- value = {
--   "enabled_platforms": ["instagram", "facebook", "tiktok", ...],
--   "platform_config": {
--     "instagram": { "handle": "@wright_mode", "enabled": true },
--     ...
--   }
-- }
-- ============================================================================
