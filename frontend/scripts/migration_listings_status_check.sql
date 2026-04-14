-- Migration: Expand listings status check constraint
-- The original constraint only allowed 5 statuses but the app supports 11 MLS statuses.

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN (
    'lead',
    'signed',
    'coming_soon',
    'active',
    'pending',
    'contingent',
    'closed',
    'withdrawn',
    'cancelled',
    'expired',
    'relaunching'
  ));
