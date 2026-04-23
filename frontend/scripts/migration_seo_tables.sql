-- ═══════════════════════════════════════════════════════════════════════════
-- SEO & AEO tables for the /seo page
-- Run against your Supabase project (NOT greenpros)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Ranking Snapshots ────────────────────────────────────────────────────
-- Tracks keyword position over time (manual or automated)
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id  uuid NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  rank        int,               -- NULL = not in top 100
  engine      text DEFAULT 'google',  -- google, bing, etc.
  at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_keyword ON ranking_snapshots(keyword_id, at DESC);

-- ─── AI Citations ─────────────────────────────────────────────────────────
-- Tracks share-of-voice across AI engines (AEO)
CREATE TABLE IF NOT EXISTS ai_citations (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query         text NOT NULL,
  ai            text NOT NULL,       -- chatgpt, claude, perplexity, gemini
  cited         boolean DEFAULT false,
  citation_url  text,
  sample_text   text,                -- what the AI said about you
  measured_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_citations_ai ON ai_citations(ai, measured_at DESC);

-- ─── Hub Pages (topical authority) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_pages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  slug        text,
  theme       text,                  -- e.g. "Gilbert AZ Real Estate"
  created_at  timestamptz DEFAULT now()
);

-- ─── Spoke Pages (supporting articles linked to hubs) ─────────────────────
CREATE TABLE IF NOT EXISTS spoke_pages (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id            uuid NOT NULL REFERENCES hub_pages(id) ON DELETE CASCADE,
  title             text NOT NULL,
  slug              text,
  internal_links_out int DEFAULT 0,   -- how many internal links this page has
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spoke_pages_hub ON spoke_pages(hub_id);

-- ─── SEO Audits ───────────────────────────────────────────────────────────
-- Stores results from automated or manual SEO health checks
CREATE TABLE IF NOT EXISTS seo_audits (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at      timestamptz DEFAULT now(),
  issue_count int DEFAULT 0,
  issues      jsonb DEFAULT '[]'::jsonb   -- [{kind, severity, auto_fixable}]
);

-- ─── RLS (allow all for single-user app) ──────────────────────────────────
ALTER TABLE ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE spoke_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all ranking_snapshots" ON ranking_snapshots FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all ai_citations" ON ai_citations FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all hub_pages" ON hub_pages FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all spoke_pages" ON spoke_pages FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all seo_audits" ON seo_audits FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
