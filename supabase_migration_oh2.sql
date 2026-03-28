-- ============================================================
-- Open House migration 2: new columns + historical data seed
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to open_houses
ALTER TABLE open_houses
  ADD COLUMN IF NOT EXISTS listing_agent       TEXT,
  ADD COLUMN IF NOT EXISTS lofty_landing_page  TEXT,
  ADD COLUMN IF NOT EXISTS lofty_other_oh_page TEXT,
  ADD COLUMN IF NOT EXISTS groups_through       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_converted      INTEGER DEFAULT 0;

-- 2. Seed helper function
CREATE OR REPLACE FUNCTION _seed_oh(
  p_address     TEXT,   p_city        TEXT,
  p_date        DATE,   p_start       TEXT,   p_end TEXT,
  p_agent       TEXT,   p_lofty       TEXT,
  p_leads       INT,    p_groups      INT,    p_converted INT,
  p_notes       TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_prop UUID;
  v_oh   UUID;
BEGIN
  -- Find or create property
  SELECT id INTO v_prop FROM properties WHERE address ILIKE p_address || '%' LIMIT 1;
  IF v_prop IS NULL THEN
    INSERT INTO properties (address, city, state)
    VALUES (p_address, p_city, 'AZ') RETURNING id INTO v_prop;
  END IF;

  -- Skip if this property+date combo already exists
  SELECT id INTO v_oh FROM open_houses
  WHERE property_id = v_prop AND date = p_date LIMIT 1;
  IF v_oh IS NOT NULL THEN RETURN; END IF;

  -- Insert open house
  INSERT INTO open_houses (
    property_id, date, start_time, end_time, status,
    listing_agent, lofty_landing_page,
    leads_count, groups_through, leads_converted, notes
  ) VALUES (
    v_prop, p_date, p_start, p_end, 'completed',
    p_agent, p_lofty,
    p_leads, p_groups, p_converted, p_notes
  ) RETURNING id INTO v_oh;

  -- Seed full process checklist
  INSERT INTO oh_tasks (open_house_id, task_name, category, sort_order) VALUES
    -- Pre-Event
    (v_oh, 'Create OH Sign In in Lofty',                        'pre', 1),
    (v_oh, 'Set up Curbhero Sign In',                            'pre', 2),
    (v_oh, 'Create Flyers in Canva',                             'pre', 3),
    (v_oh, 'Prep Door Jammer',                                   'pre', 4),
    (v_oh, 'Send materials for printing',                        'pre', 5),
    (v_oh, 'Print Sign-In QR page',                              'pre', 6),
    (v_oh, 'Print QR for other Open Houses',                     'pre', 7),
    (v_oh, 'Print MLS sheet',                                    'pre', 8),
    (v_oh, 'Schedule Flyer Delivery',                            'pre', 9),
    (v_oh, 'Create FB Marketplace Post',                         'pre', 10),
    (v_oh, 'Create IG Post in Canva',                            'pre', 11),
    (v_oh, 'Create IG Stories in Canva',                         'pre', 12),
    (v_oh, 'Set up Manychat Sequence',                           'pre', 13),
    (v_oh, 'Schedule IG Post',                                   'pre', 14),
    (v_oh, 'Schedule IG Stories',                                'pre', 15),
    (v_oh, 'Add Lofty landing page link to Boards app',          'pre', 16),
    (v_oh, 'Circle Prospect neighborhood',                       'pre', 17),
    -- Day-Of
    (v_oh, 'Post Open House IG Story (live)',                    'day_of', 18),
    (v_oh, 'Arrive 45 min early — set up signs & feature sheets','day_of', 19),
    (v_oh, 'Set up sign-in at entrance (Curbhero / iPad)',       'day_of', 20),
    (v_oh, 'Track each group: buyer type + interest level',      'day_of', 21),
    (v_oh, 'Note feedback on price, condition, competition',     'day_of', 22),
    (v_oh, 'Lock up & collect all signs + materials',            'day_of', 23),
    -- Post-Event
    (v_oh, 'Create Thank You image + text in Canva',             'post', 24),
    (v_oh, 'Add Thank You copy to Boards app',                   'post', 25),
    (v_oh, 'Text every sign-in within 2 hours of close',         'post', 26),
    (v_oh, 'Trigger Manychat Thank You sequence',                'post', 27),
    (v_oh, 'Add hot leads to Lofty & schedule follow-up call',   'post', 28);
END;
$$;

-- 3. Seed the 13 historical open houses
SELECT _seed_oh('2919 S Chatsworth',           'Mesa',          '2025-11-01', '12:00', '14:00', NULL,                   NULL,                                       0, 3,  0, NULL);
SELECT _seed_oh('10614 E Lincoln Ave',          'Mesa',          '2025-11-01', '15:00', '17:00', NULL,                   NULL,                                       1, 1,  0, NULL);
SELECT _seed_oh('23083 S 212th Pl',             'Queen Creek',   '2025-11-22', '09:00', '12:00', 'Victoria Cole',        'https://danamassey.com/23083',             1, 3,  0, 'Mom and dad came through — their son is going through a divorce and living with them. Looking to find a place ~$650K');
SELECT _seed_oh('654 E Taylor Trl',             'San Tan Valley','2025-12-06', '12:00', '15:00', 'Victoria Cole',        'https://danamassey.com/654taylortrail',    1, 1,  1, 'BBA signed // Jamie Turner');
SELECT _seed_oh('11035 E Topaz Ave',            'Mesa',          '2025-12-07', '09:00', '12:00', 'Victoria Cole',        'https://danamassey.com/11035topaz',        0, 0,  0, NULL);
SELECT _seed_oh('2742 S Sulley Dr #102',        'Gilbert',       '2025-12-13', '09:00', '12:00', 'Victoria Cole',        'https://danamassey.com/2742-sulley-dr-102',1, 4,  0, NULL);
SELECT _seed_oh('2742 S Sulley Dr #102',        'Gilbert',       '2025-12-14', '09:00', '12:00', 'Victoria Cole',        'https://danamassey.com/2742-sulley-dr-102',1, 1,  0, NULL);
SELECT _seed_oh('9603 E Theia Dr',              'Mesa',          '2026-01-17', '12:00', '15:00', 'Michelle Rae Colbert', 'https://danamassey.com/9603theia',         1, 4,  0, 'Devon Salo (+ her husband)');
SELECT _seed_oh('9426 E Saturn Ave',            'Mesa',          '2026-01-31', '11:00', '14:00', 'Kaushik Sirkar',       'https://danamassey.com/9426saturn',        1, 4,  0, 'Alycia Bukartek');
SELECT _seed_oh('2222 S Yellow Wood Dr',        'Mesa',          '2026-02-01', '11:00', '14:00', 'Kristen Amen',         'https://danamassey.com/2222yellowwood',    4, 15, 0, 'Carol VanKirk, Mary Sullivan, Steve and Deb Ostertag, Jeff and Kristen Kurpinsky');
SELECT _seed_oh('9603 E Theia Dr',              'Mesa',          '2026-02-07', '11:00', '13:00', 'Michelle Rae Colbert', 'https://danamassey.com/9603theia',         0, 0,  0, NULL);
SELECT _seed_oh('2222 S Yellow Wood Dr',        'Mesa',          '2026-02-27', '15:00', '18:00', 'Kristen Amen',         'https://danamassey.com/2222yellowwood',    4, 15, 0, 'Carol VanKirk, Mary Sullivan, Steve and Deb Ostertag, Jeff and Kristen Kurpinsky');
SELECT _seed_oh('4651 S Glacier',               'Mesa',          '2026-02-28', '11:00', '13:00', 'Michelle Rae Colbert', 'https://danamassey.com/4651glacier',       0, 0,  0, NULL);

-- 4. Clean up helper
DROP FUNCTION IF EXISTS _seed_oh;
