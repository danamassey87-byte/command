-- Add per-open-house sign-in form configuration
-- Lets Dana toggle which questions appear on each OH kiosk form

ALTER TABLE public.open_houses
  ADD COLUMN IF NOT EXISTS sign_in_config jsonb
  DEFAULT '{
    "show_email": true,
    "show_phone": true,
    "show_working_with_agent": true,
    "show_pre_approved": true,
    "show_need_to_sell": true,
    "show_timeframe": true
  }'::jsonb;

COMMENT ON COLUMN public.open_houses.sign_in_config IS
  'Per-OH sign-in form field visibility config (JSONB). Keys: show_email, show_phone, show_working_with_agent, show_pre_approved, show_need_to_sell, show_timeframe';
