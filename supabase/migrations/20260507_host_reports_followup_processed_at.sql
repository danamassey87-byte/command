-- O4 — host-report-followup edge function idempotency guard.
-- Marks the host_report row as processed after the followup function has
-- attempted (or skipped) the task cascade. Prevents re-processing on retries.

ALTER TABLE host_reports
  ADD COLUMN IF NOT EXISTS followup_processed_at TIMESTAMPTZ;

COMMENT ON COLUMN host_reports.followup_processed_at IS
  'Set by host-report-followup edge function once the strong-signal cascade has been evaluated. Idempotency guard.';
