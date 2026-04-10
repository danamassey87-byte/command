-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Resend tracking columns on campaign_step_history + campaigns
-- Run AFTER migration_campaigns_schema.sql
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- campaign_step_history: Resend tracking columns
alter table campaign_step_history add column if not exists resend_email_id text;
alter table campaign_step_history add column if not exists delivery_status text default 'pending';
alter table campaign_step_history add column if not exists delivered_at   timestamptz;
alter table campaign_step_history add column if not exists opened_at      timestamptz;
alter table campaign_step_history add column if not exists open_count     integer default 0;
alter table campaign_step_history add column if not exists clicked_at     timestamptz;
alter table campaign_step_history add column if not exists click_count    integer default 0;
alter table campaign_step_history add column if not exists last_clicked_url text;
alter table campaign_step_history add column if not exists bounce_type    text;
alter table campaign_step_history add column if not exists error_message  text;

create index if not exists csh_resend_email_idx
  on campaign_step_history(resend_email_id) where resend_email_id is not null;

-- campaigns: auto_send toggle (default OFF for safety)
-- This column may already exist from the original campaigns schema — safe either way.
alter table campaigns add column if not exists auto_send_enabled boolean not null default false;

-- email_suppressions: ensure the email column has a unique constraint for upserts
-- (may already exist from migration_campaigns_schema)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'email_suppressions_email_key'
  ) then
    -- Try adding unique on email; skip if there's already one by a different name
    begin
      alter table email_suppressions add constraint email_suppressions_email_key unique (email);
    exception when duplicate_table then null;
    when others then
      raise notice 'email_suppressions unique constraint skipped: %', sqlerrm;
    end;
  end if;
end $$;

notify pgrst, 'reload schema';
