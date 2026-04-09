-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Vendor Rolodex + Listing Parties (v2)
--   1. vendors             — global vendor/partner contact rolodex
--   2. vendor_assignments  — companion table used by DailyTasks view
--   3. listing_parties     — per-listing assignments (co-buyers, agents, vendors)
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- #1  Vendors — global contact rolodex
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists vendors (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),

  -- Classification
  role              text not null default 'other',
  role_group        text,

  -- Identity
  name              text not null,
  company           text,
  title             text,

  -- Reach
  email             text,
  phone             text,
  phone_secondary   text,
  website           text,

  -- Address
  address_line_1    text,
  city              text,
  state             text default 'AZ',
  zip               text,

  -- Licensing
  license_number    text,
  license_state     text,

  -- Reputation / workflow
  preferred         boolean default false,
  rating            int,
  specialties       text[],
  tags              text[],

  -- Notes / soft-delete
  notes             text,
  deleted_at        timestamptz,

  -- Normalized fields for fuzzy search / dedupe
  name_normalized   text generated always as (lower(trim(coalesce(name, '')))) stored,
  email_normalized  text generated always as (
    nullif(lower(trim(coalesce(email, ''))), '')
  ) stored,
  phone_normalized  text generated always as (
    nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')
  ) stored
);

-- If the table existed in some partial form, add anything that's missing.
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
alter table vendors add column if not exists updated_at       timestamptz default now();

-- Normalized columns — only create if missing
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

create index if not exists vendors_role_idx           on vendors(role)           where deleted_at is null;
create index if not exists vendors_role_group_idx     on vendors(role_group)     where deleted_at is null;
create index if not exists vendors_preferred_idx      on vendors(preferred)      where deleted_at is null and preferred = true;
create index if not exists vendors_name_norm_idx      on vendors(name_normalized) where deleted_at is null;
create index if not exists vendors_email_norm_idx     on vendors(email_normalized) where deleted_at is null and email_normalized is not null;
create index if not exists vendors_phone_norm_idx     on vendors(phone_normalized) where deleted_at is null and phone_normalized is not null;

-- Keep updated_at fresh on every row update
create or replace function touch_vendors_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_vendors_touch on vendors;
create trigger trg_vendors_touch
  before update on vendors
  for each row execute function touch_vendors_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- #2  vendor_assignments — referenced by the DailyTasks vendors view
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists vendor_assignments (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  vendor_id       uuid references vendors(id) on delete cascade,
  deal_id         uuid,
  property_address text,
  service_type    text,
  scheduled_date  date,
  scheduled_time  time,
  cost            numeric,
  status          text default 'pending',
  notes           text
);
create index if not exists vendor_assignments_vendor_idx on vendor_assignments(vendor_id);
create index if not exists vendor_assignments_deal_idx   on vendor_assignments(deal_id) where deal_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- #3  listing_parties — per-listing assignment of people/vendors
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists listing_parties (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  listing_id    uuid references listings(id) on delete cascade,

  -- Optional link to the global rolodex
  vendor_id     uuid references vendors(id) on delete set null,

  -- Classification
  role          text not null,
  role_group    text,

  -- Snapshot fields (used when vendor_id is null)
  name          text,
  company       text,
  email         text,
  phone         text,
  notes         text,

  sort_order    int default 0,
  deleted_at    timestamptz
);

create index if not exists listing_parties_listing_idx
  on listing_parties(listing_id) where deleted_at is null;

create index if not exists listing_parties_role_group_idx
  on listing_parties(listing_id, role_group) where deleted_at is null;

create index if not exists listing_parties_vendor_idx
  on listing_parties(vendor_id) where deleted_at is null and vendor_id is not null;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
