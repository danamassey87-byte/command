-- BBA signed date and expiration date columns
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bba_signed_date DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bba_expiration_date DATE;
