-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Gmail Reply Detection
-- Adds:
--   1. gmail_reply_log — stores every detected reply for audit/display
--   2. replied_at + reply_detected on campaign_step_history
--   3. last_reply_scan_at + reply_count on contacts
-- Idempotent — safe to re-run.
-- DO NOT run against greenpros (gkzadjkijxrukigdpmbo).
-- Target: lfydlxhfctuiyykuyqnr (Client Tracker)
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ gmail_reply_log ═══════════════════════════════════════════════════════
-- Permanent record of every reply detected by gmail-reply-detect edge fn
create table if not exists gmail_reply_log (
  id                uuid primary key default gen_random_uuid(),
  contact_id        uuid references contacts(id) on delete set null,
  enrollment_id     uuid references campaign_enrollments(id) on delete set null,
  step_history_id   uuid references campaign_step_history(id) on delete set null,
  thread_id         text not null,
  reply_from_email  text not null,
  reply_from_name   text,
  subject           text,
  snippet           text,
  reply_date        timestamptz,
  campaign_id       uuid references campaigns(id) on delete set null,
  campaign_name     text,
  created_at        timestamptz default now()
);

create index if not exists grl_contact_idx   on gmail_reply_log(contact_id) where contact_id is not null;
create index if not exists grl_thread_idx    on gmail_reply_log(thread_id);
create index if not exists grl_created_idx   on gmail_reply_log(created_at desc);
create index if not exists grl_enrollment_idx on gmail_reply_log(enrollment_id) where enrollment_id is not null;

-- ═══ Add replied_at + reply_detected to campaign_step_history ══════════════
-- These columns track whether a specific sent email received a reply
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'campaign_step_history' and column_name = 'replied_at'
  ) then
    alter table campaign_step_history add column replied_at timestamptz;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'campaign_step_history' and column_name = 'reply_detected'
  ) then
    alter table campaign_step_history add column reply_detected boolean default false;
  end if;
end $$;

-- ═══ Add reply_count to campaign_enrollments ═══════════════════════════════
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'campaign_enrollments' and column_name = 'reply_count'
  ) then
    alter table campaign_enrollments add column reply_count int default 0;
  end if;
end $$;

-- ═══ Add last_reply_scan_at + reply_count to contacts ═════════════════════
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'contacts' and column_name = 'last_reply_scan_at'
  ) then
    alter table contacts add column last_reply_scan_at timestamptz;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'contacts' and column_name = 'reply_count'
  ) then
    alter table contacts add column reply_count int default 0;
  end if;
end $$;

-- Partial index for quick "show me contacts who replied" queries
create index if not exists contacts_replied_idx
  on contacts(last_reply_scan_at desc)
  where last_reply_scan_at is not null;

-- Tell PostgREST about the new tables / columns
notify pgrst, 'reload schema';
