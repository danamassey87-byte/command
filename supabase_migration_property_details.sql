-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add full property detail fields to properties table
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Property details
ALTER TABLE properties ADD COLUMN IF NOT EXISTS description      text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_built       int;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_sqft         int;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_acres        numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS garage_spaces    int;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS stories          int default 1;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pool             boolean default false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS spa              boolean default false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS subdivision      text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS county           text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS school_district  text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS elementary_school text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS middle_school    text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS high_school      text;

-- Features & construction
ALTER TABLE properties ADD COLUMN IF NOT EXISTS features         text[];   -- e.g. {'granite counters','RV gate','solar panels'}
ALTER TABLE properties ADD COLUMN IF NOT EXISTS construction     text;     -- e.g. 'Stucco', 'Block', 'Frame'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS roof_type        text;     -- e.g. 'Tile', 'Shingle', 'Flat'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cooling          text;     -- e.g. 'Central A/C', 'Evaporative'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS heating          text;     -- e.g. 'Forced Air', 'Heat Pump'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS flooring         text;     -- e.g. 'Tile, Wood, Carpet'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking          text;     -- e.g. '2 Car Garage + RV Gate'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS exterior         text;     -- e.g. 'Stucco, Block'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS landscaping      text;     -- e.g. 'Desert Front, Grass Back'

-- Financials
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_amount       numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_year         int;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS apn              text;     -- Assessor's Parcel Number

-- Media
ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_urls       text[];   -- multiple photos
ALTER TABLE properties ADD COLUMN IF NOT EXISTS virtual_tour_url text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floorplan_url    text;

-- Notes
ALTER TABLE properties ADD COLUMN IF NOT EXISTS agent_notes      text;     -- internal notes, not shown to clients
ALTER TABLE properties ADD COLUMN IF NOT EXISTS marketing_remarks text;    -- public-facing description for marketing
