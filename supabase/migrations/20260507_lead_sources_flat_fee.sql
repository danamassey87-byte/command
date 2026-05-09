-- Migration: Lead sources — flat $ OR % per side, sides_supplied, auto-tag links
-- Adds:
--   • buyer_fee_type / seller_fee_type ('pct' | 'flat') + flat cents
--   • sides_supplied ('buyer' | 'seller' | 'both') — drives which tags auto-create
--   • buyer_tag_id / seller_tag_id FKs into tags (auto-created by app on insert/update)
-- Plus matching snapshot columns on lead_attributions and a fee_type/flat path on referral_fees.
-- Append-only. Existing 'pct' rows continue to work — defaults preserve them.

-- ───────────────────────────────────────────────────────────────────────────
-- 1 · lead_sources — fee type selectors per side + side coverage + tag links
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE lead_sources
  ADD COLUMN IF NOT EXISTS buyer_fee_type    TEXT NOT NULL DEFAULT 'pct',
  ADD COLUMN IF NOT EXISTS buyer_flat_cents  INTEGER,
  ADD COLUMN IF NOT EXISTS seller_fee_type   TEXT NOT NULL DEFAULT 'pct',
  ADD COLUMN IF NOT EXISTS seller_flat_cents INTEGER,
  ADD COLUMN IF NOT EXISTS sides_supplied    TEXT NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS buyer_tag_id      UUID REFERENCES tags(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_tag_id     UUID REFERENCES tags(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_sources_buyer_fee_type_chk') THEN
    ALTER TABLE lead_sources
      ADD CONSTRAINT lead_sources_buyer_fee_type_chk
      CHECK (buyer_fee_type IN ('pct','flat'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_sources_seller_fee_type_chk') THEN
    ALTER TABLE lead_sources
      ADD CONSTRAINT lead_sources_seller_fee_type_chk
      CHECK (seller_fee_type IN ('pct','flat'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_sources_sides_chk') THEN
    ALTER TABLE lead_sources
      ADD CONSTRAINT lead_sources_sides_chk
      CHECK (sides_supplied IN ('buyer','seller','both'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_sources_buyer_tag  ON lead_sources(buyer_tag_id)  WHERE buyer_tag_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_sources_seller_tag ON lead_sources(seller_tag_id) WHERE seller_tag_id IS NOT NULL;

COMMENT ON COLUMN lead_sources.buyer_fee_type IS
  'pct = use buyer_pct (% of GCI). flat = use buyer_flat_cents ($ per close).';
COMMENT ON COLUMN lead_sources.seller_fee_type IS
  'pct = use seller_pct (% of GCI). flat = use seller_flat_cents ($ per close).';
COMMENT ON COLUMN lead_sources.sides_supplied IS
  'Which sides this source delivers leads for. Drives which tags auto-create on insert: buyer = "<Name> — Buyer", seller = "<Name> — Seller", both = both. Used by the email parser to decide which tag to apply when a lead arrives.';
COMMENT ON COLUMN lead_sources.buyer_tag_id IS
  'FK to the auto-generated buyer tag (category="Lead Source"). Null when sides_supplied=seller. Re-created on display_name change.';
COMMENT ON COLUMN lead_sources.seller_tag_id IS
  'FK to the auto-generated seller tag (category="Lead Source"). Null when sides_supplied=buyer. Re-created on display_name change.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2 · lead_attributions — snapshot the fee type + flat at arrival
-- ───────────────────────────────────────────────────────────────────────────
-- Same Phase-9 invariant: editing the source's fee type later does NOT
-- retroactively rewrite an attribution that was locked at arrival.
ALTER TABLE lead_attributions
  ADD COLUMN IF NOT EXISTS buyer_fee_type_locked    TEXT,
  ADD COLUMN IF NOT EXISTS buyer_flat_cents_locked  INTEGER,
  ADD COLUMN IF NOT EXISTS seller_fee_type_locked   TEXT,
  ADD COLUMN IF NOT EXISTS seller_flat_cents_locked INTEGER,
  ADD COLUMN IF NOT EXISTS detected_side            TEXT;  -- 'buyer' | 'seller' | null when ambiguous

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_attr_detected_side_chk') THEN
    ALTER TABLE lead_attributions
      ADD CONSTRAINT lead_attr_detected_side_chk
      CHECK (detected_side IS NULL OR detected_side IN ('buyer','seller'));
  END IF;
END $$;

COMMENT ON COLUMN lead_attributions.detected_side IS
  'Side classified by the parser/UI when the lead arrived. Drives which tag the app applies: detected_side=buyer → lead_sources.buyer_tag_id; seller → seller_tag_id. Null when sides_supplied=both and the email did not disclose side — the app prompts to classify.';

-- ───────────────────────────────────────────────────────────────────────────
-- 3 · referral_fees — flat alternative to pct_applied
-- ───────────────────────────────────────────────────────────────────────────
-- pct_applied becomes nullable (only set when fee_type='pct'). fee_cents is
-- always the final $ amount actually owed, regardless of fee_type.
ALTER TABLE referral_fees
  ADD COLUMN IF NOT EXISTS fee_type           TEXT NOT NULL DEFAULT 'pct',
  ADD COLUMN IF NOT EXISTS flat_cents_applied INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_fees_fee_type_chk') THEN
    ALTER TABLE referral_fees
      ADD CONSTRAINT referral_fees_fee_type_chk
      CHECK (fee_type IN ('pct','flat'));
  END IF;
END $$;

ALTER TABLE referral_fees ALTER COLUMN pct_applied DROP NOT NULL;

COMMENT ON COLUMN referral_fees.fee_type IS
  'pct = pct_applied × gci_cents. flat = flat_cents_applied (gci_cents irrelevant). fee_cents is the resolved $ amount.';
