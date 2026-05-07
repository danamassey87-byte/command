-- ────────────────────────────────────────────────────────────────────────────
-- 2026-05-06 — Transaction Workflow Tables
-- Pairs with Dana's M1–M10 buyer + seller checklists. Adds two trackers that
-- live alongside `checklist_runs` (which holds the action checklist):
--   • transaction_documents  — tracks RECEIPT status of required docs
--   • transaction_deadlines  — tracks contractual deadlines, feeds Notification Center
-- Plus templates so a new contact/listing can auto-pre-populate.
-- ────────────────────────────────────────────────────────────────────────────

-- ─── Required Documents tracker ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_kind        TEXT NOT NULL,                  -- 'contact' (buyer) | 'listing'
  parent_id          UUID NOT NULL,
  name               TEXT NOT NULL,                  -- e.g. "Buyer Agency Agreement (signed)"
  phase              TEXT,                           -- e.g. "Buyer Agency & Compliance"
  required_by        TEXT,                           -- e.g. "Before touring", "3 days before close"
  responsible_party  TEXT,                           -- 'Agent' | 'TC' | 'Seller' | 'Buyer'
  status             TEXT NOT NULL DEFAULT 'Not Received',  -- 'Not Received' | 'Pending' | 'Received' | 'Waived' | 'N/A'
  date_received      DATE,
  file_url           TEXT,                           -- optional Drive link
  notes              TEXT,
  sort_order         INT NOT NULL DEFAULT 0,
  template_key       TEXT,                           -- nullable; ties row back to the template that created it
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_txn_documents_parent
  ON transaction_documents(parent_kind, parent_id);
CREATE INDEX IF NOT EXISTS idx_txn_documents_status
  ON transaction_documents(status) WHERE status <> 'Received';

