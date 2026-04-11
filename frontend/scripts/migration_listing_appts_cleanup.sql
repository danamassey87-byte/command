-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup: listing_appointments — consolidate dual schemas into one canonical shape
-- NEW canonical columns: contact_id, property_id, scheduled_at, status, source,
--   location, converted_listing_id, notes, outcome, listing_price_discussed, lost_reason
-- OLD columns to drop: seller_name, address, city, appointment_date, appointment_time
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure all canonical columns exist
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled'
  CHECK (status IN ('scheduled','held','cancelled','converted','no_show'));
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS converted_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Keep listing-appointment-specific fields (add if missing)
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'pending'
  CHECK (outcome IN ('pending','won','lost','cancelled','rescheduled'));
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS listing_price_discussed NUMERIC;
ALTER TABLE listing_appointments ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- 2. Backfill scheduled_at from old date+time columns where NULL
UPDATE listing_appointments
SET scheduled_at = CASE
  WHEN appointment_date IS NOT NULL AND appointment_time IS NOT NULL
    THEN (appointment_date::text || ' ' || appointment_time::text)::timestamptz
  WHEN appointment_date IS NOT NULL
    THEN appointment_date::timestamptz
  ELSE NULL
END
WHERE scheduled_at IS NULL
  AND appointment_date IS NOT NULL;

-- 3. Backfill contact_id from seller_name where possible (match by name)
UPDATE listing_appointments la
SET contact_id = c.id
FROM contacts c
WHERE la.contact_id IS NULL
  AND la.seller_name IS NOT NULL
  AND lower(trim(c.name)) = lower(trim(la.seller_name));

-- 4. Backfill property_id from address where possible
UPDATE listing_appointments la
SET property_id = p.id
FROM properties p
WHERE la.property_id IS NULL
  AND la.address IS NOT NULL
  AND lower(trim(p.address)) = lower(trim(la.address));

-- 5. Map outcome → status for rows that still have default status
UPDATE listing_appointments
SET status = CASE outcome
  WHEN 'pending' THEN 'scheduled'
  WHEN 'won' THEN 'converted'
  WHEN 'lost' THEN 'held'
  WHEN 'cancelled' THEN 'cancelled'
  WHEN 'rescheduled' THEN 'scheduled'
  ELSE 'scheduled'
END
WHERE status = 'scheduled' AND outcome IS NOT NULL AND outcome != 'pending';

-- 6. Drop old columns (safe — frontend updated to use new schema)
ALTER TABLE listing_appointments DROP COLUMN IF EXISTS seller_name;
ALTER TABLE listing_appointments DROP COLUMN IF EXISTS address;
ALTER TABLE listing_appointments DROP COLUMN IF EXISTS city;
ALTER TABLE listing_appointments DROP COLUMN IF EXISTS appointment_date;
ALTER TABLE listing_appointments DROP COLUMN IF EXISTS appointment_time;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS listing_appointments_contact_idx ON listing_appointments(contact_id);
CREATE INDEX IF NOT EXISTS listing_appointments_scheduled_idx ON listing_appointments(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS listing_appointments_property_idx ON listing_appointments(property_id);
