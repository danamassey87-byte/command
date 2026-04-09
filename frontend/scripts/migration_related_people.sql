-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Related People on contacts + listings
--
-- Stores additional people tied to a client/listing as a JSONB array.
-- Each item:
--   {
--     "id":           "uuid",
--     "first_name":   "Jane",
--     "last_name":    "Smith",
--     "phone":        "(480) 555-0000",
--     "email":        "jane@example.com",       -- optional
--     "relationship": "spouse"                  -- key from CONTACT_RELATIONSHIP_ROLES
--   }
--
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table contacts add column if not exists related_people jsonb default '[]'::jsonb;
alter table listings add column if not exists related_people jsonb default '[]'::jsonb;

-- Helpful generated index on the length of the array so queries like "contacts
-- with at least one related person" stay cheap.
create index if not exists contacts_has_related_people_idx
  on contacts((jsonb_array_length(coalesce(related_people, '[]'::jsonb)) > 0))
  where related_people is not null;

notify pgrst, 'reload schema';
