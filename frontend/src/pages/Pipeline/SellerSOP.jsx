import { useState, useCallback, useMemo } from 'react'
import { Card, Badge, Button, Input, Textarea, SlidePanel } from '../../components/ui/index.jsx'
import { useTransactions } from '../../lib/hooks.js'
import { useBrandSignature } from '../../lib/BrandContext'
import './SellerSOP.css'

// ─── Seller SOP Stages ──────────────────────────────────────────────────────
// Based on Dana's SOP + Arizona-specific requirements (AAR, ADRE, ARS 33-422, ARS 33-1260)
const SELLER_SOP = [
  {
    id: 'initial_lead',
    label: 'Initial Lead',
    color: 'var(--brown-mid)',
    tasks: [
      { id: 'lead_in',            text: 'New lead comes in (website, lead magnet, referral, SOI)',                   hasTemplate: false },
      { id: 'lead_workflow',       text: 'Send New Lead Workflow email (auto-sets appointment)',                     hasTemplate: true, templateKey: 'new_lead_workflow' },
      { id: 'phone_appt',         text: 'Appointment set — 15-minute phone call',                                   hasTemplate: false },
      { id: 'in_person_appt',     text: 'Set in-person listing appointment per timeline',                           hasTemplate: false },
    ],
  },
  {
    id: 'pre_listing',
    label: 'Pre-Appointment & Listing',
    color: 'var(--color-warning)',
    tasks: [
      // Pre-appointment
      { id: 'comps_ready',        text: 'Have comps ready — value opinion / appraisal packet (CMA)',                 hasTemplate: false },
      { id: 'hoa_verify',         text: 'Call HOA — verify fees, rental restrictions, pet rules, transfer fees',     hasTemplate: false },
      { id: 'az_affidavit',       text: 'Affidavit of Disclosure (required in unincorporated Maricopa County — ARS 33-422)', hasTemplate: false, arizona: true },
      { id: 'post_appt_email',    text: 'Send post-appointment email with next steps & questionnaire',              hasTemplate: true, templateKey: 'post_appointment' },
      // Listing docs
      { id: 'listing_docs',       text: 'Send listing documents — Exclusive Right to Sell agreement',               hasTemplate: false },
      { id: 'listing_followup',   text: 'Follow up if unsigned within 24 hours',                                    hasTemplate: false },
      { id: 'upload_broker',      text: 'Upload signed docs to broker within 48 hours',                             hasTemplate: false },
      { id: 'az_agency_disc',     text: 'Agency Disclosure — confirm representation type (ARS 32-2153)',             hasTemplate: false, arizona: true },
      { id: 'az_advisory',        text: 'Arizona ADRE Advisory — provide state-required advisory document',          hasTemplate: false, arizona: true },
      // Sign & SPDS
      { id: 'sign_install',       text: 'Coordinate yard sign install timing',                                      hasTemplate: false },
      { id: 'spds_claims',        text: 'Send SPDS (Seller Property Disclosure) & request CLUE Claims History',     hasTemplate: false },
      { id: 'az_lead_paint',      text: 'Lead-Based Paint Disclosure (required for pre-1978 homes — federal)',       hasTemplate: false, arizona: true },
      { id: 'az_wire_fraud',      text: 'Wire Fraud Advisory — signed by seller',                                   hasTemplate: false, arizona: true },
      // MLS & prep
      { id: 'start_mls',          text: 'Start MLS listing — send to client for review before activating',          hasTemplate: false },
      { id: 'upgrades_list',      text: 'Make upgrades/improvements list',                                          hasTemplate: true, templateKey: 'upgrades_list' },
      { id: 'google_form',        text: 'Send seller property questionnaire form',                                  hasTemplate: true, templateKey: 'seller_questionnaire' },
      { id: 'form_followup',      text: 'Follow up on form completion — set database task reminder',                hasTemplate: false },
      { id: 'schedule_media',     text: 'Schedule 3D tour, professional photos & video',                            hasTemplate: false },
      { id: 'update_db_listing',  text: 'Update database with listing date and details',                            hasTemplate: false },
      // Marketing
      { id: 'listing_package',    text: 'Prepare listing package — postcard, carousel, story posts, flyer',         hasTemplate: true, templateKey: 'listing_package' },
      { id: 'compile_upgrades',   text: 'Compile final upgrades list for marketing materials',                      hasTemplate: true, templateKey: 'upgrades_list' },
      { id: 'print_materials',    text: 'Print flyers (20) and postcards (500)',                                    hasTemplate: false },
      { id: 'flyer_delivery',     text: 'Flyer delivery coordination',                                              hasTemplate: false, note: '480-888-5957' },
      { id: 'finalize_listing',   text: 'Finalize listing description — upload photos to MLS',                      hasTemplate: false },
      { id: 'key_lockbox',        text: 'Ensure key in lockbox',                                                    hasTemplate: false },
      { id: 'client_materials',   text: 'Send client showing instructions, materials & schedule',                   hasTemplate: true, templateKey: 'listing_live' },
      { id: 'weekly_followup',    text: 'Monday weekly follow-up email — all unanswered showing feedback',          hasTemplate: true, templateKey: 'weekly_feedback' },
      { id: 'were_live',          text: 'Send "We\'re Live" email to client + sphere',                              hasTemplate: true, templateKey: 'listing_live' },
      // AZ-specific listing requirements
      { id: 'az_fair_housing',    text: 'Fair Housing compliance — review listing language & photos',                hasTemplate: false, arizona: true },
      { id: 'az_mls_accuracy',    text: 'MLS accuracy check — AZ ADRE requires accurate square footage & disclosures', hasTemplate: false, arizona: true },
    ],
  },
  {
    id: 'under_contract',
    label: 'Under Contract',
    color: 'var(--color-success)',
    tasks: [
      { id: 'update_terms',       text: 'Update database with contract terms, price, close date, title company',    hasTemplate: false },
      { id: 'congrats_email',     text: 'Send Congratulations / Offer Accepted email with critical dates',          hasTemplate: true, templateKey: 'offer_accepted' },
      { id: 'critical_dates',     text: 'Create critical dates spreadsheet & share with all parties',               hasTemplate: true, templateKey: 'critical_dates' },
      { id: 'open_escrow',        text: 'Open escrow — obtain escrow number',                                       hasTemplate: false },
      { id: 'opening_package',    text: 'Receive & review opening package from escrow company',                     hasTemplate: false },
      { id: 'submit_disclosures', text: 'Submit Seller Disclosures (SPDS) and Claims History to buyer',             hasTemplate: false },
      { id: 'az_title_order',     text: 'Title order placed — review for liens, encumbrances, CC&Rs',               hasTemplate: false, arizona: true },
      { id: 'az_hoa_demand',      text: 'HOA demand letter / transfer fees requested',                              hasTemplate: false, arizona: true },
      { id: 'az_loan_payoff',     text: 'Seller loan payoff statement ordered',                                     hasTemplate: false, arizona: true },
      // AZ inspection period
      { id: 'inspections',        text: 'Buyer inspections scheduled (10-day inspection window — AZ standard)',      hasTemplate: false, arizona: true },
      { id: 'earnest_money',      text: 'Earnest money received by title (3 business days)',                         hasTemplate: false },
      { id: 'binsr_received',     text: 'BINSR received from buyer — review repair/credit requests',                hasTemplate: false },
      { id: 'seller_binsr_resp',  text: 'Seller response to BINSR due (5 days from BINSR delivery)',                hasTemplate: false, arizona: true },
      { id: 'az_cure_period',     text: 'If curing: complete agreed repairs within cure period',                    hasTemplate: false, arizona: true },
      { id: 'appraisal',          text: 'Appraisal scheduled — grant appraiser access',                             hasTemplate: false },
      { id: 'first_loan_update',  text: 'First loan status update due from buyer\'s lender',                        hasTemplate: false },
      { id: 'final_loan',         text: 'Final loan approval / clear to close confirmed',                           hasTemplate: false },
      { id: 'schedule_signing',   text: 'Schedule seller signing at title company',                                 hasTemplate: false },
      { id: 'final_walkthrough',  text: 'Buyer\'s final walkthrough — property in contract condition',              hasTemplate: false },
      { id: 'az_closing_disc',    text: 'Review Closing Disclosure — verify seller credits, prorations, net proceeds', hasTemplate: false, arizona: true },
      { id: 'closing_gift',       text: 'Get closing gift ready',                                                   hasTemplate: false },
      { id: 'closing_day',        text: 'Closing day!',                                                             hasTemplate: true, templateKey: 'closing_day' },
    ],
  },
  {
    id: 'post_closing',
    label: 'Closing & Post-Close',
    color: '#6a9e72',
    tasks: [
      { id: 'remove_lockbox',     text: 'Coordinate removal of lockbox',                                            hasTemplate: false },
      { id: 'mls_sold',           text: 'Change MLS status to Sold — enter final sale price',                       hasTemplate: false },
      { id: 'sign_removal',       text: 'Schedule yard sign removal',                                               hasTemplate: false },
      { id: 'update_address',     text: 'Update client address in database',                                        hasTemplate: false },
      { id: 'check_review',       text: 'Request Google/Zillow review from client',                                 hasTemplate: true, templateKey: 'review_request' },
      { id: 'az_recordation',     text: 'Confirm deed recorded with Maricopa County Recorder',                      hasTemplate: false, arizona: true },
      { id: 'az_file_retention',  text: 'Retain transaction file per ADRE requirements (6 years)',                   hasTemplate: false, arizona: true },
      { id: 'add_anniversary',    text: 'Add home sale anniversary to CRM for annual follow-up',                    hasTemplate: false },
      { id: 'update_pnl',         text: 'Update P&L with commission received',                                      hasTemplate: false },
    ],
  },
]

