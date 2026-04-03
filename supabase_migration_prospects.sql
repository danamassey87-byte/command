-- ─────────────────────────────────────────────────────────────────────────────
-- Prospects table — unified prospecting across all source types
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists prospects (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  user_id             uuid references auth.users(id),

  -- Person info
  name                text not null,
  phone               text,
  email               text,

  -- Property info (for FSBO, expired, circle)
  address             text,
  city                text,
  zip                 text,
  mls_id              text,
  list_price          numeric,

  -- Classification
  source              text not null check (source in ('expired','fsbo','circle','soi','referral','open_house')),
  status              text not null default 'new' check (status in ('new','contacted','nurturing','hot','converted','dead')),

  -- Tracking
  last_contacted      date,
  next_follow_up      date,
  notes               text,

  -- Per-source workflow progress (keys = step ids, values = completion timestamps)
  workflow_steps      jsonb default '{}',

  -- Conversion link
  converted_contact_id uuid references contacts(id)
);

-- Indexes for common queries
create index if not exists idx_prospects_source on prospects(source);
create index if not exists idx_prospects_status on prospects(status);
create index if not exists idx_prospects_user   on prospects(user_id);
create index if not exists idx_prospects_next   on prospects(next_follow_up);

-- RLS (enable when auth is fully wired)
-- alter table prospects enable row level security;
-- create policy "Users see own prospects" on prospects for all using (auth.uid() = user_id);
