-- M6 from SECURITY_AUDIT_PUNCHLIST: two related issues.
--
-- (1) Several FK columns the app treats as required are nullable. listings
--     without contact_id show up as "no client" in the UI; transactions
--     without contact_id break P&L joins. Live check shows 0 nulls on
--     both today, so we can safely enforce NOT NULL. Note: we DO NOT
--     enforce open_houses.listing_id NOT NULL — 17 OHs today legitimately
--     have no listing (OHs at non-listed properties / pre-listing
--     prospecting OHs).
--
-- (2) enforce_oh_listing_date_consistency silently NULLs NEW.listing_id
--     when the listing's agreement_signed_date > OH date, leaving Dana
--     wondering why the link disappeared. Rewrite the trigger to also
--     write a system_events('warn') row so the disappearance is visible
--     in the Slack #system fan-out and the Notifications Center.

-- ── 1 · NOT NULL on FK columns with 0 nulls ────────────────────────────────
ALTER TABLE public.listings
  ALTER COLUMN contact_id SET NOT NULL;

ALTER TABLE public.transactions
  ALTER COLUMN contact_id SET NOT NULL;

-- ── 2 · OH consistency trigger: surface the silent NULL ────────────────────
CREATE OR REPLACE FUNCTION public.enforce_oh_listing_date_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_signed_date     DATE;
  v_deleted_at      TIMESTAMPTZ;
  v_reason          TEXT;
  v_original_listing UUID;
BEGIN
  IF NEW.listing_id IS NULL OR NEW.date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT l.agreement_signed_date, l.deleted_at
    INTO v_signed_date, v_deleted_at
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  IF v_signed_date IS NULL OR v_signed_date > NEW.date OR v_deleted_at IS NOT NULL THEN
    v_original_listing := NEW.listing_id;
    v_reason := CASE
      WHEN v_deleted_at IS NOT NULL THEN 'listing soft-deleted'
      WHEN v_signed_date IS NULL THEN 'listing has no agreement_signed_date yet'
      WHEN v_signed_date > NEW.date THEN format('OH date %s precedes listing agreement %s', NEW.date, v_signed_date)
      ELSE 'unknown'
    END;

    NEW.listing_id := NULL;

    -- M6: surface this so Dana sees a system_events warning instead of
    -- silently losing the link. Slack #system already fans warn-and-above
    -- events out.
    INSERT INTO public.system_events (kind, severity, source, body, metadata)
    VALUES (
      'oh.listing_unlinked',
      'warn',
      'enforce_oh_listing_date_consistency',
      format('OH %s had listing_id %s silently NULLed: %s', NEW.id, v_original_listing, v_reason),
      jsonb_build_object(
        'open_house_id', NEW.id,
        'attempted_listing_id', v_original_listing,
        'oh_date', NEW.date,
        'listing_signed_date', v_signed_date,
        'listing_deleted_at', v_deleted_at,
        'reason', v_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
