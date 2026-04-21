-- Create tags table (didn't exist yet) + contact_tags join
-- Applied to Supabase 2026-04-21

CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  color       TEXT,
  category    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all tags" ON tags FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id        UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  source        TEXT DEFAULT 'command',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all contact_tags" ON contact_tags FOR ALL USING (true) WITH CHECK (true);
