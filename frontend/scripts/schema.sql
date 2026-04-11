-- ─────────────────────────────────────────────────────────────────────────────
-- Antigravity Real Estate — Supabase Schema
-- Paste this into: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── contacts ────────────────────────────────────────────────────────────────
-- Everyone: buyers, sellers, investors, leads
create table if not exists contacts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  name          text not null,
  email         text,
  phone         text,
  type          text check (type in ('buyer','seller','investor','lead')) default 'buyer',
  source        text,
  stage         text,
  notes         text,
  budget_min    numeric,
  budget_max    numeric,
  bba_signed    boolean default false,
  bba_expiration_date date,
  areas         text[],
  beds_min      int,
  baths_min     int
);

-- ─── properties ──────────────────────────────────────────────────────────────
-- Every property address — listings, expired, showings
create table if not exists properties (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  address       text not null,
  city          text,
  state         text default 'AZ',
  zip           text,
  price         numeric,
  bedrooms      int,
  bathrooms     numeric,
  sqft          int,
  status        text,
  mls_id        text,
  property_type text,
  hoa_monthly   numeric,
  list_date     date,
  expired_date  date,
  dom           int,
  image_url     text,
  listing_url   text
);

-- ─── listings ────────────────────────────────────────────────────────────────
-- Seller + property relationship with workflow state
create table if not exists listings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  contact_id    uuid references contacts(id) on delete cascade,
  property_id   uuid references properties(id) on delete cascade,
  type          text check (type in ('new','expired')) default 'new',
  status        text check (status in ('active','pending','closed','expired','relaunching')) default 'active',
  list_price    numeric,
  current_price numeric,
  list_date     date,
  close_date    date,
  offers_count  int default 0,
  dom           int default 0,
  notes         text,
  -- Seller tracking
  cash_offer_requested     boolean default false,
  cash_offer_status        text default 'none',
  showing_access           text default 'lockbox',
  staging                  text default 'none',
  photography_status       text default 'not_scheduled',
  seller_motivation        text default 'medium',
  concessions              text default 'none',
  property_condition       text default 'move_in_ready',
  commission_rate          numeric,
  listing_agreement_signed boolean default false,
  agreement_signed_date    date,
  agreement_expires_date   date,
  pre_inspection_done      boolean default false,
  home_warranty_offered    boolean default false
);

-- ─── client_avatars ─────────────────────────────────────────────────────────
create table if not exists client_avatars (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  type             text not null check (type in ('buyer','seller')),
  name             text not null default 'Untitled Avatar',
  age_range        text,
  income_range     text,
  family_status    text,
  motivation       text,
  property_type    text,
  price_range_min  numeric,
  price_range_max  numeric,
  locations        text[],
  pain_points      text,
  online_platforms text[],
  content_resonates text,
  notes            text
);

-- ─── checklist_tasks ─────────────────────────────────────────────────────────
-- Launch/Relaunch plan steps with due dates and reminders
create table if not exists checklist_tasks (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  listing_id    uuid references listings(id) on delete cascade,
  phase         text not null,
  label         text not null,
  completed     boolean default false,
  completed_at  timestamptz,
  due_date      date,
  reminded_at   timestamptz,
  sort_order    int default 0
);

-- ─── listing_documents ───────────────────────────────────────────────────────
-- Attached files (disclosures, photos, contracts, etc.) per listing
create table if not exists listing_documents (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  listing_id  uuid references listings(id) on delete cascade,
  name        text not null,
  file_url    text not null,
  file_path   text not null,
  file_type   text,
  file_size   bigint,
  category    text default 'general'
);

-- ─── transactions ─────────────────────────────────────────────────────────────
create table if not exists transactions (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  contact_id            uuid references contacts(id),
  property_id           uuid references properties(id),
  status                text,
  offer_price           numeric,
  accepted_date         date,
  escrow_opened         boolean default false,
  inspection_scheduled  boolean default false,
  binsr_submitted       text,
  closing_date          date,
  commission_amount     numeric,
  notes                 text
);

-- ─── showing_sessions ────────────────────────────────────────────────────────
-- Groups showings into an itinerary for a buyer
create table if not exists showing_sessions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  contact_id    uuid references contacts(id) on delete cascade,
  date          date,
  notes         text,
  itinerary_url text,
  recap_sent    boolean default false
);

-- ─── showings ────────────────────────────────────────────────────────────────
create table if not exists showings (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  contact_id     uuid references contacts(id),
  property_id    uuid references properties(id),
  session_id     uuid references showing_sessions(id),
  scheduled_at   timestamptz,
  status         text default 'scheduled',
  feedback       text,
  interest_level text,
  notes          text
);

-- ─── open_houses ─────────────────────────────────────────────────────────────
create table if not exists open_houses (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  property_id     uuid references properties(id),
  date            date,
  start_time      time,
  end_time        time,
  status          text default 'scheduled',
  inquiries_count int default 0,
  sign_in_count   int default 0,
  leads_count     int default 0,
  notes           text,
  checklist       jsonb default '{}'
);

-- ─── leads ───────────────────────────────────────────────────────────────────
-- Expired cannonball workflow
create table if not exists leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  property_id         uuid references properties(id),
  stage               text default 'Identified',
  relisted            boolean default false,
  relisted_date       date,
  last_contact_date   date,
  next_follow_up_date date,
  notes               text
);

-- ─── investors ───────────────────────────────────────────────────────────────
create table if not exists investors (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  contact_id          uuid references contacts(id) on delete cascade,
  strategy            text check (strategy in ('buy-hold','fix-flip','multi-family')),
  assets_count        int default 0,
  buy_box_type        text,
  buy_box_price_min   numeric,
  buy_box_price_max   numeric,
  buy_box_areas       text[],
  buy_box_min_beds    int,
  buy_box_min_baths   int,
  buy_box_max_dom     int,
  buy_box_max_hoa     numeric,
  buy_box_min_cap_rate numeric,
  buy_box_notes       text
);

-- ─── investor_feedback ───────────────────────────────────────────────────────
create table if not exists investor_feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  investor_id uuid references investors(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  status      text check (status in ('yes','no','maybe')),
  notes       text,
  unique(investor_id, property_id)
);

-- ─── weekly_stats ─────────────────────────────────────────────────────────────
create table if not exists weekly_stats (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  week_id             text not null unique,
  productivity_days   int,
  hours_prospected    numeric,
  hours_practiced     numeric,
  live_contacts       int,
  added_to_pc         int,
  new_leads           int,
  listing_appts_set   int,
  listing_appts_held  int,
  listings_taken      int,
  listings_sold       int,
  buyer_reps_signed   int,
  buyer_sales         int,
  open_house_events   int,
  sales_closed        int,
  earned_income       numeric,
  paid_income         numeric
);

-- ─── goals ───────────────────────────────────────────────────────────────────
create table if not exists goals (
  id                  uuid primary key default gen_random_uuid(),
  year                int not null unique,
  productivity_days   int,
  hours_prospected    numeric,
  hours_practiced     numeric,
  live_contacts       int,
  added_to_pc         int,
  new_leads           int,
  listing_appts_set   int,
  listing_appts_held  int,
  listings_taken      int,
  listings_sold       int,
  buyer_reps_signed   int,
  buyer_sales         int,
  open_house_events   int,
  sales_closed        int,
  earned_income       numeric,
  paid_income         numeric
);

-- ─── activity_log ────────────────────────────────────────────────────────────
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  type        text not null,
  contact_id  uuid references contacts(id),
  property_id uuid references properties(id),
  description text,
  metadata    jsonb default '{}'
);
