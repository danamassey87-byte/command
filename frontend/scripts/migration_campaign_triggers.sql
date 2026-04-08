-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Campaign Triggers (auto-enrollment based on events)
-- Run AFTER migration_campaigns_schema.sql + migration_campaign_step_types.sql
--
-- Concept:
--   1. `campaign_triggers` — per-campaign config: "when X happens, auto-enroll
--      the matching contact into this campaign"
--   2. `campaign_trigger_events` — append-only event log written by DB triggers
--      whenever a relevant change occurs (tag added, BBA signed, listing active,
--      etc). Each row starts as processed=false.
--   3. Edge function `process-campaign-trigger-events` reads unprocessed rows,
--      matches them against campaign_triggers, and calls the equivalent of
--      enrollContacts() for each match. Marks processed=true after.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- Table: campaign_triggers
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists campaign_triggers (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  trigger_type    text not null,
  config          jsonb not null default '{}'::jsonb,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint campaign_triggers_type_check check (trigger_type in (
    -- Tag events
    'tag_added', 'tag_removed',
    -- Contact lifecycle
    'contact_created', 'contact_type_changed', 'contact_status_changed',
    -- Buyer side
    'bba_signed',
    -- Seller side
    'listing_appt_booked', 'listing_appt_completed',
    'listing_agreement_signed', 'listing_active',
    'listing_price_reduced', 'listing_under_contract',
    'listing_closed', 'listing_expired',
    -- Transactions
    'transaction_closed',
    -- Engagement (wired by Resend webhook + Gmail reply detection)
    'email_opened', 'email_clicked', 'email_replied',
    -- Forms
    'form_submitted', 'public_form_returned',
    -- Time-based
    'birthday', 'closing_anniversary', 'days_stale',
    -- Campaign flow
    'campaign_completed',
    -- Manual (explicit enrollment only; default)
    'manual'
  ))
);

create index if not exists campaign_triggers_campaign_idx on campaign_triggers(campaign_id);
create index if not exists campaign_triggers_type_idx on campaign_triggers(trigger_type) where enabled = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- Table: campaign_trigger_events (append-only event log)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists campaign_trigger_events (
  id              uuid primary key default gen_random_uuid(),
  event_type      text not null,
  contact_id      uuid references contacts(id) on delete cascade,
  source_table    text,
  source_id       uuid,
  event_data      jsonb default '{}'::jsonb,
  processed       boolean not null default false,
  processed_at    timestamptz,
  resulting_enrollments uuid[] default '{}'::uuid[],
  created_at      timestamptz not null default now()
);

create index if not exists cte_unprocessed_idx
  on campaign_trigger_events(created_at) where processed = false;
create index if not exists cte_contact_idx on campaign_trigger_events(contact_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Generic helper: write an event row
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function emit_trigger_event(
  p_event_type text,
  p_contact_id uuid,
  p_source_table text,
  p_source_id uuid,
  p_event_data jsonb default '{}'::jsonb
) returns void as $$
begin
  -- Only emit if at least one enabled campaign_trigger watches this event type.
  -- Avoids flooding the log with noise nobody's listening to.
  if not exists (
    select 1 from campaign_triggers
    where enabled = true and trigger_type = p_event_type
  ) then
    return;
  end if;

  insert into campaign_trigger_events (
    event_type, contact_id, source_table, source_id, event_data
  ) values (
    p_event_type, p_contact_id, p_source_table, p_source_id, coalesce(p_event_data, '{}'::jsonb)
  );
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger: contact_tags INSERT / DELETE → tag_added / tag_removed
-- (Conditional on the table existing — skip silently if contact_tags hasn't
--  been created yet in this project.)
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'contact_tags'
  ) then
    -- INSERT → tag_added
    execute $f$
      create or replace function trg_contact_tags_added() returns trigger as $body$
      begin
        perform emit_trigger_event(
          'tag_added',
          new.contact_id,
          'contact_tags',
          new.contact_id,
          jsonb_build_object('tag_id', new.tag_id)
        );
        return new;
      end;
      $body$ language plpgsql;
    $f$;
    execute 'drop trigger if exists trg_contact_tags_ins on contact_tags';
    execute 'create trigger trg_contact_tags_ins
      after insert on contact_tags
      for each row execute function trg_contact_tags_added()';

    -- DELETE → tag_removed
    execute $f$
      create or replace function trg_contact_tags_removed() returns trigger as $body$
      begin
        perform emit_trigger_event(
          'tag_removed',
          old.contact_id,
          'contact_tags',
          old.contact_id,
          jsonb_build_object('tag_id', old.tag_id)
        );
        return old;
      end;
      $body$ language plpgsql;
    $f$;
    execute 'drop trigger if exists trg_contact_tags_del on contact_tags';
    execute 'create trigger trg_contact_tags_del
      after delete on contact_tags
      for each row execute function trg_contact_tags_removed()';
  else
    raise notice 'contact_tags table not found — tag_added / tag_removed triggers skipped';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger: contacts INSERT → contact_created
