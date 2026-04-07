-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Global Quick-Add bar support
-- Adds: listing_appointments table, contacts.lead_intent column,
--       normalized-address index on properties for dup matching,
--       pg_trgm extension + trigram index on contacts.name for fuzzy search
-- ─────────────────────────────────────────────────────────────────────────────

-- Fuzzy name matching via trigrams
create extension if not exists pg_trgm;

-- ─── contacts: track whether a lead is a buyer-lead or seller-lead ───────────
alter table contacts add column if not exists lead_intent text
  check (lead_intent in ('buyer','seller'));

-- Trigram index on name for fast fuzzy lookups (ILIKE / % operator)
create index if not exists contacts_name_trgm_idx
  on contacts using gin (name gin_trgm_ops);

-- Normalized address for dedupe: strip punctuation, lowercase, collapse spaces.
-- Use an expression index so we can lookup by normalized form directly.
create index if not exists properties_normalized_address_idx
  on properties (
    lower(regexp_replace(address, '[^a-zA-Z0-9]+', ' ', 'g'))
  );

-- ─── listing_appointments ────────────────────────────────────────────────────
-- A scheduled seller consultation. May be linked to an existing contact
-- (required) and an existing property (optional — may be gathered at appt).
create table if not exists listing_appointments (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  contact_id     uuid not null references contacts(id) on delete cascade,
  property_id    uuid references properties(id) on delete set null,
  scheduled_at   timestamptz not null,
  location       text,
  status         text check (status in ('scheduled','held','cancelled','converted','no_show'))
                 default 'scheduled',
  source         text,            -- how did this appointment originate?
  notes          text,
  -- If the appointment converts to a signed listing, track the FK
  converted_listing_id uuid references listings(id) on delete set null
);

create index if not exists listing_appointments_contact_idx
  on listing_appointments (contact_id);
create index if not exists listing_appointments_scheduled_idx
  on listing_appointments (scheduled_at desc);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_listing_appointments_updated_at on listing_appointments;
create trigger trg_listing_appointments_updated_at
  before update on listing_appointments
  for each row execute function set_updated_at();
