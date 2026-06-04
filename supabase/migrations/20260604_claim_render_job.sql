-- H15 from SECURITY_AUDIT_PUNCHLIST: process-queue.ts SELECTed one queued
-- render_job then UPDATEd status='rendering' in two separate roundtrips.
-- Two processors (laptop + desktop, or a stale + a fresh GitHub Actions
-- run) could both pick the same job, both submit to Remotion Lambda, and
-- both bill AWS for the render.
--
-- This RPC does the claim in a single atomic statement using
-- FOR UPDATE SKIP LOCKED. The second caller's claim affects 0 rows; the
-- caller skips to the next iteration.

CREATE OR REPLACE FUNCTION public.claim_render_job()
RETURNS SETOF public.render_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.render_jobs r
  SET status     = 'rendering',
      started_at = now()
  WHERE r.id = (
    SELECT id FROM public.render_jobs
     WHERE status = 'queued'
     ORDER BY created_at
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  RETURNING r.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_render_job() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_render_job() TO service_role;
