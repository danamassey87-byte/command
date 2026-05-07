-- Virtual Staging Studio (Replicate-backed) — Dana picked Replicate over
-- Stability AI on 2026-05-07. Token in Supabase Function Secrets as
-- REPLICATE_API_TOKEN.
--
-- Schema additions to media_assets so original + AI-staged versions are
-- linked but separately tracked. Original is always preserved.
--
-- Applied 2026-05-07 via Management API.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS staged_from_id     UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staged_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staging_style      TEXT,
  ADD COLUMN IF NOT EXISTS staging_room_type  TEXT,
  ADD COLUMN IF NOT EXISTS staging_prompt     TEXT,
  ADD COLUMN IF NOT EXISTS staging_cost_cents INTEGER,
  ADD COLUMN IF NOT EXISTS staging_model      TEXT;

CREATE INDEX IF NOT EXISTS media_assets_staged_from_id_idx
  ON media_assets(staged_from_id) WHERE staged_from_id IS NOT NULL;

COMMENT ON COLUMN media_assets.staged_from_id IS
  'When set, this media_asset is an AI-staged version of staged_from_id (the original empty-room photo).';
COMMENT ON COLUMN media_assets.staging_style IS
  'modern | scandinavian | luxury | mid_century | coastal | farmhouse | custom';
COMMENT ON COLUMN media_assets.staging_room_type IS
  'living | bedroom | kitchen | dining | office | outdoor';

-- Storage bucket: staging-photos (public so Replicate can fetch source images
-- and we can serve staged outputs). 25MB limit. JPEG / PNG / WebP only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('staging-photos', 'staging-photos', true, 26214400,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies — public read, authenticated write/delete.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staging_photos_public_read' AND tablename = 'objects') THEN
    EXECUTE 'CREATE POLICY staging_photos_public_read ON storage.objects FOR SELECT USING (bucket_id = ''staging-photos'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staging_photos_authenticated_write' AND tablename = 'objects') THEN
    EXECUTE 'CREATE POLICY staging_photos_authenticated_write ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''staging-photos'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staging_photos_authenticated_delete' AND tablename = 'objects') THEN
    EXECUTE 'CREATE POLICY staging_photos_authenticated_delete ON storage.objects FOR DELETE USING (bucket_id = ''staging-photos'')';
  END IF;
END $$;
