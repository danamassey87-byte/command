-- M13 from SECURITY_AUDIT_PUNCHLIST. `transact_files.external_id` has an
-- unconditional UNIQUE constraint and `deal_id` is `ON DELETE SET NULL`.
-- Audit scenario: a transaction gets hard-deleted → transact_files row's
-- deal_id becomes NULL (row survives). Transact later resends the same
-- file payload for a NEW transaction → INSERT with the same external_id
-- collides on UNIQUE → the file never lands.
--
-- Fix: replace the unconditional UNIQUE with a partial UNIQUE that only
-- applies to rows with a live deal_id. Orphans don't block; they can be
-- cleaned up by a retention pass when convenient.
--
-- Verified live: 0 rows in transact_files today, so the constraint
-- change is risk-free.

ALTER TABLE public.transact_files DROP CONSTRAINT IF EXISTS transact_files_external_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS transact_files_external_id_active_uniq
  ON public.transact_files (external_id)
  WHERE deal_id IS NOT NULL;
