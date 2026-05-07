// ─────────────────────────────────────────────────────────────────────────────
// Contact segment definitions — shared between EnrollModal (Smart Campaigns)
// and ListingEmailBlastModal (one-off listing blasts).
//
// Each segment is `{ key, label, description, filter(contact) -> bool }`.
// `filter` runs client-side over a list of live contacts (deleted_at /
// archived_at already removed by the loader).
// ─────────────────────────────────────────────────────────────────────────────

export const CONTACT_SEGMENTS = [
  {
    key: 'all',
    label: 'All Contacts',
    description: 'Every live contact in the database',
    filter: () => true,
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'Contacts typed as "lead"',
    filter: c => c.type === 'lead',
  },
  {
    key: 'buyers',
    label: 'Buyers',
    description: 'Active buyers (type = buyer or both)',
    filter: c => c.type === 'buyer' || c.type === 'both',
  },
  {
    key: 'buyers_bba_signed',
    label: 'Buyers — BBA Signed',
    description: 'Buyers with a signed BBA still active (expiry in future or not set)',
    filter: c => {
      if (!(c.type === 'buyer' || c.type === 'both')) return false
      if (!c.bba_signed) return false
      if (!c.bba_expiration_date) return true
      return new Date(c.bba_expiration_date) >= new Date()
    },
  },
  {
    key: 'buyers_bba_expiring',
    label: 'Buyers — BBA Expiring Soon (30d)',
    description: 'BBA expires in the next 30 days',
    filter: c => {
      if (!c.bba_signed || !c.bba_expiration_date) return false
      const days = (new Date(c.bba_expiration_date) - new Date()) / (1000 * 60 * 60 * 24)
      return days >= 0 && days <= 30
    },
  },
  {
    key: 'sellers',
    label: 'Sellers',
    description: 'Active sellers (type = seller or both)',
    filter: c => c.type === 'seller' || c.type === 'both',
  },
  {
    key: 'investors',
    label: 'Investors',
    description: 'Investor contacts',
    filter: c => c.type === 'investor',
  },
  {
    key: 'past_clients',
    label: 'Past Clients',
    description: 'Closed deals / type = past_client',
    filter: c => c.type === 'past_client',
  },
  {
    key: 'fsbo',
    label: 'FSBO',
    description: 'Source = FSBO',
    filter: c => (c.source || '').toLowerCase() === 'fsbo',
  },
  {
    key: 'expired',
    label: 'Expired Listings',
    description: 'Source = expired',
    filter: c => (c.source || '').toLowerCase() === 'expired',
  },
  {
    key: 'circle',
    label: 'Circle Prospecting',
    description: 'Source = circle',
    filter: c => (c.source || '').toLowerCase() === 'circle',
  },
  {
    key: 'soi',
    label: 'Sphere of Influence',
    description: 'Source = soi / sphere / referral',
    filter: c => {
      const s = (c.source || '').toLowerCase()
      return s === 'soi' || s === 'sphere' || s === 'referral'
    },
  },
  {
    key: 'no_email',
    label: 'No Email on File',
    description: 'Contacts missing an email address (SMS-only)',
    filter: c => !c.email || !c.email.trim(),
  },
  {
    key: 'no_recent_activity',
    label: 'Stale — No Activity 14+ days',
    description: 'created_at older than 14 days and no recent update',
    filter: c => {
      const last = new Date(c.updated_at || c.created_at || 0)
      const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
      return days >= 14
    },
  },
]

export function findSegment(key) {
  return CONTACT_SEGMENTS.find(s => s.key === key) || null
}

/** Apply a segment by key to a contact list. Returns matched contacts. */
export function applySegment(key, contacts) {
  const seg = findSegment(key)
  if (!seg) return []
  return contacts.filter(seg.filter)
}
