-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add 'task' and 'manual_email' step types to campaigns
-- Run AFTER migration_campaigns_schema.sql
--
-- What's new:
--   * campaign_steps.type now accepts 'task' and 'manual_email' in addition to
--     'email' and 'sms'
--   * campaign_steps.requires_approval boolean — for manual_email steps that
--     need Dana to click Approve before they're sent (never auto-fired)
--   * campaign_steps.task_title / task_notes / task_link — for task-type steps
--     (no email/sms sent; renders as a todo in the Send Queue)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the existing type CHECK constraint if one exists, then re-add a wider one.
do $$
declare
  cn text;
begin
  select c.conname into cn
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'campaign_steps'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%type%';
  if cn is not null then
    execute format('alter table campaign_steps drop constraint %I', cn);
  end if;
end $$;

-- Re-add as a non-strict hint: PostgREST lets any text through anyway; this
-- guards against typos only. We use a partial check that still allows NULL.
alter table campaign_steps
  add constraint campaign_steps_type_check
  check (type in ('email', 'sms', 'task', 'manual_email'));

-- New columns
alter table campaign_steps
  add column if not exists requires_approval boolean not null default false;
alter table campaign_steps
  add column if not exists task_title text;
alter table campaign_steps
  add column if not exists task_notes text;
alter table campaign_steps
  add column if not exists task_link text;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
