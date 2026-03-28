-- ═══════════════════════════════════════════════════════════════════════════
-- P&L System — Expenses, Income, Categories, Receipt Splits
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Expense Categories (IRS Schedule C aligned) ─────────────────────────
create table if not exists expense_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  parent_id   uuid references expense_categories(id) on delete set null,
  type        text not null default 'expense' check (type in ('expense', 'income')),
  tax_line    text,          -- IRS Schedule C line reference
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Seed standard real estate expense categories
insert into expense_categories (name, type, tax_line, sort_order) values
  ('Advertising & Marketing',       'expense', 'Line 8',   1),
  ('Auto / Mileage',                'expense', 'Line 9',   2),
  ('Commissions & Fees',            'expense', 'Line 10',  3),
  ('Contract Labor',                'expense', 'Line 11',  4),
  ('Insurance',                     'expense', 'Line 15',  5),
  ('Professional Services',         'expense', 'Line 17',  6),
  ('Office Expense',                'expense', 'Line 18',  7),
  ('Supplies',                      'expense', 'Line 22',  8),
  ('Technology & Software',         'expense', 'Line 18',  9),
  ('Travel & Meals',                'expense', 'Line 24a', 10),
  ('Utilities (Phone, Internet)',   'expense', 'Line 25',  11),
  ('Education & Training',          'expense', 'Line 27a', 12),
  ('Brokerage Fees / Desk Fees',    'expense', 'Line 10',  13),
  ('MLS / Association Dues',        'expense', 'Line 27a', 14),
  ('Licensing & Renewals',          'expense', 'Line 27a', 15),
  ('Photography / Staging',         'expense', 'Line 8',   16),
  ('Signs & Lockboxes',             'expense', 'Line 8',   17),
  ('Gifts & Client Appreciation',   'expense', 'Line 27a', 18),
  ('Home Office',                   'expense', 'Line 30',  19),
  ('Depreciation',                  'expense', 'Line 13',  20),
  ('Other / Miscellaneous',         'expense', 'Line 27a', 21)
on conflict do nothing;

-- Income categories
insert into expense_categories (name, type, tax_line, sort_order) values
  ('Buyer Commission',         'income', 'Line 1', 1),
  ('Listing Commission',       'income', 'Line 1', 2),
  ('Referral Fee Received',    'income', 'Line 1', 3),
  ('Bonus / Incentive',        'income', 'Line 1', 4),
  ('Rental Income',            'income', 'Line 1', 5),
  ('Coaching / Training',      'income', 'Line 1', 6),
  ('Other Income',             'income', 'Line 6', 7)
on conflict do nothing;

-- ─── Expenses ────────────────────────────────────────────────────────────
create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  date          date not null default current_date,
  vendor        text,
  description   text,
  amount        numeric(12,2) not null default 0,
  category_id   uuid references expense_categories(id),
  property_id   uuid references properties(id) on delete set null,
  payment_method text check (payment_method in ('credit_card','debit_card','check','cash','ach','venmo','zelle','other')),
  receipt_url   text,
  is_split      boolean default false,
  split_group   uuid,   -- groups split items together (the parent receipt)
  notes         text,
  is_deductible boolean default true,
  tax_year      int generated always as (extract(year from date)) stored,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_expenses_category on expenses(category_id);
create index if not exists idx_expenses_property on expenses(property_id);
create index if not exists idx_expenses_tax_year on expenses(tax_year);
create index if not exists idx_expenses_split_group on expenses(split_group);

-- ─── Income Entries ──────────────────────────────────────────────────────
create table if not exists income_entries (
  id              uuid primary key default gen_random_uuid(),
  date            date not null default current_date,
  description     text,
  amount          numeric(12,2) not null default 0,
  category_id     uuid references expense_categories(id),
  property_id     uuid references properties(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  transaction_id  uuid references transactions(id) on delete set null,
  commission_pct  numeric(5,3),        -- e.g., 2.500
  sale_price      numeric(14,2),       -- property sale price
  gross_commission numeric(12,2),      -- before splits
  broker_split_pct numeric(5,2),       -- brokerage split %
  broker_split_amt numeric(12,2),      -- $ paid to brokerage
  net_commission   numeric(12,2),      -- your take-home
  referral_fee_pct numeric(5,2),       -- outgoing referral %
  referral_fee_amt numeric(12,2),      -- outgoing referral $
  status          text default 'pending' check (status in ('pending','received','deposited')),
  received_date   date,
  notes           text,
  tax_year        int generated always as (extract(year from date)) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_income_date on income_entries(date);
create index if not exists idx_income_category on income_entries(category_id);
create index if not exists idx_income_property on income_entries(property_id);
create index if not exists idx_income_tax_year on income_entries(tax_year);

-- ─── Mileage Log (auto expense tracking) ─────────────────────────────────
create table if not exists mileage_log (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default current_date,
  description text,
  miles       numeric(8,1) not null,
  property_id uuid references properties(id) on delete set null,
  rate_per_mile numeric(5,3) default 0.700,  -- 2026 IRS rate
  amount      numeric(10,2) generated always as (miles * rate_per_mile) stored,
  tax_year    int generated always as (extract(year from date)) stored,
  created_at  timestamptz default now()
);

create index if not exists idx_mileage_date on mileage_log(date);
