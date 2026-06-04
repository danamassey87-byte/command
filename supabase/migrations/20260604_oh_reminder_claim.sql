-- H4 from SECURITY_AUDIT_PUNCHLIST: atomic flag-then-send pattern in
-- oh-reminders. The function maintains a `reminders_sent text[]` array on
-- each open_house row and previously did SELECT → check membership → insert
-- notification → UPDATE array. Two cron ticks racing on the same OH could
-- both see "window not yet fired" and both insert a notification.
--
-- This RPC atomically appends a window key to reminders_sent if and only if
-- it wasn't already there. UPDATE row-locks the row, so the WHERE clause
-- re-evaluates against the latest committed state; second caller sees
-- ROW_COUNT=0 and returns false.

CREATE OR REPLACE FUNCTION public.claim_oh_reminder_window(
  p_oh_id  UUID,
  p_window TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.open_houses
  SET reminders_sent = array_append(COALESCE(reminders_sent, ARRAY[]::TEXT[]), p_window)
  WHERE id = p_oh_id
    AND NOT (p_window = ANY(COALESCE(reminders_sent, ARRAY[]::TEXT[])));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_oh_reminder_window(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_oh_reminder_window(UUID, TEXT) TO service_role;
