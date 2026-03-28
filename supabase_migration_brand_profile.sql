-- ============================================================================
-- Brand Profile & Assets Storage
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1) Create a storage bucket for brand assets (logos, headshots, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2) Allow public read access to brand assets
CREATE POLICY "Public read access for brand assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

-- 3) Allow authenticated (or anon for now) insert/update/delete
CREATE POLICY "Allow upload to brand assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "Allow update brand assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'brand-assets');

CREATE POLICY "Allow delete brand assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brand-assets');

-- 4) Seed brand_profile key in user_settings if it doesn't exist
INSERT INTO user_settings (key, value)
VALUES ('brand_profile', '{
  "signature": {
    "full_name": "",
    "title": "",
    "phone": "",
    "email": "",
    "brokerage": "",
    "license_number": "",
    "tagline": ""
  },
  "guidelines": {
    "primary_color": "#524136",
    "secondary_color": "#b79782",
    "accent_color": "#c9b99a",
    "tagline": "",
    "tone_of_voice": "",
    "fonts": ""
  },
  "assets": {},
  "social_channels": {
    "instagram": "",
    "facebook": "",
    "tiktok": "",
    "youtube": "",
    "linkedin": "",
    "twitter": "",
    "gmb": "",
    "zillow": "",
    "realtor_com": "",
    "blog": "",
    "website": "",
    "linktree": ""
  }
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
