-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add lead_source + mls_status to contacts
--
-- lead_source — Where the contact originally came from:
--   expired, fsbo, circle, soi, referral, open_house, intake_form, etc.
-- mls_status  — Current MLS status for expired-sourced contacts:
--   active, sold, back_on_market, expired, withdrawn, cancelled, etc.
--
-- Also widens the type CHECK to include 'both' (buyer & seller).
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add new columns
alter table contacts add column if not exists lead_source text;
alter table contacts add column if not exists mls_status text;

-- 2. Index lead_source for fast filtering
create index if not exists contacts_lead_source_idx on contacts(lead_source) where lead_source is not null;

-- 3. Widen type CHECK to include 'both'
--    Drop the old constraint (if it exists) and recreate with the full set.
do $$ begin
  -- The original constraint is unnamed → Postgres names it contacts_type_check
  alter table contacts drop constraint if exists contacts_type_check;
exception when others then null;
end $$;

alter table contacts add constraint contacts_type_check
  check (type in ('buyer', 'seller', 'both', 'investor', 'lead'));

-- 4. Refresh PostgREST schema cache
notify pgrst, 'reload schema';