// ─── Email Templates ─────────────────────────────────────────────────────────
export const DEFAULT_TEMPLATES = {
  new_lead_workflow: {
    name: 'New Lead Workflow',
    type: 'email',
    subject: 'Let\'s Talk About Selling Your Home — {contact_name}',
    body: `Hi {contact_name},\n\nThank you for reaching out! I'm {agent_name} with {brokerage}, and I'd love to help you with your home sale.\n\nI specialize in the East Valley and Gilbert market and would love to learn more about your property, your timeline, and your goals.\n\nLet's set up a quick 15-minute phone call to get started. You can reply to this email or call/text me directly.\n\nLooking forward to connecting!\n\n{agent_name}\n{brokerage}\n{agent_phone}`,
  },
  post_appointment: {
    name: 'Post-Appointment Follow-Up',
    type: 'email',
    subject: 'Great Meeting You — Next Steps for {property_address}',
    body: `Hi {contact_name},\n\nIt was great meeting with you today! I'm excited about the opportunity to help sell {property_address}.\n\nHere's what happens next:\n\n1. Please complete the seller property questionnaire I've attached — this helps me market your home effectively\n2. Review and sign the listing documents I'll be sending over\n3. We'll schedule your professional photography and 3D tour\n4. I'll prepare your complete listing package (flyers, postcards, social media content)\n\nIn the meantime, here's what you can do to prepare:\n- Touch up any minor cosmetic items\n- Declutter and depersonalize where possible\n- Gather any home warranty info, receipts for upgrades, and HOA docs\n\nI'll be in touch within 24 hours. Don't hesitate to reach out with any questions!\n\n{agent_name}\n{brokerage}`,
  },
  seller_questionnaire: {
    name: 'Seller Property Questionnaire',
    type: 'form',
    description: 'Collects property details, upgrades, features, and seller preferences. Use the built-in Intake Forms page to customize and send.',
    linkTo: '/crm/intake-forms',
  },
  upgrades_list: {
    name: 'Property Upgrades List',
    type: 'document',
    description: 'Template to compile and format property upgrades for marketing materials.',
    sections: ['Kitchen & Appliances', 'Bathrooms', 'Flooring', 'HVAC & Mechanical', 'Roof & Exterior', 'Pool & Landscaping', 'Smart Home & Tech', 'Other Improvements'],
  },
  listing_package: {
    name: 'Listing Marketing Package',
    type: 'design',
    description: 'Branded marketing materials for the listing. Includes:',
    items: ['Property Flyer (print-ready)', 'Just Listed Postcard', 'Instagram Carousel Post', 'Instagram Stories (x2)', 'Facebook Post'],
  },
  listing_live: {
    name: 'We\'re Live / Showing Instructions',
    type: 'email',
    subject: 'Your Home is LIVE! — {property_address}',
    body: `Hi {contact_name},\n\nExciting news — your home is officially live on the MLS and ready to show! Here's what you need to know:\n\nShowing Instructions:\n- You'll receive showing requests via ShowingTime — please confirm or decline promptly\n- Please have the home show-ready (lights on, blinds open, pets secured, valuables stored)\n- Try to vacate during showings for the best buyer experience\n\nWhat I'm Doing:\n- Your listing is being promoted across MLS, Zillow, Realtor.com, and social media\n- I've sent Just Listed postcards to 500 neighbors in your area\n- Open house dates are being scheduled and marketed\n\nI'll keep you updated weekly with showing feedback and market activity.\n\nLet's get this sold!\n\n{agent_name}\n{brokerage}`,
  },
  weekly_feedback: {
    name: 'Weekly Showing Feedback Follow-Up',
    type: 'email',
    subject: 'Weekly Update — {property_address} Showing Activity',
    body: `Hi {contact_name},\n\nHere's your weekly update on {property_address}:\n\nThis Week's Activity:\n- Showings this week: {showing_count}\n- Total showings to date: {total_showings}\n\nShowing Feedback Summary:\n{feedback_summary}\n\nUnanswered Feedback:\nI'm following up with the following agents who haven't provided feedback yet:\n{unanswered_agents}\n\nMarket Update:\n{market_notes}\n\nLet me know if you'd like to discuss any adjustments to pricing or marketing strategy. I'm always just a call or text away.\n\n{agent_name}\n{brokerage}`,
  },
  offer_accepted: {
    name: 'Congratulations — Offer Accepted!',
    type: 'email',
    subject: 'Offer Accepted! — {property_address}',
    body: `Congratulations {contact_name}!\n\nGreat news — we have an accepted offer on {property_address}!\n\nHere are the key details:\n\n- Sale Price: {sale_price}\n- Buyer: {buyer_name}\n- Buyer's Agent: {buyer_agent}\n- Financing: {financing_type}\n- Earnest Money: {earnest_amount}\n- Close of Escrow: {closing_date}\n- Title Company: {title_company}\n\nCritical Dates (Arizona Standard):\n- Earnest Money Due: 3 business days from contract\n- Inspection Period: 10 days from contract\n- BINSR Deadline: 10 days from contract\n- Seller BINSR Response: 5 days from BINSR delivery\n- Appraisal Contingency: 25 days from contract\n- Loan Approval: 30 days from contract\n- Close of Escrow: {closing_date}\n\nI'll be sending over a full critical dates spreadsheet so we can track every deadline together.\n\nNext steps:\n1. I'll open escrow and send you the opening package\n2. Please submit your SPDS and Claims History ASAP\n3. Buyer will schedule inspections within their 10-day window\n\nWe're on our way! I'll keep you informed every step.\n\n{agent_name}\n{brokerage}`,
  },
  critical_dates: {
    name: 'Critical Dates Tracker',
    type: 'spreadsheet',
    description: 'AZ transaction critical dates — auto-calculated from contract date.',
    columns: ['Milestone', 'Date', 'Status', 'Notes'],
    rows: [
      { milestone: 'Contract Executed', offset: 0 },
      { milestone: 'Earnest Money Due', offset: 3, note: '3 business days' },
      { milestone: 'Inspection Period Ends', offset: 10 },
      { milestone: 'BINSR Delivery Deadline', offset: 10 },
      { milestone: 'Seller BINSR Response Due', offset: 15, note: '5 days from BINSR' },
      { milestone: 'Appraisal Contingency', offset: 25 },
      { milestone: 'Loan Approval Deadline', offset: 30 },
      { milestone: 'Closing Disclosure Review', offset: -3, fromClose: true, note: '3 days before close' },
      { milestone: 'Final Walkthrough', offset: -1, fromClose: true },
      { milestone: 'Close of Escrow (COE)', offset: 0, fromClose: true },
    ],
  },
  closing_day: {
    name: 'Closing Day',
    type: 'email',
    subject: 'Closing Day! — {property_address}',
    body: `Congratulations {contact_name}!\n\nToday is the big day! Here's everything you need for a smooth closing on {property_address}:\n\nClosing Details:\n- Date: {closing_date}\n- Title Company: {title_company}\n- Please bring a valid government-issued photo ID\n\nReminders:\n- Review your Closing Disclosure carefully — verify all numbers, credits, and prorations\n- Confirm wire instructions directly with the title company by phone (never trust emailed wire instructions alone)\n- Keys, garage remotes, and access codes should be left for the buyer\n\nAfter Closing:\n- I'll update the MLS to Sold status\n- Yard sign and lockbox will be removed within 48 hours\n- You'll receive your proceeds via wire or check from the title company\n\nIt has been an absolute pleasure working with you on the sale of your home. Thank you for trusting me with one of life's biggest transactions.\n\nIf you know anyone else thinking about buying or selling, I'd be honored to help them too!\n\n{agent_name}\n{brokerage}`,
  },
  review_request: {
    name: 'Review Request',
    type: 'email',
    subject: 'Quick Favor? — {agent_name}',
    body: `Hi {contact_name},\n\nI hope you're settling in and enjoying the next chapter! It was truly a pleasure helping you with the sale of {property_address}.\n\nIf you had a positive experience, would you mind taking 2 minutes to leave a review? It means the world to my small business.\n\nGoogle: [Your Google Review Link]\nZillow: [Your Zillow Review Link]\n\nThank you so much — and please don't hesitate to reach out anytime, whether it's real estate related or you just need a great contractor recommendation!\n\n{agent_name}\n{brokerage}`,
  },
}

