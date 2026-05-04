-- Drive folder linkage on contacts + listings
-- One Google Drive folder per client/listing. We store the folder ID + view URL
-- so the UI can render a "Open in Drive" link without re-fetching from Google.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS drive_folder_id  text,
  ADD COLUMN IF NOT EXISTS drive_folder_url text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS drive_folder_id  text,
  ADD COLUMN IF NOT EXISTS drive_folder_url text;

COMMENT ON COLUMN public.contacts.drive_folder_id IS 'Google Drive folder ID for this client (created via OAuth-scoped drive.file access)';
COMMENT ON COLUMN public.contacts.drive_folder_url IS 'Shareable webViewLink for the client''s Drive folder';
COMMENT ON COLUMN public.listings.drive_folder_id IS 'Google Drive folder ID for this listing';
COMMENT ON COLUMN public.listings.drive_folder_url IS 'Shareable webViewLink for the listing''s Drive folder';

-- Optional parent "Real Estate" workspace folder (one per user_settings).
-- Stored separately so all client/listing folders nest under it cleanly.
-- See user_settings.drive_root_folder, set on first folder creation.
