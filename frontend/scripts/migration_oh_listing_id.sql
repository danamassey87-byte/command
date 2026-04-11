-- Add listing_id to open_houses so an OH can be linked to a specific listing
-- Also adds listing_id index for fast lookups from the Listings page
-- Idempotent. Safe to re-run.

alter table open_houses
  add column if not exists listing_id uuid references listings(id) on delete set null;

create index if not exists oh_listing_idx on open_houses(listing_id) where listing_id is not null;

-- Auto-match existing OHs to listings by property_id where possible
update open_houses oh
set listing_id = (
  select l.id from listings l
  where l.property_id = oh.property_id
  and l.status in ('active', 'pending')
  limit 1
)
where oh.listing_id is null
  and oh.property_id is not null;

notify pgrst, 'reload schema';
