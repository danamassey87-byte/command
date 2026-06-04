-- H2 from SECURITY_AUDIT_PUNCHLIST: dedupe race on merge-oh-signin.
--
-- The kiosk sign-in flow reads contacts WHERE email_normalized = X to find
-- existing contacts, then INSERTs if none exist. Two concurrent sign-ins
-- for the same email (double-tap, kiosk + later self sign-in) both miss
-- the SELECT before either INSERT commits → both INSERT → duplicate
-- contacts with the same email.
--
-- These partial unique indexes are the actual idempotency primitive. The
-- second INSERT now hits SQLSTATE 23505 unique_violation and the edge
-- function can recover by re-fetching the row that won the race.
--
-- Live data verified before applying: 0 existing duplicates on either
-- column (among non-deleted contacts).

CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_normalized_uniq
  ON public.contacts (email_normalized)
  WHERE deleted_at IS NULL AND email_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_phone_normalized_uniq
  ON public.contacts (phone_normalized)
  WHERE deleted_at IS NULL AND phone_normalized IS NOT NULL;
