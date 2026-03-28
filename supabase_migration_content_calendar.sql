-- ─── Content Pillars ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_pillars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#b79782',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Content Pieces ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_pieces (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  pillar_id    UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
  content_date DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'idea'
                 CHECK (status IN ('idea','draft','scheduled','published')),
  body_text    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── Content Platform Posts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_platform_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id   UUID NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL
                 CHECK (platform IN ('instagram','facebook','tiktok','youtube','linkedin','email','twitter','stories')),
  adapted_text TEXT,
  post_url     TEXT,
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','scheduled','published')),
  posted_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (content_id, platform)
);

-- ─── User Settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Seed: Default Content Pillars ─────────────────────────────────────────────
INSERT INTO content_pillars (name, description, color, sort_order) VALUES
  ('Market Updates',        'Stats, trends, market reports, predictions',              '#5a87b4', 1),
  ('Client Stories',        'Testimonials, success stories, buyer/seller journeys',    '#6a9e72', 2),
  ('Home Tips',             'Staging, buying/selling tips, home care advice',          '#c99a2e', 3),
  ('Behind the Scenes',     'Open houses, showings, daily agent life',                 '#b79782', 4),
  ('Personal Brand',        'Who I am, values, community involvement',                 '#c0604a', 5),
  ('Investment Insights',   'Investor content, ROI, market analysis',                  '#7a6b8a', 6),
  ('Neighborhood Spotlight','Local area features, restaurants, schools, lifestyle',    '#4a9a8a', 7)
ON CONFLICT DO NOTHING;

-- ─── Seed: Content Settings (Business Brain URL + active platforms) ────────────
INSERT INTO user_settings (key, value) VALUES (
  'content_settings',
  '{"business_brain_url": "https://docs.google.com/document/d/1V33_23kTyLOho8fYpEEQww9r0eFlxsFp/edit", "active_platforms": ["instagram","facebook","tiktok","email"]}'
) ON CONFLICT (key) DO NOTHING;
