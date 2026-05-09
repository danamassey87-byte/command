-- Migration: Auto-create referral_fees when a transaction enters 'under_contract'.
-- Reads the active lead_attribution for the contact (expires_at IS NULL or > now)
-- and uses the LOCKED rate (snapshot at lead arrival) to populate a referral_fees
-- row with status='suggested'. Updates transactions.projected_referral_fee_cents.
--
-- Idempotent: existing (transaction_id, lead_source_id, side) rows are not duplicated.
-- Re-runs (status flip away then back) won't double-charge.

CREATE OR REPLACE FUNCTION fn_auto_create_referral_fees()
RETURNS TRIGGER AS $$
DECLARE
  attr           RECORD;
  v_side         TEXT;
  v_gci_cents    INTEGER;
  v_pct          NUMERIC(5,2);
  v_flat_cents   INTEGER;
  v_fee_type     TEXT;
  v_fee_cents    INTEGER;
  v_total_cents  INTEGER := 0;
  v_existing     UUID;
BEGIN
  -- Only fire on transitions INTO 'under_contract' (insert OR update).
  IF NEW.status IS DISTINCT FROM 'under_contract' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'under_contract' THEN
    RETURN NEW;  -- already handled
  END IF;
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;  -- nothing to attribute
  END IF;

  -- Determine deal side. transactions.side might be 'buyer' / 'seller' / 'Buyer' etc.
  v_side := lower(coalesce(NEW.side, ''));
  IF v_side NOT IN ('buyer','seller') THEN
    -- Side undetermined — skip auto-create. Dana can add fees manually.
    RETURN NEW;
  END IF;

  -- expected_commission is dollars (numeric). Convert to cents.
  v_gci_cents := COALESCE(round(NEW.expected_commission * 100)::int, 0);

  -- Walk every CURRENTLY VALID lead_attribution on this contact.
  -- "Valid" = is_primary OR within attribution window. Multiple sources can
  -- charge against the same deal (rare, but possible if Dana has overlapping
  -- pay-at-close vendors). We fee each independently.
  FOR attr IN
    SELECT la.*, ls.cost_model
    FROM lead_attributions la
    JOIN lead_sources ls ON ls.id = la.lead_source_id
    WHERE la.contact_id = NEW.contact_id
      AND ls.status = 'active'
      AND ls.cost_model IN ('pay_at_close','cash_offer_routing')
      AND (la.expires_at IS NULL OR la.expires_at > now())
  LOOP
    -- Resolve the rate for this side. Defaults: if locked snapshot is missing
    -- (older row), fall back to current source rate.
    IF v_side = 'buyer' THEN
      v_fee_type   := COALESCE(attr.buyer_fee_type_locked, 'pct');
      v_pct        := attr.buyer_pct_locked;
      v_flat_cents := attr.buyer_flat_cents_locked;
    ELSE
      v_fee_type   := COALESCE(attr.seller_fee_type_locked, 'pct');
      v_pct        := attr.seller_pct_locked;
      v_flat_cents := attr.seller_flat_cents_locked;
    END IF;

    -- Compute fee cents.
    IF v_fee_type = 'flat' THEN
      v_fee_cents := COALESCE(v_flat_cents, 0);
    ELSE
      v_fee_cents := COALESCE(round(v_gci_cents * COALESCE(v_pct, 0) / 100.0)::int, 0);
    END IF;

    -- Skip zero-fee rows (nothing owed) — keeps suggested queue clean.
    IF v_fee_cents <= 0 THEN
      CONTINUE;
    END IF;

    -- Idempotency: skip if a referral_fees row already exists for
    -- (transaction, source, side). A user could have manually pre-created one.
    SELECT id INTO v_existing
    FROM referral_fees
    WHERE transaction_id = NEW.id
      AND lead_source_id = attr.lead_source_id
      AND side = v_side
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
      v_total_cents := v_total_cents + v_fee_cents;
      CONTINUE;
    END IF;

    -- Create the suggested fee row.
    INSERT INTO referral_fees (
      transaction_id, lead_source_id, contact_id, side,
      gci_cents, pct_applied, flat_cents_applied, fee_type, fee_cents,
      status
    ) VALUES (
      NEW.id, attr.lead_source_id, NEW.contact_id, v_side,
      v_gci_cents,
      CASE WHEN v_fee_type = 'pct'  THEN v_pct        ELSE NULL END,
      CASE WHEN v_fee_type = 'flat' THEN v_flat_cents ELSE NULL END,
      v_fee_type, v_fee_cents,
      'suggested'
    );

    v_total_cents := v_total_cents + v_fee_cents;
  END LOOP;

  -- Roll up onto the transaction. Only set if non-zero (don't clobber manual entries).
  IF v_total_cents > 0 THEN
    NEW.projected_referral_fee_cents := v_total_cents;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_referral_fees ON transactions;
CREATE TRIGGER trg_auto_create_referral_fees
  BEFORE INSERT OR UPDATE OF status ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_create_referral_fees();

COMMENT ON FUNCTION fn_auto_create_referral_fees() IS
  'Fires when a transaction enters under_contract. Walks active lead_attributions on the contact and creates referral_fees rows with status=suggested using locked snapshot rates. Idempotent on (transaction_id, lead_source_id, side).';

-- ───────────────────────────────────────────────────────────────────────────
-- Helper trigger: keep transactions.actual_referral_fee_cents in sync with
-- referral_fees.status='confirmed' rows. Sums on every change to referral_fees.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_actual_referral_fee_cents()
RETURNS TRIGGER AS $$
DECLARE
  v_tx_id UUID;
  v_total INTEGER;
BEGIN
  v_tx_id := COALESCE(NEW.transaction_id, OLD.transaction_id);
  IF v_tx_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(fee_cents), 0) INTO v_total
  FROM referral_fees
  WHERE transaction_id = v_tx_id AND status IN ('confirmed','paid');

  UPDATE transactions SET actual_referral_fee_cents = v_total WHERE id = v_tx_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_actual_referral_fee_cents ON referral_fees;
CREATE TRIGGER trg_sync_actual_referral_fee_cents
  AFTER INSERT OR UPDATE OR DELETE ON referral_fees
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_actual_referral_fee_cents();

COMMENT ON FUNCTION fn_sync_actual_referral_fee_cents() IS
  'Keeps transactions.actual_referral_fee_cents = SUM(referral_fees.fee_cents WHERE status IN (confirmed,paid)) for the transaction.';
