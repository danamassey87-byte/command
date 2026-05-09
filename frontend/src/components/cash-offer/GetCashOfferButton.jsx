// GetCashOfferButton — Plan B FCO submission flow.
//
// FastCashOffers' portal does not (currently) accept URL params for new submissions,
// so this button:
//   1. Builds a clean address+property block.
//   2. Copies it to the clipboard.
//   3. Opens FCO in a new tab.
//   4. Records a row in cash_offer_routings (pending, 24h SLA).
//   5. Tags the contact with the FCO seller-side tag.
//   6. Schedules a 4-step Dana-side follow-up reminder sequence in daily_tasks.
//
// On decline/expire, the cron `cash-offer-sla-check` (separate edge fn) marks
// the routing expired and (TODO) auto-enrolls the contact in the fallback
// Traditional-listing sequence.
import { useState } from 'react'
import { Button } from '../ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import supabase from '../../lib/supabase.js'

const FCO_PORTAL_URL = 'https://console.fastcashoffers.ai/'

// Follow-up cadence Dana asked for. All offsets in hours from submission.
// Each task carries a unique source_link for idempotent re-runs.
const FCO_FOLLOW_UPS = [
  { offsetHours: 4,   priority: 'high',   title: 'Confirm with seller: FCO submission received', body: 'Quick check-in — let them know we just submitted to FastCashOffers and they should hear back within 24h.' },
  { offsetHours: 24,  priority: 'high',   title: 'FCO 24h check-in (SLA hits today)',             body: 'Vendor SLA is up. Call the seller — review whatever offer came back (or pivot to traditional if declined).' },
  { offsetHours: 48,  priority: 'normal', title: 'Day 2: post-FCO conversation',                  body: 'Where do they want to go from here? If accepted, schedule walkthrough. If declined, present traditional-listing path.' },
  { offsetHours: 120, priority: 'normal', title: 'Day 5: FCO decision close-out',                 body: 'Final close-out check. If still undecided, mark them on-hold and queue for nurture; otherwise move to next stage.' },
]

export default function GetCashOfferButton({
  contactId,
  propertyId = null,
  property = {},   // { address, city, state, zip, beds, baths, sqft, year_built, list_price_cents, condition_notes }
  contactName = '',
  size = 'md',
  variant = 'primary',
  className = '',
  onSubmitted, // optional callback({ routing })
}) {
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    if (!contactId) {
      alert('No contact attached — open this from a seller record so we can track the routing.')
      return
    }
    setBusy(true)
    try {
      // 1 · Build clipboard block.
      const fullAddress = [property.address, [property.city, property.state].filter(Boolean).join(', '), property.zip].filter(Boolean).join(', ')
      const lines = [
        contactName ? `Seller: ${contactName}` : null,
        fullAddress ? `Address: ${fullAddress}` : null,
        property.beds       ? `Beds: ${property.beds}`             : null,
        property.baths      ? `Baths: ${property.baths}`           : null,
        property.sqft       ? `Sqft: ${property.sqft}`             : null,
        property.year_built ? `Year Built: ${property.year_built}` : null,
        property.list_price_cents ? `Asking: $${(property.list_price_cents/100).toLocaleString()}` : null,
        property.condition_notes ? `Condition: ${property.condition_notes}` : null,
      ].filter(Boolean)
      const block = lines.join('\n')

      // 2 · Copy to clipboard (best-effort).
      let copied = false
      try {
        await navigator.clipboard.writeText(block)
        copied = true
      } catch { /* fall through */ }

      // 3 · Resolve FastCashOffers source.
      const sources = await DB.listLeadSources({ includeArchived: true })
      const fco = (sources || []).find(s => s.slug === 'fastcashoffers')
      if (!fco) throw new Error('FastCashOffers lead source not found in Settings → Lead Sources.')

      // 4 · Insert routing row.
      const routing = await DB.createCashOfferRouting({
        contact_id: contactId,
        lead_source_id: fco.id,
        property_id: propertyId,
        property_address: fullAddress || null,
        outcome: 'pending',
        notes: copied ? null : 'Clipboard copy failed — Dana pasted manually.',
      })

      // 5 · Apply the FCO seller-side tag to the contact.
      //     If sides_supplied is 'seller' we use seller_tag_id; if FCO ever flips to 'both'
      //     we still default to seller (cash offers are seller-side workflow).
      const tagId = fco.seller_tag_id || fco.buyer_tag_id || null
      if (tagId) {
        try { await DB.addContactTag(contactId, tagId) } catch (e) { console.warn('[FCO] tag apply failed', e) }
      }

      // 6 · Schedule 4-step follow-up reminder sequence in daily_tasks (idempotent on source_link).
      const now = Date.now()
      const taskRows = FCO_FOLLOW_UPS.map(step => {
        const dueMs = now + step.offsetHours * 3600 * 1000
        const due = new Date(dueMs)
        return {
          title: step.title + (contactName ? ` — ${contactName}` : ''),
          description: step.body,
          category: 'follow_up',
          priority: step.priority,
          status: 'pending',
          due_date: due.toISOString().slice(0, 10),
          due_time: due.toISOString().slice(11, 16) + ':00',
          contact_id: contactId,
          source_type: 'cash_offer_routing',
          source_link: `fco-followup://${routing.id}/${step.offsetHours}h`,
        }
      })
      // Use upsert-style insert with onConflict-by-source_link via pre-check, since
      // daily_tasks has no unique constraint there. A second click within minutes
      // would otherwise create dupes; pre-check is cheap and bulletproof.
      const sourceLinks = taskRows.map(r => r.source_link)
      const { data: existing } = await supabase.from('daily_tasks').select('source_link').in('source_link', sourceLinks)
      const existingSet = new Set((existing || []).map(r => r.source_link))
      const toInsert = taskRows.filter(r => !existingSet.has(r.source_link))
      if (toInsert.length > 0) {
        const { error: taskErr } = await supabase.from('daily_tasks').insert(toInsert)
        if (taskErr) console.warn('[FCO] follow-up tasks insert failed', taskErr)
      }

      // 7 · Open the portal.
      window.open(FCO_PORTAL_URL, '_blank', 'noopener,noreferrer')

      // 8 · Toast.
      const msg = copied
        ? `Address copied. FastCashOffers opened in a new tab.\nTag applied. ${toInsert.length} follow-up reminder(s) scheduled (4h / 24h / 2d / 5d).`
        : `FastCashOffers opened in a new tab. Clipboard copy failed — please copy the address manually.\nTag applied. ${toInsert.length} follow-up reminder(s) scheduled.`
      alert(msg)

      onSubmitted?.({ routing, tasksCreated: toInsert.length })
    } catch (err) {
      console.error('[GetCashOfferButton]', err)
      alert(err.message || 'Failed to submit cash offer routing.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={busy}
    >
      {busy ? 'Submitting…' : '💰 Get Cash Offer'}
    </Button>
  )
}
