-- M5 from SECURITY_AUDIT_PUNCHLIST: status enums on six tables were
-- documented inline as `-- new · nurturing · hot · …` style comments but
-- had no CHECK constraint. A typo at insert time (e.g. `parse_status`
-- written as "needs-revew") would silently land in the DB and break any
-- downstream cron / report query that filters on the canonical values.
--
-- Verified live-data: every one of these tables is empty today, so
-- adding the constraints can't fail on existing rows. As Dana adds
-- features that write to them, the constraint catches typos immediately.
--
-- Source-of-truth values are the inline `--` comments in
-- 20260421_command_phase1_core.sql + 20260421_command_v2_modules.sql.

ALTER TABLE public.seller_leads
  DROP CONSTRAINT IF EXISTS seller_leads_status_check,
  ADD  CONSTRAINT seller_leads_status_check
       CHECK (status IN ('new','nurturing','hot','converted-to-deal','cold','unsubscribed'));

ALTER TABLE public.expired_leads
  DROP CONSTRAINT IF EXISTS expired_leads_status_check,
  ADD  CONSTRAINT expired_leads_status_check
       CHECK (status IN ('new','contacted','appt-set','converted','dead'));

ALTER TABLE public.fsbo_leads
  DROP CONSTRAINT IF EXISTS fsbo_leads_status_check,
  ADD  CONSTRAINT fsbo_leads_status_check
       CHECK (status IN ('new','contacted','appt-set','converted','dead'));

ALTER TABLE public.client_for_life_plans
  DROP CONSTRAINT IF EXISTS client_for_life_plans_status_check,
  ADD  CONSTRAINT client_for_life_plans_status_check
       CHECK (status IN ('active','paused','completed','opted-out'));

ALTER TABLE public.blotato_posts
  DROP CONSTRAINT IF EXISTS blotato_posts_status_check,
  ADD  CONSTRAINT blotato_posts_status_check
       CHECK (status IN ('queued','scheduled','posted','failed'));

ALTER TABLE public.print_orders
  DROP CONSTRAINT IF EXISTS print_orders_status_check,
  ADD  CONSTRAINT print_orders_status_check
       CHECK (status IN ('draft','submitted','printing','mailed','delivered','failed'));
