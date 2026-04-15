-- ============================================================================
-- Inspo Library upgrade — add multi-slide media, content type, title, notes
-- Safe to run multiple times (all ALTER TABLE use IF NOT EXISTS pattern).
-- ============================================================================

-- Title for quick reference in the library grid
ALTER TABLE inspo_bank ADD COLUMN IF NOT EXISTS title TEXT;

-- Content type: reel, carousel, single_post, story, blog, tiktok, other
ALTER TABLE inspo_bank ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'single_post';

-- Multi-slide / multi-image support (JSONB array of { url, type, caption? })
-- Each entry: { "url": "https://...", "type": "image"|"video", "caption": "optional per-slide caption" }
ALTER TABLE inspo_bank ADD COLUMN IF NOT EXISTS source_media JSONB DEFAULT '[]';

-- Notes / why you saved it
ALTER TABLE inspo_bank ADD COLUMN IF NOT EXISTS notes TEXT;

-- Favorite flag for quick-access
ALTER TABLE inspo_bank ADD COLUMN IF NOT EXISTS favorited BOOLEAN DEFAULT false;

-- Index on content type for filtering
CREATE INDEX IF NOT EXISTS idx_inspo_content_type ON inspo_bank(content_type);
CREATE INDEX IF NOT EXISTS idx_inspo_favorited    ON inspo_bank(favorited);
