-- M21 from SECURITY_AUDIT_PUNCHLIST: per-feature notification dedup is
-- currently implemented via per-table flag arrays/columns (oh_reminders
-- writes to `open_houses.reminders_sent text[]`,
-- transaction-deadline-check writes per-deadline `notified_3d` booleans).
-- Every new feature reinvents its own idempotency scheme; H4 + M21 noted
-- this should be centralized at the notifications table itself.
--
-- The audit's proposed key was `(type, source_table, source_id,
-- metadata->>'window')`. That works for oh_reminder (window varies per
-- entry) and transaction_deadline_<kind> (the kind is encoded in `type`),
-- but it breaks price_change notifications — those are GENUINELY distinct
-- events for the same listing (Dana drops the price multiple times during
-- a listing's life). Verified live: 2 price_change rows for the same
-- listing both with empty `window`.
--
-- Instead: opt-in `dedupe_key` convention. Writers that want
-- "at most one of this event per (type, source) per dedupe_key" set
-- `metadata.dedupe_key = '<some-stable-value>'`. The partial unique index
-- only enforces uniqueness when that key is present, so legacy writers
-- (price_change, anything that doesn't write dedupe_key) are unaffected.

CREATE UNIQUE INDEX IF NOT EXISTS notifications_active_dedupe_uniq
  ON public.notifications (type, source_table, source_id, (metadata->>'dedupe_key'))
  WHERE (metadata->>'dedupe_key') IS NOT NULL
    AND status NOT IN ('dismissed', 'archived');

COMMENT ON INDEX public.notifications_active_dedupe_uniq IS
  'Opt-in idempotency: writers that set metadata.dedupe_key get "at most one active notification per (type, source, dedupe_key)" enforcement. Writers without dedupe_key are unaffected.';
