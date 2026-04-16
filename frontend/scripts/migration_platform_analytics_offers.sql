-- Platform Analytics & Offers for Listings
-- Weekly stats from Zillow, Realtor.com, Redfin, Homes.com + offer tracking

-- ─── Platform Analytics (weekly stat snapshots per listing) ─────────────────
CREATE TABLE IF NOT EXISTS listing_platform_stats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  week_of         date NOT NULL,                          -- Monday of the week
  -- Portal stats (manually entered)
  zillow_views         int DEFAULT 0,
  zillow_saves         int DEFAULT 0,
  realtor_views        int DEFAULT 0,
  realtor_leads        int DEFAULT 0,
  redfin_views         int DEFAULT 0,
  redfin_favorites     int DEFAULT 0,
  homes_views          int DEFAULT 0,
  homes_leads          int DEFAULT 0,
  -- MLS / other
  mls_views            int DEFAULT 0,
  mls_inquiries        int DEFAULT 0,
  property_website_views int DEFAULT 0,
  -- Showings that week (auto or manual)
  showings_count       int DEFAULT 0,
  -- Agent notes for that week
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(listing_id, week_of)
);

CREATE INDEX IF NOT EXISTS idx_platform_stats_listing ON listing_platform_stats(listing_id);
CREATE INDEX IF NOT EXISTS idx_platform_stats_week    ON listing_platform_stats(week_of DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trg_platform_stats_updated() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_stats_updated ON listing_platform_stats;
CREATE TRIGGER platform_stats_updated BEFORE UPDATE ON listing_platform_stats
  FOR EACH ROW EXECUTE FUNCTION trg_platform_stats_updated();

-- ─── Weekly stat-pull tasks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_stat_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  week_of         date NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(listing_id, week_of)
);

-- ─── Offers on listings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  -- Buyer info
  buyer_name      text NOT NULL,
  buyer_agent     text,
  buyer_brokerage text,
  buyer_phone     text,
  buyer_email     text,
  -- Offer terms
  offer_price     numeric(12,2),
  earnest_money   numeric(10,2),
  down_payment_pct numeric(5,2),
  financing_type  text CHECK (financing_type IN ('conventional','fha','va','usda','cash','hard_money','other')),
  lender_name     text,
  pre_approval    boolean DEFAULT false,
  -- Dates
  submitted_at    timestamptz DEFAULT now(),
  expiration_at   timestamptz,
  close_of_escrow date,
  -- Contingencies
  inspection_days int,
  appraisal_contingency boolean DEFAULT true,
  financing_contingency boolean DEFAULT true,
  sale_contingency boolean DEFAULT false,
  -- Concessions & extras
  seller_concessions numeric(10,2) DEFAULT 0,
  home_warranty   boolean DEFAULT false,
  escalation_clause text,
  personal_letter text,
  other_terms     text,
  -- Status
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewing', 'countered', 'accepted', 'declined', 'withdrawn', 'expired'
  )),
  counter_price   numeric(12,2),
  counter_terms   text,
  -- Net sheet
  net_sheet_doc_url text,                          -- uploaded PDF/image URL
  net_sheet_doc_path text,                         -- storage path for cleanup
  net_sheet_doc_name text,                         -- original filename
  net_sheet_total  numeric(12,2),                  -- manually entered net-to-seller from net sheet
  -- AI analysis
  ai_analysis     text,                            -- Claude's breakdown of this offer
  ai_compared_at  timestamptz,                     -- last multi-offer comparison timestamp
  -- Notes
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_listing ON listing_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_status  ON listing_offers(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trg_offers_updated() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offers_updated ON listing_offers;
CREATE TRIGGER offers_updated BEFORE UPDATE ON listing_offers
  FOR EACH ROW EXECUTE FUNCTION trg_offers_updated();

-- ─── Meta Ads Attribution (link Meta campaigns to listings) ─────────────────
CREATE TABLE IF NOT EXISTS listing_ad_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  -- Meta Ads identifiers
  meta_campaign_id   text NOT NULL,
  meta_campaign_name text,
  meta_adset_id      text NOT NULL DEFAULT '',
  meta_adset_name    text,
  audience_label     text,                          -- e.g. "Buyers 30-55 Gilbert", "Relocators", "Investors"
  -- Cached stats (refreshed on sync)
  impressions     bigint DEFAULT 0,
  reach           bigint DEFAULT 0,
  clicks          bigint DEFAULT 0,
  spend           numeric(10,2) DEFAULT 0,
  leads           int DEFAULT 0,
  ctr             numeric(6,4) DEFAULT 0,
  cpc             numeric(8,2) DEFAULT 0,
  cpl             numeric(8,2) DEFAULT 0,
  conversions     int DEFAULT 0,
  -- Sync tracking
  last_synced_at  timestamptz,
  date_start      date,
  date_stop       date,
  -- Meta
  attributed      boolean DEFAULT true,             -- toggle to include/exclude from client reports
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(listing_id, meta_campaign_id, meta_adset_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_listing ON listing_ad_campaigns(listing_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_meta    ON listing_ad_campaigns(meta_campaign_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trg_ad_campaigns_updated() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ad_campaigns_updated ON listing_ad_campaigns;
CREATE TRIGGER ad_campaigns_updated BEFORE UPDATE ON listing_ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION trg_ad_campaigns_updated();