-- ─── Deadline tracker ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_deadlines (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_kind        TEXT NOT NULL,                  -- 'contact' (buyer) | 'listing'
  parent_id          UUID NOT NULL,
  description        TEXT NOT NULL,                  -- e.g. "Inspection Objection Deadline"
  contract_day_offset INT,                           -- offset from contract acceptance (Day 0); null for free-form
  calendar_date      DATE,                           -- computed from contract acceptance + offset, or set manually
  responsible_party  TEXT,                           -- 'Agent' | 'TC'
  status             TEXT NOT NULL DEFAULT 'Pending',  -- 'Pending' | 'Met' | 'Missed' | 'Waived'
  completed_at       TIMESTAMPTZ,
  notes              TEXT,
  sort_order         INT NOT NULL DEFAULT 0,
  template_key       TEXT,
  notified_7d        BOOLEAN NOT NULL DEFAULT false, -- to avoid duplicate Notification Center alerts
  notified_3d        BOOLEAN NOT NULL DEFAULT false,
  notified_1d        BOOLEAN NOT NULL DEFAULT false,
  notified_missed    BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_txn_deadlines_parent
  ON transaction_deadlines(parent_kind, parent_id);
CREATE INDEX IF NOT EXISTS idx_txn_deadlines_calendar
  ON transaction_deadlines(calendar_date) WHERE status = 'Pending';

-- ─── Templates (used to pre-populate the trackers above) ────────────────────
CREATE TABLE IF NOT EXISTS transaction_document_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key       TEXT NOT NULL UNIQUE,           -- stable identifier, e.g. 'buyer.bba_signed'
  applies_to         TEXT NOT NULL,                  -- 'buyer' | 'listing' | 'both'
  name               TEXT NOT NULL,
  phase              TEXT,
  required_by        TEXT,
  responsible_party  TEXT,
  sort_order         INT NOT NULL DEFAULT 0,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_deadline_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key       TEXT NOT NULL UNIQUE,
  applies_to         TEXT NOT NULL,                  -- 'buyer' | 'listing' | 'both'
  description        TEXT NOT NULL,
  default_offset     INT,                            -- typical day-from-acceptance, can override per deal
  responsible_party  TEXT,
  sort_order         INT NOT NULL DEFAULT 0,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Permissive RLS (matches current project pattern; tighten when Auth lands) ─
ALTER TABLE transaction_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_deadlines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_deadline_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "allow all" ON transaction_documents          FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON transaction_deadlines          FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON transaction_document_templates FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON transaction_deadline_templates FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Seed: Required Document templates (from M1–M10 spreadsheets) ───────────

-- Buyer documents
INSERT INTO transaction_document_templates (template_key, applies_to, name, phase, required_by, responsible_party, sort_order) VALUES
  ('buyer.bba_signed',          'buyer', 'Buyer Agency Agreement (signed)',           'Buyer Agency & Compliance', 'Before touring',       'Agent',  10),
  ('buyer.agency_disclosure',   'buyer', 'Agency Disclosure / Acknowledgment',        'Buyer Agency & Compliance', 'At first meeting',     'Agent',  20),
  ('buyer.fair_housing',        'buyer', 'Fair Housing Acknowledgment',               'Buyer Agency & Compliance', 'At consultation',      'Agent',  30),
  ('buyer.preapproval',         'buyer', 'Buyer Pre-Approval Letter',                 'Buyer Agency & Compliance', 'Before touring',       'Agent',  40),
  ('buyer.proof_of_funds',      'buyer', 'Proof of Funds (cash buyers)',              'Buyer Agency & Compliance', 'Before offer',         'Agent',  50),
  ('buyer.purchase_contract',   'buyer', 'Purchase Contract (fully executed)',        'Offer & Contract',          'At acceptance',        'Agent',  60),
  ('buyer.addenda',             'buyer', 'All Addenda and Amendments',                'Offer & Contract',          'As executed',          'Agent',  70),
  ('buyer.earnest_receipt',     'buyer', 'Earnest Money Receipt / Deposit Confirmation','Offer & Contract',         'Per contract deadline','TC',     80),
  ('buyer.seller_disclosures',  'buyer', 'Seller Disclosures (received)',             'Offer & Contract',          'Per contract',         'TC',     90),
  ('buyer.lead_paint',          'buyer', 'Lead-Based Paint Disclosure (pre-1978 homes)','Offer & Contract',        'Per contract',         'TC',    100),
  ('buyer.inspection_report',   'buyer', 'Home Inspection Report',                    'Inspection & Due Diligence','Per inspection period','TC',    110),
  ('buyer.radon_report',        'buyer', 'Radon Test Results',                        'Inspection & Due Diligence','Per inspection period','TC',    120),
  ('buyer.sewer_septic_report', 'buyer', 'Sewer/Septic Inspection Report',            'Inspection & Due Diligence','Per inspection period','TC',    130),
  ('buyer.pest_termite_report', 'buyer', 'Pest/Termite Inspection Report',            'Inspection & Due Diligence','Per inspection period','TC',    140),
  ('buyer.specialty_inspect',   'buyer', 'Other Specialty Inspection Reports',        'Inspection & Due Diligence','Per inspection period','TC',    150),
  ('buyer.inspection_objection','buyer', 'Inspection Objection / Repair Request',     'Inspection & Due Diligence','Per deadline',         'Agent', 160),
  ('buyer.inspection_resolution','buyer','Inspection Resolution Agreement',           'Inspection & Due Diligence','Per deadline',         'Agent', 170),
  ('buyer.title_commitment',    'buyer', 'Title Commitment / Preliminary Report',     'Title & Appraisal',         'When available',       'TC',    180),
  ('buyer.title_objection',     'buyer', 'Title Objection (if needed)',               'Title & Appraisal',         'Per deadline',         'Agent', 190),
  ('buyer.survey',              'buyer', 'Survey',                                    'Title & Appraisal',         'Per contract',         'TC',    200),
  ('buyer.appraisal_report',    'buyer', 'Appraisal Report',                          'Title & Appraisal',         'When available',       'TC',    210),
  ('buyer.appraisal_resolution','buyer', 'Appraisal Objection / Resolution',          'Title & Appraisal',         'Per deadline',         'Agent', 220),
  ('buyer.loan_app',            'buyer', 'Loan Application Confirmation',             'Financing',                 'Week 1 UC',            'TC',    230),
  ('buyer.conditional_approval','buyer', 'Conditional Loan Approval',                 'Financing',                 'Per deadline',         'TC',    240),
  ('buyer.clear_to_close',      'buyer', 'Final Loan Approval / Clear-to-Close',      'Financing',                 'Pre-closing',          'TC',    250),
  ('buyer.insurance_binder',    'buyer', 'Homeowner''s Insurance Binder',             'Financing',                 'Per lender requirement','TC',   260),
  ('buyer.hoa_package',         'buyer', 'HOA Documents Package (received)',          'HOA',                       'Per contract',         'TC',    270),
  ('buyer.hoa_objection',       'buyer', 'HOA Document Review / Objection',           'HOA',                       'Per deadline',         'Agent', 280),
  ('buyer.hoa_transfer',        'buyer', 'HOA Transfer Fee Payment',                  'HOA',                       'At closing',           'TC',    290),
  ('buyer.closing_disclosure',  'buyer', 'Closing Disclosure / Settlement Statement', 'Closing',                   '3 days before close',  'TC',    300),
  ('buyer.wire_confirmation',   'buyer', 'Wire Transfer Confirmation / Cashier''s Check','Closing',                'At closing',           'TC',    310),
  ('buyer.walkthrough_confirm', 'buyer', 'Final Walkthrough Confirmation',            'Closing',                   '24-48 hrs before close','TC',   320),
  ('buyer.recorded_deed',       'buyer', 'Recorded Deed (copy)',                      'Post-Closing',              'After closing',        'TC',    330),
  ('buyer.title_policy',        'buyer', 'Title Insurance Policy',                    'Post-Closing',              'After closing',        'TC',    340),
  ('buyer.final_package',       'buyer', 'Final Closing Package (complete file)',     'Post-Closing',              'Within 1 week',        'TC',    350),
  ('buyer.commission_statement','buyer', 'Commission Verification / Statement',       'Post-Closing',              'At closing',           'TC',    360)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, phase = EXCLUDED.phase, required_by = EXCLUDED.required_by,
  responsible_party = EXCLUDED.responsible_party, sort_order = EXCLUDED.sort_order, updated_at = now();

-- Listing documents
INSERT INTO transaction_document_templates (template_key, applies_to, name, phase, required_by, responsible_party, sort_order) VALUES
  ('listing.listing_agreement',     'listing', 'Listing Agreement (fully executed)',         'Listing Agreement & Agency', 'At listing',              'Agent',  10),
  ('listing.agency_disclosure',     'listing', 'Agency Disclosure / Acknowledgment',         'Listing Agreement & Agency', 'At listing',              'Agent',  20),
  ('listing.seller_disclosure',     'listing', 'Seller Property Disclosure',                 'Listing Agreement & Agency', 'At listing / within days','Agent',  30),
  ('listing.lead_paint',            'listing', 'Lead-Based Paint Disclosure (pre-1978 homes)','Listing Agreement & Agency','At listing',              'Agent',  40),
  ('listing.hoa_disclosure',        'listing', 'HOA Disclosure / Resale Certificate',        'Listing Agreement & Agency', 'Within first week',       'Agent',  50),
  ('listing.sqft_disclosure',       'listing', 'Square Footage Disclosure (if required)',    'Listing Agreement & Agency', 'At listing',              'Agent',  60),
  ('listing.title_commitment',      'listing', 'Preliminary Title Report / Title Commitment','Title & Ownership',          'Within first week',       'TC',     70),
  ('listing.survey',                'listing', 'Property Survey (if available)',             'Title & Ownership',          'Before closing',          'TC',     80),
  ('listing.deed_review',           'listing', 'Deed (for review)',                          'Title & Ownership',          'Before closing',          'TC',     90),
  ('listing.trust_poa',             'listing', 'Trust Documents / Power of Attorney',        'Title & Ownership',          'Before closing',          'Agent', 100),
  ('listing.divorce_decree',        'listing', 'Divorce Decree / Court Order (if applicable)','Title & Ownership',         'Before closing',          'Agent', 110),
  ('listing.purchase_contract',     'listing', 'Purchase Contract (fully executed)',         'Under Contract',             'At acceptance',           'Agent', 120),
  ('listing.addenda',               'listing', 'All Addenda and Amendments',                 'Under Contract',             'As executed',             'Agent', 130),
  ('listing.earnest_receipt',       'listing', 'Earnest Money Receipt',                      'Under Contract',             'Per contract deadline',   'TC',    140),
  ('listing.inspection_resolution', 'listing', 'Inspection Report / Objection / Resolution', 'Under Contract',             'Per deadlines',           'TC',    150),
  ('listing.appraisal_report',      'listing', 'Appraisal Report',                           'Under Contract',             'When available',          'TC',    160),
  ('listing.hoa_package_buyer',     'listing', 'HOA Documents Package for Buyer',            'Under Contract',             'Per contract',            'TC',    170),
  ('listing.repair_receipts',       'listing', 'Repair Receipts and Documentation',          'Under Contract',             'Before closing',          'TC',    180),
  ('listing.contingency_removal',   'listing', 'Contingency Removal / Waiver Notices',       'Under Contract',             'Per deadlines',           'TC',    190),
  ('listing.closing_disclosure',    'listing', 'Closing Disclosure / Settlement Statement',  'Closing',                    '3 days before close',     'TC',    200),
  ('listing.commission_auth',       'listing', 'Commission Disbursement Authorization',      'Closing',                    'Before closing',          'TC',    210),
  ('listing.utility_transfer',      'listing', 'Utility Transfer Information',               'Closing',                    'Before closing',          'Agent', 220),
  ('listing.home_warranty',         'listing', 'Home Warranty Documentation',                'Closing',                    'Before closing',          'TC',    230),
  ('listing.walkthrough_confirm',   'listing', 'Final Walkthrough Confirmation',             'Closing',                    '24-48 hrs before close',  'TC',    240),
  ('listing.recorded_deed_confirm', 'listing', 'Recorded Deed Confirmation',                 'Post-Closing',               'After closing',           'TC',    250),
  ('listing.final_package',         'listing', 'Final Closing Package (complete file)',      'Post-Closing',               'Within 1 week',           'TC',    260),
  ('listing.commission_statement',  'listing', 'Commission Verification / Statement',        'Post-Closing',               'At closing',              'TC',    270)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, phase = EXCLUDED.phase, required_by = EXCLUDED.required_by,
  responsible_party = EXCLUDED.responsible_party, sort_order = EXCLUDED.sort_order, updated_at = now();

-- ─── Seed: Deadline templates ────────────────────────────────────────────────

-- Buyer deadlines
INSERT INTO transaction_deadline_templates (template_key, applies_to, description, default_offset, responsible_party, sort_order) VALUES
  ('buyer.contract_acceptance',     'buyer', 'Contract Acceptance / Binding Agreement Date',  0,    'Agent',  10),
  ('buyer.earnest_money',           'buyer', 'Earnest Money Deposit Deadline',                3,    'TC',     20),
  ('buyer.inspection_deadline',     'buyer', 'Home Inspection Deadline',                      10,   'TC',     30),
  ('buyer.inspection_objection',    'buyer', 'Inspection Objection Deadline',                 12,   'Agent',  40),
  ('buyer.inspection_resolution',   'buyer', 'Inspection Resolution Deadline',                15,   'Agent',  50),
  ('buyer.specialty_inspection',    'buyer', 'Radon / Specialty Inspection Deadline',         10,   'TC',     60),
  ('buyer.appraisal_deadline',      'buyer', 'Appraisal Deadline',                            21,   'TC',     70),
  ('buyer.appraisal_objection',     'buyer', 'Appraisal Objection / Resolution Deadline',     24,   'Agent',  80),
  ('buyer.title_delivery',          'buyer', 'Title Commitment Delivery Deadline',            7,    'TC',     90),
  ('buyer.title_objection',         'buyer', 'Title Objection Deadline',                      14,   'Agent', 100),
  ('buyer.title_resolution',        'buyer', 'Title Resolution Deadline',                     20,   'Agent', 110),
  ('buyer.hoa_delivery',            'buyer', 'HOA Document Delivery Deadline',                7,    'TC',    120),
  ('buyer.hoa_objection',           'buyer', 'HOA Document Review / Objection Deadline',      14,   'Agent', 130),
  ('buyer.survey_deadline',         'buyer', 'Survey Deadline',                               14,   'TC',    140),
  ('buyer.loan_commitment',         'buyer', 'Loan Approval / Commitment Deadline',           21,   'TC',    150),
  ('buyer.financing_contingency',   'buyer', 'Financing Contingency Deadline',                25,   'TC',    160),
  ('buyer.sale_of_property',        'buyer', 'Sale of Buyer''s Property Deadline',            null, 'Agent', 170),
  ('buyer.final_walkthrough',       'buyer', 'Final Walkthrough Date',                        29,   'TC',    180),
  ('buyer.closing_date',            'buyer', 'Closing Date',                                  30,   'Agent', 190),
  ('buyer.possession_date',         'buyer', 'Possession Date',                               30,   'Agent', 200)
ON CONFLICT (template_key) DO UPDATE SET
  description = EXCLUDED.description, default_offset = EXCLUDED.default_offset,
  responsible_party = EXCLUDED.responsible_party, sort_order = EXCLUDED.sort_order, updated_at = now();

-- Listing deadlines
INSERT INTO transaction_deadline_templates (template_key, applies_to, description, default_offset, responsible_party, sort_order) VALUES
  ('listing.contract_acceptance',   'listing', 'Contract Acceptance / Binding Agreement Date', 0,    'Agent',  10),
  ('listing.earnest_money',         'listing', 'Earnest Money Deposit Deadline',               3,    'TC',     20),
  ('listing.seller_disclosure',     'listing', 'Seller Disclosure Delivery Deadline',          5,    'Agent',  30),
  ('listing.inspection_objection',  'listing', 'Buyer Inspection Objection Deadline',          12,   'TC',     40),
  ('listing.inspection_resolution', 'listing', 'Inspection Resolution Deadline',               15,   'Agent',  50),
  ('listing.appraisal_deadline',    'listing', 'Appraisal Deadline',                           21,   'TC',     60),
  ('listing.appraisal_objection',   'listing', 'Appraisal Objection / Resolution Deadline',    24,   'Agent',  70),
  ('listing.hoa_delivery',          'listing', 'HOA Document Delivery Deadline',               7,    'TC',     80),
  ('listing.hoa_objection',         'listing', 'HOA Document Objection Deadline',              14,   'TC',     90),
  ('listing.loan_commitment',       'listing', 'Loan Approval / Commitment Deadline',          21,   'TC',    100),
  ('listing.title_objection',       'listing', 'Title Objection Deadline',                     14,   'Agent', 110),
  ('listing.title_resolution',      'listing', 'Title Resolution Deadline',                    20,   'Agent', 120),
  ('listing.survey_deadline',       'listing', 'Survey Deadline',                              14,   'TC',    130),
  ('listing.closing_date',          'listing', 'Closing Date',                                 30,   'Agent', 140),
  ('listing.possession_date',       'listing', 'Possession / Move-Out Date',                   30,   'Agent', 150),
  ('listing.rentback_end',          'listing', 'Rent-Back End Date (if applicable)',           null, 'Agent', 160)
ON CONFLICT (template_key) DO UPDATE SET
  description = EXCLUDED.description, default_offset = EXCLUDED.default_offset,
  responsible_party = EXCLUDED.responsible_party, sort_order = EXCLUDED.sort_order, updated_at = now();
