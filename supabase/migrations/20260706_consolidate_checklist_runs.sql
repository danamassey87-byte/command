-- ────────────────────────────────────────────────────────────────────────────
-- 2026-07-06 — Consolidate checklist runs onto ONE canonical key per client
-- Historically a deal's checklist was keyed parent_kind='deal', while the Sellers
-- page keyed on the listing and the Buyers page on the contact — so a client
-- (e.g. Don & Julie Neves / 9603 E Theia Dr) had divergent checklists per view.
-- Canonical anchor: seller → listing.id, buyer → contact.id.
-- Guards prevent creating duplicates; safe to re-run.
-- ────────────────────────────────────────────────────────────────────────────

-- Seller/listing deal runs → move onto the listing
UPDATE checklist_runs cr
SET parent_kind = 'listing', parent_id = l.id, updated_at = now()
FROM transactions t
JOIN listings l ON l.property_id = t.property_id
WHERE cr.parent_kind = 'deal' AND cr.parent_id = t.id
  AND (t.deal_type = 'seller' OR t.side = 'listing')
  AND NOT EXISTS (
    SELECT 1 FROM checklist_runs x
    WHERE x.parent_kind = 'listing' AND x.parent_id = l.id AND x.id <> cr.id
  );

-- Buyer deal runs → move onto the contact
UPDATE checklist_runs cr
SET parent_kind = 'contact', parent_id = t.contact_id, updated_at = now()
FROM transactions t
WHERE cr.parent_kind = 'deal' AND cr.parent_id = t.id
  AND COALESCE(t.deal_type, '') <> 'seller' AND t.side IS DISTINCT FROM 'listing'
  AND t.contact_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM checklist_runs x
    WHERE x.parent_kind = 'contact' AND x.parent_id = t.contact_id AND x.id <> cr.id
  );

-- Link each transaction to its canonical run for convenience
UPDATE transactions t
SET checklist_run_id = cr.id
FROM listings l
JOIN checklist_runs cr ON cr.parent_kind = 'listing' AND cr.parent_id = l.id
WHERE l.property_id = t.property_id
  AND (t.deal_type = 'seller' OR t.side = 'listing')
  AND t.checklist_run_id IS NULL;

UPDATE transactions t
SET checklist_run_id = cr.id
FROM checklist_runs cr
WHERE cr.parent_kind = 'contact' AND cr.parent_id = t.contact_id
  AND COALESCE(t.deal_type, '') <> 'seller'
  AND t.checklist_run_id IS NULL;
