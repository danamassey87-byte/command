-- Migration: add vendor_ids (uuid[]) to daily_tasks for multi-vendor task linking
-- Run this in Supabase SQL editor. Idempotent.

-- 1. Add vendor_ids column
alter table public.daily_tasks
  add column if not exists vendor_ids uuid[] not null default '{}';

-- 2. Backfill from the legacy single vendor_id column (if present)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_tasks'
      and column_name = 'vendor_id'
  ) then
    update public.daily_tasks
      set vendor_ids = array[vendor_id]
      where vendor_id is not null
        and (vendor_ids is null or array_length(vendor_ids, 1) is null);
  end if;
end$$;

-- 3. Index for "tasks linked to a vendor" lookups
create index if not exists idx_daily_tasks_vendor_ids
  on public.daily_tasks using gin (vendor_ids);
