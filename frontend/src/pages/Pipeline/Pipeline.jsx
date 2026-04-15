import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Badge, Card, SlidePanel, Input, Select, Textarea, EmptyState } from '../../components/ui/index.jsx'
import { TagPicker } from '../../components/ui/TagPicker.jsx'
import { useTransactions, useContacts, useProperties, useContactTags, useNotesForContact, useOfferHistory, useStatusLog } from '../../lib/hooks.js'
import { useNotesContext } from '../../lib/NotesContext.jsx'
import FavoriteButton from '../../components/layout/FavoriteButton.jsx'
import { useBrandSignature } from '../../lib/BrandContext'
import * as DB from '../../lib/supabase.js'
import './Pipeline.css'

// ─── Arizona Transaction Stages ──────────────────────────────────────────────
const STAGES = [
  { value: 'pre_offer',       label: 'Pre-Offer',           color: '#8b8b8b',              desc: 'Preparing offer package' },
  { value: 'offer',           label: 'Offer Submitted',     color: 'var(--color-info)',     desc: 'Awaiting seller response' },
  { value: 'offer_declined',  label: 'Offer Declined',      color: '#c44040',               desc: 'Seller rejected the offer' },
  { value: 'counter',         label: 'Counter / Negotiate', color: '#7ba1c7',               desc: 'Negotiating terms' },
  { value: 'under_contract',  label: 'Under Contract',      color: 'var(--color-warning)',  desc: 'Executed purchase contract' },
  { value: 'earnest_money',   label: 'Earnest Money',       color: '#c9962e',               desc: '3 business days to deposit' },
  { value: 'inspection',      label: 'Inspection Period',   color: '#b07d62',               desc: '10-day inspection window' },
  { value: 'binsr',           label: 'BINSR',               color: 'var(--color-danger)',    desc: "Buyer's Inspection Notice" },
  { value: 'binsr_response',  label: 'BINSR Response',      color: '#c06060',               desc: 'Seller cure / buyer cancel window' },
  { value: 'appraisal',       label: 'Appraisal',           color: '#8b7ec8',               desc: 'Lender appraisal ordered' },
  { value: 'loan_approval',   label: 'Loan Approval',       color: '#6a9e72',               desc: 'Underwriting & clear to close' },
  { value: 'closing',         label: 'Closing',             color: 'var(--color-success)',   desc: 'Final walkthrough & signing' },
]

const DEAL_TYPES = [
  { value: 'buyer',  label: 'Buyer Side' },
  { value: 'seller', label: 'Seller Side' },
  { value: 'both',   label: 'Both Sides' },
]

const FINANCING_TYPES = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'fha',          label: 'FHA' },
  { value: 'va',           label: 'VA' },
  { value: 'usda',         label: 'USDA' },
  { value: 'cash',         label: 'Cash' },
  { value: 'hard_money',   label: 'Hard Money' },
  { value: 'other',        label: 'Other' },
]

