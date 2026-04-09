// ─────────────────────────────────────────────────────────────────────────────
// Shared role vocabulary for the Vendors rolodex and Listing Parties section.
// Used by:
//   - Vendors page (filter + add/edit form)
//   - Sellers → Parties & Vendors picker
//   - Vendor PDF packet export (grouping + section headers)
// ─────────────────────────────────────────────────────────────────────────────

// Four logical groupings. "Contract" = additional people on the contract.
// "Representation" = agents/transaction-side. "Vendor" = service providers.
export const ROLE_GROUPS = [
  { key: 'contract',       label: 'On the Contract',    desc: 'Additional people on the purchase agreement' },
  { key: 'representation', label: 'Representation',     desc: 'Agents, transaction coordinator, escrow, title, lender' },
  { key: 'vendor',         label: 'Vendors',            desc: 'Inspection, appraisal, photography, staging, repairs, etc.' },
  { key: 'other',          label: 'Other',              desc: 'Anyone else involved in this deal' },
]

// `vendorAllowed: false` excludes a role from the Vendors rolodox because it's
// transaction-specific (co-buyer, spouse, trustee, the other side's agent,
// etc). These roles still appear when editing a client/lead contact.
//
// Full role vocabulary — flat list, each tagged with its group.
// `short` is a single-word label for compact chip rendering.
export const ROLES = [
  // ── On the contract (all transaction-specific, NOT vendors) ──
  { key: 'co_buyer',             group: 'contract',       vendorAllowed: false, label: 'Co-Buyer',                short: 'Co-Buyer' },
  { key: 'co_seller',            group: 'contract',       vendorAllowed: false, label: 'Co-Seller',               short: 'Co-Seller' },
  { key: 'spouse',               group: 'contract',       vendorAllowed: false, label: 'Spouse',                  short: 'Spouse' },
  { key: 'parent',               group: 'contract',       vendorAllowed: false, label: 'Parent',                  short: 'Parent' },
  { key: 'poa',                  group: 'contract',       vendorAllowed: false, label: 'Power of Attorney',       short: 'POA' },
  { key: 'trustee',              group: 'contract',       vendorAllowed: false, label: 'Trustee',                 short: 'Trustee' },
  { key: 'guarantor',            group: 'contract',       vendorAllowed: false, label: 'Guarantor',               short: 'Guarantor' },

  // ── Representation ──
  // Co-listing / buyer's agent / attorney are transaction-specific — not vendors.
  // TC / escrow / title / lender ARE recurring vendor-style relationships.
  { key: 'listing_agent_other',  group: 'representation', vendorAllowed: false, label: 'Co-Listing Agent',        short: 'Co-Listing Agent' },
  { key: 'buyer_agent',          group: 'representation', vendorAllowed: false, label: "Buyer's Agent",           short: "Buyer's Agent" },
  { key: 'attorney',             group: 'representation', vendorAllowed: false, label: 'Attorney',                short: 'Attorney' },
  { key: 'transaction_coordinator', group: 'representation', vendorAllowed: true, label: 'Transaction Coordinator', short: 'TC' },
  { key: 'escrow_officer',       group: 'representation', vendorAllowed: true,  label: 'Escrow Officer',          short: 'Escrow' },
  { key: 'title_officer',        group: 'representation', vendorAllowed: true,  label: 'Title Officer',           short: 'Title' },
  { key: 'lender',               group: 'representation', vendorAllowed: true,  label: 'Lender / Loan Officer',   short: 'Lender' },

  // ── Vendors ──
  { key: 'inspector',            group: 'vendor',         vendorAllowed: true, label: 'Home Inspector',          short: 'Inspector' },
  { key: 'termite_inspector',    group: 'vendor',         vendorAllowed: true, label: 'Termite Inspector',       short: 'Termite' },
  { key: 'pool_inspector',       group: 'vendor',         vendorAllowed: true, label: 'Pool Inspector',          short: 'Pool Insp.' },
  { key: 'roof_inspector',       group: 'vendor',         vendorAllowed: true, label: 'Roof Inspector',          short: 'Roof Insp.' },
  { key: 'hvac_inspector',       group: 'vendor',         vendorAllowed: true, label: 'HVAC Inspector',          short: 'HVAC' },
  { key: 'sewer_scope',          group: 'vendor',         vendorAllowed: true, label: 'Sewer Scope',             short: 'Sewer Scope' },
  { key: 'appraiser',            group: 'vendor',         vendorAllowed: true, label: 'Appraiser',               short: 'Appraiser' },
  { key: 'surveyor',             group: 'vendor',         vendorAllowed: true, label: 'Land Surveyor',           short: 'Surveyor' },
  { key: 'photographer',         group: 'vendor',         vendorAllowed: true, label: 'Photographer',            short: 'Photographer' },
  { key: 'videographer',         group: 'vendor',         vendorAllowed: true, label: 'Videographer',            short: 'Videographer' },
  { key: 'stager',               group: 'vendor',         vendorAllowed: true, label: 'Stager',                  short: 'Stager' },
  { key: 'cleaner',              group: 'vendor',         vendorAllowed: true, label: 'Cleaner',                 short: 'Cleaner' },
  { key: 'landscaper',           group: 'vendor',         vendorAllowed: true, label: 'Landscaper',              short: 'Landscaper' },
  { key: 'general_contractor',   group: 'vendor',         vendorAllowed: true, label: 'General Contractor',      short: 'GC' },
  { key: 'handyman',             group: 'vendor',         vendorAllowed: true, label: 'Handyman',                short: 'Handyman' },
  { key: 'plumber',              group: 'vendor',         vendorAllowed: true, label: 'Plumber',                 short: 'Plumber' },
  { key: 'electrician',          group: 'vendor',         vendorAllowed: true, label: 'Electrician',             short: 'Electrician' },
  { key: 'roofer',               group: 'vendor',         vendorAllowed: true, label: 'Roofer',                  short: 'Roofer' },
  { key: 'hvac_tech',            group: 'vendor',         vendorAllowed: true, label: 'HVAC Technician',         short: 'HVAC Tech' },
  { key: 'painter',              group: 'vendor',         vendorAllowed: true, label: 'Painter',                 short: 'Painter' },
  { key: 'flooring',             group: 'vendor',         vendorAllowed: true, label: 'Flooring',                short: 'Flooring' },
  { key: 'mover',                group: 'vendor',         vendorAllowed: true, label: 'Moving Company',          short: 'Movers' },
  { key: 'warranty',             group: 'vendor',         vendorAllowed: true, label: 'Home Warranty',           short: 'Warranty' },
  { key: 'insurance',            group: 'vendor',         vendorAllowed: true, label: 'Insurance Agent',         short: 'Insurance' },

  // ── Other ──
  { key: 'other',                group: 'other',          vendorAllowed: true, label: 'Other',                   short: 'Other' },
]