// ─── LocalStorage persistence ────────────────────────────────────────────────
const SOP_KEY = 'seller_sop_progress'
const TEMPLATE_KEY = 'seller_sop_templates'

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
export default function SellerSOP() {
  const { data: transactions } = useTransactions()
  const sig = useBrandSignature()
  const [progress, setProgressRaw] = useState(() => loadProgress())
  const [templates, setTemplatesRaw] = useState(() => loadTemplates() || DEFAULT_TEMPLATES)
  const [activeDeal, setActiveDeal] = useState(null)
  const [templatePanel, setTemplatePanel] = useState(null) // templateKey
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [contractDate, setContractDate] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [showAZ, setShowAZ] = useState(true)

  // Seller deals from pipeline
  const sellerDeals = useMemo(() => {
    if (!transactions) return []
    return transactions.filter(t =>
      (t.deal_type === 'seller' || t.deal_type === 'both') &&
      t.status !== 'closed' && t.status !== 'cancelled' && t.status !== 'withdrawn'
    )
  }, [transactions])

  // Progress helpers
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
    return SELLER_SOP.map(stage => {
      const visibleTasks = stage.tasks.filter(t => showAZ || !t.arizona)
      const done = visibleTasks.filter(t => !!dealProgress[t.id]).length
      return { total: visibleTasks.length, done, pct: visibleTasks.length ? Math.round((done / visibleTasks.length) * 100) : 0 }
    })
  }, [dealProgress, showAZ])

  const totalDone = stageProgress.reduce((s, p) => s + p.done, 0)
  const totalTasks = stageProgress.reduce((s, p) => s + p.total, 0)

  // Critical dates calculation
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

  // Fill template merge tags
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
      .replace(/\{buyer_name\}/g, '{buyer_name}')
      .replace(/\{buyer_agent\}/g, '{buyer_agent}')
      .replace(/\{financing_type\}/g, '{financing_type}')
      .replace(/\{earnest_amount\}/g, '{earnest_amount}')
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
              const deal = sellerDeals.find(d => d.id === e.target.value)
              setActiveDeal(deal || null)
              if (deal?.contract_date) setContractDate(deal.contract_date)
              if (deal?.closing_date) setClosingDate(deal.closing_date)
            }}
          >
            <option value="">— Use as Template (no deal) —</option>
            {sellerDeals.map(d => (
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
          <div
            className="seller-sop__bar-fill"
            style={{ width: `${totalTasks ? (totalDone / totalTasks) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ─── Critical Dates ─── */}
      {contractDate && (
        <Card className="seller-sop__dates-card">
          <h3 className="seller-sop__section-title">Critical Dates — Arizona Transaction</h3>
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
      {SELLER_SOP.map((stage, si) => (
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
                        onClick={() => {
                          setTemplatePanel(task.templateKey)
                          setEditingTemplate(null)
                        }}
                      >
                        {tpl.type === 'email' ? '✉️' : tpl.type === 'form' ? '📋' : tpl.type === 'design' ? '🎨' : tpl.type === 'spreadsheet' ? '📊' : '📄'} {tpl.name}
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
          subtitle={`${templates[templatePanel].type === 'email' ? 'Email Template' : templates[templatePanel].type === 'form' ? 'Form / Link' : templates[templatePanel].type === 'design' ? 'Design Package' : templates[templatePanel].type === 'spreadsheet' ? 'Spreadsheet' : 'Document'}`}
          onClose={() => { setTemplatePanel(null); setEditingTemplate(null) }}
        >
          {(() => {
            const tpl = templates[templatePanel]

            // ─── Email template ───
            if (tpl.type === 'email') {
              return (
                <div className="seller-sop__tpl-content">
                  {editingTemplate === templatePanel ? (
                    <>
                      <div className="seller-sop__tpl-field">
                        <label>Subject</label>
                        <input
                          type="text"
                          value={tpl.subject}
                          onChange={e => setTemplates(templatePanel, { subject: e.target.value })}
                          className="seller-sop__tpl-input"
                        />
                      </div>
                      <div className="seller-sop__tpl-field">
                        <label>Body</label>
                        <textarea
                          value={tpl.body}
                          onChange={e => setTemplates(templatePanel, { body: e.target.value })}
                          className="seller-sop__tpl-textarea"
                          rows={18}
                        />
                      </div>
                      <div className="seller-sop__tpl-actions">
                        <Button variant="primary" size="sm" onClick={() => setEditingTemplate(null)}>Save Changes</Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setTemplates(templatePanel, { ...DEFAULT_TEMPLATES[templatePanel] })
                          setEditingTemplate(null)
                        }}>Reset to Default</Button>
                      </div>
                      <div className="seller-sop__merge-tags">
                        <p className="seller-sop__merge-label">Available merge tags:</p>
                        <div className="seller-sop__tag-list">
                          {['{contact_name}', '{property_address}', '{sale_price}', '{closing_date}', '{title_company}', '{buyer_name}', '{buyer_agent}', '{financing_type}', '{earnest_amount}'].map(tag => (
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
                        <Button variant="ghost" size="sm" onClick={() => {
                          navigator.clipboard.writeText(fillMergeTags(tpl.body))
                        }}>Copy to Clipboard</Button>
                      </div>
                    </>
                  )}
                </div>
              )
            }

            // ─── Form link ───
            if (tpl.type === 'form') {
              return (
                <div className="seller-sop__tpl-content">
                  <p className="seller-sop__tpl-desc">{tpl.description}</p>
                  <Button variant="primary" size="sm" onClick={() => window.location.href = tpl.linkTo}>
                    Open Intake Forms
                  </Button>
                </div>
              )
            }

            // ─── Design package ───
            if (tpl.type === 'design') {
              return (
                <div className="seller-sop__tpl-content">
                  <p className="seller-sop__tpl-desc">{tpl.description}</p>
                  <ul className="seller-sop__design-list">
                    {tpl.items.map((item, i) => (
                      <li key={i} className="seller-sop__design-item">
                        <span className="seller-sop__design-icon">🎨</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="seller-sop__tpl-note">
                    These are generated in your Content section or via Canva integration. When Canva Connect is active, assets will auto-generate from your brand templates.
                  </p>
                </div>
              )
            }

            // ─── Spreadsheet (Critical Dates) ───
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

            // ─── Document ───
            return (
              <div className="seller-sop__tpl-content">
                <p className="seller-sop__tpl-desc">{tpl.description}</p>
                {tpl.sections && (
                  <div className="seller-sop__doc-sections">
                    {tpl.sections.map((s, i) => (
                      <div key={i} className="seller-sop__doc-section">
                        <h4>{s}</h4>
                        <Textarea
                          placeholder={`List ${s.toLowerCase()} upgrades here...`}
                          rows={3}
                          className="seller-sop__doc-textarea"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </SlidePanel>
      )}
    </div>
  )
}