-- Uses to_jsonb(new) for defensive field access in case columns vary.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function trg_contacts_created() returns trigger as $$
declare
  row_data jsonb;
begin
  row_data := to_jsonb(new);
  perform emit_trigger_event(
    'contact_created',
    new.id,
    'contacts',
    new.id,
    jsonb_build_object(
      'type',   coalesce(row_data->>'type', ''),
      'source', coalesce(row_data->>'source', '')
    )
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_contacts_created on contacts;
create trigger trg_contacts_created
  after insert on contacts
  for each row execute function trg_contacts_created();

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger: contacts UPDATE → type_changed / bba_signed
-- Uses to_jsonb(new)/to_jsonb(old) so missing columns don't break the function.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function trg_contacts_updated() returns trigger as $$
declare
  old_data jsonb;
  new_data jsonb;
  old_type text;
  new_type text;
  old_bba  boolean;
  new_bba  boolean;
begin
  old_data := to_jsonb(old);
  new_data := to_jsonb(new);

  old_type := old_data->>'type';
  new_type := new_data->>'type';
  if new_type is distinct from old_type then
    perform emit_trigger_event(
      'contact_type_changed',
      new.id,
      'contacts',
      new.id,
      jsonb_build_object('from', coalesce(old_type, ''), 'to', coalesce(new_type, ''))
    );
  end if;

  old_bba := (old_data->>'bba_signed')::boolean;
  new_bba := (new_data->>'bba_signed')::boolean;
  if coalesce(new_bba, false) = true and coalesce(old_bba, false) = false then
    perform emit_trigger_event(
      'bba_signed',
      new.id,
      'contacts',
      new.id,
      jsonb_build_object('expiry_date', new_data->>'bba_expiry_date')
    );
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_contacts_updated on contacts;
create trigger trg_contacts_updated
  after update on contacts
  for each row execute function trg_contacts_updated();

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger: listings UPDATE → lifecycle events
-- Defensive: uses to_jsonb() to tolerate missing columns.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function trg_listings_updated() returns trigger as $$
declare
  old_data jsonb;
  new_data jsonb;
  old_agreement boolean;
  new_agreement boolean;
  old_status text;
  new_status text;
  listing_contact uuid;
begin
  old_data := to_jsonb(old);
  new_data := to_jsonb(new);
  listing_contact := (new_data->>'contact_id')::uuid;

  -- Listing agreement signed
  old_agreement := (old_data->>'listing_agreement_signed')::boolean;
  new_agreement := (new_data->>'listing_agreement_signed')::boolean;
  if coalesce(new_agreement, false) = true and coalesce(old_agreement, false) = false then
    perform emit_trigger_event(
      'listing_agreement_signed',
      listing_contact,
      'listings',
      new.id,
      jsonb_build_object('listing_id', new.id)
    );
  end if;

  -- Status changes
  old_status := old_data->>'status';
  new_status := new_data->>'status';
  if new_status is distinct from old_status then
    if new_status = 'active' then
      perform emit_trigger_event('listing_active', listing_contact, 'listings', new.id, jsonb_build_object('listing_id', new.id));
    elsif new_status = 'pending' then
      perform emit_trigger_event('listing_under_contract', listing_contact, 'listings', new.id, jsonb_build_object('listing_id', new.id));
    elsif new_status = 'closed' then
      perform emit_trigger_event('listing_closed', listing_contact, 'listings', new.id, jsonb_build_object('listing_id', new.id));
    elsif new_status = 'expired' then
      perform emit_trigger_event('listing_expired', listing_contact, 'listings', new.id, jsonb_build_object('listing_id', new.id));
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

-- Only attach if listings table has a contact_id column
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'contact_id'
  ) then
    execute 'drop trigger if exists trg_listings_updated on listings';
    execute 'create trigger trg_listings_updated after update on listings for each row execute function trg_listings_updated()';
  else
    raise notice 'listings.contact_id not found — trg_listings_updated skipped';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger: listing_appointments INSERT / UPDATE → booked / completed
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_tables where tablename = 'listing_appointments') then
    execute $trg$
      create or replace function trg_listing_appt_changes() returns trigger as $func$
      begin
        if tg_op = 'INSERT' then
          perform emit_trigger_event(
            'listing_appt_booked',
            new.contact_id,
            'listing_appointments',
            new.id,
            jsonb_build_object('scheduled_at', new.scheduled_at)
          );
        elsif tg_op = 'UPDATE'
              and new.status is distinct from old.status
              and new.status = 'completed' then
          perform emit_trigger_event(
            'listing_appt_completed',
            new.contact_id,
            'listing_appointments',
            new.id,
            '{}'::jsonb
          );
        end if;
        return new;
      end;
      $func$ language plpgsql;
    $trg$;
    execute 'drop trigger if exists trg_listing_appt_changes on listing_appointments';
    execute 'create trigger trg_listing_appt_changes
      after insert or update on listing_appointments
      for each row execute function trg_listing_appt_changes()';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger: transactions UPDATE → transaction_closed
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_tables where tablename = 'transactions') then
    execute $trg$
      create or replace function trg_transactions_updated() returns trigger as $func$
      begin
        -- escrow_closed column may vary; use status = 'closed' as canonical signal
        if (
          (new.status is distinct from old.status and new.status = 'closed')
          or (
            new.closing_date is not null
            and old.closing_date is distinct from new.closing_date
            and new.closing_date <= current_date
          )
        ) then
          perform emit_trigger_event(
            'transaction_closed',
            new.contact_id,
            'transactions',
            new.id,
            jsonb_build_object('closing_date', new.closing_date)
          );
        end if;
        return new;
      end;
      $func$ language plpgsql;
    $trg$;
    execute 'drop trigger if exists trg_transactions_updated on transactions';
    execute 'create trigger trg_transactions_updated
      after update on transactions
      for each row execute function trg_transactions_updated()';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger: campaign_enrollments UPDATE status='completed' → campaign_completed
