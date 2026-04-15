import { useState, useCallback, useMemo } from 'react'
import { Card, Badge, Button, Textarea, SlidePanel } from '../../components/ui/index.jsx'
import { useTransactions } from '../../lib/hooks.js'
import { useBrandSignature } from '../../lib/BrandContext'
import './SellerSOP.css' // shared styles with seller SOP

// ─── Buyer SOP Stages ────────────────────────────────────────────────────────
// Based on Dana's buyer SOP + Arizona requirements (AAR, ADRE, ARS 33-422)
const BUYER_SOP = [
  {
    id: 'initial_lead',
    label: 'Initial Lead & Pre-Appointment',
    color: 'var(--brown-mid)',
    tasks: [
      { id: 'lead_in',             text: 'New lead comes in (website, lead magnet, referral, SOI, open house)',          hasTemplate: false },
      { id: 'lead_workflow',        text: 'Send New Buyer Lead Workflow email (auto-response sets appointment)',         hasTemplate: true, templateKey: 'new_buyer_lead' },
      { id: 'phone_appt',          text: 'Appointment set — 15-minute phone call',                                      hasTemplate: false },
      { id: 'pre_qual_check',      text: 'Verify pre-qualification or pre-approval status',                             hasTemplate: false },
      { id: 'in_person_appt',      text: 'Set in-person appointment based on timeline & pre-qualification',             hasTemplate: false },
      { id: 'send_questionnaire',  text: 'Send buyer questionnaire before meeting',                                     hasTemplate: true, templateKey: 'buyer_questionnaire' },
      { id: 'outside_lender',      text: 'If outside lender — send email requesting file details',                      hasTemplate: true, templateKey: 'lender_details' },
      { id: 'meeting_search',      text: 'In-person meeting — set up property search criteria',                         hasTemplate: false },
    ],
  },
  {
    id: 'pre_showing',
    label: 'Pre-Showing Documents & Offer',
    color: 'var(--color-warning)',
    tasks: [
      // AZ required pre-showing docs
      { id: 'buyer_advisory',      text: 'Buyer Advisory (AAR) — signed before showing properties',                     hasTemplate: false, arizona: true },
      { id: 'buyer_broker',        text: 'Buyer Broker Agreement — exclusive representation agreement',                 hasTemplate: false, arizona: true },
      { id: 'agency_disclosure',   text: 'Agency Disclosure — confirm representation type (ARS 32-2153)',               hasTemplate: false, arizona: true },
      { id: 'mold_disclosure',     text: 'Mold Disclosure — Arizona mold advisory acknowledgment',                     hasTemplate: false, arizona: true },
      { id: 'wire_fraud_advisory', text: 'Wire Fraud Advisory — signed acknowledgment',                                hasTemplate: false, arizona: true },
      { id: 'az_fair_housing',     text: 'Fair Housing advisory provided to buyer',                                    hasTemplate: false, arizona: true },
      { id: 'pre_approval_letter', text: 'Pre-approval letter on file (or proof of funds for cash)',                    hasTemplate: false },
      // Showing & offer
      { id: 'showings_begin',      text: 'Property showings begin — track in Buyer Showings',                          hasTemplate: false },
      { id: 'offer_prep',          text: 'Prepare offer — AAR Purchase Contract',                                       hasTemplate: false },
      { id: 'az_lead_paint',       text: 'Lead-Based Paint Disclosure (required for pre-1978 homes — federal)',         hasTemplate: false, arizona: true },
      { id: 'send_offer',          text: 'Send signed offer to listing agent',                                          hasTemplate: false },
    ],
  },
  {
    id: 'under_contract',
    label: 'Under Contract',
    color: 'var(--color-success)',
    tasks: [
      // Contract & escrow
      { id: 'update_terms',        text: 'Update database with contract terms — price, close date, title company',      hasTemplate: false },
      { id: 'open_escrow',         text: 'Open escrow — send to title & escrow with commission details',                hasTemplate: true, templateKey: 'open_escrow' },
      { id: 'send_lender',         text: 'Send executed contract to lender',                                            hasTemplate: false },
      { id: 'congrats_email',      text: 'Send "You\'re Under Contract!" congratulations email to buyer',               hasTemplate: true, templateKey: 'under_contract_congrats' },
      { id: 'next_steps_email',    text: 'Send buyer next steps email with timeline & critical dates',                  hasTemplate: true, templateKey: 'buyer_next_steps' },
      { id: 'critical_dates',      text: 'Create critical dates spreadsheet & share with all parties',                  hasTemplate: true, templateKey: 'critical_dates' },
      // Earnest money
      { id: 'earnest_money',       text: 'Earnest money deposit — due within 3 business days',                          hasTemplate: false, arizona: true },
      { id: 'earnest_followup',    text: 'Follow up on earnest money after 24 hours if not confirmed',                  hasTemplate: false },
      // Title
      { id: 'title_commitment',    text: 'Follow up on title commitment after 5 days',                                  hasTemplate: false },
      { id: 'az_title_review',     text: 'Review title commitment — check for liens, encumbrances, exceptions',         hasTemplate: false, arizona: true },
      { id: 'az_hoa_docs',         text: 'Request HOA docs (CC&Rs, financials, rules) — review with buyer',             hasTemplate: false, arizona: true },
      // SPDS & disclosures
      { id: 'spds_received',       text: 'Confirm SPDS received from listing agent within 3 days',                      hasTemplate: false, arizona: true },
      { id: 'claims_history',      text: 'Confirm Claims History (CLUE report) received from listing agent',            hasTemplate: false },
      // Inspections
      { id: 'schedule_inspections', text: 'Schedule inspections (10-day inspection window — AZ standard)',               hasTemplate: false, arizona: true },
      { id: 'home_inspection',     text: 'Home inspection completed',                                                   hasTemplate: false },
      { id: 'termite_inspection',  text: 'Termite / WDO inspection ordered & completed',                                hasTemplate: false },
      { id: 'pool_inspection',     text: 'Pool / spa inspection (if applicable)',                                       hasTemplate: false },
      { id: 'roof_inspection',     text: 'Roof inspection (if needed)',                                                 hasTemplate: false },
      { id: 'sewer_scope',         text: 'Sewer scope / lateral inspection',                                            hasTemplate: false },
      { id: 'hvac_inspection',     text: 'HVAC inspection (if needed)',                                                 hasTemplate: false },
      { id: 'az_well_septic',      text: 'Well / septic inspection (if applicable — common in unincorporated AZ)',      hasTemplate: false, arizona: true },
      // BINSR
      { id: 'binsr_due_reminder',  text: 'Set BINSR delivery deadline reminder (10 days from contract)',                hasTemplate: false, arizona: true },
      { id: 'binsr_sent',          text: 'BINSR (Buyer Inspection Notice) sent to listing agent',                       hasTemplate: false },
      { id: 'binsr_response',      text: 'Seller BINSR response received — review cure/credit/deny',                   hasTemplate: false },
      { id: 'az_binsr_cancel',     text: 'If seller denies: buyer has right to cancel within 5 days of BINSR response', hasTemplate: false, arizona: true },
      // Loan status
      { id: 'lsu_10day',           text: 'Check Loan Status Update (LSU) — 10 days after contract',                     hasTemplate: false },
      { id: 'lsu_weekly',          text: 'Continue weekly LSU checks with lender',                                      hasTemplate: false },
      { id: 'az_appraisal',        text: 'Appraisal ordered by lender — grant access (25-day contingency)',             hasTemplate: false, arizona: true },
      { id: 'appraisal_received',  text: 'Appraisal report received — at or above contract price',                     hasTemplate: false },
      { id: 'az_loan_approval',    text: 'Final loan approval / clear to close (30-day deadline)',                      hasTemplate: false, arizona: true },
      { id: 'az_closing_disc',     text: 'Closing Disclosure received — 3-day review period (federal TRID rule)',       hasTemplate: false, arizona: true },
      // Insurance & utilities
      { id: 'insurance_bound',     text: 'Homeowner\'s insurance quote obtained & bound (binder to lender)',            hasTemplate: false },
      { id: 'az_flood_insurance',  text: 'Flood insurance (if required by lender or in flood zone)',                    hasTemplate: false, arizona: true },
      { id: 'utility_transfer',    text: 'Utility transfer scheduled (APS/SRP, water, gas, internet)',                  hasTemplate: false },
      // Pre-closing
      { id: 'seller_details',      text: 'Request seller details questionnaire 1 week before close',                    hasTemplate: true, templateKey: 'seller_details_questionnaire' },
      { id: 'settlement_followup', text: 'Follow up on settlement statement 1 week before close',                      hasTemplate: false },
      { id: 'commission_instr',    text: 'Send commission instructions to title company',                               hasTemplate: false },
      { id: 'final_walkthrough',   text: 'Final walkthrough — verify property condition matches contract',              hasTemplate: false },
      { id: 'az_repairs_verify',   text: 'Verify all agreed BINSR repairs completed before walkthrough',                hasTemplate: false, arizona: true },
      { id: 'closing_gift',        text: 'Get closing gift ready',                                                      hasTemplate: false },
      { id: 'closing_day',         text: 'Closing day!',                                                                hasTemplate: true, templateKey: 'closing_day' },
    ],
  },
  {
    id: 'post_closing',
    label: 'Closing & Post-Close',
    color: '#6a9e72',
    tasks: [
      { id: 'upload_docs',         text: 'Make sure all transaction documents are uploaded',                             hasTemplate: false },
      { id: 'az_deed_recorded',    text: 'Confirm deed recorded with Maricopa County Recorder',                         hasTemplate: false, arizona: true },
      { id: 'keys_delivered',      text: 'Keys, garage remotes, and access codes delivered to buyer',                   hasTemplate: false },
      { id: 'thank_everyone',      text: 'Thank all parties — lender, title, other agent — for a great transaction',    hasTemplate: true, templateKey: 'thank_you_review' },
      { id: 'update_close',        text: 'Update database with details — move to closed',                               hasTemplate: false },
      { id: 'check_review',        text: 'Follow up on Google/Zillow review',                                           hasTemplate: false },
      { id: 'az_file_retention',   text: 'Retain transaction file per ADRE requirements (6 years)',                      hasTemplate: false, arizona: true },
      { id: 'add_anniversary',     text: 'Add home purchase anniversary to CRM for annual follow-up',                   hasTemplate: false },
      { id: 'update_pnl',          text: 'Update P&L with commission received',                                         hasTemplate: false },
    ],
  },
]

