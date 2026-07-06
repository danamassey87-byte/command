// ─── Canonical checklist keying ──────────────────────────────────────────────
// A client has exactly ONE workflow checklist, shown across every view. To keep
// them all reading/writing the same checklist_runs row we anchor:
//   • Seller / listing side  → parent_kind='listing', parent_id=listing.id
//   • Buyer  side            → parent_kind='contact', parent_id=contact.id
// The Sellers page already keys on listing.id and the Buyers page on contact.id;
// this resolver lets the Pipeline (which works off deals/transactions) and the
// standalone SOP pages land on the very same key.

export function isSellerDeal(deal) {
  return deal?.deal_type === 'seller' || deal?.side === 'listing'
}

/**
 * Resolve a deal/transaction to its canonical checklist key.
 * @param {object} deal      transaction row (needs deal_type, property_id, contact_id)
 * @param {array}  listings  listings list (to map a seller deal → its listing)
 * @returns {{parentKind, parentId, category}|null} null when it can't be anchored yet
 */
export function resolveDealChecklistKey(deal, listings = []) {
  if (!deal) return null
  if (isSellerDeal(deal)) {
    const listing = listings.find(l => l.property_id === deal.property_id)
    if (listing) return { parentKind: 'listing', parentId: listing.id, category: 'listing' }
    // No listing record yet — fall back to the property so the checklist still
    // has a stable home and can migrate onto the listing once one exists.
    if (deal.property_id) return { parentKind: 'property', parentId: deal.property_id, category: 'listing' }
    return null
  }
  // Buyer / both → the buyer contact is the anchor.
  if (deal.contact_id) return { parentKind: 'contact', parentId: deal.contact_id, category: 'buyer' }
  return null
}