-- (lets one campaign chain into another)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function trg_enrollment_completed() returns trigger as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform emit_trigger_event(
      'campaign_completed',
      new.contact_id,
      'campaign_enrollments',
      new.id,
      jsonb_build_object('campaign_id', new.campaign_id)
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enrollment_completed on campaign_enrollments;
create trigger trg_enrollment_completed
  after update on campaign_enrollments
  for each row execute function trg_enrollment_completed();

-- ═══════════════════════════════════════════════════════════════════════════
-- Processor: auto-enrolls contacts from unprocessed trigger events
-- Call manually or via pg_cron every 2 minutes.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function process_campaign_trigger_events(p_limit int default 500)
returns table(
  event_id uuid,
  event_type text,
  contact_id uuid,
  matched_campaigns integer,
  enrollments_created integer
) as $$
declare
  ev record;
  trg record;
  new_enrollment_ids uuid[];
  match_count int;
  enroll_count int;
  already_enrolled boolean;
  matches_config boolean;
  event_tag_id uuid;
  trigger_tag_id uuid;
begin
  for ev in
    select * from campaign_trigger_events
    where processed = false
    order by created_at asc
    limit p_limit
  loop
    match_count := 0;
    enroll_count := 0;
    new_enrollment_ids := '{}'::uuid[];

    for trg in
      select * from campaign_triggers
      where enabled = true and trigger_type = ev.event_type
    loop
      -- Config matching for tag-specific triggers
      matches_config := true;
      if ev.event_type in ('tag_added', 'tag_removed') then
        trigger_tag_id := (trg.config->>'tag_id')::uuid;
        event_tag_id := (ev.event_data->>'tag_id')::uuid;
        -- If trigger specifies a tag_id, must match; else match any tag event
        if trigger_tag_id is not null and trigger_tag_id is distinct from event_tag_id then
          matches_config := false;
        end if;
      end if;

      if not matches_config then continue; end if;
      if ev.contact_id is null then continue; end if;

      match_count := match_count + 1;

      -- Skip if already actively enrolled in this campaign
      select exists(
        select 1 from campaign_enrollments
        where campaign_id = trg.campaign_id
          and contact_id = ev.contact_id
          and status = 'active'
      ) into already_enrolled;

      if already_enrolled then continue; end if;

      -- Enroll
      declare
        new_enrollment_id uuid;
      begin
        insert into campaign_enrollments (
          campaign_id, contact_id, status, current_step, next_send_at, enrolled_at,
          triggered_by_event_id
        ) values (
          trg.campaign_id, ev.contact_id, 'active', 0, now(), now(),
          ev.id
        ) returning id into new_enrollment_id;

        new_enrollment_ids := array_append(new_enrollment_ids, new_enrollment_id);
        enroll_count := enroll_count + 1;

        -- Audit
        insert into campaign_audit_log (
          enrollment_id, campaign_id, contact_id, action, detail
        ) values (
          new_enrollment_id, trg.campaign_id, ev.contact_id,
          'auto_enrolled',
          'Auto-enrolled by trigger: ' || ev.event_type
        );
      exception when others then
        -- swallow and continue; processor should never die on one bad row
        raise notice 'auto-enroll failed for contact % / campaign %: %',
          ev.contact_id, trg.campaign_id, sqlerrm;
      end;
    end loop;

    update campaign_trigger_events set
      processed = true,
      processed_at = now(),
      resulting_enrollments = new_enrollment_ids
    where id = ev.id;

    event_id := ev.id;
    event_type := ev.event_type;
    contact_id := ev.contact_id;
    matched_campaigns := match_count;
    enrollments_created := enroll_count;
    return next;
  end loop;

  return;
end;
$$ language plpgsql;

-- Add triggered_by_event_id column so auto-enrollments can be traced back to the event.
alter table campaign_enrollments
  add column if not exists triggered_by_event_id uuid references campaign_trigger_events(id) on delete set null;

create index if not exists ce_triggered_by_event_idx
  on campaign_enrollments(triggered_by_event_id) where triggered_by_event_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- Schedule the processor via pg_cron (every 2 minutes). Safe-no-op if pg_cron
-- isn't enabled.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('process-campaign-triggers')
      where exists (select 1 from cron.job where jobname = 'process-campaign-triggers');
    perform cron.schedule(
      'process-campaign-triggers',
      '*/2 * * * *',
      'select process_campaign_trigger_events(500);'
    );
  else
    raise notice 'pg_cron not enabled — run process_campaign_trigger_events() manually or enable pg_cron.';
  end if;
exception when others then
  raise notice 'cron schedule skipped: %', sqlerrm;
end $$;

notify pgrst, 'reload schema';