// ── Filtered subsets ─────────────────────────────────────────────────────────
// VENDOR_ROLES = only roles that represent recurring service providers.
// Use this in the Vendors rolodex + Add Vendor form.
export const VENDOR_ROLES = ROLES.filter(r => r.vendorAllowed !== false)

// CONTACT_RELATIONSHIP_ROLES = transaction-specific roles that belong on a
// client/lead contact (co-buyer, spouse, trustee, etc), NOT in the Vendors list.
export const CONTACT_RELATIONSHIP_ROLES = ROLES.filter(r => r.vendorAllowed === false)

// Role groups filtered to only those that have any vendor-allowed roles.
// Vendors page filter tabs use this so the 'contract' group is hidden.
export const VENDOR_ROLE_GROUPS = ROLE_GROUPS.filter(g =>
  VENDOR_ROLES.some(r => r.group === g.key)
)

// Map of key → role object for fast lookup.
export const ROLE_BY_KEY = Object.fromEntries(ROLES.map(r => [r.key, r]))

// Pretty label for a role key, falling back to the key itself humanized.
export function roleLabel(key) {
  const r = ROLE_BY_KEY[key]
  if (r) return r.label
  if (!key) return 'Other'
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Group label for a role key.
export function roleGroupFor(key) {
  return ROLE_BY_KEY[key]?.group || 'other'
}

// Roles limited to a single group — for dropdowns in Add Party forms.
// By default only returns vendor-allowed roles. Pass { all: true } to include
// transaction-specific roles (used on client/lead contact forms).
export function rolesInGroup(group, { all = false } = {}) {
  const pool = all ? ROLES : VENDOR_ROLES
  return pool.filter(r => r.group === group)
}
