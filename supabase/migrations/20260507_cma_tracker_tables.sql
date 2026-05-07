-- CMA Tracker — upload CMAs (built externally in NARRPR), parse the comps
-- they used, then revisit weekly to confirm the valuation still holds.
--
-- Two tables:
--   cmas       — one per CMA upload, tied to a listing OR contact OR property
--                + subject estimate range + uploaded PDF + last review verdict
--   cma_comps  — the individual comparable properties pulled from the CMA;
--                original_* fields snapshot from the CMA at upload, current_*
--                fields update during weekly review
--
-- Applied 2026-05-07 via Management API.

CREATE TABLE IF NOT EXISTS cmas (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                  UUID REFERENCES listings(id) ON DELETE SET NULL,
  contact_id                  UUID REFERENCES contacts(id) ON DELETE SET NULL,
  property_id                 UUID REFERENCES properties(id) ON DELETE SET NULL,
  label                       TEXT,
  subject_address             TEXT,
  subject_estimate_low        NUMERIC,
  subject_estimate_high       NUMERIC,
  subject_recommended_price   NUMERIC,
  file_url                    TEXT,
  file_path                   TEXT,
  source                      TEXT DEFAULT 'narrpr',  -- narrpr | manual | other
  notes                       TEXT,
  last_reviewed_at            TIMESTAMPTZ,
  review_verdict              TEXT,                   -- still_valid | needs_reprice | stale_skip
  parse_status                TEXT DEFAULT 'pending', -- pending | parsing | parsed | failed
  uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS cmas_listing_id_idx ON cmas(listing_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS cmas_contact_id_idx ON cmas(contact_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE cmas IS
  'Uploaded CMAs (built externally in NARRPR) with their subject estimate. Comps live in cma_comps. Reviewed weekly to confirm valuation still holds.';

COMMENT ON COLUMN cmas.parse_status IS
  'pending | parsing | parsed | failed — set by cma-parse edge function';
COMMENT ON COLUMN cmas.review_verdict IS
  'still_valid | needs_reprice | stale_skip — last weekly review verdict';

CREATE TABLE IF NOT EXISTS cma_comps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cma_id                UUID NOT NULL REFERENCES cmas(id) ON DELETE CASCADE,
  address               TEXT NOT NULL,
  city                  TEXT,
  mls_id                TEXT,
  original_status       TEXT,        -- snapshot at CMA build time
  original_sale_price   NUMERIC,
  original_list_price   NUMERIC,
  original_sale_date    DATE,
  sqft                  INTEGER,
  beds                  INTEGER,
  baths                 NUMERIC,
  year_built            INTEGER,
  distance_miles        NUMERIC,
  dom                   INTEGER,
  current_status        TEXT,        -- updated during weekly review
  current_price         NUMERIC,
  current_sale_date     DATE,
  last_checked_at       TIMESTAMPTZ,
  check_notes           TEXT,
  position              INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cma_comps_cma_id_idx ON cma_comps(cma_id);

COMMENT ON TABLE cma_comps IS
  'Individual comparable properties pulled from a CMA. Original_* fields are the snapshot from the CMA at upload time. Current_* fields update during weekly review.';

COMMENT ON COLUMN cma_comps.original_status IS
  'sold | active | pending | expired — at the time the CMA was built';
COMMENT ON COLUMN cma_comps.current_status IS
  'sold | active | pending | expired | unknown — updated during review';
