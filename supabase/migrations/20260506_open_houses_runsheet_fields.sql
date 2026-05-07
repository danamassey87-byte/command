-- Host runsheet / briefing fields. The OHBriefing renders these for hosts;
-- they should NEVER appear on public OH landing pages or kiosk sign-in.
ALTER TABLE public.open_houses
  ADD COLUMN IF NOT EXISTS lockbox_code text,
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS parking_notes text,
  ADD COLUMN IF NOT EXISTS host_runsheet_notes text,
  ADD COLUMN IF NOT EXISTS talking_points text;

COMMENT ON COLUMN public.open_houses.lockbox_code IS
  'Lockbox/keypad code (do NOT show on public landing pages — only host briefing).';
COMMENT ON COLUMN public.open_houses.access_notes IS
  'Side door / gate code / dog in yard / etc. (host briefing only).';
COMMENT ON COLUMN public.open_houses.parking_notes IS
  'Where guests park, agent parking, neighbor sensitivities.';
COMMENT ON COLUMN public.open_houses.host_runsheet_notes IS
  'Free-form host-only notes — emergency contacts, things to avoid showing, special tips.';
COMMENT ON COLUMN public.open_houses.talking_points IS
  'Specific talking points to lead with — features, neighborhood, schools.';
