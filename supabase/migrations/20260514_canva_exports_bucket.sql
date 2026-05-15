-- Applied via MCP apply_migration on 2026-05-14.
-- Public bucket for PNGs/JPEGs exported from Canva /v1/exports.
-- canva-generate uploads here after a successful export; URLs land in
-- content_platform_posts.media_urls so publish-content can hand them to
-- Blotato's POST /v2/media when it fires the actual post.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'canva-exports',
  'canva-exports',
  true,
  20971520,
  ARRAY['image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