// ─── Email Templates ─────────────────────────────────────────────────────────
export const DEFAULT_TEMPLATES = {
  new_buyer_lead: {
    name: 'New Buyer Lead Workflow',
    type: 'email',
    subject: 'Let\'s Find Your Dream Home — {contact_name}',
    body: `Hi {contact_name},\n\nThank you for reaching out! I'm {agent_name} with {brokerage}, and I'd love to help you find your perfect home in the East Valley.\n\nTo get started, I'd love to set up a quick 15-minute phone call to learn about:\n- Your ideal timeline for purchasing\n- The areas you're most interested in\n- Your must-haves and dealbreakers\n- Where you are in the financing process\n\nYou can reply to this email, or call/text me directly to get on the calendar.\n\nLooking forward to working with you!\n\n{agent_name}\n{brokerage}\n{agent_phone}`,
  },
  buyer_questionnaire: {
    name: 'Buyer Questionnaire',
    type: 'form',
    description: 'Collects buyer preferences, timeline, financing status, and property must-haves. Use the built-in Intake Forms page to customize and send.',
    linkTo: '/crm/intake-forms',
  },
  lender_details: {
    name: 'Lender File Details Request',
    type: 'email',
    subject: 'File Details Request — {contact_name} Purchase',
    body: `Hi {lender_name},\n\nI'm working with {contact_name} on a home purchase and wanted to request any pertinent details on their file.\n\nCould you provide:\n- Pre-approval letter (or updated letter if needed)\n- Loan type and estimated terms\n- Any conditions or items needed from the buyer\n- Your preferred communication method for updates\n\nWe're actively searching and I want to make sure we're aligned on budget and timeline before submitting offers.\n\nThank you!\n\n{agent_name}\n{brokerage}`,
  },
  open_escrow: {
    name: 'Open Escrow — To Title & Escrow',
    type: 'email',
    subject: 'New Escrow — {property_address} — {contact_name}',
    body: `Hi {title_contact},\n\nPlease open escrow for the following transaction:\n\nProperty: {property_address}\nBuyer: {contact_name}\nSale Price: {sale_price}\nClose of Escrow: {closing_date}\n\nBuyer Agent: {agent_name} — {brokerage}\nBuyer Agent Commission: {commission_amount}\n\nSeller: {seller_name}\nSeller Agent: {seller_agent}\n\nPlease include me on all correspondence related to this file.\n\nAttached: Executed purchase contract and all addenda.\n\nThank you!\n\n{agent_name}\n{brokerage}`,
  },
  under_contract_congrats: {
    name: 'Congratulations — You\'re Under Contract!',
    type: 'email',
    subject: 'You\'re Under Contract! — {property_address}',
    body: `Congratulations {contact_name}!\n\nAMAZING news — your offer has been accepted and you are officially under contract on {property_address}!\n\nHere are the key details:\n\n- Property: {property_address}\n- Purchase Price: {sale_price}\n- Close of Escrow: {closing_date}\n- Title Company: {title_company}\n\nI'll be sending you a full critical dates timeline so you know exactly what happens next and when. But here's the quick overview:\n\n1. Earnest money deposit due within 3 business days\n2. We'll schedule your home inspection right away\n3. 10-day inspection period starts now\n4. Your lender will order the appraisal\n5. We'll track loan status weekly\n6. Final walkthrough before closing\n\nI'm with you every step of the way. Don't hesitate to call or text with any questions!\n\n{agent_name}\n{brokerage}`,
  },
  buyer_next_steps: {
    name: 'Buyer Next Steps & Timeline',
    type: 'email',
    subject: 'Next Steps & Timeline — {property_address}',
    body: `Hi {contact_name},\n\nNow that we're under contract on {property_address}, here's what to expect and what I need from you:\n\nIMMEDIATE (Next 3 Days):\n- Earnest money deposit — wire to {title_company} (I'll send you the wiring instructions from title directly)\n- IMPORTANT: Verify ALL wiring instructions by calling the title company directly. Never wire money based on email instructions alone.\n\nTHIS WEEK (Days 1-10):\n- Home inspection — I'm scheduling this ASAP\n- Any additional inspections (termite, pool, roof, sewer) as needed\n- We'll review the SPDS (Seller's Property Disclosure Statement) together\n- If we need repairs or credits, we'll submit the BINSR before Day 10\n\nWEEKS 2-4:\n- Appraisal will be ordered by your lender\n- Loan processing & underwriting\n- I'll check in weekly with your lender for status updates\n- Title commitment review\n\n1 WEEK BEFORE CLOSING:\n- Final walkthrough\n- Review settlement statement / Closing Disclosure\n- Coordinate utility transfers\n- Arrange closing funds (wire or cashier's check)\n\nDO's:\n- Keep your employment stable\n- Continue making all regular payments\n- Stay responsive to your lender's document requests\n\nDON'Ts:\n- Don't open new credit cards or take on new debt\n- Don't make large purchases (cars, furniture) until after closing\n- Don't change bank accounts\n- Don't co-sign for anyone\n\nI'll be in touch every step of the way. Let's get you to the finish line!\n\n{agent_name}\n{brokerage}`,
  },
  critical_dates: {
    name: 'Critical Dates Tracker',
    type: 'spreadsheet',
    description: 'AZ transaction critical dates — auto-calculated from contract date.',
    columns: ['Milestone', 'Date', 'Status', 'Notes'],
    rows: [
      { milestone: 'Contract Executed', offset: 0 },
      { milestone: 'Earnest Money Due', offset: 3, note: '3 business days' },
      { milestone: 'SPDS Due from Seller', offset: 3, note: '3 days from contract' },
      { milestone: 'Inspection Period Ends', offset: 10 },
      { milestone: 'BINSR Delivery Deadline', offset: 10 },
      { milestone: 'Seller BINSR Response Due', offset: 15, note: '5 days from BINSR' },
      { milestone: 'First Loan Status Update', offset: 10 },
      { milestone: 'Appraisal Contingency', offset: 25 },
      { milestone: 'Loan Approval Deadline', offset: 30 },
      { milestone: 'Settlement Statement Review', offset: -7, fromClose: true, note: '1 week before close' },
      { milestone: 'Closing Disclosure Review', offset: -3, fromClose: true, note: '3-day TRID rule' },
      { milestone: 'Final Walkthrough', offset: -1, fromClose: true },
      { milestone: 'Close of Escrow (COE)', offset: 0, fromClose: true },
    ],
  },
  seller_details_questionnaire: {
    name: 'Seller Details Questionnaire (1 Week Before Close)',
    type: 'email',
    subject: 'Quick Request — Seller Details for {property_address}',
    body: `Hi {seller_agent},\n\nWe're getting close to closing day on {property_address}, and I'd love it if your seller could share the following details for my buyer:\n\nProperty Details:\n- Trash pickup day and company?\n- Mail delivery details (mailbox location, any PO box?)\n- HOA contact info and any upcoming assessments?\n- Landscape service info (if applicable)?\n- Pool service info (if applicable)?\n- Alarm system code and company?\n- Garage door codes?\n- Sprinkler/irrigation schedule?\n- Any neighborhood-specific info (block party, good neighbors to know, etc.)?\n- Warranties still active on any appliances or systems?\n\nThis helps make the transition smooth for everyone. Thank you!\n\n{agent_name}\n{brokerage}`,
  },
  closing_day: {
    name: 'Closing Day',
    type: 'email',
    subject: 'Closing Day! — {property_address}',
    body: `Congratulations {contact_name}!\n\nThe day is HERE! You're about to officially become the owner of {property_address}!\n\nClosing Details:\n- Date: {closing_date}\n- Title Company: {title_company}\n- Please bring a valid government-issued photo ID\n\nReminders:\n- Review your Closing Disclosure carefully — verify all numbers match what we've discussed\n- Confirm wire instructions directly with title by phone before sending closing funds\n- Keys will be released once the deed is recorded (usually same day)\n\nAfter Closing:\n- I'll help coordinate your move-in\n- Save your closing documents for tax purposes\n- Your home warranty info will be provided by the title company\n\nIt has been an absolute pleasure helping you find and close on your new home. Welcome home!\n\nIf you know anyone else looking to buy or sell, I'd be honored to help them too.\n\n{agent_name}\n{brokerage}`,
  },
  thank_you_review: {
    name: 'Thank You & Review Request',
    type: 'email',
    subject: 'Thank You — {agent_name}',
    body: `Hi {contact_name},\n\nI hope you're settling into your new home and loving it! It was truly a pleasure helping you through the buying process.\n\nI also want to thank everyone who helped make this transaction smooth:\n- {lender_name} at {lender_company} — thank you for getting this loan across the finish line\n- {title_contact} at {title_company} — thank you for handling escrow and closing\n- {seller_agent} — thank you for a professional and collaborative transaction\n\nIf you had a positive experience, would you mind taking 2 minutes to leave a review? It means the world to my small business.\n\nGoogle: [Your Google Review Link]\nZillow: [Your Zillow Review Link]\n\nThank you so much — and please don't hesitate to reach out anytime. Whether it's a contractor recommendation, a market question, or your next move, I'm always here!\n\n{agent_name}\n{brokerage}`,
  },
}