// ─── AZ Key Dates / Deadlines ────────────────────────────────────────────────
const AZ_DEADLINES = [
  { key: 'earnest_money_due',   label: 'Earnest Money Due',            daysAfterContract: 3,  business: true },
  { key: 'inspection_deadline', label: 'Inspection Period Ends',       daysAfterContract: 10, business: false },
  { key: 'binsr_deadline',      label: 'BINSR Delivery Deadline',      daysAfterContract: 10, business: false },
  { key: 'binsr_response_due',  label: 'BINSR Response Due',           daysAfterContract: 15, business: false },
  { key: 'appraisal_deadline',  label: 'Appraisal Contingency',       daysAfterContract: 25, business: false },
  { key: 'loan_approval_due',   label: 'Loan Approval Deadline',      daysAfterContract: 30, business: false },
  { key: 'close_of_escrow',     label: 'Close of Escrow (COE)',       daysAfterContract: 30, business: false },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function daysUntil(d) {
  if (!d) return null
  const target = new Date(d + 'T12:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}
function fmtDollar(v) {
  if (!v) return '—'
  return '$' + Number(v).toLocaleString()
}
function stageInfo(status) {
  const s = (status ?? '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
  // Try exact match first, then longest substring match to avoid 'offer' matching before 'offer_declined'
  return STAGES.find(st => st.value === s)
    ?? [...STAGES].sort((a, b) => b.value.length - a.value.length).find(st => s.includes(st.value))
    ?? STAGES[1]
}
function addDays(dateStr, days) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── Stage History Tracker (localStorage) ────────────────────────────────────
// Stores: { [dealId]: { [stageValue]: { completed: bool, date: ISO, completedAt: ISO } } }
const STAGE_HISTORY_KEY = 'pipeline_stage_history'
function loadStageHistory() { try { return JSON.parse(localStorage.getItem(STAGE_HISTORY_KEY) || '{}') } catch { return {} } }
function saveStageHistory(d) { localStorage.setItem(STAGE_HISTORY_KEY, JSON.stringify(d)) }

function fmtTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ─── AZ Docs Tracker (localStorage) ──────────────────────────────────────────
const DOCS_KEY = 'pipeline_docs'
function loadDocs() { try { return JSON.parse(localStorage.getItem(DOCS_KEY) || '{}') } catch { return {} } }
function saveDocs(d) { localStorage.setItem(DOCS_KEY, JSON.stringify(d)) }

// ─── Deal Contacts (localStorage) ────────────────────────────────────────────
// Stores: { [dealId]: { spouse: {name,email,phone}, other_agent: {...}, other_tc: {...}, escrow_officer: {...}, lender_contact: {...}, family: [{name,email,phone,relationship}] } }
const DEAL_CONTACTS_KEY = 'pipeline_deal_contacts'
function loadDealContacts() { try { return JSON.parse(localStorage.getItem(DEAL_CONTACTS_KEY) || '{}') } catch { return {} } }
function saveDealContacts(d) { localStorage.setItem(DEAL_CONTACTS_KEY, JSON.stringify(d)) }

// ─── Transaction Links (localStorage) ────────────────────────────────────────
const DEAL_LINKS_KEY = 'pipeline_deal_links'
function loadDealLinks() { try { return JSON.parse(localStorage.getItem(DEAL_LINKS_KEY) || '{}') } catch { return {} } }
function saveDealLinks(d) { localStorage.setItem(DEAL_LINKS_KEY, JSON.stringify(d)) }

const CONTACT_ROLES = [
  { key: 'spouse',         label: 'Spouse / Partner' },
  { key: 'other_agent',    label: "Other Agent (Their Realtor)" },
  { key: 'other_tc',       label: "Other Agent's TC" },
  { key: 'escrow_officer',  label: 'Escrow Officer' },
  { key: 'lender_contact', label: 'Lender Contact' },
]

const EMPTY_ROLE_CONTACT = { name: '', email: '', phone: '' }
const EMPTY_FAMILY = { name: '', email: '', phone: '', relationship: '' }

// ─── Embedded SOP Tasks (syncs with standalone SOP pages via localStorage) ──
const BUYER_SOP_KEY = 'buyer_sop_progress'
const SELLER_SOP_KEY = 'seller_sop_progress'
function loadSOPProgress(key) { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } }
function saveSOPProgress(key, d) { localStorage.setItem(key, JSON.stringify(d)) }

const BUYER_SOP_TASKS = [
  { stage: 'Initial Lead', tasks: [
    { id: 'lead_in', text: 'New lead comes in' }, { id: 'lead_workflow', text: 'Send New Buyer Lead email' },
    { id: 'phone_appt', text: '15-min phone call' }, { id: 'pre_qual_check', text: 'Verify pre-qualification' },
    { id: 'send_questionnaire', text: 'Send buyer questionnaire' },
  ]},
  { stage: 'Pre-Showing Docs', tasks: [
    { id: 'buyer_advisory', text: 'Buyer Advisory (AAR) signed', az: true }, { id: 'buyer_broker', text: 'Buyer Broker Agreement signed', az: true },
    { id: 'agency_disclosure', text: 'Agency Disclosure (ARS 32-2153)', az: true }, { id: 'wire_fraud_advisory', text: 'Wire Fraud Advisory signed', az: true },
    { id: 'pre_approval_letter', text: 'Pre-approval letter on file' }, { id: 'send_offer', text: 'Offer sent to listing agent' },
  ]},
  { stage: 'Under Contract', tasks: [
    { id: 'update_terms', text: 'Update database with contract terms' }, { id: 'open_escrow', text: 'Open escrow' },
    { id: 'send_lender', text: 'Send contract to lender' }, { id: 'congrats_email', text: 'Send congratulations email' },
    { id: 'earnest_money', text: 'Earnest money (3 biz days)', az: true }, { id: 'title_commitment', text: 'Title commitment received' },
    { id: 'spds_received', text: 'SPDS received from seller', az: true }, { id: 'schedule_inspections', text: 'Inspections scheduled (10-day)', az: true },
    { id: 'home_inspection', text: 'Home inspection completed' }, { id: 'binsr_sent', text: 'BINSR sent to listing agent' },
    { id: 'binsr_response', text: 'Seller BINSR response received' }, { id: 'lsu_10day', text: 'Loan Status Update (10 days)' },
    { id: 'az_appraisal', text: 'Appraisal ordered (25-day)', az: true }, { id: 'az_loan_approval', text: 'Final loan approval (30-day)', az: true },
    { id: 'az_closing_disc', text: 'Closing Disclosure (3-day review)', az: true }, { id: 'insurance_bound', text: 'Insurance bound' },
    { id: 'utility_transfer', text: 'Utilities transferred' }, { id: 'final_walkthrough', text: 'Final walkthrough' },
    { id: 'closing_day', text: 'Closing day!' },
  ]},
  { stage: 'Post-Close', tasks: [
    { id: 'upload_docs', text: 'All docs uploaded' }, { id: 'thank_everyone', text: 'Thank all parties + review request' },
    { id: 'update_close', text: 'Update database — move to closed' }, { id: 'update_pnl', text: 'Update P&L with commission' },
  ]},
]

const SELLER_SOP_TASKS = [
  { stage: 'Initial Lead', tasks: [
    { id: 'lead_in', text: 'New lead comes in' }, { id: 'lead_workflow', text: 'Send New Lead email' },
    { id: 'phone_appt', text: '15-min phone call' }, { id: 'in_person_appt', text: 'Set listing appointment' },
  ]},
  { stage: 'Pre-Listing', tasks: [
    { id: 'comps_ready', text: 'Comps / CMA ready' }, { id: 'hoa_verify', text: 'HOA verified' },
    { id: 'listing_docs', text: 'Listing docs sent' }, { id: 'spds_claims', text: 'SPDS & Claims History sent' },
    { id: 'az_lead_paint', text: 'Lead-Based Paint (pre-1978)', az: true }, { id: 'az_wire_fraud', text: 'Wire Fraud Advisory signed', az: true },
    { id: 'start_mls', text: 'MLS listing started' }, { id: 'schedule_media', text: 'Photos/video scheduled' },
    { id: 'listing_package', text: 'Marketing package prepared' }, { id: 'print_materials', text: 'Flyers & postcards printed' },
    { id: 'were_live', text: '"We\'re Live" email sent' },
  ]},
  { stage: 'Under Contract', tasks: [
    { id: 'update_terms', text: 'Update database with contract terms' }, { id: 'congrats_email', text: 'Send Offer Accepted email' },
    { id: 'open_escrow', text: 'Open escrow' }, { id: 'submit_disclosures', text: 'Submit disclosures to buyer' },
    { id: 'inspections', text: 'Buyer inspections (10-day)', az: true }, { id: 'earnest_money', text: 'Earnest money received' },
    { id: 'binsr_received', text: 'BINSR received — review' }, { id: 'seller_binsr_resp', text: 'Seller BINSR response due', az: true },
    { id: 'appraisal', text: 'Appraisal — grant access' }, { id: 'final_loan', text: 'Buyer loan approval confirmed' },
    { id: 'schedule_signing', text: 'Signing scheduled' }, { id: 'final_walkthrough', text: 'Buyer final walkthrough' },
    { id: 'az_closing_disc', text: 'Closing Disclosure reviewed', az: true }, { id: 'closing_day', text: 'Closing day!' },
  ]},
  { stage: 'Post-Close', tasks: [
    { id: 'remove_lockbox', text: 'Lockbox removed' }, { id: 'mls_sold', text: 'MLS status → Sold' },
    { id: 'sign_removal', text: 'Sign removed' }, { id: 'check_review', text: 'Review requested' },
    { id: 'update_pnl', text: 'P&L updated with commission' },
  ]},
]

// ─── Stage Email Templates ───────────────────────────────────────────────────
export const STAGE_EMAILS = {
  pre_offer: {
    label: 'Pre-Offer Introduction',
    subject: 'Getting Started — {contact} Home Search',
    body: `Hi everyone,\n\nI'm reaching out to introduce myself and connect all parties as we begin the home search process for {contact}.\n\nHere's a quick overview:\n• Buyer: {contact}\n• Property Interest: {property}\n• Financing: {financing}\n• Lender: {lender}\n\nI'll keep everyone in the loop as we move through the process. Please don't hesitate to reach out with any questions.\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  offer: {
    label: 'Offer Submitted Notification',
    subject: 'Offer Submitted — {property}',
    body: `Hi everyone,\n\nI wanted to let you know that we have submitted an offer on behalf of {contact} for the following property:\n\n• Property: {property}\n• Offer Price: {price}\n• Financing: {financing}\n• Target Close: {closing}\n\nWe'll update everyone as soon as we hear back from the listing agent. Fingers crossed!\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  offer_declined: {
    label: 'Offer Declined — Next Steps',
    subject: 'Offer Update — {property}',
    body: `Hi {contact},\n\nI wanted to let you know that unfortunately the seller has declined our offer on {property}.\n\nHere's what we know:\n• Property: {property}\n• Our Offer: {price}\n\nThis is not uncommon and does not mean we're out of options. Here are our next steps:\n1. We can submit a revised offer if you'd like to come up at a different price or terms\n2. We can continue searching for other properties that fit your criteria\n3. We can keep an eye on this property in case the situation changes\n\nLet's connect to discuss how you'd like to proceed. I'm here for you every step of the way.\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  counter: {
    label: 'Counter Offer Update',
    subject: 'Counter Offer Update — {property}',
    body: `Hi everyone,\n\nWe've received a counter offer on {property}. I'm reviewing the terms with {contact} and will keep everyone updated on next steps.\n\nPlease standby for updates — we're working to get this deal to a place everyone feels good about.\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  under_contract: {
    label: 'Under Contract — Congrats!',
    subject: 'We\'re Under Contract! — {property}',
    body: `Great news everyone!\n\n{contact} is officially under contract on {property}!\n\nHere are the key details:\n• Contract Price: {price}\n• Contract Date: {contract_date}\n• Closing Date (COE): {closing}\n• Title/Escrow: {title}\n• Lender: {lender}\n\nNext steps:\n1. Earnest money deposit (due within 3 business days)\n2. Inspection period begins\n3. Title work and loan processing\n\nI'll be sending deadline reminders along the way. Let's get this to the finish line!\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  earnest_money: {
    label: 'Earnest Money Reminder',
    subject: 'ACTION NEEDED: Earnest Money Due — {property}',
    body: `Hi {contact},\n\nFriendly reminder that your earnest money deposit is due within 3 business days of contract execution.\n\n• Property: {property}\n• Please wire funds to the title/escrow company: {title}\n\nIMPORTANT: Please verify all wiring instructions directly with the title company by phone before sending any funds. Never wire money based solely on email instructions.\n\nLet me know once the deposit has been sent and I'll confirm receipt with escrow.\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  inspection: {
    label: 'Inspection Period Update',
    subject: 'Inspection Period — {property}',
    body: `Hi everyone,\n\nWe are now in the inspection period for {property}. Here's what to expect:\n\n• The 10-day inspection window is active\n• Home inspection, termite/WDO, and any additional inspections will be scheduled\n• All inspection reports will be reviewed thoroughly\n\n{contact} — I'll walk you through every finding and we'll discuss how to proceed before the BINSR deadline.\n\nPlease let me know if you have any questions.\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  binsr: {
    label: 'BINSR Filed Notification',
    subject: 'BINSR Filed — {property}',
    body: `Hi everyone,\n\nThe Buyer's Inspection Notice and Seller's Response (BINSR) has been filed for {property} on behalf of {contact}.\n\nThe BINSR outlines requested repairs and/or credits based on the inspection findings. The seller has 5 days to respond.\n\nI'll keep everyone posted on the seller's response and next steps.\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  binsr_response: {
    label: 'BINSR Resolution Update',
    subject: 'BINSR Response Received — {property}',
    body: `Hi everyone,\n\nWe've received the seller's response to the BINSR for {property}.\n\nI'm reviewing the response with {contact} and will update everyone on whether we're moving forward, negotiating further, or exercising any cancellation rights.\n\nStandby for an update shortly.\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  appraisal: {
    label: 'Appraisal Update',
    subject: 'Appraisal Update — {property}',
    body: `Hi everyone,\n\nThe appraisal has been ordered for {property}. Here's where we stand:\n\n• Contract Price: {price}\n• Lender: {lender}\n• Appraisal contingency deadline is approaching\n\nI'll let everyone know as soon as the appraisal report comes back. If there are any issues, we'll work together on the best path forward.\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  loan_approval: {
    label: 'Clear to Close Update',
    subject: 'Loan Approval / Clear to Close — {property}',
    body: `Hi everyone,\n\nGreat news — we're nearing the finish line on {property}!\n\nLoan status update:\n• Lender: {lender}\n• We are working toward final loan approval and clear to close\n\nNext steps:\n1. Final closing disclosure review\n2. Final walkthrough scheduling\n3. Signing appointment coordination with title\n\n{contact} — I'll be in touch about scheduling your final walkthrough and signing.\n\nAlmost there!\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
  closing: {
    label: 'Closing Day Details',
    subject: 'Closing Day! — {property}',
    body: `Congratulations {contact}!\n\nThe big day is here (or almost here)! Here are your closing details for {property}:\n\n• Closing Date: {closing}\n• Title/Escrow: {title}\n• Please bring a valid photo ID\n• Final walkthrough: [to be scheduled]\n\nReminders:\n- Review your closing disclosure carefully\n- Bring any required cashier's check or confirm wire transfer\n- Keys will be released upon recording\n\nIt has been an absolute pleasure working with you. Congratulations on your new home!\n\nBest regards,\n{agent_name}\n{brokerage}`,
  },
}

function fillTemplate(template, deal, sig = {}) {
  const agentName = sig.full_name || ''
  const replacements = {
    '{contact}': deal.contact?.name ?? 'Client',
    '{property}': deal.property?.address ?? 'the property',
    '{price}': fmtDollar(deal.property?.price || deal.offer_price),
    '{financing}': FINANCING_TYPES.find(f => f.value === deal.financing_type)?.label ?? deal.financing_type ?? 'TBD',
    '{lender}': deal.lender ?? 'TBD',
    '{title}': deal.title_company ?? 'TBD',
    '{closing}': fmtDate(deal.closing_date),
    '{contract_date}': fmtDate(deal.contract_date),
    '{agent_name}': agentName,
    '{agent_first_name}': agentName.split(' ')[0] || '',
    '{brokerage}': sig.brokerage || '',
    '{agent_email}': sig.email || '',
    '{agent_phone}': sig.phone || '',
  }
  let result = template
  Object.entries(replacements).forEach(([key, val]) => {
    result = result.split(key).join(val)
  })
  return result
}

function getStageEmail(key) {
  try {
    const overrides = JSON.parse(localStorage.getItem('pipeline_email_templates'))
    if (overrides?.[key]) return { ...STAGE_EMAILS[key], ...overrides[key] }
  } catch {}
  return STAGE_EMAILS[key]
}

// Documents required for an AZ transaction
const AZ_DOCS_BUYER = [
  { key: 'pre_approval',    label: 'Pre-Approval Letter',        stage: 'pre_offer' },
  { key: 'proof_of_funds',  label: 'Proof of Funds',             stage: 'pre_offer' },
  { key: 'purchase_contract', label: 'AAR Purchase Contract',    stage: 'offer' },
  { key: 'buyer_advisory',  label: 'Buyer Advisory (AAR)',       stage: 'offer' },
  { key: 'wire_fraud_advisory', label: 'Wire Fraud Advisory',    stage: 'offer' },
  { key: 'lead_based_paint', label: 'Lead-Based Paint Disclosure (pre-1978)', stage: 'offer' },
  { key: 'earnest_money_receipt', label: 'Earnest Money Receipt', stage: 'earnest_money' },
  { key: 'home_inspection', label: 'Home Inspection Report',     stage: 'inspection' },
  { key: 'termite_report',  label: 'Termite / WDO Report',       stage: 'inspection' },
  { key: 'pool_inspection', label: 'Pool Inspection (if applicable)', stage: 'inspection' },
  { key: 'roof_inspection', label: 'Roof Inspection',            stage: 'inspection' },
  { key: 'sewer_scope',     label: 'Sewer Scope',                stage: 'inspection' },
  { key: 'binsr_form',      label: 'BINSR (Buyer Inspection Notice)', stage: 'binsr' },
  { key: 'cure_notice',     label: 'Seller Response to BINSR',   stage: 'binsr_response' },
  { key: 'appraisal_report', label: 'Appraisal Report',          stage: 'appraisal' },
  { key: 'loan_estimate',   label: 'Loan Estimate',              stage: 'loan_approval' },
  { key: 'closing_disclosure', label: 'Closing Disclosure',      stage: 'loan_approval' },
  { key: 'clear_to_close',  label: 'Clear to Close Letter',      stage: 'loan_approval' },
  { key: 'hoa_docs',        label: 'HOA Docs & CC&Rs',           stage: 'under_contract' },
  { key: 'title_commitment', label: 'Title Commitment',          stage: 'under_contract' },
  { key: 'title_insurance', label: 'Title Insurance Policy',     stage: 'closing' },
  { key: 'home_warranty',   label: 'Home Warranty Policy',       stage: 'closing' },
  { key: 'final_walkthrough', label: 'Final Walkthrough Completed', stage: 'closing' },
]

const AZ_DOCS_SELLER = [
  { key: 'listing_agreement', label: 'Listing Agreement (Exclusive Right)', stage: 'pre_offer' },
  { key: 'spds',             label: 'SPDS (Seller Property Disclosure)', stage: 'pre_offer' },
  { key: 'clue_report',     label: 'CLUE Report',                stage: 'pre_offer' },
  { key: 'lead_based_paint_seller', label: 'Lead-Based Paint Disclosure (pre-1978)', stage: 'pre_offer' },
  { key: 'purchase_contract_seller', label: 'Executed Purchase Contract', stage: 'under_contract' },
  { key: 'affidavit_of_value', label: 'Affidavit of Value',     stage: 'under_contract' },
  { key: 'hoa_demand',      label: 'HOA Demand Letter / Payoff', stage: 'under_contract' },
  { key: 'loan_payoff',     label: 'Loan Payoff Statement',      stage: 'under_contract' },
  { key: 'title_commitment_seller', label: 'Title Commitment',   stage: 'under_contract' },
  { key: 'termite_clearance', label: 'Termite Clearance (if required)', stage: 'binsr_response' },
  { key: 'repair_receipts', label: 'Repair Receipts / Invoices', stage: 'binsr_response' },
  { key: 'cure_response',   label: 'BINSR Cure / Response',      stage: 'binsr_response' },
  { key: 'appraisal_seller', label: 'Appraisal Received',        stage: 'appraisal' },
  { key: 'closing_disclosure_seller', label: 'Closing Disclosure', stage: 'closing' },
  { key: 'deed',            label: 'Warranty Deed Signed',       stage: 'closing' },
  { key: 'keys_delivered',  label: 'Keys / Remotes / Codes Delivered', stage: 'closing' },
]

// ─── Pipeline Tag Picker (self-contained with its own tag state) ─────────────
function PipelineTagPicker({ contactId }) {
  const { data: tagData } = useContactTags(contactId)
  const [tags, setTags] = useState([])
  useEffect(() => {
    if (tagData) setTags((tagData ?? []).map(ct => ct.tag).filter(Boolean))
  }, [tagData])
  return <TagPicker contactId={contactId} assignedTags={tags} onTagsChange={setTags} />
}

function DealNotesTab({ contactId, dealId }) {
  const { data: notes, refetch } = useNotesForContact(contactId)
  const { openNote, createAndOpen } = useNotesContext()
  const list = notes ?? []
  return (
    <div className="pipe__detail-section">
      <div className="pipe__detail-section-header">
        <h4 className="pipe__detail-section-title">Notes ({list.length})</h4>
        <button className="pipe__btn pipe__btn--sm" onClick={async () => { await createAndOpen({ contact_id: contactId }); refetch() }}>+ Add</button>
      </div>
      {list.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '12px 0' }}>No notes yet. Add one to track details about this deal.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map(n => (
            <div key={n.id} onClick={() => openNote(n)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--cream)', borderRadius: 'var(--radius-md)', cursor: 'pointer', borderLeft: n.color ? `3px solid ${n.color}` : '3px solid var(--brown-mid)' }}>
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{n.title || 'Untitled'}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{(n.body ?? '').slice(0, 80)}{(n.body ?? '').length > 80 ? '...' : ''}</p>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <FavoriteButton type="note" id={n.id} label={n.title || 'Untitled'} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Offer History Tab ───────────────────────────────────────────────────────
function OfferHistoryTab({ contactId, currentDealId, onReOffer }) {
  const { data: offers, loading } = useOfferHistory(contactId)

  if (loading) return <p style={{ padding: 16, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Loading offer history...</p>

  const history = (offers ?? []).filter(o => o.id !== currentDealId)
  if (history.length === 0) {
    return (
      <div className="pipe__detail-section">
        <p style={{ padding: '16px 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
          No previous offers for this contact. This is their first deal in the pipeline.
        </p>
      </div>
    )
  }

  return (
    <div className="pipe__detail-section">
      <h4 className="pipe__detail-section-title">All Offers ({history.length} previous)</h4>
      <div className="pipe__offer-history">
        {history.map(offer => {
          const outcomeColors = {
            rejected: '#c44040', withdrawn: '#8b8b8b', expired: '#b07d62',
            accepted: 'var(--color-success)', countered: '#7ba1c7', active: 'var(--color-info)',
          }
          const outcomeLabel = offer.outcome
            ? offer.outcome.charAt(0).toUpperCase() + offer.outcome.slice(1)
            : offer.is_active_offer === false ? 'Archived' : 'Unknown'
          return (
            <div key={offer.id} className="pipe__offer-card">
              <div className="pipe__offer-card-header">
                <div className="pipe__offer-card-title">
                  <span style={{ fontWeight: 600 }}>{offer.property?.address ?? 'No property'}</span>
                  {offer.offer_number > 1 && <span className="pipe__offer-attempt">Attempt #{offer.offer_number}</span>}
                </div>
                <Badge
                  variant="default" size="sm"
                  style={{ background: outcomeColors[offer.outcome] || '#8b8b8b', color: '#fff', border: 'none' }}
                >
                  {outcomeLabel}
                </Badge>
              </div>
              <div className="pipe__offer-card-details">
                <span>Offer: {fmtDollar(offer.offer_price)}</span>
                {offer.offer_submitted_at && <span>Submitted: {fmtTimestamp(offer.offer_submitted_at)}</span>}
                {offer.outcome_date && <span>Outcome: {fmtTimestamp(offer.outcome_date)}</span>}
              </div>
              {offer.rejection_reason && (
                <div className="pipe__offer-card-reason">
                  <strong>Reason:</strong> {offer.rejection_reason}
                </div>
              )}
              {offer.outcome_notes && (
                <div className="pipe__offer-card-reason">
                  <strong>Notes:</strong> {offer.outcome_notes}
                </div>
              )}
              <div className="pipe__offer-card-timestamps">
                <span>Created: {fmtTimestamp(offer.created_at)}</span>
                {offer.status_changed_at && <span>Last status: {fmtTimestamp(offer.status_changed_at)}</span>}
                <span>Status: {offer.status}</span>
              </div>
              {(offer.outcome === 'rejected' || offer.outcome === 'expired') && (
                <button className="pipe__offer-reoffer-btn" onClick={() => onReOffer(offer)}>
                  Submit New Offer on {offer.property?.address ?? 'this property'} →
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Pipeline() {
  const { data: transactions, loading, error, refetch } = useTransactions()
  const { data: contacts } = useContacts()
  const { data: properties } = useProperties()
  const sig = useBrandSignature()
  const [docs, setDocsRaw] = useState(() => loadDocs())
  const [stageHistory, setStageHistoryRaw] = useState(() => loadStageHistory())
  const [dealContacts, setDealContactsRaw] = useState(() => loadDealContacts())

  const [viewMode, setViewMode] = useState('board')
  const [panelOpen, setPanelOpen] = useState(false)
  const [detailDeal, setDetailDeal] = useState(null)
  const [editDeal, setEditDeal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [emailStage, setEmailStage] = useState(null)
  const [detailTab, setDetailTab] = useState('overview') // 'overview' | 'sop' | 'docs' | 'notes'
  const [collapsedSections, setCollapsedSections] = useState({}) // { 'stageName': true }

  // Rejection / outcome modal state
  const [rejectDeal, setRejectDeal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [rejectOutcome, setRejectOutcome] = useState('rejected') // 'rejected' | 'withdrawn' | 'expired'
  const [rejecting, setRejecting] = useState(false)

  // Transaction links (dotloop, SkySlope, etc.)
  const [dealLinks, setDealLinksRaw] = useState(() => loadDealLinks())
  const updateDealLink = useCallback((dealId, url) => {
    setDealLinksRaw(prev => {
      const next = { ...prev, [dealId]: url }
      saveDealLinks(next)
      return next
    })
  }, [])

  // SOP progress (syncs with standalone SOP pages)
  const [buyerSOPProgress, setBuyerSOPRaw] = useState(() => loadSOPProgress(BUYER_SOP_KEY))
  const [sellerSOPProgress, setSellerSOPRaw] = useState(() => loadSOPProgress(SELLER_SOP_KEY))

  const toggleSectionCollapse = useCallback((sectionName) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }))
  }, [])

  const toggleSOPTask = useCallback((dealId, taskId, isBuyer) => {
    const key = isBuyer ? BUYER_SOP_KEY : SELLER_SOP_KEY
    const setter = isBuyer ? setBuyerSOPRaw : setSellerSOPRaw
    setter(prev => {
      const dealProgress = { ...(prev[dealId] ?? {}) }
      dealProgress[taskId] = dealProgress[taskId] ? false : new Date().toISOString()
      const next = { ...prev, [dealId]: dealProgress }
      saveSOPProgress(key, next)
      return next
    })
  }, [])

  // Form state
  const [contactId, setContactId] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [dealType, setDealType] = useState('buyer')
  const [status, setStatus] = useState('pre_offer')
  const [offerPrice, setOfferPrice] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [contractDate, setContractDate] = useState('')
  const [expectedCommission, setExpectedCommission] = useState('')
  const [financingType, setFinancingType] = useState('conventional')
  const [lender, setLender] = useState('')
  const [titleCompany, setTitleCompany] = useState('')
  const [leadSource, setLeadSource] = useState('')
  const [leadSourceFee, setLeadSourceFee] = useState('')
  const [referralFee, setReferralFee] = useState('')
  const [referralTo, setReferralTo] = useState('')
  const [tcFee, setTcFee] = useState('')
  const [brokerFee, setBrokerFee] = useState('')
  const [notes, setNotes] = useState('')

  const setDocs = useCallback((dealId, docKey, val) => {
    setDocsRaw(prev => {
      const dealDocs = { ...(prev[dealId] ?? {}) }
      dealDocs[docKey] = val
      const next = { ...prev, [dealId]: dealDocs }
      saveDocs(next)
      return next
    })
  }, [])

  // Stage history helpers
  const getDealStages = useCallback((dealId) => stageHistory[dealId] ?? {}, [stageHistory])

  const toggleStageComplete = useCallback((dealId, stageValue) => {
    setStageHistoryRaw(prev => {
      const dealStages = { ...(prev[dealId] ?? {}) }
      const existing = dealStages[stageValue]
      if (existing?.completed) {
        // Undo — keep the record but mark as not completed, preserve history
        dealStages[stageValue] = { ...existing, completed: false, uncompletedAt: new Date().toISOString() }
      } else {
        // Complete — timestamp it
        dealStages[stageValue] = {
          completed: true,
          completedAt: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
          ...(existing ?? {}),
          // Override completed status
          completed: true,
          completedAt: new Date().toISOString(),
        }
      }
      const next = { ...prev, [dealId]: dealStages }
      saveStageHistory(next)
      return next
    })
  }, [])

  const editStageDate = useCallback((dealId, stageValue, newDate) => {
    setStageHistoryRaw(prev => {
      const dealStages = { ...(prev[dealId] ?? {}) }
      const existing = dealStages[stageValue] ?? {}
      dealStages[stageValue] = {
        ...existing,
        date: newDate,
        editedAt: new Date().toISOString(),
      }
      const next = { ...prev, [dealId]: dealStages }
      saveStageHistory(next)
      return next
    })
  }, [])

  // ─── Deal Contacts helpers ────────────────────────────────────────────────
  const getDealContacts = useCallback((dealId) => dealContacts[dealId] ?? {}, [dealContacts])

  const updateDealContact = useCallback((dealId, roleKey, field, value) => {
    setDealContactsRaw(prev => {
      const dc = { ...(prev[dealId] ?? {}) }
      dc[roleKey] = { ...(dc[roleKey] ?? EMPTY_ROLE_CONTACT), [field]: value }
      const next = { ...prev, [dealId]: dc }
      saveDealContacts(next)
      return next
    })
  }, [])

  const addFamilyMember = useCallback((dealId) => {
    setDealContactsRaw(prev => {
      const dc = { ...(prev[dealId] ?? {}) }
      dc.family = [...(dc.family ?? []), { ...EMPTY_FAMILY }]
      const next = { ...prev, [dealId]: dc }
      saveDealContacts(next)
      return next
    })
  }, [])

  const updateFamilyMember = useCallback((dealId, idx, field, value) => {
    setDealContactsRaw(prev => {
      const dc = { ...(prev[dealId] ?? {}) }
      const family = [...(dc.family ?? [])]
      family[idx] = { ...family[idx], [field]: value }
      dc.family = family
      const next = { ...prev, [dealId]: dc }
      saveDealContacts(next)
      return next
    })
  }, [])

  const removeFamilyMember = useCallback((dealId, idx) => {
    setDealContactsRaw(prev => {
      const dc = { ...(prev[dealId] ?? {}) }
      const family = [...(dc.family ?? [])]
      family.splice(idx, 1)
      dc.family = family
      const next = { ...prev, [dealId]: dc }
      saveDealContacts(next)
      return next
    })
  }, [])

  // Collect all emails for a deal (primary contact + deal contacts)
  const collectEmails = useCallback((deal) => {
    const dc = dealContacts[deal.id] ?? {}
    const emails = []
    if (deal.contact?.email) emails.push({ email: deal.contact.email, label: deal.contact.name ?? 'Client' })
    CONTACT_ROLES.forEach(role => {
      const c = dc[role.key]
      if (c?.email) emails.push({ email: c.email, label: `${c.name || role.label} (${role.label})` })
    })
    ;(dc.family ?? []).forEach(f => {
      if (f.email) emails.push({ email: f.email, label: `${f.name || 'Family'} (${f.relationship || 'Family'})` })
    })
    return emails
  }, [dealContacts])

  // Open mailto with template
  const sendStageEmail = useCallback((deal, stageKey, selectedEmails) => {
    const tmpl = getStageEmail(stageKey)
    if (!tmpl) return
    const subject = fillTemplate(tmpl.subject, deal, sig)
    const body = fillTemplate(tmpl.body, deal, sig)
    const to = selectedEmails.join(',')
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto, '_blank')
  }, [sig])

  // Computed: stages completed count for a deal
  const stagesCompleted = useCallback((dealId) => {
    const ds = stageHistory[dealId] ?? {}
    return STAGES.filter(s => ds[s.value]?.completed).length
  }, [stageHistory])

  // Drag-and-drop state
  const [dragDeal, setDragDeal] = useState(null)
  const [dropStage, setDropStage] = useState(null)

  // Filter active deals — ONLY show deals with active offers (is_active_offer !== false)
  const allActiveDeals = useMemo(() =>
    (transactions ?? []).filter(t => {
      const s = (t.status ?? '').toLowerCase()
      if (s.includes('closed') || s.includes('cancelled') || s.includes('withdrawn') || s.includes('dead')) return false
      // Exclude archived/rejected offers — only show active offers on the board
      if (t.is_active_offer === false) return false
      return true
    })
  , [transactions])

  // Archived/rejected offers (for history view)
  const archivedDeals = useMemo(() =>
    (transactions ?? []).filter(t => t.is_active_offer === false || t.outcome === 'rejected' || t.outcome === 'withdrawn' || t.outcome === 'expired')
  , [transactions])

  // Separate pre-offer leads from board deals
  const preOfferDeals = useMemo(() =>
    allActiveDeals.filter(t => stageInfo(t.status).value === 'pre_offer')
  , [allActiveDeals])

  const activeDeals = useMemo(() =>
    allActiveDeals.filter(t => stageInfo(t.status).value !== 'pre_offer')
  , [allActiveDeals])

  const [showPreOffer, setShowPreOffer] = useState(false)

  // Board stages (exclude pre_offer since it has its own section)
  const BOARD_STAGES = useMemo(() => STAGES.filter(s => s.value !== 'pre_offer'), [])

  // Group by stage for board view
  const dealsByStage = useMemo(() => {
    const map = {}
    BOARD_STAGES.forEach(s => { map[s.value] = [] })
    activeDeals.forEach(deal => {
      const si = stageInfo(deal.status)
      if (map[si.value]) map[si.value].push(deal)
    })
    return map
  }, [activeDeals, BOARD_STAGES])

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e, deal) => {
    setDragDeal(deal)
    e.dataTransfer.effectAllowed = 'move'
    e.target.style.opacity = '0.4'
  }, [])

  const handleDragEnd = useCallback((e) => {
    e.target.style.opacity = '1'
    setDragDeal(null)
    setDropStage(null)
  }, [])

  const handleColumnDragOver = useCallback((e, stageValue) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropStage(stageValue)
  }, [])

  const handleColumnDragLeave = useCallback(() => {
    setDropStage(null)
  }, [])

  const handleColumnDrop = useCallback(async (e, stageValue) => {
    e.preventDefault()
    setDropStage(null)
    if (!dragDeal) return
    const currentStage = stageInfo(dragDeal.status)
    if (currentStage.value === stageValue) return
    const newStage = STAGES.find(s => s.value === stageValue)
    if (!newStage) return
    try {
      const update = { status: newStage.label }
      if (stageValue === 'offer' && !dragDeal.offer_submitted_at) {
        update.offer_submitted_at = new Date().toISOString()
      }
      await DB.updateTransaction(dragDeal.id, update)
      refetch()
    } catch (err) {
      alert('Error moving deal: ' + err.message)
    }
    setDragDeal(null)
  }, [dragDeal, refetch])

  const pipelineValue = useMemo(() =>
    activeDeals.reduce((sum, d) => sum + (Number(d.property?.price) || Number(d.offer_price) || 0), 0)
  , [activeDeals])

  const expectedGCI = useMemo(() =>
    activeDeals.reduce((sum, d) => sum + (Number(d.expected_commission) || 0), 0)
  , [activeDeals])

  // Open new
  const openNew = () => {
    setEditDeal(null); setDetailDeal(null)
    setContactId(''); setPropertyId('')
    setDealType('buyer'); setStatus('pre_offer')
    setOfferPrice(''); setClosingDate(''); setContractDate('')
    setExpectedCommission(''); setFinancingType('conventional')
    setLender(''); setTitleCompany('')
    setLeadSource(''); setLeadSourceFee(''); setReferralFee(''); setReferralTo('')
    setTcFee(''); setBrokerFee(''); setNotes('')
    setPanelOpen(true)
  }

  // Open edit
  const openEdit = (deal) => {
    setEditDeal(deal); setDetailDeal(null)
    setContactId(deal.contact_id ?? '')
    setPropertyId(deal.property_id ?? '')
    setDealType(deal.deal_type ?? 'buyer')
    setStatus(stageInfo(deal.status).value)
    setOfferPrice(deal.offer_price ?? '')
    setClosingDate(deal.closing_date ?? '')
    setContractDate(deal.contract_date ?? '')
    setExpectedCommission(deal.expected_commission ?? '')
    setFinancingType(deal.financing_type ?? 'conventional')
    setLender(deal.lender ?? '')
    setTitleCompany(deal.title_company ?? '')
    setLeadSource(deal.lead_source ?? '')
    setLeadSourceFee(deal.lead_source_fee ?? '')
    setReferralFee(deal.referral_fee ?? '')
    setReferralTo(deal.referral_to ?? '')
    setTcFee(deal.tc_fee ?? '')
    setBrokerFee(deal.broker_fee ?? '')
    setNotes(deal.notes ?? '')
    setPanelOpen(true)
  }

  // Open detail view (docs + deadlines)
  const openDetail = (deal) => {
    setDetailDeal(deal); setEditDeal(null)
    setPanelOpen(true)
  }

  const saveDeal = async () => {
    if (!contactId) return
    setSaving(true)
    try {
      const stageLabel = STAGES.find(s => s.value === status)?.label ?? status
      const payload = {
        contact_id: contactId || null,
        property_id: propertyId || null,
        deal_type: dealType,
        status: stageLabel,
        offer_price: offerPrice ? Number(offerPrice) : null,
        closing_date: closingDate || null,
        contract_date: contractDate || null,
        expected_commission: expectedCommission ? Number(expectedCommission) : null,
        financing_type: financingType || null,
        lender: lender.trim() || null,
        title_company: titleCompany.trim() || null,
        lead_source: leadSource.trim() || null,
        lead_source_fee: leadSourceFee ? Number(leadSourceFee) : null,
        referral_fee: referralFee ? Number(referralFee) : null,
        referral_to: referralTo.trim() || null,
        tc_fee: tcFee ? Number(tcFee) : null,
        broker_fee: brokerFee ? Number(brokerFee) : null,
        notes: notes.trim() || null,
      }
      if (editDeal) {
        await DB.updateTransaction(editDeal.id, payload)
      } else {
        // New deal: set offer tracking fields
        payload.is_active_offer = true
        payload.outcome = 'active'
        payload.offer_number = 1
        if (status !== 'pre_offer') {
          payload.offer_submitted_at = new Date().toISOString()
        }
        await DB.createTransaction(payload)
      }
      refetch()
      setPanelOpen(false)
    } catch (err) {
      alert('Error saving deal: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const advanceStage = async (deal) => {
    const current = stageInfo(deal.status)
    const idx = STAGES.findIndex(s => s.value === current.value)
    if (idx >= STAGES.length - 1) return
    const next = STAGES[idx + 1]
    try {
      const update = { status: next.label }
      // Auto-set offer_submitted_at when moving to Offer Submitted
      if (next.value === 'offer' && !deal.offer_submitted_at) {
        update.offer_submitted_at = new Date().toISOString()
      }
      await DB.updateTransaction(deal.id, update)
      refetch()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // ─── Reject / Archive an offer ────────────────────────────────────────────
  const openRejectModal = (deal) => {
    setRejectDeal(deal)
    setRejectReason('')
    setRejectNotes('')
    setRejectOutcome('rejected')
  }

  const confirmRejectOffer = async () => {
    if (!rejectDeal) return
    setRejecting(true)
    try {
      await DB.archiveOffer(rejectDeal.id, rejectOutcome, rejectNotes, rejectReason)
      // Also update the status label to reflect rejection
      const statusLabel = rejectOutcome === 'rejected' ? 'Offer Declined'
        : rejectOutcome === 'withdrawn' ? 'Withdrawn'
        : 'Expired'
      await DB.updateTransaction(rejectDeal.id, { status: statusLabel })
      setRejectDeal(null)
      setDetailDeal(null)
      setPanelOpen(false)
      refetch()
    } catch (err) {
      alert('Error archiving offer: ' + err.message)
    } finally {
      setRejecting(false)
    }
  }

  // ─── Re-submit a new offer (after rejection) ─────────────────────────────
  const resubmitOffer = async (previousDeal) => {
    try {
      const newDeal = await DB.createReOffer(previousDeal)
      setDetailDeal(null)
      setPanelOpen(false)
      refetch()
    } catch (err) {
      alert('Error creating new offer: ' + err.message)
    }
  }

  // Get docs for a deal
  const getDealDocs = (dealId) => docs[dealId] ?? {}
  const docList = (deal) => deal.deal_type === 'seller' ? AZ_DOCS_SELLER : AZ_DOCS_BUYER
  const docsDone = (deal) => {
    const dl = docList(deal)
    const dd = getDealDocs(deal.id)
    return dl.filter(d => dd[d.key]).length
  }

  if (loading) return <div className="pipe-loading">Loading pipeline...</div>
  if (error) return <div className="pipe-loading">Error: {error}</div>

  return (
    <div className="pipe">
      {/* ─── Top Bar ─── */}
      <div className="pipe__topbar">
        <div className="pipe__stats">
          <div className="pipe__stat">
            <span className="pipe__stat-num">{activeDeals.length}</span>
            <span className="pipe__stat-label">Active Deals</span>
          </div>
          <div className="pipe__stat">
            <span className="pipe__stat-num">{fmtDollar(pipelineValue)}</span>
            <span className="pipe__stat-label">Pipeline Value</span>
          </div>
          <div className="pipe__stat">
            <span className="pipe__stat-num">{fmtDollar(expectedGCI)}</span>
            <span className="pipe__stat-label">Expected GCI</span>
          </div>
        </div>
        <div className="pipe__actions">
          <div className="pipe__view-tabs">
            <button className={`pipe__view-tab ${viewMode === 'board' ? 'pipe__view-tab--active' : ''}`} onClick={() => setViewMode('board')}>Board</button>
            <button className={`pipe__view-tab ${viewMode === 'list' ? 'pipe__view-tab--active' : ''}`} onClick={() => setViewMode('list')}>List</button>
          </div>
          <Button variant="primary" size="sm" icon="+" onClick={openNew}>New Deal</Button>
        </div>
      </div>

      {/* ─── Pre-Offer Leads (collapsed section) ─── */}
      {preOfferDeals.length > 0 && (
        <div className="pipe__pre-offer">
          <button className="pipe__pre-offer-toggle" onClick={() => setShowPreOffer(p => !p)}>
            <span className="pipe__pre-offer-title">
              {showPreOffer ? '▾' : '▸'} Pre-Offer Leads
            </span>
            <Badge variant="default" size="sm">{preOfferDeals.length}</Badge>
          </button>
          {showPreOffer && (
            <div className="pipe__pre-offer-list">
              {preOfferDeals.map(deal => (
                <button key={deal.id} className="pipe__pre-offer-card" onClick={() => openDetail(deal)}>
                  <div className="pipe__pre-offer-info">
                    <span className="pipe__card-name">{deal.contact?.name ?? '—'}</span>
                    <span className="pipe__card-addr">{deal.property?.address ?? 'No property'}</span>
                  </div>
                  <div className="pipe__pre-offer-meta">
                    <Badge variant={deal.deal_type === 'buyer' ? 'info' : deal.deal_type === 'seller' ? 'accent' : 'dark'} size="sm">{deal.deal_type ?? '—'}</Badge>
                    <span className="pipe__card-price">{fmtDollar(deal.property?.price || deal.offer_price)}</span>
                  </div>
                  <div className="pipe__pre-offer-actions">
                    <button className="pipe__pre-offer-advance" onClick={(e) => { e.stopPropagation(); advanceStage(deal) }} title="Move to Offer Submitted">
                      Move to Offer →
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {allActiveDeals.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No active deals"
          description="Add your first deal to start tracking your pipeline."
          action={<Button variant="primary" onClick={openNew}>New Deal</Button>}
        />
      ) : viewMode === 'board' ? (
        /* ─── Board View (drag & drop) ─── */
        <div className="pipe__board">
          {BOARD_STAGES.map(stage => {
            const deals = dealsByStage[stage.value] ?? []
            const isDropTarget = dropStage === stage.value && dragDeal && stageInfo(dragDeal.status).value !== stage.value
            return (
              <div
                key={stage.value}
                className={`pipe__col ${isDropTarget ? 'pipe__col--drop-target' : ''}`}
                onDragOver={(e) => handleColumnDragOver(e, stage.value)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(e, stage.value)}
              >
                <div className="pipe__col-header">
                  <span className="pipe__col-dot" style={{ background: stage.color }} />
                  <div className="pipe__col-header-text">
                    <span className="pipe__col-title">{stage.label}</span>
                    <span className="pipe__col-desc">{stage.desc}</span>
                  </div>
                  <span className="pipe__col-count">{deals.length}</span>
                </div>
                <div className="pipe__col-body">
                  {deals.map(deal => {
                    const days = daysUntil(deal.closing_date)
                    const sc = stagesCompleted(deal.id)
                    const fin = FINANCING_TYPES.find(f => f.value === deal.financing_type)?.label
                    return (
                      <div
                        key={deal.id}
                        className="pipe__card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openDetail(deal)}
                      >
                        <div className="pipe__card-top">
                          <span className="pipe__card-name">{deal.contact?.name ?? '—'}</span>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {deal.offer_number > 1 && <Badge variant="warning" size="sm">Offer #{deal.offer_number}</Badge>}
                            <Badge variant={deal.deal_type === 'buyer' ? 'info' : deal.deal_type === 'seller' ? 'accent' : 'dark'} size="sm">
                              {deal.deal_type ?? '—'}
                            </Badge>
                          </div>
                        </div>
                        <span className="pipe__card-addr">{deal.property?.address ?? 'No property'}</span>
                        <div className="pipe__card-price-row">
                          <span className="pipe__card-price">{fmtDollar(deal.property?.price || deal.offer_price)}</span>
                          {fin && <span className="pipe__card-fin">{fin}</span>}
                        </div>
                        {/* Key info row */}
                        <div className="pipe__card-details">
                          {deal.closing_date && (
                            <span className={`pipe__card-close ${days !== null && days <= 7 ? 'pipe__card-close--urgent' : days !== null && days <= 14 ? 'pipe__card-close--soon' : ''}`}>
                              COE: {fmtDate(deal.closing_date)} {days !== null && <strong>({days <= 0 ? 'TODAY' : `${days}d`})</strong>}
                            </span>
                          )}
                          {deal.lender && <span className="pipe__card-lender">Lender: {deal.lender}</span>}
                          {deal.title_company && <span className="pipe__card-lender">Title: {deal.title_company}</span>}
                        </div>
                        {/* Contact quick-access */}
                        {(deal.contact?.phone || deal.contact?.email) && (
                          <div className="pipe__card-contact">
                            {deal.contact?.phone && (
                              <a href={`tel:${deal.contact.phone}`} className="pipe__card-contact-link" onClick={e => e.stopPropagation()} title="Call">
                                📞 {deal.contact.phone}
                              </a>
                            )}
                            {deal.contact?.email && (() => {
                              const currentStage = stageInfo(deal.status)
                              const tmpl = getStageEmail(currentStage.value)
                              if (tmpl) {
                                const subject = encodeURIComponent(fillTemplate(tmpl.subject, deal, sig))
                                const body = encodeURIComponent(fillTemplate(tmpl.body, deal, sig))
                                return (
                                  <a
                                    href={`mailto:${deal.contact.email}?subject=${subject}&body=${body}`}
                                    className="pipe__card-contact-link pipe__card-email-btn"
                                    onClick={e => e.stopPropagation()}
                                    title={`Send: ${tmpl.label}`}
                                  >
                                    ✉️ {tmpl.label}
                                  </a>
                                )
                              }
                              return (
                                <a href={`mailto:${deal.contact.email}`} className="pipe__card-contact-link" onClick={e => e.stopPropagation()} title="Email">
                                  ✉️ Email
                                </a>
                              )
                            })()}
                          </div>
                        )}
                        <div className="pipe__card-progress">
                          <div className="pipe__card-docs-bar">
                            <div className="pipe__card-docs-fill" style={{ width: `${STAGES.length > 0 ? (sc / STAGES.length) * 100 : 0}%` }} />
                          </div>
                          <span className="pipe__card-stage-count">{sc}/{STAGES.length}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ─── List View ─── */
        <div className="pipe__list">
          <div className="pipe__list-header">
            <span className="pipe__list-th pipe__list-th--name">Contact</span>
            <span className="pipe__list-th">Property</span>
            <span className="pipe__list-th">Stage</span>
            <span className="pipe__list-th">Type</span>
            <span className="pipe__list-th">Price</span>
            <span className="pipe__list-th">Closing</span>
            <span className="pipe__list-th">Days</span>
            <span className="pipe__list-th">Docs</span>
          </div>
          {activeDeals.map(deal => {
            const si = stageInfo(deal.status)
            const days = daysUntil(deal.closing_date)
            const dl = docList(deal)
            const completed = docsDone(deal)
            return (
              <button key={deal.id} className="pipe__list-row" onClick={() => openDetail(deal)}>
                <span className="pipe__list-td pipe__list-td--name">{deal.contact?.name ?? '—'}</span>
                <span className="pipe__list-td">{deal.property?.address ?? '—'}</span>
                <span className="pipe__list-td">
                  <Badge variant={si.value === 'closing' || si.value === 'loan_approval' ? 'success' : si.value.includes('binsr') ? 'danger' : 'default'} size="sm">{si.label}</Badge>
                </span>
                <span className="pipe__list-td">
                  <Badge variant={deal.deal_type === 'buyer' ? 'info' : 'accent'} size="sm">{deal.deal_type ?? '—'}</Badge>
                </span>
                <span className="pipe__list-td">{fmtDollar(deal.property?.price || deal.offer_price)}</span>
                <span className="pipe__list-td">{fmtDate(deal.closing_date)}</span>
                <span className={`pipe__list-td ${days !== null && days <= 7 ? 'pipe__list-td--urgent' : ''}`}>
                  {days !== null ? (days <= 0 ? 'Today!' : `${days}d`) : '—'}
                </span>
                <span className="pipe__list-td">{completed}/{dl.length}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Deal Detail Panel (tabbed: Overview / SOP / Docs) ─── */}
      <SlidePanel
        open={panelOpen && !!detailDeal}
        onClose={() => { setPanelOpen(false); setDetailDeal(null); setDetailTab('overview') }}
        title={detailDeal?.contact?.name ?? 'Deal Details'}
        subtitle={detailDeal?.property?.address ?? ''}
        width={540}
      >
        {detailDeal && (() => {
          const deal = detailDeal
          const si = stageInfo(deal.status)
          const days = daysUntil(deal.closing_date)
          const dl = docList(deal)
          const dd = getDealDocs(deal.id)
          const completed = dl.filter(d => dd[d.key]).length

          // Group docs by stage
          const docsByStage = {}
          dl.forEach(d => {
            if (!docsByStage[d.stage]) docsByStage[d.stage] = []
            docsByStage[d.stage].push(d)
          })

          // Calculate AZ deadlines from contract date
          const deadlines = (deal.contract_date || deal.closing_date)
            ? AZ_DEADLINES.map(dl => ({
                ...dl,
                date: addDays(deal.contract_date || deal.closing_date, dl.daysAfterContract),
              }))
            : []

          // SOP data for this deal
          const isBuyer = deal.deal_type === 'buyer' || deal.deal_type === 'both'
          const sopTasks = isBuyer ? BUYER_SOP_TASKS : SELLER_SOP_TASKS
          const sopProgress = isBuyer ? (buyerSOPProgress[deal.id] ?? {}) : (sellerSOPProgress[deal.id] ?? {})
          const sopDone = sopTasks.reduce((sum, s) => sum + s.tasks.filter(t => !!sopProgress[t.id]).length, 0)
          const sopTotal = sopTasks.reduce((sum, s) => sum + s.tasks.length, 0)

          return (
            <div className="pipe__detail">
              {/* ─── Tab Bar ─── */}
              <div className="pipe__detail-tabs">
                <button className={`pipe__detail-tab ${detailTab === 'overview' ? 'pipe__detail-tab--active' : ''}`} onClick={() => setDetailTab('overview')}>Overview</button>
                <button className={`pipe__detail-tab ${detailTab === 'sop' ? 'pipe__detail-tab--active' : ''}`} onClick={() => setDetailTab('sop')}>
                  SOP {sopTotal > 0 && <span className="pipe__detail-tab-count">{sopDone}/{sopTotal}</span>}
                </button>
                <button className={`pipe__detail-tab ${detailTab === 'notes' ? 'pipe__detail-tab--active' : ''}`} onClick={() => setDetailTab('notes')}>Notes</button>
                <button className={`pipe__detail-tab ${detailTab === 'history' ? 'pipe__detail-tab--active' : ''}`} onClick={() => setDetailTab('history')}>History</button>
                <button className={`pipe__detail-tab ${detailTab === 'docs' ? 'pipe__detail-tab--active' : ''}`} onClick={() => setDetailTab('docs')}>
                  Docs {dl.length > 0 && <span className="pipe__detail-tab-count">{completed}/{dl.length}</span>}
                </button>
              </div>

              {/* ═══ OVERVIEW TAB ═══ */}
              {detailTab === 'overview' && (
                <>
                  {/* Deal summary */}
                  <div className="pipe__detail-summary">
                    <div className="pipe__detail-row">
                      <span className="pipe__detail-label">Stage</span>
                      <Badge variant={si.value === 'closing' ? 'success' : si.value.includes('binsr') ? 'danger' : 'default'}>{si.label}</Badge>
                    </div>
                    <div className="pipe__detail-row">
                      <span className="pipe__detail-label">Type</span>
                      <span>{deal.deal_type === 'buyer' ? 'Buyer Side' : deal.deal_type === 'seller' ? 'Seller Side' : 'Both Sides'}</span>
                    </div>
                    <div className="pipe__detail-row">
                      <span className="pipe__detail-label">Price</span>
                      <span>{fmtDollar(deal.property?.price || deal.offer_price)}</span>
                    </div>
                    {deal.financing_type && (
                      <div className="pipe__detail-row">
                        <span className="pipe__detail-label">Financing</span>
                        <span>{FINANCING_TYPES.find(f => f.value === deal.financing_type)?.label ?? deal.financing_type}</span>
                      </div>
                    )}
                    {deal.lender && (
                      <div className="pipe__detail-row">
                        <span className="pipe__detail-label">Lender</span>
                        <span>{deal.lender}</span>
                      </div>
                    )}
                    {deal.title_company && (
                      <div className="pipe__detail-row">
                        <span className="pipe__detail-label">Title Co</span>
                        <span>{deal.title_company}</span>
                      </div>
                    )}
                    <div className="pipe__detail-row">
                      <span className="pipe__detail-label">Closing</span>
                      <span>{fmtDate(deal.closing_date)} {days !== null && <span className={days <= 7 ? 'pipe__detail-urgent' : ''}> ({days}d)</span>}</span>
                    </div>
                    {deal.lead_source && (
                      <div className="pipe__detail-row">
                        <span className="pipe__detail-label">Lead Source</span>
                        <span>{deal.lead_source}{deal.lead_source_fee ? ` (${fmtDollar(deal.lead_source_fee)} fee)` : ' (no fee)'}</span>
                      </div>
                    )}
                    {deal.expected_commission && (
                      <div className="pipe__detail-row">
                        <span className="pipe__detail-label">Commission</span>
                        <span>{fmtDollar(deal.expected_commission)}</span>
                      </div>
                    )}
                    {deal.contact?.phone && (
                      <div className="pipe__detail-row">
                        <span className="pipe__detail-label">Phone</span>
                        <a href={`tel:${deal.contact.phone}`}>{deal.contact.phone}</a>
                      </div>
                    )}
                    {deal.contact?.email && (
                      <div className="pipe__detail-row">
                        <span className="pipe__detail-label">Email</span>
                        <a href={`mailto:${deal.contact.email}`}>{deal.contact.email}</a>
                      </div>
                    )}
                  </div>

                  {/* Client Tags */}
                  {deal.contact?.id && (
                    <div className="pipe__detail-section">
                      <h4 className="pipe__detail-section-title">Client Tags</h4>
                      <PipelineTagPicker contactId={deal.contact.id} />
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="pipe__detail-section" style={{ marginTop: 8 }}>
                    <h4 className="pipe__detail-section-title">Timeline</h4>
                    <div className="pipe__timestamps">
                      <div className="pipe__timestamp-row">
                        <span className="pipe__timestamp-label">Created</span>
                        <span className="pipe__timestamp-value">{fmtTimestamp(deal.created_at)}</span>
                      </div>
                      {deal.offer_submitted_at && (
                        <div className="pipe__timestamp-row">
                          <span className="pipe__timestamp-label">Offer Submitted</span>
                          <span className="pipe__timestamp-value">{fmtTimestamp(deal.offer_submitted_at)}</span>
                        </div>
                      )}
                      {deal.status_changed_at && (
                        <div className="pipe__timestamp-row">
                          <span className="pipe__timestamp-label">Last Status Change</span>
                          <span className="pipe__timestamp-value">{fmtTimestamp(deal.status_changed_at)}</span>
                        </div>
                      )}
                      {deal.outcome_date && (
                        <div className="pipe__timestamp-row">
                          <span className="pipe__timestamp-label">Outcome Date</span>
                          <span className="pipe__timestamp-value">{fmtTimestamp(deal.outcome_date)}</span>
                        </div>
                      )}
                      {deal.updated_at && (
                        <div className="pipe__timestamp-row">
                          <span className="pipe__timestamp-label">Last Updated</span>
                          <span className="pipe__timestamp-value">{fmtTimestamp(deal.updated_at)}</span>
                        </div>
                      )}
                      {deal.offer_number > 1 && (
                        <div className="pipe__timestamp-row">
                          <span className="pipe__timestamp-label">Offer Attempt</span>
                          <span className="pipe__timestamp-value">#{deal.offer_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pipe__detail-actions">
                    <Button variant="ghost" size="sm" onClick={() => { setDetailDeal(null); openEdit(deal) }}>Edit Deal</Button>
                    <Button variant="primary" size="sm" onClick={() => { advanceStage(deal); setDetailDeal({ ...deal, status: STAGES[STAGES.findIndex(s => s.value === si.value) + 1]?.label ?? deal.status }) }}>
                      Advance Stage
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => openRejectModal(deal)}>
                      Reject / Archive
                    </Button>
                  </div>

                  {/* Transaction Docs Link */}
                  <div className="pipe__txn-link-section">
                    <label className="pipe__txn-link-label">Transaction Docs (dotloop, SkySlope, etc.)</label>
                    <div className="pipe__txn-link-row">
                      <input
                        type="url"
                        className="pipe__txn-link-input"
                        placeholder="Paste your transaction link here..."
                        value={dealLinks[deal.id] || ''}
                        onChange={e => updateDealLink(deal.id, e.target.value)}
                      />
                      {dealLinks[deal.id] && (
                        <a href={dealLinks[deal.id]} target="_blank" rel="noopener noreferrer" className="pipe__txn-link-btn">
                          Open Docs →
                        </a>
                      )}
                    </div>
                  </div>

                  {/* AZ Key Deadlines */}
                  {deadlines.length > 0 && (
                    <div className="pipe__detail-section">
                      <h4 className="pipe__detail-section-title">AZ Contract Deadlines</h4>
                      <div className="pipe__deadline-list">
                        {deadlines.map(dl => {
                          const d = daysUntil(dl.date)
                          return (
                            <div key={dl.key} className={`pipe__deadline ${d !== null && d <= 3 ? 'pipe__deadline--urgent' : d !== null && d <= 7 ? 'pipe__deadline--soon' : d !== null && d < 0 ? 'pipe__deadline--past' : ''}`}>
                              <span className="pipe__deadline-label">{dl.label}</span>
                              <span className="pipe__deadline-date">
                                {fmtDate(dl.date)}
                                {d !== null && <span className="pipe__deadline-days"> ({d <= 0 ? 'PAST' : `${d}d`})</span>}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fee Breakdown */}
                  {deal.expected_commission && (
                    <div className="pipe__detail-section">
                      <h4 className="pipe__detail-section-title">Fee Breakdown & Net Commission</h4>
                      <div className="pipe__fees">
                        <div className="pipe__fee-row">
                          <span className="pipe__fee-label">Gross Commission</span>
                          <span className="pipe__fee-value">{fmtDollar(deal.expected_commission)}</span>
                        </div>
                        {deal.broker_fee > 0 && (
                          <div className="pipe__fee-row">
                            <span className="pipe__fee-label">Broker Split / Fee</span>
                            <span className="pipe__fee-value pipe__fee-value--deduct">({fmtDollar(deal.broker_fee)})</span>
                          </div>
                        )}
                        {deal.referral_fee > 0 && (
                          <div className="pipe__fee-row">
                            <span className="pipe__fee-label">Referral Fee{deal.referral_to ? ` → ${deal.referral_to}` : ''}</span>
                            <span className="pipe__fee-value pipe__fee-value--deduct">({fmtDollar(deal.referral_fee)})</span>
                          </div>
                        )}
                        {deal.tc_fee > 0 && (
                          <div className="pipe__fee-row">
                            <span className="pipe__fee-label">Transaction Coordinator</span>
                            <span className="pipe__fee-value pipe__fee-value--deduct">({fmtDollar(deal.tc_fee)})</span>
                          </div>
                        )}
                        {deal.lead_source_fee > 0 && (
                          <div className="pipe__fee-row">
                            <span className="pipe__fee-label">Lead Source Fee ({deal.lead_source ?? 'Unknown'})</span>
                            <span className="pipe__fee-value pipe__fee-value--deduct">({fmtDollar(deal.lead_source_fee)})</span>
                          </div>
                        )}
                        <div className="pipe__fee-row pipe__fee-total">
                          <span className="pipe__fee-label">Net to You</span>
                          <span className="pipe__fee-value">{fmtDollar(
                            Number(deal.expected_commission || 0)
                            - Number(deal.broker_fee || 0)
                            - Number(deal.referral_fee || 0)
                            - Number(deal.tc_fee || 0)
                            - Number(deal.lead_source_fee || 0)
                          )}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ═══ SOP TAB ═══ */}
              {detailTab === 'sop' && (
                <>
                  <div className="pipe__sop-header">
                    <span className="pipe__sop-type">{isBuyer ? 'Buyer' : 'Seller'} SOP</span>
                    <div className="pipe__sop-progress-wrap">
                      <div className="pipe__sop-progress-bar">
                        <div className="pipe__sop-progress-fill" style={{ width: `${sopTotal ? (sopDone / sopTotal) * 100 : 0}%` }} />
                      </div>
                      <span className="pipe__sop-progress-text">{sopDone}/{sopTotal}</span>
                    </div>
                  </div>

                  {sopTasks.map(section => {
                    const sectionDone = section.tasks.filter(t => !!sopProgress[t.id]).length
                    const isCollapsed = !!collapsedSections[section.stage]
                    const isComplete = sectionDone === section.tasks.length
                    return (
                      <div key={section.stage} className={`pipe__sop-section ${isComplete ? 'pipe__sop-section--done' : ''}`}>
                        <button className="pipe__sop-section-toggle" onClick={() => toggleSectionCollapse(section.stage)}>
                          <span className="pipe__sop-section-arrow">{isCollapsed ? '▸' : '▾'}</span>
                          <h4 className="pipe__detail-section-title">{section.stage}</h4>
                          <span className={`pipe__detail-doc-count ${isComplete ? 'pipe__detail-doc-count--done' : ''}`}>{sectionDone}/{section.tasks.length}</span>
                        </button>
                        {!isCollapsed && (
                          <div className="pipe__sop-tasks">
                            {section.tasks.map(task => {
                              const checked = !!sopProgress[task.id]
                              return (
                                <label key={task.id} className={`pipe__sop-task ${checked ? 'pipe__sop-task--done' : ''} ${task.az ? 'pipe__sop-task--az' : ''}`}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleSOPTask(deal.id, task.id, isBuyer)} />
                                  <span>{task.text}</span>
                                  {task.az && <span className="pipe__sop-az-badge">AZ</span>}
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  <div className="pipe__sop-link">
                    <a href={isBuyer ? '/pipeline/buyer-sop' : '/pipeline/seller-sop'}>
                      Open full {isBuyer ? 'Buyer' : 'Seller'} SOP with email templates →
                    </a>
                  </div>
                </>
              )}

              {/* ═══ DOCS & DEADLINES TAB ═══ */}
              {detailTab === 'notes' && (() => {
                const cid = deal.contact_id ?? deal.contact?.id
                return <DealNotesTab contactId={cid} dealId={deal.id} />
              })()}

              {/* ═══ OFFER HISTORY TAB ═══ */}
              {detailTab === 'history' && <OfferHistoryTab contactId={deal.contact_id ?? deal.contact?.id} currentDealId={deal.id} onReOffer={resubmitOffer} />}

              {detailTab === 'docs' && (
                <>
                  {/* Stage Timeline */}
                  <div className="pipe__detail-section">
                    <div className="pipe__detail-section-header">
                      <h4 className="pipe__detail-section-title">Stage Timeline</h4>
                      <span className="pipe__detail-doc-count">{STAGES.filter(s => getDealStages(deal.id)[s.value]?.completed).length}/{STAGES.length}</span>
                    </div>
                    <div className="pipe__stage-timeline">
                      {STAGES.map((stage, idx) => {
                        const ds = getDealStages(deal.id)
                        const entry = ds[stage.value]
                        const isCompleted = entry?.completed
                        const isCurrent = si.value === stage.value
                        return (
                          <div key={stage.value} className={`pipe__stage-row ${isCompleted ? 'pipe__stage-row--done' : ''} ${isCurrent ? 'pipe__stage-row--current' : ''}`}>
                            <div className="pipe__stage-line">
                              <button
                                className={`pipe__stage-check ${isCompleted ? 'pipe__stage-check--done' : ''}`}
                                onClick={() => toggleStageComplete(deal.id, stage.value)}
                                title={isCompleted ? 'Undo' : 'Complete'}
                              >
                                {isCompleted ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
                                ) : (
                                  <span className="pipe__stage-circle" style={{ borderColor: stage.color }} />
                                )}
                              </button>
                              {idx < STAGES.length - 1 && <span className={`pipe__stage-connector ${isCompleted ? 'pipe__stage-connector--done' : ''}`} />}
                            </div>
                            <div className="pipe__stage-info">
                              <div className="pipe__stage-label-row">
                                <span className="pipe__stage-label" style={{ color: isCurrent ? stage.color : undefined }}>{stage.label}</span>
                                {isCurrent && <Badge variant="warning" size="sm">Current</Badge>}
                              </div>
                              {isCompleted && entry?.completedAt && (
                                <span className="pipe__stage-timestamp">Completed {fmtTimestamp(entry.completedAt)}{entry.editedAt && <span className="pipe__stage-edited"> (edited)</span>}</span>
                              )}
                              {isCompleted && (
                                <div className="pipe__stage-date-edit">
                                  <input type="date" className="pipe__stage-date-input" value={entry?.date ?? ''} onChange={(e) => editStageDate(deal.id, stage.value, e.target.value)} />
                                </div>
                              )}
                              {!isCompleted && entry?.uncompletedAt && (
                                <span className="pipe__stage-timestamp pipe__stage-timestamp--undo">Undone {fmtTimestamp(entry.uncompletedAt)}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Document Tracker */}
                  <div className="pipe__detail-section">
                    <div className="pipe__detail-section-header">
                      <h4 className="pipe__detail-section-title">Document Tracker — {deal.deal_type === 'seller' ? 'Seller' : 'Buyer'} Side</h4>
                      <span className="pipe__detail-doc-count">{completed}/{dl.length}</span>
                    </div>
                    <div className="pipe__detail-doc-bar">
                      <div className="pipe__detail-doc-fill" style={{ width: `${dl.length > 0 ? (completed / dl.length) * 100 : 0}%` }} />
                    </div>
                    {STAGES.map(stage => {
                      const stageDocs = docsByStage[stage.value]
                      if (!stageDocs) return null
                      return (
                        <div key={stage.value} className="pipe__doc-group">
                          <span className="pipe__doc-group-title">
                            <span className="pipe__doc-group-dot" style={{ background: stage.color }} />
                            {stage.label}
                          </span>
                          {stageDocs.map(doc => (
                            <label key={doc.key} className={`pipe__doc-item ${dd[doc.key] ? 'pipe__doc-item--done' : ''}`}>
                              <input type="checkbox" checked={!!dd[doc.key]} onChange={() => setDocs(deal.id, doc.key, !dd[doc.key])} />
                              <span>{doc.label}</span>
                            </label>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })()}
      </SlidePanel>

      {/* ─── New / Edit Deal Panel ─── */}
      <SlidePanel
        open={panelOpen && (!!editDeal || (!detailDeal && !editDeal))}
        onClose={() => { setPanelOpen(false); setEditDeal(null) }}
        title={editDeal ? 'Edit Deal' : 'New Deal — Arizona'}
        subtitle={editDeal ? `${editDeal.contact?.name ?? ''} — ${editDeal.property?.address ?? ''}` : 'AAR Purchase Contract intake'}
        width={480}
      >
        {!detailDeal && (
          <div className="pipe__form">
            <Select label="Contact" id="deal-contact" value={contactId} onChange={e => setContactId(e.target.value)}>
              <option value="">Select contact...</option>
              {(contacts ?? []).map(c => <option key={c.id} value={c.id}>{c.name}{c.type ? ` (${c.type})` : ''}</option>)}
            </Select>

            <Select label="Property" id="deal-property" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
              <option value="">Select property...</option>
              {(properties ?? []).map(p => <option key={p.id} value={p.id}>{p.address}, {p.city}</option>)}
            </Select>

            <div className="pipe__form-row">
              <Select label="Deal Type" id="deal-type" value={dealType} onChange={e => setDealType(e.target.value)}>
                {DEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
              <Select label="Stage" id="deal-stage" value={status} onChange={e => setStatus(e.target.value)}>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>

            <div className="pipe__form-row">
              <Select label="Financing" id="deal-financing" value={financingType} onChange={e => setFinancingType(e.target.value)}>
                {FINANCING_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
              <Input label="Lender" id="deal-lender" value={lender} onChange={e => setLender(e.target.value)} placeholder="e.g. Nova Home Loans" />
            </div>

            <Input label="Title / Escrow Company" id="deal-title" value={titleCompany} onChange={e => setTitleCompany(e.target.value)} placeholder="e.g. Security Title Agency" />

            <div className="pipe__form-row">
              <Input label="Offer Price" id="deal-price" type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} placeholder="450000" />
              <Input label="Expected Commission" id="deal-commission" type="number" value={expectedCommission} onChange={e => setExpectedCommission(e.target.value)} placeholder="13500" />
            </div>

            <div className="pipe__form-row">
              <Input label="Contract Date" id="deal-contract" type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
              <Input label="Closing Date (COE)" id="deal-closing" type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} />
            </div>

            <span className="pipe__form-section">Lead Source</span>
            <div className="pipe__form-row">
              <Input label="Lead Source" id="deal-lead-source" value={leadSource} onChange={e => setLeadSource(e.target.value)} placeholder="e.g. Zillow, Sphere, Open House, Realtor.com" />
              <Input label="Lead Source Fee ($)" id="deal-lead-fee" type="number" value={leadSourceFee} onChange={e => setLeadSourceFee(e.target.value)} placeholder="0 if no fee" />
            </div>

            <span className="pipe__form-section">Fees & Splits</span>
            <div className="pipe__form-row">
              <Input label="Broker Fee ($)" id="deal-broker" type="number" value={brokerFee} onChange={e => setBrokerFee(e.target.value)} placeholder="e.g. 500" />
              <Input label="TC Fee ($)" id="deal-tc" type="number" value={tcFee} onChange={e => setTcFee(e.target.value)} placeholder="e.g. 395" />
            </div>
            <div className="pipe__form-row">
              <Input label="Referral Fee ($)" id="deal-referral" type="number" value={referralFee} onChange={e => setReferralFee(e.target.value)} placeholder="0 if none" />
              <Input label="Referral To (agent/company)" id="deal-referral-to" value={referralTo} onChange={e => setReferralTo(e.target.value)} placeholder="e.g. Jane Doe, Keller Williams" />
            </div>

            <Textarea label="Notes" id="deal-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="MLS #, special terms, contingencies..." />

            <div className="pipe__form-actions">
              <Button variant="primary" onClick={saveDeal} disabled={saving}>{saving ? 'Saving...' : editDeal ? 'Update Deal' : 'Add Deal'}</Button>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* ─── Reject / Archive Offer Modal ─── */}
      {rejectDeal && (
        <div className="pipe__modal-overlay" onClick={() => setRejectDeal(null)}>
          <div className="pipe__modal" onClick={e => e.stopPropagation()}>
            <h3 className="pipe__modal-title">Archive Offer</h3>
            <p className="pipe__modal-subtitle">
              {rejectDeal.contact?.name} — {rejectDeal.property?.address ?? 'No property'}
              {rejectDeal.offer_price && ` — ${fmtDollar(rejectDeal.offer_price)}`}
            </p>

            <Select label="Outcome" id="reject-outcome" value={rejectOutcome} onChange={e => setRejectOutcome(e.target.value)}>
              <option value="rejected">Rejected by Seller</option>
              <option value="withdrawn">Withdrawn by Us</option>
              <option value="expired">Offer Expired</option>
            </Select>

            <Input
              label="Reason"
              id="reject-reason"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Seller accepted another offer, price too low, multiple offers..."
            />

            <Textarea
              label="Notes"
              id="reject-notes"
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              rows={3}
              placeholder="Any additional details about the outcome..."
            />

            <div className="pipe__modal-actions">
              <Button variant="ghost" size="sm" onClick={() => setRejectDeal(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={confirmRejectOffer} disabled={rejecting}>
                {rejecting ? 'Archiving...' : 'Archive Offer'}
              </Button>
            </div>

            <p className="pipe__modal-hint">
              This removes the deal from the active board. You can submit a new offer from the Offer History tab anytime.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
