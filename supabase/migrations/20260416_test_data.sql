-- ============================================================
-- TEST DATA — All names prefixed with [TEST] for easy cleanup
-- Delete with: DELETE FROM contacts WHERE name LIKE '[TEST]%';
-- ============================================================

-- Test contacts: 5 buyers, 3 sellers, 2 investors
INSERT INTO contacts (name, phone, email, type, source, stage, budget_min, budget_max, areas, beds_min, baths_min, pre_approval_amount, lender_name, notes)
VALUES
  ('[TEST] Sarah Johnson', '(480) 555-0101', 'sarah.j@test.com', 'buyer', 'open_house', 'Active Search', 400000, 550000, ARRAY['Gilbert','Chandler'], 3, 2, 500000, 'First National', 'First-time buyer, needs hand-holding'),
  ('[TEST] Mike & Lisa Chen', '(480) 555-0102', 'mchen@test.com', 'buyer', 'referral', 'Pre-Approval', 600000, 800000, ARRAY['Gilbert','Queen Creek'], 4, 3, 750000, 'Wells Fargo', 'Relocating from CA, cash heavy'),
  ('[TEST] David Williams', '(602) 555-0103', 'dwilliams@test.com', 'buyer', 'expired', 'Showing', 350000, 450000, ARRAY['Mesa','Tempe'], 3, 2, 420000, 'Guild Mortgage', 'VA loan, looking for move-in ready'),
  ('[TEST] Rachel Martinez', '(480) 555-0104', 'rachel.m@test.com', 'buyer', 'circle', 'New Lead', 500000, 700000, ARRAY['Scottsdale','Paradise Valley'], 4, 3, NULL, NULL, 'SOI referral from neighbor'),
  ('[TEST] James Thompson', '(623) 555-0105', 'jthompson@test.com', 'buyer', 'online', 'Under Contract', 300000, 400000, ARRAY['Gilbert','Mesa'], 3, 2, 380000, 'Movement Mortgage', 'Closing April 30'),
  ('[TEST] Patricia Adams', '(480) 555-0201', 'padams@test.com', 'seller', 'referral', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Downsizing, needs to sell before buying'),
  ('[TEST] Robert & Kim Lee', '(602) 555-0202', 'rlee@test.com', 'seller', 'expired', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Expired listing from Q1, wants to relist'),
  ('[TEST] Maria Gonzalez', '(480) 555-0203', 'mgonzalez@test.com', 'seller', 'soi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Investment property sale, motivated'),
  ('[TEST] Stone Capital LLC', '(480) 555-0301', 'info@stonecap.test', 'investor', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Fix-and-flip investor, buys 3-4/year'),
  ('[TEST] Horizon Rentals', '(602) 555-0302', 'deals@horizon.test', 'investor', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Buy-and-hold, looking for multi-family')
ON CONFLICT DO NOTHING;

-- Test properties
INSERT INTO properties (address, city, state, zip, price, beds, baths, sqft, year_built, property_type, pool)
VALUES
  ('[TEST] 1234 E Sunrise Blvd', 'Gilbert', 'AZ', '85234', 525000, 4, 2.5, 2200, 2005, 'single_family', true),
  ('[TEST] 5678 S Mountain View Dr', 'Mesa', 'AZ', '85212', 415000, 3, 2, 1800, 2010, 'single_family', false),
  ('[TEST] 910 W Desert Flower Ln', 'Chandler', 'AZ', '85226', 680000, 5, 3, 3100, 2018, 'single_family', true),
  ('[TEST] 2468 N Cactus Rd', 'Scottsdale', 'AZ', '85260', 750000, 4, 3.5, 2800, 2015, 'single_family', true),
  ('[TEST] 1357 E Palm St', 'Gilbert', 'AZ', '85296', 385000, 3, 2, 1650, 2008, 'townhouse', false)
ON CONFLICT DO NOTHING;

-- Test prospects (for All Prospects / Prospecting)
INSERT INTO prospects (name, phone, email, source, status, address, city, zip, notes)
VALUES
  ('[TEST] Angela Rivera', '(480) 555-1001', 'arivera@test.com', 'expired', 'new', '789 W Oak Ave', 'Gilbert', '85233', 'Expired 2 weeks ago, L1 sent'),
  ('[TEST] Tom Baker', '(602) 555-1002', 'tbaker@test.com', 'fsbo', 'contacted', '321 N Pine St', 'Mesa', '85201', 'FSBO sign spotted, door-knocked'),
  ('[TEST] Neighborhood Lead', '(480) 555-1003', NULL, 'circle', 'new', '456 E Elm Dr', 'Chandler', '85225', 'Circle prospecting hit'),
  ('[TEST] Jenny Park', '(480) 555-1004', 'jpark@test.com', 'soi', 'warm', NULL, NULL, NULL, 'Friend of friend, exploring options'),
  ('[TEST] Agent Referral Lead', '(623) 555-1005', 'referral@test.com', 'referral', 'new', NULL, NULL, NULL, 'Referred by agent in Tucson'),
  ('[TEST] OH Visitor - Amy', '(480) 555-1006', 'amy@test.com', 'open_house', 'warm', NULL, NULL, NULL, 'Met at OH on Sunrise Blvd, interested')
ON CONFLICT DO NOTHING;