// ─── LocalStorage persistence ────────────────────────────────────────────────
const SOP_KEY = 'buyer_sop_progress'
const TEMPLATE_KEY = 'buyer_sop_templates'

function loadProgress() { try { return JSON.parse(localStorage.getItem(SOP_KEY) || '{}') } catch { return {} } }
function saveProgress(d) { localStorage.setItem(SOP_KEY, JSON.stringify(d)) }
function loadTemplates() { try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY)) || null } catch { return null } }
function saveTemplates(d) { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(d)) }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function addDays(dateStr, days) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BuyerSOP() {
  const { data: transactions } = useTransactions()
  const sig = useBrandSignature()
  const [progress, setProgressRaw] = useState(() => loadProgress())
  const [templates, setTemplatesRaw] = useState(() => loadTemplates() || DEFAULT_TEMPLATES)
  const [activeDeal, setActiveDeal] = useState(null)
  const [templatePanel, setTemplatePanel] = useState(null)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [contractDate, setContractDate] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [showAZ, setShowAZ] = useState(true)

  // Buyer deals from pipeline
  const buyerDeals = useMemo(() => {
    if (!transactions) return []
    return transactions.filter(t =>
      (t.deal_type === 'buyer' || t.deal_type === 'both') &&
      t.status !== 'closed' && t.status !== 'cancelled' && t.status !== 'withdrawn'
    )
  }, [transactions])

  const setProgress = useCallback((dealKey, taskId, checked) => {
    setProgressRaw(prev => {
      const dealProgress = { ...(prev[dealKey] ?? {}) }
      dealProgress[taskId] = checked ? new Date().toISOString() : false
      const next = { ...prev, [dealKey]: dealProgress }
      saveProgress(next)
      return next
    })
  }, [])

  const setTemplates = useCallback((key, updates) => {
    setTemplatesRaw(prev => {
      const next = { ...prev, [key]: { ...prev[key], ...updates } }
      saveTemplates(next)
      return next
    })
  }, [])

  const dealKey = activeDeal?.id || '_default'
  const dealProgress = progress[dealKey] ?? {}

  const stageProgress = useMemo(() => {
    return BUYER_SOP.map(stage => {
      const visibleTasks = stage.tasks.filter(t => showAZ || !t.arizona)
      const done = visibleTasks.filter(t => !!dealProgress[t.id]).length
      return { total: visibleTasks.length, done, pct: visibleTasks.length ? Math.round((done / visibleTasks.length) * 100) : 0 }
    })
  }, [dealProgress, showAZ])

  const totalDone = stageProgress.reduce((s, p) => s + p.done, 0)
  const totalTasks = stageProgress.reduce((s, p) => s + p.total, 0)

  // Critical dates
  const criticalDates = useMemo(() => {
    if (!contractDate) return []
    const tpl = DEFAULT_TEMPLATES.critical_dates
    return tpl.rows.map(row => {
      let date
      if (row.fromClose) {
        date = closingDate ? addDays(closingDate, row.offset) : null
      } else {
        date = addDays(contractDate, row.offset)
      }
      return { ...row, date }
    })
  }, [contractDate, closingDate])

  const fillMergeTags = useCallback((text) => {
    if (!text) return text
    const deal = activeDeal || {}
    const contact = deal.contact || {}
    const property = deal.property || {}
    return text
      .replace(/\{contact_name\}/g, contact.name || '{contact_name}')
      .replace(/\{property_address\}/g, property.address || '{property_address}')
      .replace(/\{sale_price\}/g, property.price ? '$' + Number(property.price).toLocaleString() : '{sale_price}')
      .replace(/\{closing_date\}/g, closingDate ? fmtDate(closingDate) : '{closing_date}')
      .replace(/\{title_company\}/g, deal.title_company || '{title_company}')
      .replace(/\{title_contact\}/g, '{title_contact}')
      .replace(/\{lender_name\}/g, deal.lender || '{lender_name}')
      .replace(/\{lender_company\}/g, '{lender_company}')
      .replace(/\{seller_name\}/g, '{seller_name}')
      .replace(/\{seller_agent\}/g, '{seller_agent}')
      .replace(/\{commission_amount\}/g, '{commission_amount}')
      .replace(/\{agent_name\}/g, sig.full_name || '')
      .replace(/\{agent_first_name\}/g, (sig.full_name || '').split(' ')[0] || '')
      .replace(/\{brokerage\}/g, sig.brokerage || '')
      .replace(/\{agent_email\}/g, sig.email || '')
      .replace(/\{agent_phone\}/g, sig.phone || '')
  }, [activeDeal, closingDate, sig])

  return (
    <div className="seller-sop">
      {/* ─── Header Controls ─── */}
      <div className="seller-sop__controls">
        <div className="seller-sop__deal-picker">
          <label className="seller-sop__label">Active Deal</label>
          <select
            className="seller-sop__select"
            value={activeDeal?.id || ''}
            onChange={e => {
              const deal = buyerDeals.find(d => d.id === e.target.value)
              setActiveDeal(deal || null)
              if (deal?.contract_date) setContractDate(deal.contract_date)
              if (deal?.closing_date) setClosingDate(deal.closing_date)
            }}
          >
            <option value="">— Use as Template (no deal) —</option>
            {buyerDeals.map(d => (
              <option key={d.id} value={d.id}>
                {d.contact?.name || 'Unknown'} — {d.property?.address || 'No address'}
              </option>
            ))}
          </select>
        </div>

        <div className="seller-sop__date-row">
          <div className="seller-sop__date-field">
            <label className="seller-sop__label">Contract Date</label>
            <input type="date" className="seller-sop__input" value={contractDate} onChange={e => setContractDate(e.target.value)} />
          </div>
          <div className="seller-sop__date-field">
            <label className="seller-sop__label">Closing Date (COE)</label>
            <input type="date" className="seller-sop__input" value={closingDate} onChange={e => setClosingDate(e.target.value)} />
          </div>
        </div>

        <div className="seller-sop__toggles">
          <label className="seller-sop__toggle-label">
            <input type="checkbox" checked={showAZ} onChange={e => setShowAZ(e.target.checked)} />
            Show Arizona-specific requirements
          </label>
        </div>
      </div>

      {/* ─── Overall Progress ─── */}
      <div className="seller-sop__progress-bar">
        <div className="seller-sop__progress-info">
          <span className="seller-sop__progress-text">{totalDone} of {totalTasks} tasks complete</span>
          <span className="seller-sop__progress-pct">{totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0}%</span>
        </div>
        <div className="seller-sop__bar-track">
          <div className="seller-sop__bar-fill" style={{ width: `${totalTasks ? (totalDone / totalTasks) * 100 : 0}%` }} />
        </div>
      </div>

      {/* ─── Critical Dates ─── */}
      {contractDate && (
        <Card className="seller-sop__dates-card">
          <h3 className="seller-sop__section-title">Critical Dates — Arizona Buyer Transaction</h3>
          <div className="seller-sop__dates-grid">
            {criticalDates.map((cd, i) => {
              const isPast = cd.date && new Date(cd.date + 'T12:00:00') < new Date()
              return (
                <div key={i} className={`seller-sop__date-item ${isPast ? 'seller-sop__date-item--past' : ''}`}>
                  <span className="seller-sop__date-milestone">{cd.milestone}</span>
                  <span className="seller-sop__date-value">{cd.date ? fmtDate(cd.date) : 'Set closing date'}</span>
                  {cd.note && <span className="seller-sop__date-note">{cd.note}</span>}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── SOP Stages ─── */}
      {BUYER_SOP.map((stage, si) => (
        <Card key={stage.id} className="seller-sop__stage">
          <div className="seller-sop__stage-header">
            <div className="seller-sop__stage-badge" style={{ background: stage.color }} />
            <h3 className="seller-sop__stage-title">{stage.label}</h3>
            <Badge variant={stageProgress[si].pct === 100 ? 'success' : 'default'} size="sm">
              {stageProgress[si].done}/{stageProgress[si].total}
            </Badge>
            <div className="seller-sop__stage-bar">
              <div className="seller-sop__stage-bar-fill" style={{ width: `${stageProgress[si].pct}%`, background: stage.color }} />
            </div>
          </div>

          <div className="seller-sop__tasks">
            {stage.tasks.map(task => {
              if (task.arizona && !showAZ) return null
              const checked = !!dealProgress[task.id]
              const tpl = task.hasTemplate ? templates[task.templateKey] : null
              return (
                <div key={task.id} className={`seller-sop__task ${checked ? 'seller-sop__task--done' : ''} ${task.arizona ? 'seller-sop__task--az' : ''}`}>
                  <label className="seller-sop__check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setProgress(dealKey, task.id, e.target.checked)}
                    />
                    <span className="seller-sop__task-text">{task.text}</span>
                  </label>
                  <div className="seller-sop__task-actions">
                    {task.arizona && <Badge variant="info" size="sm">AZ</Badge>}
                    {task.note && <span className="seller-sop__task-note">{task.note}</span>}
                    {task.hasTemplate && tpl && (
                      <button
                        className="seller-sop__template-btn"
                        onClick={() => { setTemplatePanel(task.templateKey); setEditingTemplate(null) }}
                      >
                        {tpl.type === 'email' ? '✉️' : tpl.type === 'form' ? '📋' : tpl.type === 'spreadsheet' ? '📊' : '📄'} {tpl.name}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}

      {/* ─── Template Panel ─── */}
      {templatePanel && templates[templatePanel] && (
        <SlidePanel
          title={templates[templatePanel].name}
          subtitle={`${templates[templatePanel].type === 'email' ? 'Email Template' : templates[templatePanel].type === 'form' ? 'Form / Link' : templates[templatePanel].type === 'spreadsheet' ? 'Spreadsheet' : 'Document'}`}
          onClose={() => { setTemplatePanel(null); setEditingTemplate(null) }}
        >
          {(() => {
            const tpl = templates[templatePanel]

            if (tpl.type === 'email') {
              return (
                <div className="seller-sop__tpl-content">
                  {editingTemplate === templatePanel ? (
                    <>
                      <div className="seller-sop__tpl-field">
                        <label>Subject</label>
                        <input type="text" value={tpl.subject} onChange={e => setTemplates(templatePanel, { subject: e.target.value })} className="seller-sop__tpl-input" />
                      </div>
                      <div className="seller-sop__tpl-field">
                        <label>Body</label>
                        <textarea value={tpl.body} onChange={e => setTemplates(templatePanel, { body: e.target.value })} className="seller-sop__tpl-textarea" rows={18} />
                      </div>
                      <div className="seller-sop__tpl-actions">
                        <Button variant="primary" size="sm" onClick={() => setEditingTemplate(null)}>Save Changes</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setTemplates(templatePanel, { ...DEFAULT_TEMPLATES[templatePanel] }); setEditingTemplate(null) }}>Reset to Default</Button>
                      </div>
                      <div className="seller-sop__merge-tags">
                        <p className="seller-sop__merge-label">Available merge tags:</p>
                        <div className="seller-sop__tag-list">
                          {['{contact_name}', '{property_address}', '{sale_price}', '{closing_date}', '{title_company}', '{title_contact}', '{lender_name}', '{lender_company}', '{seller_name}', '{seller_agent}', '{commission_amount}'].map(tag => (
                            <code key={tag} className="seller-sop__tag">{tag}</code>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="seller-sop__tpl-preview">
                        <div className="seller-sop__tpl-subject-preview">
                          <strong>Subject:</strong> {fillMergeTags(tpl.subject)}
                        </div>
                        <div className="seller-sop__tpl-body-preview">
                          {fillMergeTags(tpl.body).split('\n').map((line, i) => (
                            <span key={i}>{line}<br /></span>
                          ))}
                        </div>
                      </div>
                      <div className="seller-sop__tpl-actions">
                        <Button variant="primary" size="sm" onClick={() => setEditingTemplate(templatePanel)}>Edit Template</Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          const subject = encodeURIComponent(fillMergeTags(tpl.subject))
                          const body = encodeURIComponent(fillMergeTags(tpl.body))
                          const email = activeDeal?.contact?.email || ''
                          window.open(`mailto:${email}?subject=${subject}&body=${body}`)
                        }}>Open in Email</Button>
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(fillMergeTags(tpl.body))}>Copy to Clipboard</Button>
                      </div>
                    </>
                  )}
                </div>
              )
            }

            if (tpl.type === 'form') {
              return (
                <div className="seller-sop__tpl-content">
                  <p className="seller-sop__tpl-desc">{tpl.description}</p>
                  <Button variant="primary" size="sm" onClick={() => window.location.href = tpl.linkTo}>Open Intake Forms</Button>
                </div>
              )
            }

            if (tpl.type === 'spreadsheet') {
              return (
                <div className="seller-sop__tpl-content">
                  <p className="seller-sop__tpl-desc">{tpl.description}</p>
                  {contractDate ? (
                    <div className="seller-sop__dates-table">
                      <div className="seller-sop__dates-header">
                        {tpl.columns.map(col => <span key={col}>{col}</span>)}
                      </div>
                      {criticalDates.map((cd, i) => {
                        const isPast = cd.date && new Date(cd.date + 'T12:00:00') < new Date()
                        return (
                          <div key={i} className={`seller-sop__dates-row ${isPast ? 'seller-sop__dates-row--past' : ''}`}>
                            <span>{cd.milestone}</span>
                            <span>{cd.date ? fmtDate(cd.date) : '—'}</span>
                            <span>{isPast ? '✅ Past' : cd.date ? 'Upcoming' : '—'}</span>
                            <span>{cd.note || ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="seller-sop__tpl-note">Enter a contract date above to auto-calculate critical dates.</p>
                  )}
                  <div className="seller-sop__tpl-actions" style={{ marginTop: 16 }}>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const rows = criticalDates.map(cd => `${cd.milestone}\t${cd.date ? fmtDate(cd.date) : ''}\t${cd.note || ''}`)
                      navigator.clipboard.writeText('Milestone\tDate\tNotes\n' + rows.join('\n'))
                    }}>Copy to Clipboard</Button>
                  </div>
                </div>
              )
            }

            return (
              <div className="seller-sop__tpl-content">
                <p className="seller-sop__tpl-desc">{tpl.description}</p>
              </div>
            )
          })()}
        </SlidePanel>
      )}
    </div>
  )
}
