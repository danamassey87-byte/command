-- Track which reminder windows have fired for each open house so the
-- oh-reminders cron doesn't double-notify.
ALTER TABLE public.open_houses
  ADD COLUMN IF NOT EXISTS reminders_sent text[] DEFAULT '{}';

COMMENT ON COLUMN public.open_houses.reminders_sent IS
  'Tracks which reminder windows have fired for this OH (e.g. "7d","24h","2h"). Prevents duplicate notifications.';
