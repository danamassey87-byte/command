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

// Full role vocabulary — flat list, each tagged with its group.
// `pdfLabel` is used on the printable vendor packet; `short` is a single-word
// label for compact chip rendering.
export const ROLES = [
  // ── On the contract ──
  { key: 'co_buyer',             group: 'contract',       label: 'Co-Buyer',                short: 'Co-Buyer' },
  { key: 'co_seller',            group: 'contract',       label: 'Co-Seller',               short: 'Co-Seller' },
  { key: 'spouse',               group: 'contract',       label: 'Spouse',                  short: 'Spouse' },
  { key: 'parent',               group: 'contract',       label: 'Parent',                  short: 'Parent' },
  { key: 'poa',                  group: 'contract',       label: 'Power of Attorney',       short: 'POA' },
  { key: 'trustee',              group: 'contract',       label: 'Trustee',                 short: 'Trustee' },
  { key: 'guarantor',            group: 'contract',       label: 'Guarantor',               short: 'Guarantor' },

  // ── Representation ──
  { key: 'listing_agent_other',  group: 'representation', label: 'Co-Listing Agent',        short: 'Co-Listing Agent' },
  { key: 'buyer_agent',          group: 'representation', label: "Buyer's Agent",           short: "Buyer's Agent" },
  { key: 'transaction_coordinator', group: 'representation', label: 'Transaction Coordinator', short: 'TC' },
  { key: 'escrow_officer',       group: 'representation', label: 'Escrow Officer',          short: 'Escrow' },
  { key: 'title_officer',        group: 'representation', label: 'Title Officer',           short: 'Title' },
  { key: 'lender',               group: 'representation', label: 'Lender / Loan Officer',   short: 'Lender' },
  { key: 'attorney',             group: 'representation', label: 'Attorney',                short: 'Attorney' },

  // ── Vendors ──
  { key: 'inspector',            group: 'vendor',         label: 'Home Inspector',          short: 'Inspector' },
  { key: 'termite_inspector',    group: 'vendor',         label: 'Termite Inspector',       short: 'Termite' },
  { key: 'pool_inspector',       group: 'vendor',         label: 'Pool Inspector',          short: 'Pool Insp.' },
  { key: 'roof_inspector',       group: 'vendor',         label: 'Roof Inspector',          short: 'Roof Insp.' },
  { key: 'hvac_inspector',       group: 'vendor',         label: 'HVAC Inspector',          short: 'HVAC' },
  { key: 'sewer_scope',          group: 'vendor',         label: 'Sewer Scope',             short: 'Sewer Scope' },
  { key: 'appraiser',            group: 'vendor',         label: 'Appraiser',               short: 'Appraiser' },
  { key: 'surveyor',             group: 'vendor',         label: 'Land Surveyor',           short: 'Surveyor' },
  { key: 'photographer',         group: 'vendor',         label: 'Photographer',            short: 'Photographer' },
  { key: 'videographer',         group: 'vendor',         label: 'Videographer',            short: 'Videographer' },
  { key: 'stager',               group: 'vendor',         label: 'Stager',                  short: 'Stager' },
  { key: 'cleaner',              group: 'vendor',         label: 'Cleaner',                 short: 'Cleaner' },
  { key: 'landscaper',           group: 'vendor',         label: 'Landscaper',              short: 'Landscaper' },
  { key: 'general_contractor',   group: 'vendor',         label: 'General Contractor',      short: 'GC' },
  { key: 'handyman',             group: 'vendor',         label: 'Handyman',                short: 'Handyman' },
  { key: 'plumber',              group: 'vendor',         label: 'Plumber',                 short: 'Plumber' },
  { key: 'electrician',          group: 'vendor',         label: 'Electrician',             short: 'Electrician' },
  { key: 'roofer',               group: 'vendor',         label: 'Roofer',                  short: 'Roofer' },
  { key: 'hvac_tech',            group: 'vendor',         label: 'HVAC Technician',         short: 'HVAC Tech' },
  { key: 'painter',              group: 'vendor',         label: 'Painter',                 short: 'Painter' },
  { key: 'flooring',             group: 'vendor',         label: 'Flooring',                short: 'Flooring' },
  { key: 'mover',                group: 'vendor',         label: 'Moving Company',          short: 'Movers' },
  { key: 'warranty',             group: 'vendor',         label: 'Home Warranty',           short: 'Warranty' },
  { key: 'insurance',            group: 'vendor',         label: 'Insurance Agent',         short: 'Insurance' },

  // ── Other ──
  { key: 'other',                group: 'other',          label: 'Other',                   short: 'Other' },
]

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
export function rolesInGroup(group) {
  return ROLES.filter(r => r.group === group)
}
