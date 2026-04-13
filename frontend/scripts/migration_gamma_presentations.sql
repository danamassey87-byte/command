-- ─── Gamma Presentations table ────────────────────────────────────────────────
-- Tracks every Gamma-generated presentation/website for listings, CMAs, etc.

CREATE TABLE IF NOT EXISTS gamma_presentations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id      uuid REFERENCES listings(id) ON DELETE SET NULL,
  property_id     uuid REFERENCES properties(id) ON DELETE SET NULL,
  title           text NOT NULL DEFAULT '',
  presentation_type text NOT NULL DEFAULT 'listing',  -- listing | buyer_consult | cma | market_report | open_house_recap | custom
  gamma_generation_id text,
  gamma_url       text,
  gamma_edit_url  text,
  status          text NOT NULL DEFAULT 'pending',    -- pending | generating | ready | failed
  slide_outline   text,
  strategy_text   text,
  photo_urls      jsonb DEFAULT '[]'::jsonb,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Add presentation columns to listings if not present
DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS presentation_url text;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS presentation_status text DEFAULT 'none';
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS presentation_generated_at timestamptz;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_gamma_presentations_listing ON gamma_presentations(listing_id);
CREATE INDEX IF NOT EXISTS idx_gamma_presentations_status ON gamma_presentations(status);
