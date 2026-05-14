-- ─────────────────────────────────────────────────────────────────────────────
-- Approval gate for auto-scheduled posts
--
-- Before Dana's OH auto-promote was pushing rows straight to Blotato. Per her
-- 2026-05-13 directive: nothing publishes until she approves. So we add
--   compliance_check  → JSONB holding {brand:{score,issues}, adre:{score,issues}, ran_at}
--   approved_at       → set when Dana approves; the row is then handed to publish-content
--   rejected_at       → set when Dana rejects; the row is dropped from the schedule
--
-- New status value: 'pending_approval' (just a string, no enum to extend).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.content_platform_posts
  ADD COLUMN IF NOT EXISTS compliance_check JSONB,
  ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ;

COMMENT ON COLUMN public.content_platform_posts.compliance_check IS
  'Last compliance run: {brand:{score,issues[]}, adre:{score,issues[]}, missing_elements[], ran_at}';
COMMENT ON COLUMN public.content_platform_posts.approved_at IS
  'Set when Dana approves a pending_approval post. publish-content fires only after this is non-null.';
COMMENT ON COLUMN public.content_platform_posts.rejected_at IS
  'Set when Dana rejects a pending_approval post. The platform_post is removed from any Blotato schedule.';

-- Index so the OH detail page can fetch pending approvals fast.
CREATE INDEX IF NOT EXISTS idx_cpp_pending_approval_oh
  ON public.content_platform_posts (status)
  WHERE status = 'pending_approval';
