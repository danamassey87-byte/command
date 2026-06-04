-- C9 from SECURITY_AUDIT_PUNCHLIST: atomic cost_ledger increment.
--
-- Previously incrementLedger() in supabase/functions/_shared/ai-bill.ts did
-- SELECT amount → compute next = existing + delta in JS → UPDATE amount = next,
-- which is lost-update under concurrency. Three parallel LLM calls when the
-- ledger is at $99.50 with a $100 cap all see "OK to proceed" → real spend
-- lands at ~$101, with the cap effectively non-enforced.
--
-- This RPC does the increment in a single SQL UPSERT and returns the new
-- amount + cap + exceeded flag so the caller can drive the 80/95/100% alert.
--
-- SECURITY DEFINER + SET search_path = '' per H11 finding (trigger/fn search
-- path hardening). Restricted to service_role; never callable from anon.
CREATE OR REPLACE FUNCTION public.increment_cost_ledger(
  p_service TEXT,
  p_month   DATE,
  p_amount  NUMERIC,
  p_source  TEXT DEFAULT 'api'
)
RETURNS TABLE(new_amount NUMERIC, cap NUMERIC, exceeded BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_amount NUMERIC;
  v_cap    NUMERIC;
BEGIN
  -- Defensive: a zero/negative delta becomes a no-op read of current state,
  -- so callers can use this same RPC as a "current spend" probe without
  -- accidentally writing.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    SELECT amount, budget_cap INTO v_amount, v_cap
      FROM public.cost_ledger
      WHERE service = p_service AND month = p_month;
    new_amount := COALESCE(v_amount, 0);
    cap        := COALESCE(v_cap, 0);
    exceeded   := (cap > 0 AND new_amount >= cap);
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.cost_ledger (service, month, amount, source)
  VALUES (p_service, p_month, p_amount, p_source)
  ON CONFLICT (service, month) DO UPDATE
    SET amount     = public.cost_ledger.amount + EXCLUDED.amount,
        updated_at = now()
  RETURNING amount, budget_cap INTO v_amount, v_cap;

  new_amount := v_amount;
  cap        := COALESCE(v_cap, 0);
  exceeded   := (cap > 0 AND v_amount >= cap);
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_cost_ledger(TEXT, DATE, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_cost_ledger(TEXT, DATE, NUMERIC, TEXT) TO service_role;
