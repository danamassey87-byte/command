/* ──────────────────────────────────────────────────────────────────────────
 * Shared validators + format guards used by quick-add and CRM forms.
 * Each validator returns null on success or a human-readable error string.
 * ────────────────────────────────────────────────────────────────────────── */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const normalizePhone = (raw) =>
  (raw || '').replace(/[^0-9]/g, '') || null

export const formatPhone = (raw) => {
  const d = normalizePhone(raw) || ''
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  return raw || ''
}

export function validateEmail(email) {
  if (!email) return null
  if (!EMAIL_RE.test(email)) return 'Email looks invalid'
  return null
}

export function validatePhone(phone) {
  if (!phone) return null
  const d = normalizePhone(phone)
  if (d.length < 10) return 'Phone must be at least 10 digits'
  if (d.length > 11) return 'Phone has too many digits'
  return null
}

export function validateZip(zip) {
  if (!zip) return null
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return 'ZIP must be 5 digits'
  return null
}

/* ─── #3  Past-date guard for scheduled_at ──────────────────────────────── */
/** Returns null if the date is in the future (or today), or a warning message
 *  asking for explicit confirmation if it's in the past. Pair with a confirm
 *  flag in the form so the user can opt in to backfilling. */
export function checkFutureDate(isoOrDate) {
  if (!isoOrDate) return null
  const d = new Date(isoOrDate)
  if (isNaN(d.getTime())) return 'Invalid date'
  if (d.getTime() < Date.now() - 60 * 1000) {
    return `That date is in the past (${d.toLocaleString()}). Confirm you're backfilling.`
  }
  return null
}

/* ─── #6  Stage transition strictness ──────────────────────────────────── */
/** Promoting a lead → buyer/seller client requires phone OR email so they're
 *  reachable. Use before allowing the contact's `type` to flip from 'lead'. */
export function canPromoteLead(contact) {
  if (!contact) return 'No contact provided'
  const hasContact =
    !!(contact.phone && normalizePhone(contact.phone)?.length >= 10) ||
    !!(contact.email && EMAIL_RE.test(contact.email))
  if (!hasContact) return 'Add a phone OR email before converting this lead to a client'
  return null
}

/** Listings can't go active without a signed agreement (DB enforces too). */
export function canActivateListing(listing) {
  if (!listing) return 'No listing provided'
  if (!listing.listing_agreement_signed) return 'Listing agreement must be signed before going active'
  return null
}

/* ─── #14  Price sanity ────────────────────────────────────────────────── */
/** Returns a warning string if a price looks far outside the typical range,
 *  null otherwise. Catches missing-zero typos. Defaults are tuned for AZ
 *  East-Valley single-family — override `bounds` for other use. */
export function priceSanity(price, { min = 50_000, max = 5_000_000 } = {}) {
  if (price == null || price === '') return null
  const n = Number(price)
  if (isNaN(n)) return 'Price must be a number'
  if (n < min) return `Price is unusually low ($${n.toLocaleString()}). Missing a zero?`
  if (n > max) return `Price is unusually high ($${n.toLocaleString()}). Extra zero?`
  return null
}

/* ─── #13  Aggregate field validator for contact-shaped forms ─────────── */
export function validateContactFields({ name, email, phone, requireReachable = false }) {
  if (!name?.trim()) return 'Name is required'
  const eErr = validateEmail(email); if (eErr) return eErr
  const pErr = validatePhone(phone); if (pErr) return pErr
  if (requireReachable && !email?.trim() && !phone?.trim()) {
    return 'Add a phone or email so they can be reached'
  }
  return null
}

/* ─── Idempotency request id (#2) ──────────────────────────────────────── */
/** Generate a stable request id that lasts as long as the form is open.
 *  The same id is sent with every retry of the same submit, so a unique
 *  index on client_request_id makes the insert idempotent. */
export function newRequestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback: timestamp + random
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
