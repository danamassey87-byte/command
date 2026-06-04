-- M18 from SECURITY_AUDIT_PUNCHLIST: validate-address, generate-embeddings,
-- and other public/anon endpoints have no rate limit. An attacker (or a
-- runaway test loop) can burn through Dana's USPS quota, HuggingFace free
-- tier, etc. — and at the LLM layer, the budget cap is enforced but a
-- determined attacker can still consume the whole monthly budget per cycle.
--
-- This migration adds:
--   • rate_limits(scope, key, period_start, count, PK)
--   • check_rate_limit(p_scope, p_key, p_period_seconds, p_max) atomic
--     check-and-increment RPC
--
-- Pattern:
--   • scope:  short identifier per endpoint ("validate-address",
--             "generate-embeddings", "ai-assistant-chat")
--   • key:    something that identifies the caller — usually an IP, but
--             could be a contact id, listing id, or a static value if you
--             just want a global cap.
--   • period: window in seconds (3600 = hourly, 86400 = daily).
--   • max:    request limit per (scope, key) per window.
--
-- Returns (allowed bool, count int, max int, retry_after_seconds int).
-- Allowed = true if the increment landed inside the cap; false means the
-- caller should be 429'd.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  scope         TEXT        NOT NULL,
  key           TEXT        NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  count         INT         NOT NULL DEFAULT 1,
  PRIMARY KEY (scope, key, period_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_period_idx
  ON public.rate_limits (period_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT  SELECT, INSERT, UPDATE ON public.rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_scope          TEXT,
  p_key            TEXT,
  p_period_seconds INT,
  p_max            INT
)
RETURNS TABLE(allowed BOOLEAN, count INT, max INT, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_count        INT;
  v_now          TIMESTAMPTZ := now();
BEGIN
  -- Bucket the current time into a stable window. e.g. for p_period_seconds=3600
  -- this rounds down to the start of the current hour.
  v_period_start := to_timestamp(
    floor(extract(epoch FROM v_now) / p_period_seconds)::BIGINT * p_period_seconds
  );

  -- Atomic upsert + increment. Postgres row-locks the existing row when the
  -- INSERT ON CONFLICT fires the UPDATE, so concurrent callers serialize
  -- around the count.
  INSERT INTO public.rate_limits (scope, key, period_start, count)
  VALUES (p_scope, p_key, v_period_start, 1)
  ON CONFLICT (scope, key, period_start)
    DO UPDATE SET count = rate_limits.count + 1
  RETURNING rate_limits.count INTO v_count;

  allowed             := (v_count <= p_max);
  count               := v_count;
  max                 := p_max;
  retry_after_seconds := CASE
    WHEN v_count > p_max
      THEN GREATEST(1, p_period_seconds - extract(epoch FROM v_now - v_period_start)::INT)
    ELSE 0
  END;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INT, INT) TO service_role;

-- Retention: stale buckets older than 7 days are useless. Add to the
-- nightly purge by extending cron_retention_purge below.
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
   WHERE received_at < now() - INTERVAL '90 days' AND processed_at IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'lofty_inbound_events'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.system_events WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'system_events'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.ai_generation_log WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'ai_generation_log'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.gmail_reply_log WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'gmail_reply_log'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.google_calendar_sync_log WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'google_calendar_sync_log'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.webhook_events_seen WHERE received_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'webhook_events_seen'; rows_deleted := v_count; RETURN NEXT;

  -- M18 retention add.
  DELETE FROM public.rate_limits WHERE period_start < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  target_table := 'rate_limits'; rows_deleted := v_count; RETURN NEXT;
END;
$$;
