-- H14 from SECURITY_AUDIT_PUNCHLIST: cron heartbeat + watchdog.
--
-- Today every cron silently fails if it stops firing — bad deploy, pg_cron
-- schedule drift, secret rotation breaking auth. The audit's concrete scary
-- scenario: a deploy regression silently breaks `transaction-deadline-check`
-- for two weeks → Dana misses an inspection-objection deadline → buyer
-- client loses earnest money.
--
-- Pattern: every cron's end-of-success path upserts into cron_heartbeats.
-- A separate `cron_watchdog_check` SQL function runs hourly (scheduled
-- separately via pg_cron — see runbook below) and writes a
-- system_events('cron.stalled', 'err', …) row for any function whose last
-- heartbeat is older than 2× its expected interval. Slack #system already
-- subscribes to severity=err so the alert fans out automatically.

CREATE TABLE IF NOT EXISTS public.cron_heartbeats (
  function_name             TEXT        PRIMARY KEY,
  last_completed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_interval_seconds INT         NOT NULL,
  metadata                  JSONB       NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.cron_heartbeats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cron_heartbeats FROM PUBLIC, anon, authenticated;
GRANT  SELECT, INSERT, UPDATE ON public.cron_heartbeats TO service_role;

-- Watchdog SQL function. Returns the number of alerts written so the
-- scheduled job's output is greppable in pg_cron's run log.
CREATE OR REPLACE FUNCTION public.cron_watchdog_check()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_stalled RECORD;
  v_count   INT := 0;
BEGIN
  FOR v_stalled IN
    SELECT function_name, last_completed_at, expected_interval_seconds
    FROM public.cron_heartbeats
    WHERE last_completed_at < now() - make_interval(secs => expected_interval_seconds * 2)
  LOOP
    -- One alert per function per day so a stuck cron doesn't spam Slack.
    IF NOT EXISTS (
      SELECT 1 FROM public.system_events
      WHERE kind = 'cron.stalled'
        AND source = v_stalled.function_name
        AND created_at > date_trunc('day', now())
    ) THEN
      INSERT INTO public.system_events (kind, severity, source, body, metadata)
      VALUES (
        'cron.stalled',
        'err',
        v_stalled.function_name,
        format('Cron %s has not reported a heartbeat since %s (expected every %s seconds)',
               v_stalled.function_name,
               v_stalled.last_completed_at,
               v_stalled.expected_interval_seconds),
        jsonb_build_object(
          'last_completed_at', v_stalled.last_completed_at,
          'expected_interval_seconds', v_stalled.expected_interval_seconds,
          'overdue_seconds', extract(epoch FROM now() - v_stalled.last_completed_at)::INT
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_watchdog_check() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_watchdog_check() TO service_role;

-- Seed expected intervals for the crons that will heartbeat in this same
-- batch. Inserting 0-timestamp rows would immediately trip the watchdog at
-- next run, so we start with last_completed_at = now() — the first real
-- heartbeat after deploy will overwrite it.
INSERT INTO public.cron_heartbeats (function_name, expected_interval_seconds)
VALUES
  ('dispatch-due-campaigns',       600),    -- 10 min
  ('oh-reminders',                3600),    -- hourly
  ('oh-followup',                  900),    -- 15 min
  ('transaction-deadline-check', 86400)     -- daily
ON CONFLICT (function_name) DO NOTHING;

-- DEPLOY: schedule the watchdog hourly via pg_cron. Not auto-applied here
-- because cron schedule changes are state we want visible:
--
--   SELECT cron.schedule(
--     'cron-watchdog-hourly',
--     '7 * * * *',  -- 7 past every hour
--     $$SELECT public.cron_watchdog_check();$$
--   );
