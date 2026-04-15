-- Add BBA commission percentage to transactions table
-- This stores the agreed-upon commission % from the Buyer Broker Agreement
-- Used to auto-calculate expected_commission from property price × commission_pct
alter table transactions add column if not exists commission_pct numeric(5,3);

-- Example: 3% BBA on a $450,000 property = $13,500 gross commission
-- Then subtract brokerage split (15%, capped at $12K) = $13,500 - $2,025 = $11,475 net
