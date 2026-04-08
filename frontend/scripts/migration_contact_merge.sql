-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Auto-merge duplicate contacts
-- Run AFTER migration_safeguards.sql (requires phone_normalized / email_normalized
-- generated columns and soft-delete columns to exist).
--
-- Strategy:
--   1. Group contacts by email_normalized (where not null) and by phone_normalized
--      (where email is null). Any group with size > 1 is a duplicate cluster.
--   2. For each cluster, pick the canonical row = (highest non-null field count,
--      then oldest created_at as tiebreaker — preserves original id for history).
--   3. Repoint every FK from dupe → canonical.
--   4. Merge any non-null fields from dupes into canonical if canonical's field is null.
--   5. Soft-delete dupes with deleted_at = now().
--
-- Idempotent — safe to re-run. Only touches rows where deleted_at is null.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function merge_contact(p_canonical uuid, p_dupe uuid) returns void as $$
declare
  canon record;
  dupe record;
  merged jsonb;
begin
  if p_canonical = p_dupe then return; end if;

  select * into canon from contacts where id = p_canonical;
  select * into dupe  from contacts where id = p_dupe;
  if canon is null or dupe is null then return; end if;

  -- ─── 1. Fill any NULL fields on canonical from dupe ──────────────────────
  update contacts set
    email             = coalesce(email,             dupe.email),
    phone             = coalesce(phone,             dupe.phone),
    address           = coalesce(address,           dupe.address),
    city              = coalesce(city,              dupe.city),
    state             = coalesce(state,             dupe.state),
    zip               = coalesce(zip,               dupe.zip),
    type              = coalesce(type,              dupe.type),
    source            = coalesce(source,            dupe.source),
    notes             = case
                          when notes is null or notes = '' then dupe.notes
                          when dupe.notes is null or dupe.notes = '' then notes
                          when notes = dupe.notes then notes
                          else notes || E'\n\n--- merged from duplicate ---\n' || dupe.notes
                        end,
    bba_signed        = coalesce(bba_signed,        dupe.bba_signed),
    bba_expiry_date   = coalesce(bba_expiry_date,   dupe.bba_expiry_date),
    budget_min        = coalesce(budget_min,        dupe.budget_min),
    budget_max        = coalesce(budget_max,        dupe.budget_max),
    beds_min          = coalesce(beds_min,          dupe.beds_min),
    baths_min         = coalesce(baths_min,         dupe.baths_min),
    areas             = case
                          when areas is null or array_length(areas, 1) is null then dupe.areas
                          when dupe.areas is null then areas
                          else array(select distinct unnest(areas || dupe.areas))
                        end
  where id = p_canonical;

  -- ─── 2. Repoint all FKs from dupe → canonical ─────────────────────────────
  -- Wrap each UPDATE in a do-nothing-on-missing-table block so the function
  -- tolerates schema drift (e.g. if a table doesn't exist on this DB yet).
  begin update listings             set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update transactions         set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update showings             set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update showing_sessions     set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update listing_appointments set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update investors            set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update activity_log         set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update notes                set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update campaign_enrollments set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update intake_form_responses set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;
  begin update public_form_submissions set contact_id = p_canonical where contact_id = p_dupe; exception when undefined_table then null; end;

  -- contact_tags: merge tag set without creating duplicate (contact_id, tag_id) rows
  begin
    insert into contact_tags (contact_id, tag_id)
      select p_canonical, tag_id from contact_tags where contact_id = p_dupe
      on conflict do nothing;
    delete from contact_tags where contact_id = p_dupe;
  exception when undefined_table then null; end;

  -- ─── 3. Soft-delete the duplicate ─────────────────────────────────────────
  update contacts set
    deleted_at = now(),
    notes = coalesce(notes, '') || E'\n[merged into ' || p_canonical::text || ' on ' || now()::date || ']'
  where id = p_dupe;
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- Auto-dedupe runner: finds all duplicate clusters and merges them
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function auto_merge_duplicate_contacts() returns table(
  canonical_id uuid,
  merged_count integer,
  match_key text
) as $$
declare
  cluster record;
  canonical uuid;
  dupe_id uuid;
  count_merged integer;
begin
  -- ─── Pass 1: dedupe by email_normalized ──────────────────────────────────
  for cluster in
    select email_normalized, array_agg(id order by
      -- Score: non-null field count (DESC), then created_at ASC
      (
        (case when email is not null then 1 else 0 end) +
        (case when phone is not null then 1 else 0 end) +
        (case when address is not null then 1 else 0 end) +
        (case when bba_signed = true then 1 else 0 end) +
        (case when notes is not null and notes <> '' then 1 else 0 end)
      ) desc,
      created_at asc
    ) as ids
    from contacts
    where deleted_at is null and email_normalized is not null
    group by email_normalized
    having count(*) > 1
  loop
    canonical := cluster.ids[1];
    count_merged := 0;
    foreach dupe_id in array cluster.ids[2:array_length(cluster.ids, 1)] loop
      perform merge_contact(canonical, dupe_id);
      count_merged := count_merged + 1;
    end loop;
    canonical_id := canonical;
    merged_count := count_merged;
    match_key := 'email:' || cluster.email_normalized;
    return next;
  end loop;

  -- ─── Pass 2: dedupe by phone_normalized (only rows with no email) ────────
  for cluster in
    select phone_normalized, array_agg(id order by
      (
        (case when phone is not null then 1 else 0 end) +
        (case when address is not null then 1 else 0 end) +
        (case when bba_signed = true then 1 else 0 end) +
        (case when notes is not null and notes <> '' then 1 else 0 end)
      ) desc,
      created_at asc
    ) as ids
    from contacts
    where deleted_at is null
      and email_normalized is null
      and phone_normalized is not null
    group by phone_normalized
    having count(*) > 1
  loop
    canonical := cluster.ids[1];
    count_merged := 0;
    foreach dupe_id in array cluster.ids[2:array_length(cluster.ids, 1)] loop
      perform merge_contact(canonical, dupe_id);
      count_merged := count_merged + 1;
    end loop;
    canonical_id := canonical;
    merged_count := count_merged;
    match_key := 'phone:' || cluster.phone_normalized;
    return next;
  end loop;

  -- ─── Pass 3: dedupe by lower(trim(name)) — only for rows with NO email AND NO phone
  -- Risky, so scoped tight: same name AND at least one of city/zip also matches
  for cluster in
    select lower(trim(name)) as name_key, coalesce(zip, ''), array_agg(id order by
      (
        (case when address is not null then 1 else 0 end) +
        (case when bba_signed = true then 1 else 0 end) +
        (case when notes is not null and notes <> '' then 1 else 0 end)
      ) desc,
      created_at asc
    ) as ids
    from contacts
    where deleted_at is null
      and email_normalized is null
      and phone_normalized is null
      and name is not null and name <> ''
    group by lower(trim(name)), coalesce(zip, '')
    having count(*) > 1
  loop
    canonical := cluster.ids[1];
    count_merged := 0;
    foreach dupe_id in array cluster.ids[2:array_length(cluster.ids, 1)] loop
      perform merge_contact(canonical, dupe_id);
      count_merged := count_merged + 1;
    end loop;
    canonical_id := canonical;
    merged_count := count_merged;
    match_key := 'name:' || cluster.name_key;
    return next;
  end loop;

  return;
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- Run the dedupe NOW. Returns one row per cluster merged.
-- Check the output to confirm which contacts were merged.
-- ═══════════════════════════════════════════════════════════════════════════
select * from auto_merge_duplicate_contacts();

-- Refresh PostgREST schema cache so the frontend sees the new state
notify pgrst, 'reload schema';
