-- ============================================================
-- Open House expansion migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Add agent + community columns to open_houses
ALTER TABLE open_houses
  ADD COLUMN IF NOT EXISTS community       TEXT,
  ADD COLUMN IF NOT EXISTS agent_name      TEXT,
  ADD COLUMN IF NOT EXISTS agent_brokerage TEXT,
  ADD COLUMN IF NOT EXISTS agent_phone     TEXT,
  ADD COLUMN IF NOT EXISTS agent_email     TEXT;

-- 2. Outreach tracking table
CREATE TABLE IF NOT EXISTS oh_outreach (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_date  DATE,
  address        TEXT NOT NULL,
  community      TEXT,
  agent_name     TEXT,
  brokerage      TEXT,
  phone          TEXT,
  email          TEXT,
  status         TEXT DEFAULT 'reached_out', -- reached_out | accepted | declined | no_response
  notes          TEXT,
  open_house_id  UUID REFERENCES open_houses(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Per-open-house task table
CREATE TABLE IF NOT EXISTS oh_tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  open_house_id  UUID NOT NULL REFERENCES open_houses(id) ON DELETE CASCADE,
  task_name      TEXT NOT NULL,
  category       TEXT DEFAULT 'pre',  -- pre | day_of | post
  due_date       DATE,
  completed      BOOLEAN DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  doc_link       TEXT,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Host report table (for open houses on DANA'S listings)
CREATE TABLE IF NOT EXISTS host_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          UUID REFERENCES listings(id),
  oh_date             DATE,
  start_time          TEXT,
  end_time            TEXT,
  agent_name          TEXT,
  agent_brokerage     TEXT,
  agent_phone         TEXT,
  agent_email         TEXT,
  sign_in_count       INTEGER DEFAULT 0,
  inquiries_count     INTEGER DEFAULT 0,
  leads_count         INTEGER DEFAULT 0,
  price_perception    TEXT,   -- too_high | fair | too_low
  overall_impression  TEXT,   -- excellent | good | neutral | concerns
  condition_notes     TEXT,
  common_questions    TEXT,
  offer_interest      BOOLEAN DEFAULT FALSE,
  leads_json          JSONB DEFAULT '[]',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed outreach data from Feb 2026 spreadsheet
INSERT INTO oh_outreach (outreach_date, address, community, agent_name, brokerage, phone, email, status) VALUES
  ('2026-02-17', '2854 S Berrywood, Mesa, AZ 85212',         'Sunland Springs Village Unit 5',      'Jaime Wintersteen',          'ProSmart Realty',                 '480-586-8702',   'jlwintersteen@gmail.com',    'reached_out'),
  ('2026-02-17', '11009 E Neville Ave, Mesa, AZ 85209',       'Sunland Springs Village Unit 5',      'Jodi Frazier',               'Realty ONE Group',                '480-235-7252',   'JDsellsAZ@gmail.com',        'reached_out'),
  ('2026-02-17', '7726 E Neville Ave, Mesa, AZ 85209',        'Sunland Village East Five',           'Brian Christopher McKernan', 'ProSmart Realty',                 '480-231-7555',   'BrianMcKernan1@gmail.com',   'reached_out'),
  ('2026-02-17', '4120 E Jude Ln, Gilbert, AZ 85298',         'Trilogy Unit 6',                      'Hope A. Salas',              'Keller Williams Integrity First', '480-720-4305',   'hopesoffice@cox.net',        'reached_out'),
  ('2026-02-17', '8214 E Navarro Ave, Mesa, AZ 85209',        'Sunland Village East',                'Kenny Klaus',                'Real Broker',                     '480-354-7344',   'kenny@klausteam.com',        'reached_out'),
  ('2026-02-17', '7704 E Navarro Ave, Mesa, AZ 85209',        'Sunland Village East',                'Kenny Klaus',                'Real Broker',                     '480-354-7344',   'kenny@klausteam.com',        'reached_out'),
  ('2026-02-17', '7726 E Navarro Ave, Mesa, AZ 85209',        'Sunland Village East Six',            'Brian Christopher McKernan', 'ProSmart Realty',                 '480-231-7555',   'BrianMcKernan1@gmail.com',   'reached_out'),
  ('2026-02-19', '1806 S Los Alamos, Mesa, AZ 85204',         'Heritage Acres',                      'Dustin Holindrake',          'REAL',                            '480-754-9300',   'dustin@holindrake.com',      'reached_out'),
  ('2026-02-19', '1117 W Lakeridge Dr, Gilbert, AZ 85233',    'Windhaven Unit 2',                    'Gary Colin',                 'REAL',                            '602-501-4580',   'gary@garycolin.com',         'reached_out');

INSERT INTO oh_outreach (outreach_date, address, community, agent_name, brokerage, phone, email, status, notes) VALUES
  ('2026-02-17', '8045 E Neville Ave, Mesa, AZ 85209',        'Sunland Village East',                'Anna V Rodriguez',           'HomeSmart',                       '602-703-9726',   'annarodriguezh2@gmail.com',  'declined', 'Homeowner doesn''t want to hold open houses'),
  ('2026-02-17', '4160 E Carmel Ave, Mesa, AZ 85206',         'Sunland Village 5',                   'Vickie L Petricka',          'HomeSmart',                       '602-908-3796',   'vpetricka57@gmail.com',      'declined', 'Brokerage doesn''t allow others to hold opens'),
  ('2026-02-17', '3041 S Lindenwood Cir, Mesa, AZ 85212',     'Sunland Springs Village Unit 8',      'Kate Anderson',              'Coldwell Banker Realty',          '480-250-1936',   'engstromteam@gmail.com',     'declined', 'Brokerage doesn''t allow others to hold opens'),
  ('2026-02-17', '10541 E Thunderbolt Ave, Mesa, AZ 85212',   'Encore at Eastmark',                  'Joni Zarka',                 'Realty ONE Group',                '949-244-6604',   'jonizarka@gmail.com',        'declined', 'Only uses agents from her brokerage');
