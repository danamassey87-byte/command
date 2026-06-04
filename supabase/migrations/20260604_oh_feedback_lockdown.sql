-- H16 from SECURITY_AUDIT_PUNCHLIST. `oh_feedback` currently has policy
-- `"anon can read oh_feedback" FOR SELECT TO anon USING (true)`. Anyone
-- with the anon publishable key can `select * from oh_feedback` and walk
-- away with every hosting agent's email + freetext comments about Dana's
-- sellers' homes.
--
-- The public OHFeedback page only needs ONE row at a time, scoped to the
-- feedback id in the URL. Replace the open SELECT with a SECURITY DEFINER
-- RPC that returns just that one row plus a tightly-scoped column list.
-- Anon callers can't enumerate any longer; future C6 Phase B will also
-- add an HMAC submit_token to the URL so id-by-itself isn't sufficient
-- to read.

DROP POLICY IF EXISTS "anon can read oh_feedback" ON public.oh_feedback;

CREATE OR REPLACE FUNCTION public.get_oh_feedback_by_id(p_feedback_id UUID)
RETURNS TABLE(
  id                    UUID,
  status                TEXT,
  open_house_id         UUID,
  hosting_agent_name    TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT id, status, open_house_id, hosting_agent_name
  FROM public.oh_feedback
  WHERE id = p_feedback_id
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_oh_feedback_by_id(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_oh_feedback_by_id(UUID) TO anon, authenticated, service_role;
