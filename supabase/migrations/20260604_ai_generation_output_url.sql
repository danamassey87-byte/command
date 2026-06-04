-- C15 from SECURITY_AUDIT_PUNCHLIST: Higgsfield generation has no callback
-- path. higgsfield-generate polls for ~55s then returns "pending" with
-- the request_id, but there's no endpoint for the frontend to re-poll.
-- Job completes, frontend doesn't find out, Dana refreshes, sees nothing,
-- clicks Generate again → another 30 Higgsfield credits (~$1) spent for
-- the same video.
--
-- Fix: persist pending jobs in ai_generation_log (already has
-- prediction_id for Replicate; reuse the column for Higgsfield request_id)
-- and let a new higgsfield-status edge fn poll the request, update the
-- log row when terminal, and write the result URL to ai_generation_log +
-- properties.hero_video_url.
--
-- This migration adds `output_url` to ai_generation_log so the status
-- function has somewhere to write the result.

ALTER TABLE public.ai_generation_log
  ADD COLUMN IF NOT EXISTS output_url TEXT;

-- Index for the status-fn lookup pattern: by service + prediction_id.
CREATE INDEX IF NOT EXISTS ai_generation_log_pending_idx
  ON public.ai_generation_log (service, prediction_id)
  WHERE prediction_id IS NOT NULL AND succeeded IS NULL;
