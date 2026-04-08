-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Relaunch Plan features
--   1. listings.source       — 'new' | 'my_expired' | 'taken_over' | 'fsbo'
--   2. listings.strategy     — AI-generated narrative strategy (markdown)
--   3. checklist_tasks.deleted_at — soft delete for restore
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- #1 Listing source
alter table listings add column if not exists source text;
-- Backfill: anything already flagged type='expired' without a source becomes 'my_expired'
update listings
   set source = 'my_expired'
 where source is null and type = 'expired';
update listings
   set source = 'new'
 where source is null and type = 'new';

-- #2 AI-generated strategy narrative
alter table listings add column if not exists strategy          text;
alter table listings add column if not exists strategy_updated_at timestamptz;

-- #3 Soft delete on checklist tasks
alter table checklist_tasks add column if not exists deleted_at timestamptz;
create index if not exists checklist_tasks_deleted_at_idx
  on checklist_tasks(deleted_at) where deleted_at is not null;
create index if not exists checklist_tasks_listing_active_idx
  on checklist_tasks(listing_id) where deleted_at is null;
