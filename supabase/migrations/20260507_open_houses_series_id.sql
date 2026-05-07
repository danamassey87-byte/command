-- O6 — Multi-date OH scheduling: link siblings via shared series_id.
--
-- When Dana schedules Sat + Sun in one flow (OHQuickForm), each date
-- creates its own open_houses row, but they share a series_id so the UI
-- can:
--   • Show "Day 1 of 2" badges in the OH list
--   • Offer "Apply runsheet to all dates" propagation in OHForm
--   • Group sibling OHs in reporting / promo flows
--
-- Solo OHs leave series_id NULL. The cron crons (oh-reminders, oh-followup)
-- need no changes — each OH still has its own date/start_time and fires
-- independently.

ALTER TABLE open_houses
  ADD COLUMN IF NOT EXISTS series_id UUID;

CREATE INDEX IF NOT EXISTS open_houses_series_id_idx
  ON open_houses(series_id)
  WHERE series_id IS NOT NULL;

COMMENT ON COLUMN open_houses.series_id IS
  'Shared UUID across linked OH siblings created in one multi-date flow (e.g. Sat + Sun for the same listing). NULL for solo OHs.';
