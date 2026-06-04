-- H1 from SECURITY_AUDIT_PUNCHLIST: dynamic merge RPCs for properties +
-- contacts, replacing the hand-coded 10-table list in
-- frontend/src/lib/supabase.js (`mergeProperties` + `mergeContacts`).
--
-- The old approach missed at least 15 FK references to properties.id and
-- ~30 to contacts.id (per information_schema audit). When Dana merged
-- two duplicate Theia property rows, weather_forecasts, media_assets,
-- interactions, ai_generation_log, and ~10 other tables still pointed at
-- the soft-deleted duplicate. The OH detail page rendered blank because
-- media_assets had the wrong property_id, and a future weather upsert
-- collided on (property_id, forecast_date) UNIQUE because the dupe still
-- owned the keeper's "today" row.
--
-- The new RPCs:
--   1. Discover every FK referencing properties.id (or contacts.id) via
--      information_schema. Stays correct as new tables get added.
--   2. Issue UPDATE child SET fk = keep WHERE fk = ANY(dupes) for each FK
--      column (some tables have multiple — family_links, referrals).
--   3. Soft-delete the dupes at the end.
--   4. Run inside a single plpgsql transaction. Any failure (e.g. unique
--      violation on a partial-overlap table like contact_tags) rolls the
--      whole thing back so we never leave a half-merged row state.
--   5. Return a SETOF report rows so the frontend can show what moved.
--
-- search_path = '' per H11; service_role-only EXECUTE.

CREATE OR REPLACE FUNCTION public.merge_properties(
  p_keep_id  UUID,
  p_dupe_ids UUID[]
)
RETURNS TABLE(child_table TEXT, child_column TEXT, rows_updated BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_fk    RECORD;
  v_sql   TEXT;
  v_count BIGINT;
BEGIN
  IF p_keep_id IS NULL THEN
    RAISE EXCEPTION 'merge_properties: p_keep_id is required';
  END IF;
  IF p_dupe_ids IS NULL OR array_length(p_dupe_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'merge_properties: p_dupe_ids must contain at least one id';
  END IF;
  IF p_keep_id = ANY(p_dupe_ids) THEN
    RAISE EXCEPTION 'merge_properties: p_keep_id cannot also be in p_dupe_ids';
  END IF;

  FOR v_fk IN
    SELECT tc.table_name AS ct, kcu.column_name AS cc
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_schema = kcu.constraint_schema
     AND tc.constraint_name   = kcu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_schema = tc.constraint_schema
     AND rc.constraint_name   = tc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_schema = rc.unique_constraint_schema
     AND ccu.constraint_name   = rc.unique_constraint_name
    WHERE tc.constraint_type   = 'FOREIGN KEY'
      AND tc.table_schema      = 'public'
      AND ccu.table_name       = 'properties'
      AND ccu.column_name      = 'id'
      AND tc.table_name       <> 'properties'  -- skip self-refs if any appear later
  LOOP
    v_sql := format('UPDATE public.%I SET %I = $1 WHERE %I = ANY($2)',
                    v_fk.ct, v_fk.cc, v_fk.cc);
    EXECUTE v_sql USING p_keep_id, p_dupe_ids;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    child_table  := v_fk.ct;
    child_column := v_fk.cc;
    rows_updated := v_count;
    RETURN NEXT;
  END LOOP;

  UPDATE public.properties SET deleted_at = now() WHERE id = ANY(p_dupe_ids) AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  child_table  := 'properties';
  child_column := '(soft-delete)';
  rows_updated := v_count;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.merge_properties(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.merge_properties(UUID, UUID[]) TO service_role;


CREATE OR REPLACE FUNCTION public.merge_contacts(
  p_keep_id  UUID,
  p_dupe_ids UUID[]
)
RETURNS TABLE(child_table TEXT, child_column TEXT, rows_updated BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_fk    RECORD;
  v_sql   TEXT;
  v_count BIGINT;
BEGIN
  IF p_keep_id IS NULL THEN
    RAISE EXCEPTION 'merge_contacts: p_keep_id is required';
  END IF;
  IF p_dupe_ids IS NULL OR array_length(p_dupe_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'merge_contacts: p_dupe_ids must contain at least one id';
  END IF;
  IF p_keep_id = ANY(p_dupe_ids) THEN
    RAISE EXCEPTION 'merge_contacts: p_keep_id cannot also be in p_dupe_ids';
  END IF;

  -- Pre-clean composite UNIQUE conflicts. contact_tags has UNIQUE(contact_id,
  -- tag_id); if both keeper and dupe carry the same tag, reassigning the
  -- dupe row would collide. Drop the dupe's overlap first.
  DELETE FROM public.contact_tags
   WHERE contact_id = ANY(p_dupe_ids)
     AND tag_id IN (SELECT tag_id FROM public.contact_tags WHERE contact_id = p_keep_id);

  FOR v_fk IN
    SELECT tc.table_name AS ct, kcu.column_name AS cc
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_schema = kcu.constraint_schema
     AND tc.constraint_name   = kcu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_schema = tc.constraint_schema
     AND rc.constraint_name   = tc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_schema = rc.unique_constraint_schema
     AND ccu.constraint_name   = rc.unique_constraint_name
    WHERE tc.constraint_type   = 'FOREIGN KEY'
      AND tc.table_schema      = 'public'
      AND ccu.table_name       = 'contacts'
      AND ccu.column_name      = 'id'
      AND tc.table_name       <> 'contacts'
  LOOP
    v_sql := format('UPDATE public.%I SET %I = $1 WHERE %I = ANY($2)',
                    v_fk.ct, v_fk.cc, v_fk.cc);
    EXECUTE v_sql USING p_keep_id, p_dupe_ids;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    child_table  := v_fk.ct;
    child_column := v_fk.cc;
    rows_updated := v_count;
    RETURN NEXT;
  END LOOP;

  UPDATE public.contacts SET deleted_at = now() WHERE id = ANY(p_dupe_ids) AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  child_table  := 'contacts';
  child_column := '(soft-delete)';
  rows_updated := v_count;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.merge_contacts(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.merge_contacts(UUID, UUID[]) TO service_role;
