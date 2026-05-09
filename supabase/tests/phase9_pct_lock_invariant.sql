-- Acceptance Tests Phase 9 — regression test for the pct-lock invariant.
--
-- The hard rule (see ship/Acceptance Tests.html Phase 9 final gate):
--   "A fee % change must NEVER retroactively modify an already-locked
--   LeadAttribution. Write an explicit regression test."
--
-- Run with:
--   psql -f supabase/tests/phase9_pct_lock_invariant.sql $DATABASE_URL
-- Or via Supabase MCP execute_sql with the body of this file.
--
-- The test runs in a transaction and ROLLS BACK at the end so it leaves no
-- residue. Idempotent and safe to re-run any number of times.

BEGIN;

DO $$
DECLARE
  v_source_id uuid;
  v_contact_id uuid;
  v_attribution_id uuid;
  v_initial_buyer_pct numeric(5,2);
  v_initial_seller_pct numeric(5,2);
  v_locked_buyer_pct numeric(5,2);
  v_locked_seller_pct numeric(5,2);
BEGIN
  -- ── Setup: pick CertiLeads as the test source (Phase-9 reference vendor)
  SELECT id, buyer_pct, seller_pct
    INTO v_source_id, v_initial_buyer_pct, v_initial_seller_pct
    FROM lead_sources
   WHERE slug = 'certileads';

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: lead_sources row "certileads" missing — run command_lead_sources_pac migration first';
  END IF;

  IF v_initial_buyer_pct IS NULL OR v_initial_seller_pct IS NULL THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: certileads.buyer_pct or seller_pct is null — seed data check';
  END IF;

  -- ── Create a throwaway contact (will roll back)
  INSERT INTO contacts (name, type, email)
  VALUES ('Phase9 Test Contact', 'lead', 'phase9-test-' || gen_random_uuid()::text || '@example.test')
  RETURNING id INTO v_contact_id;

  -- ── Insert a lead_attribution with the CURRENT pcts snapshotted in
  INSERT INTO lead_attributions (
    contact_id, lead_source_id, buyer_pct_locked, seller_pct_locked, source_lead_id, raw_payload
  )
  VALUES (
    v_contact_id, v_source_id, v_initial_buyer_pct, v_initial_seller_pct,
    'phase9-test-lead', '{"test": true}'::jsonb
  )
  RETURNING id INTO v_attribution_id;

  -- ── ACT: change the lead_source pct to a deliberately different value
  UPDATE lead_sources
     SET buyer_pct = 99.99,
         seller_pct = 88.88,
         updated_at = now()
   WHERE id = v_source_id;

  -- ── ASSERT: the in-flight attribution did NOT pick up the new pcts
  SELECT buyer_pct_locked, seller_pct_locked
    INTO v_locked_buyer_pct, v_locked_seller_pct
    FROM lead_attributions
   WHERE id = v_attribution_id;

  IF v_locked_buyer_pct IS DISTINCT FROM v_initial_buyer_pct THEN
    RAISE EXCEPTION 'INVARIANT VIOLATED: buyer_pct_locked changed from % to % after lead_source.buyer_pct edit',
      v_initial_buyer_pct, v_locked_buyer_pct;
  END IF;

  IF v_locked_seller_pct IS DISTINCT FROM v_initial_seller_pct THEN
    RAISE EXCEPTION 'INVARIANT VIOLATED: seller_pct_locked changed from % to % after lead_source.seller_pct edit',
      v_initial_seller_pct, v_locked_seller_pct;
  END IF;

  -- ── ASSERT (positive control): the lead_source.buyer_pct DID change
  PERFORM 1 FROM lead_sources WHERE id = v_source_id AND buyer_pct = 99.99;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST INTEGRITY: lead_source pct update did not stick — pre-condition for invariant test failed';
  END IF;

  RAISE NOTICE 'PASS · phase9_pct_lock_invariant — buyer_pct_locked=%, seller_pct_locked=% after lead_source pct change to 99.99/88.88',
    v_locked_buyer_pct, v_locked_seller_pct;
END $$;

ROLLBACK;
