-- Add contact_id and listing_id to expenses for client attribution
alter table expenses add column if not exists contact_id uuid references contacts(id);
alter table expenses add column if not exists listing_id uuid references listings(id);

-- Index for quick lookups by client/listing
create index if not exists idx_expenses_contact_id on expenses(contact_id) where contact_id is not null;
create index if not exists idx_expenses_listing_id on expenses(listing_id) where listing_id is not null;

-- Deduplicate expense_categories by name+type (keep lowest sort_order row)
delete from expense_categories
where id not in (
  select distinct on (name, type) id
  from expense_categories
  order by name, type, sort_order asc, id asc
);
