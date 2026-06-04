-- H14 follow-up: register the 9 additional crons in cron_heartbeats so the
-- watchdog's "missing heartbeat" check has a known expected_interval_seconds
-- for each. Intervals taken from cron.job (verified live 2026-06-04):
--
--   ai-campaign-insights-weekly        '0 8 * * 1'      → weekly (Mon 8am)
--   auto-generate-daily-content        '0 12 * * *'     → daily (12:00 UTC)
--   cash-offer-sla-check               '0 * * * *'      → hourly
--   compile-weekly-showing-report      '0 13 * * 1'     → weekly (Mon 1pm)
--   feedback-follow-up                 '0 17 * * *'     → daily (17:00 UTC)
--   gmail-client-email-monitor         '*/10 * * * *'   → every 10 min
--   gmail-showing-monitor              '*/15 * * * *'   → every 15 min
--   lead-intake-email                  '*/10 * * * *'   → every 10 min
--   send-newsletter (cron)             '*/5 * * * *'    → every 5 min
--
-- 2× expected_interval is the watchdog threshold, so weekly crons get a
-- 14-day buffer before they trip the alert.

INSERT INTO public.cron_heartbeats (function_name, expected_interval_seconds)
VALUES
  ('ai-campaign-insights',          604800),  -- weekly
  ('auto-generate-content',          86400),  -- daily
  ('cash-offer-sla-check',            3600),  -- hourly
  ('compile-weekly-showing-report', 604800),  -- weekly
  ('feedback-follow-up',             86400),  -- daily
  ('gmail-client-email-monitor',       600),  -- every 10 min
  ('gmail-showing-monitor',            900),  -- every 15 min
  ('lead-intake-email',                600),  -- every 10 min
  ('send-newsletter',                  300)   -- every 5 min
ON CONFLICT (function_name) DO NOTHING;
