-- Add drive_file_id to media_assets so the Drive Photos sync can dedup imports.
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS drive_file_id text;

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_drive_file_id_unique
  ON public.media_assets (drive_file_id)
  WHERE drive_file_id IS NOT NULL AND deleted_at IS NULL;
