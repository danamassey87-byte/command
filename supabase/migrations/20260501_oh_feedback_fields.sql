-- Add property feedback fields to OH sign-ins
-- Captures buyer impressions of the home so feedback can flow back to the seller's listing record

ALTER TABLE public.oh_sign_ins
  ADD COLUMN IF NOT EXISTS interest_level    text,
  ADD COLUMN IF NOT EXISTS price_perception  text,
  ADD COLUMN IF NOT EXISTS would_offer       text,
  ADD COLUMN IF NOT EXISTS liked             text,
  ADD COLUMN IF NOT EXISTS concerns          text,
  ADD COLUMN IF NOT EXISTS comments          text;

COMMENT ON COLUMN public.oh_sign_ins.interest_level   IS 'Buyer interest in the property: hot | warm | cool | just_browsing';
COMMENT ON COLUMN public.oh_sign_ins.price_perception IS 'Price reaction: too_high | fair | great_deal';
COMMENT ON COLUMN public.oh_sign_ins.would_offer      IS 'Would consider an offer: yes | maybe | no';
COMMENT ON COLUMN public.oh_sign_ins.liked            IS 'What the buyer liked about the property (free text)';
COMMENT ON COLUMN public.oh_sign_ins.concerns         IS 'Concerns / objections from the buyer (free text)';
COMMENT ON COLUMN public.oh_sign_ins.comments         IS 'Open-ended comments from the buyer';

-- Extend OH sign-in config with feedback toggles so Dana can hide them per-OH
UPDATE public.open_houses
SET sign_in_config = COALESCE(sign_in_config, '{}'::jsonb) || jsonb_build_object(
  'show_feedback',         true,
  'show_interest_level',   true,
  'show_price_perception', true,
  'show_would_offer',      true,
  'show_liked',            true,
  'show_concerns',         true,
  'show_comments',         true
)
WHERE sign_in_config IS NULL OR NOT (sign_in_config ? 'show_feedback');
