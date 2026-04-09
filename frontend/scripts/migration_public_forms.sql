-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Public Intake Forms (shareable links + client submissions)
-- Creates: public_forms, public_form_submissions
-- Idempotent — safe to re-run.
-- Depends on: set_updated_at() from migration_global_quick_add.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ public_forms ════════════════════════════════════════════════════════════
-- A published version of an intake form that clients can fill out by URL.
-- The full form definition (fields, style, logo, etc.) lives in form_json so
-- the public viewer only needs this one row to render the entire form.
create table if not exists public_forms (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  user_id       uuid,                     -- owner (nullable until auth multi-tenancy)
  form_json     jsonb not null,           -- full form definition
  published     boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists public_forms_slug_idx  on public_forms(slug);
create index if not exists public_forms_owner_idx on public_forms(user_id) where user_id is not null;

drop trigger if exists trg_public_forms_updated_at on public_forms;
create trigger trg_public_forms_updated_at
  before update on public_forms
  for each row execute function set_updated_at();

-- ═══ public_form_submissions ═════════════════════════════════════════════════
create table if not exists public_form_submissions (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public_forms(id) on delete cascade,
  form_slug     text not null,           -- denormalized for faster owner lookup
  client_name   text,
  data          jsonb not null default '{}'::jsonb,
  user_agent    text,
  created_at    timestamptz default now()
);

create index if not exists pfs_form_idx    on public_form_submissions(form_id, created_at desc);
create index if not exists pfs_slug_idx    on public_form_submissions(form_slug, created_at desc);

-- ═══ Row Level Security ══════════════════════════════════════════════════════
alter table public_forms             enable row level security;
alter table public_form_submissions  enable row level security;

-- public_forms: anon can SELECT published forms; authed users manage anything
drop policy if exists "anon can read published forms"       on public_forms;
drop policy if exists "authed can manage public_forms"      on public_forms;

create policy "anon can read published forms"
  on public_forms for select
  to anon, authenticated
  using (published = true);

create policy "authed can manage public_forms"
  on public_forms for all
  to authenticated
  using (true)
  with check (true);

-- public_form_submissions: anon can INSERT; only authed can SELECT/DELETE
drop policy if exists "anon can insert submissions"        on public_form_submissions;
drop policy if exists "authed can read submissions"        on public_form_submissions;
drop policy if exists "authed can delete submissions"      on public_form_submissions;

create policy "anon can insert submissions"
  on public_form_submissions for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public_forms pf
      where pf.id = form_id and pf.published = true
    )
  );

create policy "authed can read submissions"
  on public_form_submissions for select
  to authenticated
  using (true);

create policy "authed can delete submissions"
  on public_form_submissions for delete
  to authenticated
  using (true);

-- Tell PostgREST about the new tables
notify pgrst, 'reload schema';
