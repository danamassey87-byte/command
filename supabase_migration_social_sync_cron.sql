-- ============================================================================
-- Weekly auto-sync of social stats via pg_cron + pg_net
-- ----------------------------------------------------------------------------
-- This sets up a weekly cron job that calls the fetch-social-stats edge
-- function for each enabled Apify platform, then writes results back to
-- social_metrics + content_platform_posts.
--
-- ⚠️ BEFORE RUNNING:
--   1. Enable extensions in Supabase Dashboard → Database → Extensions:
--        - pg_cron
--        - pg_net
--   2. Replace `<PROJECT_REF>` below with your real estate project ref
--      (the part of your supabase URL before .supabase.co — for the real
--       estate project, NOT greenpros).
--   3. Replace `<SERVICE_ROLE_KEY>` with your project's service_role key
--      from Settings → API. This is needed for the edge function to write
--      to social_metrics + content_platform_posts.
--
-- The cron runs every Monday at 7am Phoenix time (14:00 UTC).
-- ============================================================================

-- ─── 1. Helper function: invoke edge function for one platform ─────────────
CREATE OR REPLACE FUNCTION sync_social_platform(
  p_platform TEXT,
  p_handle   TEXT,
  p_apify_key TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id BIGINT;
BEGIN
  -- Fire-and-forget POST to the edge function. Results land in
  -- social_metrics + content_platform_posts via the function's own logic.
  --
  -- NOTE: the edge function as written reads apify_key from the request body
  -- and the frontend writes results to the DB. For cron-driven sync we will
  -- need a server-side variant that writes to the DB itself. See the
  -- `sync-social-stats-cron` edge function (todo).
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/fetch-social-stats',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := jsonb_build_object(
      'platform',  p_platform,
      'handle',    p_handle,
      'apify_key', p_apify_key
    )
  ) INTO v_request_id;

  RETURN 'queued ' || p_platform || ' (request id ' || v_request_id || ')';
END $$;

-- ─── 2. Weekly job: read settings + dispatch one call per enabled platform ──
CREATE OR REPLACE FUNCTION sync_all_enabled_social()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
  v_apify_key TEXT;
  v_platforms JSONB;
  v_platform TEXT;
  v_handle TEXT;
  v_results TEXT := '';
BEGIN
  SELECT value INTO v_settings
  FROM user_settings
  WHERE key = 'social_dashboard';

  IF v_settings IS NULL THEN
    RETURN 'no social_dashboard settings';
  END IF;

  v_apify_key := v_settings ->> 'apify_key';
  v_platforms := v_settings -> 'platform_config';

  IF v_apify_key IS NULL OR v_platforms IS NULL THEN
    RETURN 'no apify_key or platform_config';
  END IF;

  -- Iterate enabled apify platforms (instagram + facebook only for now)
  FOR v_platform IN
    SELECT key FROM jsonb_object_keys(v_platforms) AS t(key)
    WHERE v_platforms -> key ->> 'enabled' = 'true'
      AND v_platforms -> key ->> 'connection' = 'apify'
      AND v_platforms -> key ->> 'handle' IS NOT NULL
      AND key IN ('instagram','facebook')
  LOOP
    v_handle := v_platforms -> v_platform ->> 'handle';
    v_results := v_results || sync_social_platform(v_platform, v_handle, v_apify_key) || E'\n';
  END LOOP;

  RETURN v_results;
END $$;

-- ─── 3. Schedule it weekly (Mondays 14:00 UTC = 7am Phoenix in DST) ────────
-- Comment this out if you prefer to trigger sync_all_enabled_social() manually.
SELECT cron.schedule(
  'social-stats-weekly-sync',  -- job name
  '0 14 * * 1',                -- every Monday at 14:00 UTC
  $$ SELECT sync_all_enabled_social(); $$
);

-- ─── To unschedule later ────────────────────────────────────────────────────
-- SELECT cron.unschedule('social-stats-weekly-sync');

-- ─── To run manually right now ──────────────────────────────────────────────
-- SELECT sync_all_enabled_social();
