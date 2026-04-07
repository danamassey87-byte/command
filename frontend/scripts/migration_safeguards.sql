-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Data Integrity Safeguards (14-point pack)
-- Run AFTER migration_global_quick_add.sql and migration_notifications.sql.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- #1  Phone & email collision indexes
-- ═══════════════════════════════════════════════════════════════════════════
alter table contacts add column if not exists phone_normalized text
  generated always as (
    nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')
  ) stored;

alter table contacts add column if not exists email_normalized text
  generated always as (
    nullif(lower(trim(coalesce(email, ''))), '')
  ) stored;

create index if not exists contacts_phone_norm_idx
  on contacts(phone_normalized) where phone_normalized is not null;
create index if not exists contacts_email_norm_idx
  on contacts(email_normalized) where email_normalized is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- #2  Idempotency: client_request_id (prevents double-submit)
-- ═══════════════════════════════════════════════════════════════════════════
alter table contacts             add column if not exists client_request_id uuid;
alter table listing_appointments add column if not exists client_request_id uuid;
alter table listings             add column if not exists client_request_id uuid;
alter table transactions         add column if not exists client_request_id uuid;

create unique index if not exists contacts_request_id_idx
  on contacts(client_request_id) where client_request_id is not null;
create unique index if not exists listing_appts_request_id_idx
  on listing_appointments(client_request_id) where client_request_id is not null;
create unique index if not exists listings_request_id_idx
  on listings(client_request_id) where client_request_id is not null;
create unique index if not exists transactions_request_id_idx
  on transactions(client_request_id) where client_request_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- #7  MLS-id dedupe on properties (partial unique)
-- ═══════════════════════════════════════════════════════════════════════════
create unique index if not exists properties_mls_unique
  on properties(mls_id) where mls_id is not null and mls_id <> '';

-- ═══════════════════════════════════════════════════════════════════════════
-- #8  Address normalization at write time + uniqueness on (norm_addr, zip)
-- ═══════════════════════════════════════════════════════════════════════════
alter table properties add column if not exists normalized_address text
  generated always as (
    nullif(
      lower(regexp_replace(coalesce(address, ''), '[^a-zA-Z0-9]+', ' ', 'g')),
      ''
    )
  ) stored;

-- Soft uniqueness — same normalized address + zip should not exist twice.
-- (Two units in the same building have different addresses post-normalization
-- because unit numbers survive the regex.)
create unique index if not exists properties_norm_addr_zip_unique
  on properties(normalized_address, coalesce(zip, ''))
  where normalized_address is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- #9  Listing-agreement gate (cannot mark active without signed agreement)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function check_listing_active() returns trigger as $$
begin
  if new.status = 'active' and coalesce(new.listing_agreement_signed, false) = false then
    raise exception 'Cannot mark listing active: listing agreement is not signed'
      using hint = 'Set listing_agreement_signed = true first.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_listing_active_check on listings;
create trigger trg_listing_active_check
  before insert or update on listings
  for each row execute function check_listing_active();

-- ═══════════════════════════════════════════════════════════════════════════
-- #10  Soft delete + Archive (with 30-day purge window)
-- ═══════════════════════════════════════════════════════════════════════════
-- Add deleted_at + archived_at to every entity table.
do $$
declare
  t text;
begin
  foreach t in array array['contacts','properties','listings','listing_appointments','transactions','showings','open_houses']
  loop
    execute format('alter table %I add column if not exists deleted_at  timestamptz', t);
    execute format('alter table %I add column if not exists archived_at timestamptz', t);
    execute format('create index if not exists %I on %I(deleted_at) where deleted_at is not null',
                   t || '_deleted_at_idx', t);
    execute format('create index if not exists %I on %I(archived_at) where archived_at is not null',
                   t || '_archived_at_idx', t);
  end loop;
end $$;

-- Daily purge: hard-delete anything soft-deleted more than 30 days ago.
create or replace function purge_soft_deleted() returns void as $$
begin
  delete from contacts             where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from properties           where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from listings             where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from listing_appointments where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from transactions         where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from showings             where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from open_houses          where deleted_at is not null and deleted_at < now() - interval '30 days';
end;
$$ language plpgsql;

-- Schedule the purge daily at 03:00 if pg_cron is enabled.
-- (Safe to ignore the NOTICE if pg_cron is not installed.)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('purge-soft-deleted')
      where exists (select 1 from cron.job where jobname = 'purge-soft-deleted');
    perform cron.schedule('purge-soft-deleted', '0 3 * * *', 'select purge_soft_deleted();');
  else
    raise notice 'pg_cron not enabled — run select purge_soft_deleted(); manually or enable pg_cron.';
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', SQLERRM;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- #11  Audit log diffs — extend activity_log to record exact field changes
-- ═══════════════════════════════════════════════════════════════════════════
alter table activity_log add column if not exists table_name text;
alter table activity_log add column if not exists record_id  uuid;
-- changes structure: { "field_name": { "before": value, "after": value }, ... }
alter table activity_log add column if not exists changes    jsonb default '{}'::jsonb;

create index if not exists activity_log_table_record_idx
  on activity_log(table_name, record_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- #12  Stale-record view — surface things rotting silently
-- ═══════════════════════════════════════════════════════════════════════════
create or replace view stale_records as
  -- Leads with no activity in 14 days
  select
    'stale_lead'::text                          as kind,
    c.id                                        as record_id,
    'contacts'::text                            as table_name,
    c.name                                      as label,
    c.created_at                                as last_activity_at,
    extract(day from now() - c.created_at)::int as days_stale
  from contacts c
  where c.type = 'lead'
    and c.deleted_at is null and c.archived_at is null
    and not exists (
      select 1 from activity_log a
      where a.contact_id = c.id and a.created_at > now() - interval '14 days'
    )

  union all

  -- Listing appointments past their scheduled time but still 'scheduled'
  select
    'overdue_appointment',
    la.id,
    'listing_appointments',
    coalesce(c.name, 'Listing appointment'),
    la.scheduled_at,
    extract(day from now() - la.scheduled_at)::int
  from listing_appointments la
  left join contacts c on c.id = la.contact_id
  where la.status = 'scheduled'
    and la.scheduled_at < now()
    and la.deleted_at is null

  union all

  -- Transactions in escrow with closing_date in the past
  select
    'overdue_closing',
    t.id,
    'transactions',
    coalesce(c.name, 'Transaction'),
    t.closing_date::timestamptz,
    extract(day from now() - t.closing_date::timestamptz)::int
  from transactions t
  left join contacts c on c.id = t.contact_id
  where t.escrow_opened = true
    and t.closing_date is not null
    and t.closing_date < current_date
    and t.deleted_at is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper view: combine deleted/archived records for the recovery page
-- ═══════════════════════════════════════════════════════════════════════════
create or replace view trash_records as
  select 'contacts'::text   as table_name, id, name as label, deleted_at, archived_at
    from contacts where deleted_at is not null or archived_at is not null
  union all
  select 'properties',       id, address,                          deleted_at, archived_at
    from properties where deleted_at is not null or archived_at is not null
  union all
  select 'listings',         id, ('Listing ' || substr(id::text,1,8)), deleted_at, archived_at
    from listings where deleted_at is not null or archived_at is not null
  union all
  select 'listing_appointments', id, ('Appt ' || to_char(scheduled_at,'YYYY-MM-DD')),
                                  deleted_at, archived_at
    from listing_appointments where deleted_at is not null or archived_at is not null
  union all
  select 'transactions',     id, ('Txn ' || substr(id::text,1,8)), deleted_at, archived_at
    from transactions where deleted_at is not null or archived_at is not null;
