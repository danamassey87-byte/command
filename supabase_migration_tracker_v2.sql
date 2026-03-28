-- ─── Daily Tracker v2: Letter tracking + OH outreach contact method ───────────

-- Track when a letter was sent to a lead (expireds / cannonballs)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS letter_sent_at TIMESTAMPTZ;

-- Track how OH outreach was made (email vs text vs phone vs door)
ALTER TABLE oh_outreach ADD COLUMN IF NOT EXISTS contact_method TEXT DEFAULT 'email'
  CHECK (contact_method IN ('email','text','phone','door','letter'));

-- ─── Annual Goals Settings (for editable goals in Goals page) ─────────────────
INSERT INTO user_settings (key, value) VALUES (
  'annual_goals',
  '{
    "productivity_days":  215,
    "hours_practiced":    215,
    "hours_prospected":   430,
    "live_contacts":      5000,
    "added_to_pc":        250,
    "new_leads":          600,
    "listing_appts_set":  100,
    "listing_appts_held": 30,
    "listings_taken":     15,
    "listings_sold":      10,
    "buyer_reps_signed":  15,
    "buyer_sales":        10,
    "open_house_events":  100,
    "earned_income":      250000,
    "sales_closed":       20,
    "paid_income":        250000
  }'
) ON CONFLICT (key) DO NOTHING;
