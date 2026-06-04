-- H11 from SECURITY_AUDIT_PUNCHLIST: trigger functions lack SET search_path.
--
-- A trigger or SECURITY DEFINER function with no `search_path` configured
-- resolves unqualified table/operator references against the session's
-- search_path. A malicious schema in front of `public` (e.g. one a future
-- multi-tenant role can write to) could shadow `pg_net.http_post`, `public.
-- xxx`, or even built-in operators, and the trigger would call the malicious
-- version instead.
--
-- SECURITY DEFINER is the high-risk case (function runs as superuser-
-- equivalent). `trigger_embed_on_change` is the most exposed today — it
-- fires from a Database Webhook to `embed-on-insert` on every contact/
-- listing/interaction insert.
--
-- ALTER FUNCTION … SET search_path is the minimal-risk transformation: it
-- doesn't recompile or re-declare the function body, just adds the
-- search_path config that future calls run with.

-- ── SECURITY DEFINER hardening ──────────────────────────────────────────────
ALTER FUNCTION public.trigger_embed_on_change()
  SET search_path = pg_catalog, public;

-- merge_submission_into_contact already had `search_path = public`. Tighten
-- it to `pg_catalog, public` so built-in operators always resolve first.
ALTER FUNCTION public.merge_submission_into_contact(p_submission_id UUID)
  SET search_path = pg_catalog, public;

-- ── SECURITY INVOKER trigger function hygiene ───────────────────────────────
-- INVOKER runs as the caller's role so this is defense-in-depth, but it's
-- cheap and worth doing in one pass.
ALTER FUNCTION public.check_listing_active()                 SET search_path = pg_catalog, public;
ALTER FUNCTION public.enforce_oh_listing_date_consistency()  SET search_path = pg_catalog, public;
ALTER FUNCTION public.fn_auto_create_referral_fees()         SET search_path = pg_catalog, public;
ALTER FUNCTION public.fn_log_listing_price_change()          SET search_path = pg_catalog, public;
ALTER FUNCTION public.fn_oh_capture_snapshot()               SET search_path = pg_catalog, public;
ALTER FUNCTION public.fn_showing_capture_snapshot()          SET search_path = pg_catalog, public;
ALTER FUNCTION public.fn_sync_actual_referral_fee_cents()    SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_price_change()                     SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_updated_at()                       SET search_path = pg_catalog, public;
ALTER FUNCTION public.touch_oh_feedback_updated_at()         SET search_path = pg_catalog, public;
ALTER FUNCTION public.touch_vendors_updated_at()             SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_ad_campaigns_updated()             SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_auto_merge_submission()            SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_contacts_created()                 SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_contacts_updated()                 SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_enrollment_completed()             SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_listing_appt_changes()             SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_listings_updated()                 SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_log_transaction_status_change()    SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_offers_updated()                   SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_platform_stats_updated()           SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_transactions_updated()             SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_transaction_timestamps()        SET search_path = pg_catalog, public;
