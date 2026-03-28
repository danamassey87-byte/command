import { useState, useMemo } from 'react'
import { Badge, EmptyState, TabBar } from '../../components/ui/index.jsx'
import { useTransactions } from '../../lib/hooks.js'
import './EscrowTracker.css'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function daysUntil(d) {
  if (!d) return null
  const target = new Date(d + 'T12:00:00')
  const now = new Date(); now.setHours(0,0,0,0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}
function fmtDollar(v) {
  if (!v) return '—'
  return '$' + Number(v).toLocaleString()
}

// ─── Full AZ Escrow Checklist — Buyer Side ───────────────────────────────────
const BUYER_CHECKLIST = [
  { section: 'Contract Execution', items: [
    'Purchase contract fully executed (AAR)',
    'Buyer Advisory signed',
    'Wire Fraud Advisory signed',
    'Lead-Based Paint Disclosure (if pre-1978)',
    'Agency Disclosure acknowledged',
    'MLS data sheet / property info reviewed',
  ]},
  { section: 'Earnest Money', items: [
    'Earnest money delivered to title (3 business days)',
    'Earnest money receipt confirmed from title',
  ]},
  { section: 'Title & Escrow', items: [
    'Title order placed',
    'Escrow opened — escrow # obtained',
    'Title commitment / preliminary title report received',
    'Title exceptions reviewed with buyer',
    'HOA docs requested (CC&Rs, financials, rules)',
    'HOA docs received and reviewed',
  ]},
  { section: 'Inspections (10-Day Window)', items: [
    'Home inspection scheduled',
    'Home inspection completed',
    'Termite / WDO inspection ordered',
    'Termite / WDO report received',
    'Roof inspection (if needed)',
    'Pool / spa inspection (if applicable)',
    'Sewer scope / sewer lateral inspection',
    'HVAC inspection (if needed)',
    'Well / septic inspection (if applicable)',
    'Radon test (if applicable)',
  ]},
  { section: 'BINSR Process', items: [
    'BINSR (Buyer Inspection Notice) prepared',
    'BINSR delivered to seller within deadline',
    'Seller response received (cure / credit / deny)',
    'Buyer approval of seller cure plan',
    'Repair negotiations finalized',
  ]},
  { section: 'Appraisal', items: [
    'Appraisal ordered by lender',
    'Appraiser access scheduled with listing agent',
    'Appraisal completed',
    'Appraisal report received',
    'Appraisal at or above contract price (or renegotiated)',
  ]},
  { section: 'Loan & Financing', items: [
    'Loan application submitted',
    'Loan estimate received',
    'All borrower documents submitted to lender',
    'Conditional loan approval received',
    'Outstanding loan conditions cleared',
    'Final underwriting review complete',
    'Clear to close received',
    'Closing Disclosure (CD) received & reviewed (3-day rule)',
  ]},
  { section: 'Insurance & Utilities', items: [
    'Homeowner\'s insurance quote obtained',
    'Homeowner\'s insurance bound (binder to lender)',
    'Flood insurance (if required)',
    'Utility transfer scheduled (APS/SRP, water, gas, internet)',
  ]},
  { section: 'Pre-Closing', items: [
    'Final walkthrough scheduled',
    'Final walkthrough completed — property condition verified',
    'Repairs confirmed complete (if any per BINSR)',
    'Closing date / time / location confirmed',
    'Buyer has valid government ID for signing',
    'Cashier\'s check or wire for closing funds arranged',
  ]},
  { section: 'Closing & Post-Close', items: [
    'Closing docs signed at title company',
    'Funding confirmed by lender',
    'Deed recorded with Maricopa County Recorder',
    'Keys, garage remotes, codes delivered to buyer',
    'Move-in coordination complete',
    'Closing gift delivered',
  ]},
]

// ─── Full AZ Escrow Checklist — Seller Side ──────────────────────────────────
const SELLER_CHECKLIST = [
  { section: 'Pre-Listing / Contract Prep', items: [
    'Listing Agreement (Exclusive Right to Sell) signed',
    'SPDS (Seller Property Disclosure Statement) completed',
    'CLUE report ordered / reviewed',
    'Lead-Based Paint Disclosure (if pre-1978)',
    'Affidavit of Disclosure prepared (unincorporated Maricopa County)',
    'HOA contact info & docs gathered',
    'Loan payoff statement requested',
  ]},
  { section: 'Contract Execution', items: [
    'Purchase contract fully executed',
    'Counter offers / addenda signed (if any)',
    'Agency Disclosure acknowledged',
    'Escrow opened — escrow # obtained',
  ]},
  { section: 'Earnest Money', items: [
    'Buyer earnest money deposit confirmed with title',
  ]},
  { section: 'Title & Escrow', items: [
    'Title commitment reviewed for seller liens / issues',
    'HOA demand letter / payoff requested',
    'HOA transfer fee arranged',
    'Lien payoff information provided to title',
    'Any judgments / tax liens addressed',
  ]},
  { section: 'Inspection Period', items: [
    'Property access coordinated for buyer inspections',
    'Termite / WDO clearance obtained (if seller responsible)',
    'BINSR received from buyer',
    'Seller response to BINSR prepared (cure / credit / deny)',
    'BINSR response delivered within deadline',
    'Repair bids obtained (if agreeing to cure)',
    'Repairs completed and documented (receipts / photos)',
  ]},
  { section: 'Appraisal', items: [
    'Property access coordinated for appraiser',
    'Appraisal received — at or above price (or renegotiated)',
  ]},
  { section: 'Pre-Closing', items: [
    'Loan payoff confirmed with lender',
    'Outstanding HOA balance confirmed',
    'Utility final reads scheduled',
    'Property tax proration calculated',
    'Home warranty ordered (if seller providing)',
    'Closing date / time / location confirmed with title',
    'Seller has valid government ID for signing',
    'Final walkthrough access arranged for buyer',
  ]},
  { section: 'Closing & Post-Close', items: [
    'Closing docs signed at title company (or mobile notary)',
    'Warranty Deed signed',
    'Affidavit of Value signed',
    'Funding confirmed',
    'Deed recorded with Maricopa County Recorder',
    'Keys, garage remotes, access codes delivered',
    'Mail forwarding set up',
    'Seller proceeds disbursed (wire or check)',
    'Closing gift delivered',
  ]},
]

const STORAGE_KEY = 'escrow_checklists_v2'
function loadChecklists() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} } }
function saveChecklists(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

// Flatten checklist to get total count
function flatCount(checklist) { return checklist.reduce((s, sec) => s + sec.items.length, 0) }

export default function EscrowTracker() {
  const { data: transactions, loading } = useTransactions()
  const [checklists, setChecklists] = useState(() => loadChecklists())
  const [expandedId, setExpandedId] = useState(null)

  const escrowDeals = useMemo(() =>
    (transactions ?? []).filter(t => {
      const s = (t.status ?? '').toLowerCase()
      return !s.includes('offer') && !s.includes('pre') && !s.includes('counter')
        && !s.includes('closed') && !s.includes('cancelled') && !s.includes('withdrawn') && !s.includes('dead')
    }).sort((a, b) => {
      const dA = daysUntil(a.closing_date)
      const dB = daysUntil(b.closing_date)
      if (dA === null && dB === null) return 0
      if (dA === null) return 1
      if (dB === null) return -1
      return dA - dB
    })
  , [transactions])

  const getChecklist = (dealId) => checklists[dealId] ?? {}
  const toggleItem = (dealId, sectionIdx, itemIdx) => {
    setChecklists(prev => {
      const key = `${sectionIdx}-${itemIdx}`
      const dealChecks = { ...(prev[dealId] ?? {}) }
      dealChecks[key] = !dealChecks[key]
      const next = { ...prev, [dealId]: dealChecks }
      saveChecklists(next)
      return next
    })
  }

  const countDone = (dealId, template) => {
    const checks = getChecklist(dealId)
    let done = 0
    template.forEach((sec, si) => sec.items.forEach((_, ii) => {
      if (checks[`${si}-${ii}`]) done++
    }))
    return done
  }

  if (loading) return <div className="escrow-loading">Loading escrow data...</div>

  if (escrowDeals.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No deals in escrow"
        description="Deals will appear here once they move past the offer stage."
      />
    )
  }

  return (
    <div className="escrow">
      {escrowDeals.map(deal => {
        const days = daysUntil(deal.closing_date)
        const isSeller = deal.deal_type === 'seller'
        const template = isSeller ? SELLER_CHECKLIST : BUYER_CHECKLIST
        const total = flatCount(template)
        const done = countDone(deal.id, template)
        const pct = Math.round((done / total) * 100)
        const isExpanded = expandedId === deal.id
        const checks = getChecklist(deal.id)

        return (
          <div key={deal.id} className="escrow__deal">
            <button className="escrow__deal-header" onClick={() => setExpandedId(isExpanded ? null : deal.id)}>
              <div className="escrow__deal-info">
                <span className="escrow__deal-name">{deal.contact?.name ?? '—'}</span>
                <span className="escrow__deal-addr">{deal.property?.address ?? '—'}, {deal.property?.city ?? ''}</span>
              </div>
              <div className="escrow__deal-meta">
                <span className="escrow__deal-price">{fmtDollar(deal.property?.price || deal.offer_price)}</span>
                <div className="escrow__deal-badges">
                  <Badge variant={isSeller ? 'accent' : 'info'} size="sm">{deal.deal_type ?? 'buyer'}</Badge>
                  <Badge variant={deal.status?.toLowerCase().includes('binsr') ? 'danger' : 'default'} size="sm">{deal.status}</Badge>
                </div>
              </div>
              <div className="escrow__deal-closing">
                <span className="escrow__deal-date">COE: {fmtDate(deal.closing_date)}</span>
                {days !== null && (
                  <span className={`escrow__deal-days ${days <= 7 ? 'escrow__deal-days--urgent' : days <= 14 ? 'escrow__deal-days--soon' : ''}`}>
                    {days <= 0 ? 'Closing today!' : `${days} days left`}
                  </span>
                )}
              </div>
              <div className="escrow__deal-progress">
                <div className="escrow__progress-bar">
                  <div className="escrow__progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="escrow__progress-label">{done}/{total}</span>
              </div>
              <svg className={`escrow__chevron ${isExpanded ? 'escrow__chevron--open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isExpanded && (
              <div className="escrow__checklist">
                <div className="escrow__checklist-header">
                  <span className="escrow__checklist-side">{isSeller ? 'Seller' : 'Buyer'} Side Checklist — Arizona</span>
                  <span className="escrow__checklist-pct">{pct}% complete</span>
                </div>

                {template.map((section, si) => {
                  const sectionDone = section.items.filter((_, ii) => checks[`${si}-${ii}`]).length
                  return (
                    <div key={si} className="escrow__section">
                      <div className="escrow__section-header">
                        <span className="escrow__section-title">{section.section}</span>
                        <span className="escrow__section-count">{sectionDone}/{section.items.length}</span>
                      </div>
                      <div className="escrow__section-items">
                        {section.items.map((item, ii) => {
                          const checked = !!checks[`${si}-${ii}`]
                          return (
                            <label key={ii} className={`escrow__check-item ${checked ? 'escrow__check-item--done' : ''}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleItem(deal.id, si, ii)} />
                              <span>{item}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
