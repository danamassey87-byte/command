-- ────────────────────────────────────────────────────────────────────────────
-- 2026-05-06 — Listing Budget preset expense_categories
-- Seeds the line items from Dana's reference Seller Workflow spreadsheet's
-- "Listing Budget" tab. Estimated total per listing: $4,130.
--
-- These are PRESETS — when Dana opens the "Add expense" picker on a Listing,
-- the autocomplete will surface these by category. Adds an optional
-- default_amount and default_paid_by column so the picker can pre-fill.
--
-- Categories use type='business' so they show up in the existing expense flow.
-- ────────────────────────────────────────────────────────────────────────────

-- Add new columns for preset defaults (idempotent)
ALTER TABLE expense_categories
  ADD COLUMN IF NOT EXISTS default_amount  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS default_paid_by TEXT,           -- 'agent' | 'seller' | 'buyer'
  ADD COLUMN IF NOT EXISTS phase           TEXT,           -- e.g. 'Preparation', 'Photography', 'Print', 'Digital', 'Open House'
  ADD COLUMN IF NOT EXISTS applies_to      TEXT;           -- 'listing' | 'buyer' | 'general'

-- Helper: insert only if (name, type) not already present
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      -- Property Preparation
      ('Pre-listing home inspection',           'expense', 'Preparation', 'listing', 400.00,  'agent',  100),
      ('Interior painting',                     'expense', 'Preparation', 'listing', 0,       'seller', 110),
      ('Exterior painting / touch-up',          'expense', 'Preparation', 'listing', 0,       'seller', 120),
      ('Landscaping / curb appeal',             'expense', 'Preparation', 'listing', 0,       'seller', 130),
      ('Power washing',                         'expense', 'Preparation', 'listing', 250.00,  'seller', 140),
      ('Deep cleaning (professional)',          'expense', 'Preparation', 'listing', 300.00,  'seller', 150),
      ('Repairs (general)',                     'expense', 'Preparation', 'listing', 0,       'seller', 160),
      ('Carpet cleaning / replacement',         'expense', 'Preparation', 'listing', 0,       'seller', 170),

      -- Staging
      ('Professional staging consultation',     'expense', 'Staging',     'listing', 200.00,  'agent',  200),
      ('Professional staging (monthly rental)', 'expense', 'Staging',     'listing', 0,       'agent',  210),
      ('Virtual staging (per photo)',           'expense', 'Staging',     'listing', 50.00,   'agent',  220),

      -- Photography & Media
      ('Professional photography (HDR)',        'expense', 'Photography', 'listing', 300.00,  'agent',  300),
      ('Aerial / drone photography',            'expense', 'Photography', 'listing', 200.00,  'agent',  310),
      ('3D virtual tour / Matterport',          'expense', 'Photography', 'listing', 250.00,  'agent',  320),
      ('Professional video walkthrough',        'expense', 'Photography', 'listing', 500.00,  'agent',  330),
      ('Floor plan / layout diagram',           'expense', 'Photography', 'listing', 150.00,  'agent',  340),
      ('Twilight photography',                  'expense', 'Photography', 'listing', 200.00,  'agent',  350),

      -- Print Marketing
      ('Property brochures / flyers',           'expense', 'Print',       'listing', 150.00,  'agent',  400),
      ('Just Listed postcards',                 'expense', 'Print',       'listing', 300.00,  'agent',  410),
      ('Property feature sheets',               'expense', 'Print',       'listing', 75.00,   'agent',  420),
      ('Home Property Book / binder',           'expense', 'Print',       'listing', 50.00,   'agent',  430),
      ('Yard sign and riders',                  'expense', 'Print',       'listing', 50.00,   'agent',  440),
      ('Open house directional signs',          'expense', 'Print',       'listing', 30.00,   'agent',  450),

      -- Digital Marketing
      ('Single-property website',               'expense', 'Digital',     'listing', 100.00,  'agent',  500),
      ('Facebook / Instagram ad campaign',      'expense', 'Digital',     'listing', 0,       'agent',  510),
      ('Google display ad campaign',            'expense', 'Digital',     'listing', 0,       'agent',  520),
      ('Email marketing campaign',              'expense', 'Digital',     'listing', 0,       'agent',  530),
      ('Social media content creation',         'expense', 'Digital',     'listing', 0,       'agent',  540),
      ('Video editing / production',            'expense', 'Digital',     'listing', 0,       'agent',  550),

      -- Open House
      ('Open house refreshments / catering',    'expense', 'Open House',  'listing', 50.00,   'agent',  600),
      ('Open house promotional materials',      'expense', 'Open House',  'listing', 25.00,   'agent',  610),

      -- Misc
      ('Home warranty (seller-purchased)',      'expense', 'Preparation', 'listing', 500.00,  'seller', 700),
      ('HOA document / transfer fees',          'expense', 'Preparation', 'listing', 0,       'seller', 710)
    ) AS v(name, type, phase, applies_to, default_amount, default_paid_by, sort_order)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM expense_categories
      WHERE expense_categories.name = rec.name
        AND expense_categories.type = rec.type
    ) THEN
      INSERT INTO expense_categories (name, type, phase, applies_to, default_amount, default_paid_by, sort_order, is_active)
      VALUES (rec.name, rec.type, rec.phase, rec.applies_to, NULLIF(rec.default_amount, 0), rec.default_paid_by, rec.sort_order, true);
    ELSE
      -- Update preset metadata on existing rows so the picker has defaults
      UPDATE expense_categories
      SET phase           = COALESCE(expense_categories.phase, rec.phase),
          applies_to      = COALESCE(expense_categories.applies_to, rec.applies_to),
          default_amount  = COALESCE(expense_categories.default_amount, NULLIF(rec.default_amount, 0)),
          default_paid_by = COALESCE(expense_categories.default_paid_by, rec.default_paid_by)
      WHERE expense_categories.name = rec.name
        AND expense_categories.type = rec.type;
    END IF;
  END LOOP;
END $$;
