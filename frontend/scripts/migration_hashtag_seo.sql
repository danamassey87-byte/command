-- ============================================================================
-- Hashtag Bank + SEO/AEO Keyword Tracker
-- Safe to run multiple times.
-- ============================================================================

-- ─── Hashtag Groups ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hashtag_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general'
                CHECK (category IN ('niche','location','listing','general','trending','seasonal')),
  color       TEXT DEFAULT '#b79782',
  hashtags    TEXT[] NOT NULL DEFAULT '{}',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hashtag_groups_cat ON hashtag_groups(category);

-- ─── Hashtag Performance (aggregated from post stats) ──────────────────────
CREATE TABLE IF NOT EXISTS hashtag_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag         TEXT NOT NULL,
  platform        TEXT NOT NULL,
  times_used      INTEGER DEFAULT 0,
  avg_reach       NUMERIC(10,2) DEFAULT 0,
  avg_engagement  NUMERIC(10,2) DEFAULT 0,
  best_post_id    UUID REFERENCES content_pieces(id) ON DELETE SET NULL,
  last_used_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hashtag, platform)
);

CREATE INDEX IF NOT EXISTS idx_hashtag_perf_eng ON hashtag_performance(avg_engagement DESC);
CREATE INDEX IF NOT EXISTS idx_hashtag_perf_plat ON hashtag_performance(platform);

-- ─── SEO / AEO Keywords ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seo_keywords (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'seo'
                  CHECK (category IN ('seo','aeo','local','long_tail')),
  priority      TEXT DEFAULT 'medium'
                  CHECK (priority IN ('high','medium','low')),
  times_used    INTEGER DEFAULT 0,
  target_pages  TEXT[],
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_kw_cat ON seo_keywords(category);
CREATE INDEX IF NOT EXISTS idx_seo_kw_pri ON seo_keywords(priority);

-- ─── Junction: keywords linked to content pieces ──────────────────────────
CREATE TABLE IF NOT EXISTS content_keywords (
  content_id  UUID NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  keyword_id  UUID NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, keyword_id)
);

-- ─── Seed: starter hashtag groups for real estate ─────────────────────────
INSERT INTO hashtag_groups (name, category, color, hashtags, sort_order) VALUES
  ('East Valley AZ', 'location', '#5a87b4', ARRAY['gilbertaz','eastvalleyaz','mesaaz','queencreekaz','chandleraz','santanvalley','apachejunction','azrealestate','arizonaliving','phoenixmetro'], 1),
  ('Real Estate General', 'general', '#b79782', ARRAY['realestate','realtor','homesforsale','realtorlife','househunting','dreamhome','homesweethome','newhome','justlisted','justsold'], 2),
  ('Listing Posts', 'listing', '#c99a2e', ARRAY['justlisted','newlisting','openhouse','homeforsale','luxurylisting','priceimproved','comingsoon','undercontract','pending','sold'], 3),
  ('Market Authority', 'niche', '#6a9e72', ARRAY['marketupdate','realestatetips','homebuying101','sellingyourhome','realestateexpert','housingmarket','interestrates','homebuyertips','sellertips','firsttimehomebuyer'], 4),
  ('Community & Lifestyle', 'niche', '#c0604a', ARRAY['gilbertlife','azliving','eastvalleyliving','localaz','arizonalife','communitylove','localbusiness','supportlocal','smallbiz','neighborhoodguide'], 5)
ON CONFLICT DO NOTHING;

-- ─── Seed: starter SEO keywords ───────────────────────────────────────────
INSERT INTO seo_keywords (keyword, category, priority, notes) VALUES
  ('homes for sale in Gilbert AZ', 'seo', 'high', 'Primary geo keyword'),
  ('Gilbert AZ real estate agent', 'seo', 'high', 'Agent branding'),
  ('East Valley AZ homes', 'seo', 'high', 'Broader geo'),
  ('best neighborhoods in Gilbert', 'local', 'medium', 'Blog/content topic'),
  ('first time home buyer Gilbert AZ', 'long_tail', 'medium', 'Buyer avatar target'),
  ('how to sell your home fast', 'aeo', 'high', 'Answer Engine — featured snippet target'),
  ('what is a home appraisal', 'aeo', 'medium', 'Answer Engine — common question'),
  ('Gilbert AZ market update', 'seo', 'high', 'Monthly content keyword'),
  ('luxury homes East Valley', 'long_tail', 'low', 'Premium segment'),
  ('moving to Arizona guide', 'aeo', 'medium', 'Relocation buyer avatar')
ON CONFLICT DO NOTHING;
