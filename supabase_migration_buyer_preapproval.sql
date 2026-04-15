-- Pre-approval amount and lender name for buyer contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pre_approval_amount NUMERIC;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lender_name TEXT;
