-- M9 from SECURITY_AUDIT_PUNCHLIST: unbounded log tables.
--
-- Six tables grow without limit today:
--   • lofty_inbound_events     — raw webhook payloads (could be MB-scale)
--   • system_events            — operational events
--   • ai_generation_log        — per-LLM-call detail
--   • gmail_reply_log          — per-inbound-reply snapshot
--   • google_calendar_sync_log — sync traces
--   • webhook_events_seen      — replay-dedupe keys (Svix window is 5 min)
--
-- Audit's scary scenario: after the C4 lofty_inbound_events lockdown
-- attackers can no longer flood the table, but legitimate webhook traffic
-- still grows linearly. Storage bloat + advisor query slowdown.
--
-- Plus: H14 / X3 scheduled watchdog: this migration also sets up the
-- pg_cron `cron-watchdog-hourly` entry that was documented but not auto-
-- applied with the H14 commit (since cron schedule changes are state).

CREATE OR REPLACE FUNCTION public.cron_retention_purge()
RETURNS TABLE(target_table TEXT, rows_deleted BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  DELETE FROM public.lofty_inbound_events
   WHERE received_at < now() - INTERVAL '90 days'
     AND processed_at IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'lofty_inbound_events'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.system_events
   WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'system_events'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.ai_generation_log
   WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'ai_generation_log'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.gmail_reply_log
   WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'gmail_reply_log'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.google_calendar_sync_log
   WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'google_calendar_sync_log'; rows_deleted := v_count; RETURN NEXT;

  -- Svix's own replay window is 5 minutes; we keep 30 days as a buffer
  -- for any forensic lookup ("did Resend really retry this event?").
  DELETE FROM public.webhook_events_seen
   WHERE received_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'webhook_events_seen'; rows_deleted := v_count; RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_retention_purge() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_retention_purge() TO service_role;

-- ── pg_cron schedules ───────────────────────────────────────────────────────
-- Nightly retention purge at 3:17 AM Phoenix (10:17 UTC). The odd minute
-- avoids the top-of-hour cron stampede if Dana's other crons drift.
SELECT cron.schedule(
  'cron-retention-purge-nightly',
  '17 10 * * *',
  $$SELECT public.cron_retention_purge();$$
);

-- H14 / X3 follow-up: watchdog cron that was documented but not scheduled
-- in 20260604_cron_heartbeats.sql. Hourly at 7 past the hour.
SELECT cron.schedule(
  'cron-watchdog-hourly',
  '7 * * * *',
  $$SELECT public.cron_watchdog_check();$$
);
