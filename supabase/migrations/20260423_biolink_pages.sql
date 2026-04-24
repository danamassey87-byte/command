-- ─── Bio Link Pages ──────────────────────────────────────────────────────────
-- Persists the page builder config and serves it on a public slug.

create table if not exists biolink_pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null default 'My Link Page',
  page_json   jsonb not null default '{}'::jsonb,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Leads captured through bio link forms / guide downloads
create table if not exists biolink_leads (
  id            uuid primary key default gen_random_uuid(),
  page_id       uuid references biolink_pages(id) on delete set null,
  block_id      text,                              -- the block.id from page_json
  name          text,
  email         text,
  phone         text,
  guide_type    text,                              -- buyer, seller, relocation, etc.
  source        text not null default 'biolink',
  contact_id    uuid references contacts(id) on delete set null,  -- linked after upsert
  campaign_id   uuid references campaigns(id) on delete set null, -- auto-enrolled campaign
  created_at    timestamptz not null default now()
);

-- Index for slug lookup (public page)
create index if not exists idx_biolink_pages_slug on biolink_pages (slug) where published = true;

-- Index for leads by page
create index if not exists idx_biolink_leads_page on biolink_leads (page_id);

-- Allow anon read for published pages
alter table biolink_pages enable row level security;
create policy "Anyone can read published biolink pages"
  on biolink_pages for select using (published = true);
create policy "Authenticated users manage biolink pages"
  on biolink_pages for all using (true) with check (true);

-- Allow anon insert for leads (public form submissions)
alter table biolink_leads enable row level security;
create policy "Anyone can submit biolink leads"
  on biolink_leads for insert with check (true);
create policy "Authenticated users manage biolink leads"
  on biolink_leads for all using (true) with check (true);
