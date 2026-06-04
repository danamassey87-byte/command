-- C8 from SECURITY_AUDIT_PUNCHLIST: atomic campaign dispatch + send-step
-- idempotency.
--
-- Two races, two fixes:
--   1. Dispatcher race — dispatch-due-campaigns SELECTs all due enrollments
--      with no claim, then iterates. Two concurrent crons (Vercel timer +
--      Supabase cron, or manual + scheduled) both pick the same enrollment
--      and fire send-campaign-step twice → Resend bills twice, contact gets
--      the same drip step twice. Fixed by `claim_due_campaign_enrollments`
--      RPC: UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING
--      *. Each returned row is exclusively claimed for p_lock_seconds.
--   2. Send-step idempotency — if Resend succeeds but the post-send
--      advanceEnrollment fails (DB blip), the next cron run sees the same
--      enrollment on the same step and resends. Fixed by a partial unique
--      index on (enrollment_id, step_index) where delivery_status IS in
--      ('sending','sent','delivered') — send-campaign-step pre-writes a
--      'sending' row and, on unique violation, knows another attempt is
--      already in flight or completed, so it advances without re-sending.

-- ── 1. Dispatcher claim ──────────────────────────────────────────────────────
ALTER TABLE public.campaign_enrollments
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Index that the dispatcher claim query rides.
CREATE INDEX IF NOT EXISTS campaign_enrollments_dispatch_idx
  ON public.campaign_enrollments (next_send_at)
  WHERE status = 'active' AND next_send_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_due_campaign_enrollments(
  p_limit INT DEFAULT 50,
  p_lock_seconds INT DEFAULT 300
)
RETURNS SETOF public.campaign_enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.campaign_enrollments e
  SET locked_until = now() + make_interval(secs => p_lock_seconds),
      updated_at   = now()
  WHERE e.id IN (
    SELECT id FROM public.campaign_enrollments
    WHERE status = 'active'
      AND next_send_at IS NOT NULL
      AND next_send_at <= now()
      AND (locked_until IS NULL OR locked_until < now())
    ORDER BY next_send_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING e.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_due_campaign_enrollments(INT, INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_due_campaign_enrollments(INT, INT) TO service_role;

-- ── 2. Send-step idempotency ────────────────────────────────────────────────
-- Failed attempts are intentionally NOT covered so a real retry after a
-- transient failure can still write a fresh row.
CREATE UNIQUE INDEX IF NOT EXISTS campaign_step_history_inflight_uniq
  ON public.campaign_step_history (enrollment_id, step_index)
  WHERE delivery_status IN ('sending', 'sent', 'delivered');
