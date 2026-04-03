-- ─────────────────────────────────────────────────────────────────────────────
-- Prospect Tags junction table — reuses existing tags table
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists prospect_tags (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  tag_id      uuid not null references tags(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(prospect_id, tag_id)
);

create index if not exists idx_prospect_tags_prospect on prospect_tags(prospect_id);
create index if not exists idx_prospect_tags_tag on prospect_tags(tag_id);

-- Also add a labels column to prospects for quick inline labels (comma-separated or jsonb)
alter table prospects add column if not exists labels text[] default '{}';
