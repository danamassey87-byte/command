-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1 COMBINED MIGRATION
-- Run order: global_quick_add → notifications → DEDUPE → safeguards
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- PART A — Global Quick Add (extensions, listing_appointments, lead_intent)
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_trgm;

alter table contacts add column if not exists lead_intent text
  check (lead_intent in ('buyer','seller'));

create index if not exists contacts_name_trgm_idx
  on contacts using gin (name gin_trgm_ops);

create index if not exists properties_normalized_address_idx
  on properties (
    lower(regexp_replace(address, '[^a-zA-Z0-9]+', ' ', 'g'))
  );

create table if not exists listing_appointments (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  contact_id     uuid not null references contacts(id) on delete cascade,
  property_id    uuid references properties(id) on delete set null,
  scheduled_at   timestamptz not null,
  location       text,
  status         text check (status in ('scheduled','held','cancelled','converted','no_show'))
                 default 'scheduled',
  source         text,
  notes          text,
  converted_listing_id uuid references listings(id) on delete set null
);

create index if not exists listing_appointments_contact_idx
  on listing_appointments (contact_id);
create index if not exists listing_appointments_scheduled_idx
  on listing_appointments (scheduled_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_listing_appointments_updated_at on listing_appointments;
create trigger trg_listing_appointments_updated_at
  before update on listing_appointments
  for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- PART B — Notifications Center
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  user_id       uuid,
  type          text not null,
  title         text not null,
  body          text,
  link          text,
  source_table  text,
  source_id     uuid,
  status        text not null default 'unread'
                check (status in ('unread','read','kept','snoozed','dismissed')),
  snooze_until  timestamptz,
  metadata      jsonb default '{}'::jsonb
);

create index if not exists notifications_user_status_idx
  on notifications (user_id, status, created_at desc);

create index if not exists notifications_type_idx
  on notifications (type);

create index if not exists notifications_snooze_idx
  on notifications (snooze_until)
  where status = 'snoozed';

drop trigger if exists trg_notifications_updated_at on notifications;
create trigger trg_notifications_updated_at
  before update on notifications
  for each row execute function set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- PART C — DEDUPE DUPLICATE PROPERTIES
-- Picks the OLDEST property in each duplicate group as canonical, repoints
-- every FK reference, then deletes the duplicates.
-- Dynamic — auto-discovers all tables with a property_id FK.
-- ─────────────────────────────────────────────────────────────────────────────

DO $dedupe$
DECLARE
  fk_record record;
  dupe_count int;
  total_repointed int := 0;
  total_deleted int := 0;
BEGIN
  -- 1. Build temp mapping table: dupe_id → canonical_id
  --    Group by normalized address + zip; oldest = canonical
  CREATE TEMP TABLE IF NOT EXISTS _dupe_map (
    canonical_id uuid,
    dupe_id      uuid PRIMARY KEY
  );

  INSERT INTO _dupe_map (canonical_id, dupe_id)
  SELECT
    ids[1] AS canonical_id,
    UNNEST(ids[2:]) AS dupe_id
  FROM (
    SELECT
      lower(regexp_replace(coalesce(address, ''), '[^a-zA-Z0-9]+', ' ', 'g')) AS norm_addr,
      coalesce(zip, '') AS norm_zip,
      ARRAY_AGG(id ORDER BY created_at) AS ids
    FROM properties
    WHERE address IS NOT NULL AND address <> ''
    GROUP BY 1, 2
    HAVING COUNT(*) > 1
  ) g
  ON CONFLICT (dupe_id) DO NOTHING;

  GET DIAGNOSTICS dupe_count = ROW_COUNT;
  RAISE NOTICE 'Found % duplicate property rows to merge', dupe_count;

  IF dupe_count = 0 THEN
    RAISE NOTICE 'No duplicates found — skipping dedupe.';
    RETURN;
  END IF;

  -- 2. For every table with a property_id FK, repoint references to canonical
  FOR fk_record IN
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'properties'
      AND tc.table_name <> 'properties'
  LOOP
    EXECUTE format(
      'UPDATE %I SET %I = m.canonical_id
       FROM _dupe_map m
       WHERE %I.%I = m.dupe_id',
      fk_record.table_name, fk_record.column_name,
      fk_record.table_name, fk_record.column_name
    );
    GET DIAGNOSTICS total_repointed = ROW_COUNT;
    RAISE NOTICE '  Repointed % rows in %.%', total_repointed, fk_record.table_name, fk_record.column_name;
  END LOOP;

  -- 3. Delete the duplicate property rows
  DELETE FROM properties WHERE id IN (SELECT dupe_id FROM _dupe_map);
  GET DIAGNOSTICS total_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate property rows', total_deleted;

  DROP TABLE IF EXISTS _dupe_map;
END $dedupe$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART D — Safeguards (14-point integrity pack)
-- Run AFTER dedupe so the unique address index can be created cleanly.
-- ─────────────────────────────────────────────────────────────────────────────

-- #1 Phone & email collision indexes
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

-- #2 Idempotency: client_request_id (prevents double-submit)
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

-- #7 MLS-id dedupe on properties
create unique index if not exists properties_mls_unique
  on properties(mls_id) where mls_id is not null and mls_id <> '';

-- #8 Address normalization + uniqueness on (norm_addr, zip)
alter table properties add column if not exists normalized_address text
  generated always as (
    nullif(
      lower(regexp_replace(coalesce(address, ''), '[^a-zA-Z0-9]+', ' ', 'g')),
      ''
    )
  ) stored;

create unique index if not exists properties_norm_addr_zip_unique
  on properties(normalized_address, coalesce(zip, ''))
  where normalized_address is not null;

-- #9 Listing-agreement gate (cannot mark active without signed agreement)
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

-- #10 Soft delete + Archive
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

-- #11 Audit log diffs
alter table activity_log add column if not exists table_name text;
alter table activity_log add column if not exists record_id  uuid;
alter table activity_log add column if not exists changes    jsonb default '{}'::jsonb;

create index if not exists activity_log_table_record_idx
  on activity_log(table_name, record_id, created_at desc);

-- #12 Stale-record view
create or replace view stale_records as
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

-- Trash records view
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
