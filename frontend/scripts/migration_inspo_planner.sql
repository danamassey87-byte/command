-- ============================================================================
-- Inspo Bank + Content Planner Slots (Supabase migration)
-- Safe to run multiple times.
-- ============================================================================

-- ─── Inspo Bank ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspo_bank (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url        TEXT,
  source_platform   TEXT,
  source_caption    TEXT,
  source_image_url  TEXT,
  ai_analysis       TEXT,
  recreated_text    TEXT,
  target_platform   TEXT,
  avatar_id         UUID REFERENCES client_avatars(id) ON DELETE SET NULL,
  pillar_id         UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
  tags              TEXT[] DEFAULT '{}',
  used              BOOLEAN DEFAULT false,
  content_piece_id  UUID REFERENCES content_pieces(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspo_platform ON inspo_bank(source_platform);
CREATE INDEX IF NOT EXISTS idx_inspo_used     ON inspo_bank(used);

-- ─── Content Planner Slots (replaces localStorage) ────────────────────────
CREATE TABLE IF NOT EXISTS content_planner_slots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date         DATE NOT NULL,
  slot_type         TEXT NOT NULL CHECK (slot_type IN ('story','reel','carousel')),
  topic             TEXT,
  hook              TEXT,
  caption           TEXT,
  hashtags          TEXT,
  keywords          TEXT,
  link              TEXT,
  manychat_keyword  TEXT,
  canva_link        TEXT,
  notes             TEXT,
  pillar_id         UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
  avatar_id         UUID REFERENCES client_avatars(id) ON DELETE SET NULL,
  property_id       UUID REFERENCES properties(id) ON DELETE SET NULL,
  neighborhood      TEXT,
  repurpose         JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slot_date, slot_type)
);

CREATE INDEX IF NOT EXISTS idx_planner_date ON content_planner_slots(slot_date);
