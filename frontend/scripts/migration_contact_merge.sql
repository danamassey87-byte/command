-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Auto-merge duplicate contacts  (v2 — schema-drift resilient)
-- Run AFTER migration_safeguards.sql (requires phone_normalized / email_normalized
-- generated columns and soft-delete columns to exist).
--
-- Strategy:
--   1. Group contacts by email_normalized (where not null) and by phone_normalized
--      (where email is null). Any group with size > 1 is a duplicate cluster.
--   2. For each cluster, pick the canonical row (highest non-null field count,
--      oldest created_at as tiebreaker).
--   3. Repoint every FK from dupe → canonical.
--   4. Merge any non-null fields from dupes into canonical where canonical is null.
--   5. Soft-delete dupes with deleted_at = now().
--
-- v2 change: uses EXECUTE with information_schema checks so it only touches
-- columns that actually exist on your `contacts` table. No more hardcoded
-- column assumptions.
--
-- Idempotent — safe to re-run. Only touches rows where deleted_at is null.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: does a column exist on a table?
create or replace function _col_exists(p_table text, p_col text) returns boolean as $$
  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_col
  );
$$ language sql stable;

-- Helper: does a table exist?
create or replace function _tbl_exists(p_table text) returns boolean as $$
  select exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = p_table
  );
$$ language sql stable;

-- ═══════════════════════════════════════════════════════════════════════════
-- merge_contact(canonical, dupe)
--   Fills NULL canonical fields from dupe, repoints every FK table, soft-deletes
--   the dupe. Only references columns proven to exist at call time.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function merge_contact(p_canonical uuid, p_dupe uuid) returns void as $$
declare
  fill_sql text;
  col_list text[];
  col text;
  fill_parts text[];
begin
  if p_canonical = p_dupe then return; end if;

  -- Build a dynamic UPDATE that only touches contacts columns that exist.
  -- For each column in the list, we do: col = coalesce(contacts.col, dupe.col)
  col_list := array[
    'email', 'phone', 'type', 'source', 'lead_source',
    'bba_signed', 'bba_expiration_date',
    'budget_min', 'budget_max', 'beds_min', 'baths_min',
    'address', 'city', 'state', 'zip', 'neighborhood',
    'birthday', 'anniversary', 'website'
  ];
  fill_parts := array[]::text[];
  foreach col in array col_list loop
    if _col_exists('contacts', col) then
      fill_parts := array_append(fill_parts, format('%I = coalesce(c.%I, d.%I)', col, col, col));
    end if;
  end loop;

  -- areas (array) — union if column exists
  if _col_exists('contacts', 'areas') then
    fill_parts := array_append(fill_parts,
      'areas = case '
        || 'when c.areas is null or array_length(c.areas, 1) is null then d.areas '
        || 'when d.areas is null then c.areas '
        || 'else array(select distinct unnest(c.areas || d.areas)) '
      || 'end'
    );
  end if;

  -- notes — concat if column exists and both have content
  if _col_exists('contacts', 'notes') then
    fill_parts := array_append(fill_parts,
      'notes = case '
        || 'when c.notes is null or c.notes = '''' then d.notes '
        || 'when d.notes is null or d.notes = '''' then c.notes '
        || 'when c.notes = d.notes then c.notes '
        || 'else c.notes || E''\n\n--- merged from duplicate ---\n'' || d.notes '
      || 'end'
    );
  end if;

  if array_length(fill_parts, 1) > 0 then
    fill_sql := 'update contacts c set '
      || array_to_string(fill_parts, ', ')
      || ' from contacts d where c.id = $1 and d.id = $2';
    execute fill_sql using p_canonical, p_dupe;
  end if;

  -- ─── Repoint FKs across every table that has contact_id ───────────────────
  -- Discover these dynamically so schema drift doesn't break the migration.
  declare
    tname text;
  begin
    for tname in
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'contact_id'
    loop
      -- Skip the contacts table itself (it doesn't have contact_id) and any views
      if exists(
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = tname and table_type = 'BASE TABLE'
      ) then
        begin
          execute format('update %I set contact_id = $1 where contact_id = $2', tname)
            using p_canonical, p_dupe;
        exception when others then
          raise notice 'skipped repoint for %.contact_id: %', tname, sqlerrm;
        end;
      end if;
    end loop;

    -- contact_tags uses (contact_id, tag_id) composite → need to dedupe
    if _tbl_exists('contact_tags') then
      begin
        insert into contact_tags (contact_id, tag_id)
          select p_canonical, tag_id from contact_tags where contact_id = p_dupe
          on conflict do nothing;
        delete from contact_tags where contact_id = p_dupe;
      exception when others then
        raise notice 'contact_tags merge skipped: %', sqlerrm;
      end;
    end if;
  end;

  -- ─── Soft-delete the duplicate ─────────────────────────────────────────────
  if _col_exists('contacts', 'notes') then
    update contacts set
      deleted_at = now(),
      notes = coalesce(notes, '') || E'\n[merged into ' || p_canonical::text || ' on ' || now()::date || ']'
    where id = p_dupe;
  else
    update contacts set deleted_at = now() where id = p_dupe;
  end if;
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- auto_merge_duplicate_contacts()
--   Runs 3 passes (email → phone → name+zip/no-zip).
--   Scoring only counts columns that exist in the current schema.
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
  score_sql text;
begin
  -- Build the scoring expression once, gated by which columns actually exist.
  -- Score = count of non-null/meaningful fields.
  score_sql := '0';
  if _col_exists('contacts', 'email') then
    score_sql := score_sql || ' + (case when email is not null then 1 else 0 end)';
  end if;
  if _col_exists('contacts', 'phone') then
    score_sql := score_sql || ' + (case when phone is not null then 1 else 0 end)';
  end if;
  if _col_exists('contacts', 'bba_signed') then
    score_sql := score_sql || ' + (case when bba_signed = true then 1 else 0 end)';
  end if;
  if _col_exists('contacts', 'notes') then
    score_sql := score_sql || ' + (case when notes is not null and notes <> '''' then 1 else 0 end)';
  end if;

  -- ─── Pass 1: dedupe by email_normalized ──────────────────────────────────
  for cluster in
    execute format($fmt$
      select email_normalized, array_agg(id order by (%s) desc, created_at asc) as ids
      from contacts
      where deleted_at is null and email_normalized is not null
      group by email_normalized
      having count(*) > 1
    $fmt$, score_sql)
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

  -- ─── Pass 2: dedupe by phone_normalized (rows with no email only) ────────
  for cluster in
    execute format($fmt$
      select phone_normalized, array_agg(id order by (%s) desc, created_at asc) as ids
      from contacts
      where deleted_at is null
        and email_normalized is null
        and phone_normalized is not null
      group by phone_normalized
      having count(*) > 1
    $fmt$, score_sql)
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
  for cluster in
    execute format($fmt$
      select lower(trim(name)) as name_key, array_agg(id order by (%s) desc, created_at asc) as ids
      from contacts
      where deleted_at is null
        and email_normalized is null
        and phone_normalized is null
        and name is not null and name <> ''
      group by lower(trim(name))
      having count(*) > 1
    $fmt$, score_sql)
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
-- Run the dedupe NOW. One row per cluster merged.
-- ═══════════════════════════════════════════════════════════════════════════
select * from auto_merge_duplicate_contacts();

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
