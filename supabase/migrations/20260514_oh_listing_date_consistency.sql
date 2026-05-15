-- Applied via MCP apply_migration on 2026-05-14.
-- An OH may only be linked to a listing whose agreement was signed on or
-- before the OH date. Enforces the rule that Dana hosting another agent's
-- listing (before she takes it over) shouldn't get backfilled into her own
-- listing's lineage when the listing later flips to hers.

CREATE OR REPLACE FUNCTION enforce_oh_listing_date_consistency()
RETURNS TRIGGER AS $$
DECLARE
  listing_signed_date date;
  listing_deleted_at  timestamptz;
BEGIN
  IF NEW.listing_id IS NULL OR NEW.date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT l.agreement_signed_date, l.deleted_at
    INTO listing_signed_date, listing_deleted_at
    FROM listings l
   WHERE l.id = NEW.listing_id;

  IF listing_signed_date IS NULL
     OR listing_signed_date > NEW.date
     OR listing_deleted_at IS NOT NULL THEN
    NEW.listing_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS open_houses_enforce_listing_date ON open_houses;
CREATE TRIGGER open_houses_enforce_listing_date
  BEFORE INSERT OR UPDATE OF listing_id, date ON open_houses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_oh_listing_date_consistency();
