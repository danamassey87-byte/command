// ─────────────────────────────────────────────────────────────────────────────
// Shared financial helpers — single source of truth for the rollup formulas
// used on EscrowTracker, ClosedDeals, Sellers list, Buyers list, and ROI tabs.
//
// Rule: every dollar in or out of a deal flows through these helpers so the
// numbers match across screens. If you change a formula here, all consumers
// move together.
// ─────────────────────────────────────────────────────────────────────────────

/** 2026 IRS standard mileage rate (cents-per-mile, expressed as dollars). */
export const IRS_MILEAGE_RATE = 0.70

const num = (v) => Number(v) || 0

/** Sum miles for a set of mileage_log rows, doubling round-trips. */
export function totalMiles(mileageRows = []) {
  return mileageRows.reduce((sum, m) => sum + (m.round_trip ? num(m.miles) * 2 : num(m.miles)), 0)
}

/** Convert miles to dollar cost at the IRS rate. */
export function mileageDollarCost(miles) {
  return num(miles) * IRS_MILEAGE_RATE
}

/**
 * Active-listing true-net snapshot — what Dana takes home if the listing
 * closes today at current_price (or list_price) with no fee surprises.
 *
 * Inputs:
 *   listing            — { id, listPriceRaw, currentPriceRaw, commission_rate, property_id }
 *   expenses           — array of all expense rows (filtered by listing_id internally)
 *   mileage            — array of all mileage_log rows (filtered by property_id / listing.id internally)
 *   transactionForListing — optional matching transaction row (used for fee details)
 *
 * Returns:
 *   {
 *     price, commissionRate,
 *     grossCommission,
 *     marketingSpend, mileageMiles, mileageCost,
 *     fees,
 *     trueNet                 — gross − fees − marketing − mileage
 *   }
 */
export function computeListingTrueNet({ listing, expenses = [], mileage = [], transactionForListing = null }) {
  const price = num(listing.currentPriceRaw || listing.listPriceRaw || listing.current_price || listing.list_price)
  const commissionRate = num(listing.commission_rate || 3) // % of price
  const grossCommission = price * (commissionRate / 100)

  const marketingSpend = expenses
    .filter(e => e.listing_id === listing.id)
    .reduce((s, e) => s + num(e.amount), 0)

  const lmiles = mileage.filter(m =>
    (transactionForListing && m.transaction_id === transactionForListing.id) ||
    (listing.property_id && m.property_id === listing.property_id)
  )
  const mileageMiles = totalMiles(lmiles)
  const mileageCost = mileageDollarCost(mileageMiles)

  const fees = transactionForListing
    ? num(transactionForListing.broker_fee) + num(transactionForListing.referral_fee) + num(transactionForListing.tc_fee) + num(transactionForListing.lead_source_fee)
    : 0

  const trueNet = grossCommission - fees - marketingSpend - mileageCost

  return { price, commissionRate, grossCommission, marketingSpend, mileageMiles, mileageCost, fees, trueNet }
}
