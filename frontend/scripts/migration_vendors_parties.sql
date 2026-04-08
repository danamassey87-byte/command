-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Vendor Rolodex + Listing Parties
--   1. vendors          — global vendor/partner contact rolodex
--   2. listing_parties  — per-listing assignments (co-buyers, agents, vendors)
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- #1  Vendors — extend the existing rolodex with rich contact fields
-- ═══════════════════════════════════════════════════════════════════════════
-- The `vendors` table already exists (basic name/company/role/phone/email/
-- website/notes/rating). Add the fields we need for contract parties, PDF
-- packet export, and fuzzy search.
alter table vendors add column if not exists role_group       text;
alter table vendors add column if not exists title            text;
alter table vendors add column if not exists phone_secondary  text;
alter table vendors add column if not exists address_line_1   text;
alter table vendors add column if not exists city             text;
alter table vendors add column if not exists state            text default 'AZ';
alter table vendors add column if not exists zip              text;
alter table vendors add column if not exists license_number   text;
alter table vendors add column if not exists license_state    text;
alter table vendors add column if not exists preferred        boolean default false;
alter table vendors add column if not exists specialties      text[];
alter table vendors add column if not exists tags             text[];
alter table vendors add column if not exists deleted_at       timestamptz;

-- Normalized fields for fuzzy search / dedupe (only add if missing)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendors' and column_name = 'name_normalized'
  ) then
    alter table vendors add column name_normalized text
      generated always as (lower(trim(coalesce(name, '')))) stored;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendors' and column_name = 'email_normalized'
  ) then
    alter table vendors add column email_normalized text
      generated always as (nullif(lower(trim(coalesce(email, ''))), '')) stored;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendors' and column_name = 'phone_normalized'
  ) then
    alter table vendors add column phone_normalized text
      generated always as (nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')) stored;
  end if;
end $$;

create index if not exists vendors_role_group_idx     on vendors(role_group)     where deleted_at is null;
create index if not exists vendors_preferred_idx      on vendors(preferred)      where deleted_at is null and preferred = true;
create index if not exists vendors_name_norm_idx      on vendors(name_normalized) where deleted_at is null;
create index if not exists vendors_email_norm_idx     on vendors(email_normalized) where deleted_at is null and email_normalized is not null;
create index if not exists vendors_phone_norm_idx     on vendors(phone_normalized) where deleted_at is null and phone_normalized is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- #2  Listing Parties — link a listing to a person/vendor in a specific role
-- ═══════════════════════════════════════════════════════════════════════════
-- A listing can have many parties: co-seller, buyer's agent, TC, inspector, etc.
-- Each row EITHER references a vendors row (vendor_id) OR holds freeform fields
-- (name/email/phone/company). The UI can upsert freeform rows into vendors later.
create table if not exists listing_parties (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  listing_id    uuid references listings(id) on delete cascade,

  -- Optional link to the global rolodex
  vendor_id     uuid references vendors(id) on delete set null,

  -- Classification (same scheme as vendors.role / role_group)
  role          text not null,     -- 'co_seller', 'buyer_agent', 'inspector', etc.
  role_group    text,              -- 'contract' | 'representation' | 'vendor' | 'other'

  -- Snapshot fields (used if vendor_id is null, or if we want a per-listing override)
  name          text,
  company       text,
  email         text,
  phone         text,
  notes         text,

  -- Sort + soft delete
  sort_order    int default 0,
  deleted_at    timestamptz
);

create index if not exists listing_parties_listing_idx
  on listing_parties(listing_id)
  where deleted_at is null;

create index if not exists listing_parties_role_group_idx
  on listing_parties(listing_id, role_group)
  where deleted_at is null;

create index if not exists listing_parties_vendor_idx
  on listing_parties(vendor_id)
  where deleted_at is null and vendor_id is not null;
