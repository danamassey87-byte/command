-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Smart Campaigns schema (move from localStorage to Supabase)
-- Adds: campaigns, campaign_steps, campaign_enrollments, campaign_step_history,
--       campaign_audit_log, email_suppressions
-- Idempotent — safe to re-run.
-- Depends on: set_updated_at() function from migration_global_quick_add.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ campaigns ═══════════════════════════════════════════════════════════════
create table if not exists campaigns (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,
  name               text not null,
  description        text,
  type               text,
  status             text default 'draft' check (status in ('draft','active','paused','completed','template')),
  send_via_domain    text default 'primary' check (send_via_domain in ('primary','subdomain')),
  auto_send_enabled  boolean default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  deleted_at         timestamptz
);
create index if not exists campaigns_status_idx on campaigns(status) where deleted_at is null;
create index if not exists campaigns_user_idx   on campaigns(user_id) where deleted_at is null;

drop trigger if exists trg_campaigns_updated_at on campaigns;
create trigger trg_campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

-- ═══ campaign_steps ══════════════════════════════════════════════════════════
create table if not exists campaign_steps (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  step_order      int not null,
  type            text not null check (type in ('email','sms')),
  delay_days      int not null default 0,
  delay_label     text,
  subject         text,
  body            text,
  email_blocks    jsonb,
  email_settings  jsonb,
  created_at      timestamptz default now()
);
create index if not exists campaign_steps_campaign_idx
  on campaign_steps(campaign_id, step_order);

-- ═══ campaign_enrollments ════════════════════════════════════════════════════
create table if not exists campaign_enrollments (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  contact_id    uuid not null references contacts(id) on delete cascade,
  status        text not null default 'active' check (status in ('active','paused','completed','stopped')),
  current_step  int not null default 0,
  next_send_at  timestamptz,
  enrolled_at   timestamptz default now(),
  paused_at     timestamptz,
  completed_at  timestamptz,
  stopped_at    timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists ce_campaign_idx on campaign_enrollments(campaign_id);
create index if not exists ce_contact_idx  on campaign_enrollments(contact_id);
create index if not exists ce_due_idx
  on campaign_enrollments(next_send_at)
  where status = 'active' and next_send_at is not null;

drop trigger if exists trg_enrollments_updated_at on campaign_enrollments;
create trigger trg_enrollments_updated_at
  before update on campaign_enrollments
  for each row execute function set_updated_at();

-- ═══ campaign_step_history (every send + tracking events) ════════════════════
create table if not exists campaign_step_history (
  id                uuid primary key default gen_random_uuid(),
  enrollment_id     uuid not null references campaign_enrollments(id) on delete cascade,
  step_index        int not null,
  step_type         text not null,
  subject           text,
  sent_at           timestamptz default now(),
  sent_via          text,                  -- 'manual' | 'resend_primary' | 'resend_subdomain'
  resend_email_id   text,                  -- Resend's id, used to match webhook events
  delivered_at      timestamptz,
  opened_at         timestamptz,
  open_count        int default 0,
  clicked_at        timestamptz,
  click_count       int default 0,
  bounced_at        timestamptz,
  bounce_type       text,                  -- 'hard' | 'soft'
  complained_at     timestamptz,
  unsubscribed_at   timestamptz,
  failed_at         timestamptz,
  failure_reason    text
);
create index if not exists csh_enrollment_idx on campaign_step_history(enrollment_id);
create index if not exists csh_resend_id_idx  on campaign_step_history(resend_email_id)
  where resend_email_id is not null;

-- ═══ campaign_audit_log ══════════════════════════════════════════════════════
create table if not exists campaign_audit_log (
  id              uuid primary key default gen_random_uuid(),
  enrollment_id   uuid,
  campaign_id     uuid,
  contact_id      uuid,
  contact_name    text,
  campaign_name   text,
  action          text not null,
  detail          text,
  created_at      timestamptz default now()
);
create index if not exists cal_enrollment_idx
  on campaign_audit_log(enrollment_id, created_at desc);
create index if not exists cal_campaign_idx
  on campaign_audit_log(campaign_id, created_at desc);

-- ═══ email_suppressions (shared by all senders) ══════════════════════════════
create table if not exists email_suppressions (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  email_normalized  text generated always as (lower(trim(email))) stored,
  reason            text not null check (reason in ('hard_bounce','soft_bounce','complained','unsubscribed','manual')),
  source            text,                  -- 'resend_webhook' | 'manual_ui' | etc
  notes             text,
  suppressed_at     timestamptz default now()
);
create unique index if not exists email_suppressions_norm_unique
  on email_suppressions(email_normalized);
create index if not exists email_suppressions_reason_idx
  on email_suppressions(reason);

-- Tell PostgREST about the new tables
notify pgrst, 'reload schema';
