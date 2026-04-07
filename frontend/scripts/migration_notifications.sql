-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Notifications Center
-- A unified inbox of in-app notifications with snooze/dismiss/keep semantics.
-- All future features (form returns, lead created, appointments booked,
-- phase changes, multi-user updates) should INSERT into this table.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  user_id       uuid,                                  -- recipient (nullable until Auth lands)
  type          text not null,                         -- e.g. 'form_returned', 'lead_created', 'appointment_booked', 'phase_change', 'task_due'
  title         text not null,
  body          text,
  link          text,                                  -- in-app route to deep-link to (e.g. /crm/buyers/:id)
  source_table  text,                                  -- e.g. 'contacts', 'listings', 'intake_form_responses'
  source_id     uuid,                                  -- row id of the source record
  status        text not null default 'unread'
                check (status in ('unread','read','kept','snoozed','dismissed')),
  snooze_until  timestamptz,                           -- when a snoozed item should reappear
  metadata      jsonb default '{}'::jsonb              -- arbitrary per-type payload
);

create index if not exists notifications_user_status_idx
  on notifications (user_id, status, created_at desc);

create index if not exists notifications_type_idx
  on notifications (type);

create index if not exists notifications_snooze_idx
  on notifications (snooze_until)
  where status = 'snoozed';

-- Auto-update updated_at (reuse set_updated_at() created in migration_global_quick_add.sql)
drop trigger if exists trg_notifications_updated_at on notifications;
create trigger trg_notifications_updated_at
  before update on notifications
  for each row execute function set_updated_at();
