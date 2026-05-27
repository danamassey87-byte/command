// ────────────────────────────────────────────────────────────────────────────
// Auto-seed Required Documents + Contract Deadlines on Under-Contract.
// Called from:
//   • Sellers.jsx when listing.status flips to 'pending' OR 'ucb'
//     (AZ MLS = under contract; UCB = Under Contract Accepting Backups)
//   • Pipeline.jsx when a deal is dragged into the 'under_contract' stage
//
// Idempotent: the underlying seedTransactionDocuments / seedTransactionDeadlines
// helpers skip rows whose template_key already exists for this parent. Safe to
// call repeatedly — re-runs become no-ops once seeding is complete.
// ────────────────────────────────────────────────────────────────────────────

import * as DB from './supabase.js'
import { emit as emitNotification } from './notifications'

/**
 * @param {Object} args
 * @param {'contact' | 'listing'} args.parentKind
 * @param {string} args.parentId
 * @param {'buyer' | 'listing'} args.appliesTo
 * @param {string|Date|null} args.contractAcceptanceDate  -- ISO string or Date; defaults to today
 * @param {string} [args.label]                           -- e.g. address or buyer name, for notification body
 * @param {string} [args.link]                            -- destination link in notification, e.g. `/buyers/${id}`
 */
export async function autoSeedOnUnderContract({
  parentKind, parentId, appliesTo,
  contractAcceptanceDate = new Date().toISOString().slice(0, 10),
  label = '',
  link = '',
}) {
  if (!parentKind || !parentId || !appliesTo) return { docs: 0, deadlines: 0 }

  let docsAdded = 0
  let deadlinesAdded = 0

  try {
    const docResult = await DB.seedTransactionDocuments(parentKind, parentId, appliesTo)
    docsAdded = docResult?.data?.length ?? 0
  } catch (err) {
    console.error('[autoSeedOnUnderContract] document seed failed:', err)
  }

  try {
    const dlResult = await DB.seedTransactionDeadlines(parentKind, parentId, appliesTo, contractAcceptanceDate)
    deadlinesAdded = dlResult?.data?.length ?? 0
  } catch (err) {
    console.error('[autoSeedOnUnderContract] deadline seed failed:', err)
  }

  // Only fire the notification if something actually got seeded — re-runs go silent.
  if (docsAdded > 0 || deadlinesAdded > 0) {
    emitNotification({
      type: 'workflow_seeded',
      title: 'Under Contract — workflow seeded',
      body: `${label ? label + ': ' : ''}${docsAdded} required documents + ${deadlinesAdded} contract deadlines added. Open the record to fill in dates and statuses.`,
      link: link || (parentKind === 'listing' ? '/sellers' : '/buyers'),
      source_table: parentKind === 'listing' ? 'listings' : 'contacts',
      source_id: parentId,
      metadata: { docs_added: docsAdded, deadlines_added: deadlinesAdded, applies_to: appliesTo },
    }).catch(err => console.error('[autoSeedOnUnderContract] notification emit failed:', err))
  }

  return { docs: docsAdded, deadlines: deadlinesAdded }
}
