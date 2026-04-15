-- ═══════════════════════════════════════════════════════════════════════════
-- OFFER TRACKING MIGRATION
-- Adds offer-centric deal tracking: offer history, rejection flow,
-- timestamps on every status change, and outcome tracking.
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Add offer tracking columns to transactions ─────────────────────────────
alter table transactions add column if not exists offer_number        int default 1;
alter table transactions add column if not exists offer_submitted_at  timestamptz;
alter table transactions add column if not exists status_changed_at   timestamptz default now();
alter table transactions add column if not exists outcome             text
  check (outcome in ('active','accepted','rejected','withdrawn','expired','countered'));
alter table transactions add column if not exists outcome_date        timestamptz;
alter table transactions add column if not exists outcome_notes       text;
alter table transactions add column if not exists rejection_reason    text;
alter table transactions add column if not exists is_active_offer     boolean default true;
alter table transactions add column if not exists previous_offer_id   uuid references transactions(id);
alter table transactions add column if not exists deal_type           text;
alter table transactions add column if not exists contract_date       date;
alter table transactions add column if not exists expected_commission numeric;
alter table transactions add column if not exists financing_type      text;
alter table transactions add column if not exists lender              text;
alter table transactions add column if not exists title_company       text;
alter table transactions add column if not exists lead_source         text;
alter table transactions add column if not exists lead_source_fee     numeric;
alter table transactions add column if not exists referral_fee        numeric;
alter table transactions add column if not exists referral_to         text;
alter table transactions add column if not exists tc_fee              numeric;
alter table transactions add column if not exists broker_fee          numeric;
alter table transactions add column if not exists actual_commission   numeric;
alter table transactions add column if not exists updated_at          timestamptz default now();

-- ─── Status change log table ────────────────────────────────────────────────
-- Every status change is recorded here for full audit trail
create table if not exists transaction_status_log (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references transactions(id) on delete cascade,
  from_status     text,
  to_status       text not null,
  changed_at      timestamptz default now(),
  notes           text
);

create index if not exists txn_status_log_txn_idx
  on transaction_status_log (transaction_id, changed_at desc);

-- ─── Auto-update status_changed_at and updated_at on transactions ───────────
create or replace function update_transaction_timestamps()
returns trigger as $$
begin
  new.updated_at = now();
  if old.status is distinct from new.status then
    new.status_changed_at = now();
    -- Auto-log status change
    insert into transaction_status_log (transaction_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_transaction_timestamps on transactions;
create trigger trg_transaction_timestamps
  before update on transactions
  for each row
  execute function update_transaction_timestamps();

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists txn_active_offer_idx
  on transactions (is_active_offer) where is_active_offer = true;
create index if not exists txn_contact_property_idx
  on transactions (contact_id, property_id);
create index if not exists txn_outcome_idx
  on transactions (outcome);
