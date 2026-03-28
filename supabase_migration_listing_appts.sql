-- Listing Appointments migration
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS listing_appointments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id              UUID REFERENCES contacts(id) ON DELETE SET NULL,
  appointment_date        DATE,
  appointment_time        TEXT,
  seller_name             TEXT,
  address                 TEXT,
  city                    TEXT,
  outcome                 TEXT NOT NULL DEFAULT 'pending'
                            CHECK (outcome IN ('pending','won','lost','cancelled','rescheduled')),
  lost_reason             TEXT,
  listing_price_discussed NUMERIC,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_appt_checklist (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES listing_appointments(id) ON DELETE CASCADE,
  task_name      TEXT NOT NULL,
  completed      BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  sort_order     INTEGER NOT NULL DEFAULT 0
);
