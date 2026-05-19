-- Adds a single cinematic hero video URL to properties. Surfaced on the
-- public property website (autoplay/muted/loop background over the hero
-- section) and editable from Properties → Media & Links via the new
-- "🎞️ Animate to video" Cinematic AI button (Higgsfield DoP image-to-video).
--
-- One field is enough for v1 — we only render one hero. Per-photo motion
-- clips for OH promo Reels are produced ad-hoc from PostComposer and don't
-- need their own table.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS hero_video_url TEXT;

COMMENT ON COLUMN properties.hero_video_url IS
  'Cinematic hero video URL (Higgsfield DoP). Played autoplay/muted/loop on the public property website hero section. Set via Properties → Media & Links → 🎞️ Animate to video.';
