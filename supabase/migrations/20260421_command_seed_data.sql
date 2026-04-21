-- Command seed data — applied 2026-04-21
-- Cost ledger, notification rules, background jobs, checklist templates

-- Cost ledger (current month)
INSERT INTO cost_ledger (service, month, amount, source, budget_cap) VALUES
  ('Supabase',       '2026-04-01', 0,    'manual', 25),
  ('Resend',         '2026-04-01', 20,   'manual', 25),
  ('Google APIs',    '2026-04-01', 0,    'manual', 10),
  ('Blotato',        '2026-04-01', 0,    'manual', 15),
  ('Anthropic',      '2026-04-01', 0,    'manual', 50),
  ('OpenAI',         '2026-04-01', 0,    'manual', 10),
  ('Vercel',         '2026-04-01', 0,    'manual', 0),
  ('OpenWeatherMap', '2026-04-01', 0,    'manual', 0)
ON CONFLICT (service, month) DO NOTHING;

-- Notification rules
INSERT INTO notification_rules (source, event, destination, is_active) VALUES
  ('oh-kiosk',    'new_signin',          '#daily-brief',  true),
  ('oh-kiosk',    'hot_lead_detected',   '#daily-brief',  true),
  ('compliance',  'block_flagged',       '#compliance',   true),
  ('cost-guard',  'budget_80pct',        '#system',       true),
  ('cost-guard',  'budget_95pct',        '#system',       true),
  ('kpi',         'weekly_summary',      '#daily-brief',  true),
  ('lofty',       'sync_conflict',       '#system',       true),
  ('lofty',       'sync_failed',         '#system',       true),
  ('weather',     'heat_advisory',       '#daily-brief',  true),
  ('resend',      'bounce_detected',     '#system',       true)
ON CONFLICT (source, event) DO NOTHING;

-- Background jobs
INSERT INTO background_jobs (name, schedule, status) VALUES
  ('daily.brief',       '0 7 * * 1-6',    'ok'),
  ('daily.wrapup',      '0 17 * * 1-6',   'ok'),
  ('weather.prefetch',  '0 6 * * *',      'ok'),
  ('cost.poll',         '0 */3 * * *',    'ok'),
  ('rag.reindex',       '0 3 * * *',      'ok'),
  ('lofty.pull',        '*/15 * * * *',   'ok'),
  ('content.perf-poll', '0 */6 * * *',    'ok')
ON CONFLICT (name) DO NOTHING;

-- Tier backfill
UPDATE contacts SET tier = CASE
  WHEN lower(stage) IN ('under contract', 'showing', 'active search') THEN 'hot'
  WHEN lower(stage) IN ('pre-approval', 'new lead') THEN 'warm'
  WHEN lower(stage) IN ('on hold', 'inactive') THEN 'cold'
  WHEN lower(stage) IN ('closed') THEN 'past'
  ELSE 'warm'
END
WHERE tier = 'warm' AND stage IS NOT NULL AND stage != '';
