-- M11 from SECURITY_AUDIT_PUNCHLIST: lead_attributions has a partial unique
-- index `uniq_lead_attr_primary_per_contact ON (contact_id) WHERE
-- is_primary = TRUE` (from 20260507_command_lead_sources_pac.sql:75) but
-- nothing enforces "demote prior primary on insert". The is_primary column
-- defaults to TRUE, so:
--
--   1. Existing contact already has attribution A with is_primary = TRUE
--   2. New lead email arrives for same contact (lead-intake-email)
--   3. INSERT lead_attribution (defaults is_primary = TRUE) → unique
--      violation → entire per-message iteration throws → marked as
--      parse_status='error' in lead_emails_processed
--
-- This trigger atomically demotes any other primary row for the same
-- contact BEFORE the insert/update writes, so the unique index never
-- conflicts. Single-statement so it's race-safe under read-committed.

CREATE OR REPLACE FUNCTION public.fn_lead_attr_demote_prior_primary()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.is_primary IS TRUE THEN
    UPDATE public.lead_attributions
       SET is_primary = FALSE
     WHERE contact_id = NEW.contact_id
       AND is_primary IS TRUE
       AND id IS DISTINCT FROM NEW.id;  -- safe for both INSERT and UPDATE
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_attr_demote_prior_primary ON public.lead_attributions;

CREATE TRIGGER trg_lead_attr_demote_prior_primary
  BEFORE INSERT OR UPDATE OF is_primary, contact_id
  ON public.lead_attributions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_lead_attr_demote_prior_primary();
