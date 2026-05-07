-- Auto-log every transactions.status change into transaction_status_log.
--
-- The table already exists (id, transaction_id, from_status, to_status,
-- changed_at, notes) and is read by the audit-trail UI in Pipeline detail.
-- Until now it was only ever populated by ad-hoc inserts, so most status
-- changes had no audit row.
--
-- This trigger runs in the same transaction as the UPDATE — guaranteed
-- atomic, can't drift, captures every code path (frontend, edge function,
-- manual SQL).

CREATE OR REPLACE FUNCTION trg_log_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO transaction_status_log (transaction_id, from_status, to_status, changed_at)
  VALUES (NEW.id, OLD.status, NEW.status, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transaction_status_log ON transactions;
CREATE TRIGGER trg_transaction_status_log
  AFTER UPDATE OF status ON transactions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trg_log_transaction_status_change();

COMMENT ON FUNCTION trg_log_transaction_status_change() IS
  'Auto-logs transactions.status changes into transaction_status_log. Fires AFTER UPDATE OF status WHEN OLD <> NEW.';
