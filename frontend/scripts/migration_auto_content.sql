-- ═══════════════════════════════════════════════════════════════════════════
-- Auto-Content Daily Generation — pg_cron job
-- Fires daily at 5:00 AM Arizona time (12:00 UTC in winter, 11:00 UTC summer)
-- Calls the auto-generate-content edge function
-- Run against your Supabase project (NOT greenpros)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable pg_cron + pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: daily at 12:00 UTC (5 AM AZ/MST)
-- The edge function itself checks if auto-content is enabled before doing anything.
SELECT cron.schedule(
  'auto-generate-daily-content',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url    := current_setting('app.settings.supabase_url') || '/functions/v1/auto-generate-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body   := '{}'::jsonb
  );
  $$
);
