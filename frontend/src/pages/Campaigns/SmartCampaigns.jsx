import { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, Button, Badge, Input, Select, Textarea, TabBar, SlidePanel, EmptyState, SectionHeader } from '../../components/ui'
import { useContacts } from '../../lib/hooks'
import './SmartCampaigns.css'

// ─── localStorage Keys ──────────────────────────────────────────────────────
const CAMPAIGNS_KEY   = 'sc_campaigns'
const ENROLLMENTS_KEY = 'sc_enrollments'
const HISTORY_KEY     = 'sc_history'

// ─── Helpers ────────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2,9)}`
const now = () => new Date().toISOString()
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

function loadJSON(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

// ─── Starter Campaign Templates ──────────────────────────────────────────────
const STARTER_CAMPAIGNS = [
  {
    id: 'tpl_new_buyer_lead',
    name: 'New Buyer Lead Nurture',
    description: 'Welcome sequence for new buyer leads — builds rapport and qualifies',
    type: 'buyer',
    status: 'template',
    steps: [
      { id: 's1', order: 1, type: 'email', delay_days: 0, delay_label: 'Immediately', subject: 'Welcome! Let\'s find your perfect home', body: 'Hi {first_name},\n\nThank you for reaching out about buying a home in the East Valley! I\'m Dana Massey with Antigravity Real Estate, and I\'m excited to help you on this journey.\n\nTo get started, I\'d love to learn more about what you\'re looking for:\n- What areas are you most interested in?\n- What\'s your ideal timeline?\n- Have you been pre-approved for a mortgage yet?\n\nI\'ll be sending you some helpful resources over the next few weeks. In the meantime, feel free to reply to this email or call/text me anytime.\n\nLooking forward to connecting!\n\nDana Massey\nAntigravity Real Estate' },
      { id: 's2', order: 2, type: 'sms', delay_days: 1, delay_label: '1 day later', body: 'Hi {first_name}! It\'s Dana from Antigravity RE. Just wanted to make sure you got my email yesterday. I\'d love to chat about your home search — what works best for a quick call?' },
      { id: 's3', order: 3, type: 'email', delay_days: 3, delay_label: '3 days later', subject: 'Your Arizona Buyer\'s Guide', body: 'Hi {first_name},\n\nI put together a quick guide covering everything you need to know about buying in Arizona — from earnest money timelines to inspection periods.\n\nKey things to know:\n- Earnest money is due within 3 business days of acceptance\n- You\'ll have a 10-day inspection period\n- Arizona uses a Buyer Broker Agreement (BBA)\n\nWould you like me to send you the full buyer\'s guide? Also happy to hop on a call to walk through the process.\n\nDana' },
      { id: 's4', order: 4, type: 'email', delay_days: 7, delay_label: '7 days later', subject: 'Homes that match your search', body: 'Hi {first_name},\n\nI\'ve been keeping an eye on the market and wanted to share some properties that might interest you. The East Valley market is moving — homes in Gilbert, Chandler, and Mesa are seeing strong activity.\n\nWould you like me to set up a custom search so you get notified the moment new listings hit the market?\n\nLet me know what price range and areas you\'re focused on, and I\'ll get that set up for you today.\n\nDana' },
      { id: 's5', order: 5, type: 'sms', delay_days: 10, delay_label: '10 days later', body: 'Hey {first_name}! Just checking in on your home search. Any questions I can answer? I have some great new listings in the East Valley if you\'d like to take a look.' },
      { id: 's6', order: 6, type: 'email', delay_days: 14, delay_label: '14 days later', subject: 'Market update + next steps', body: 'Hi {first_name},\n\nI wanted to give you a quick market update — the East Valley is still competitive but there are great opportunities if you\'re prepared.\n\nHere\'s what I\'m seeing:\n- Average days on market: ~30 days\n- Multiple offer situations on well-priced homes\n- Sellers are motivated before summer\n\nIf you\'re ready to start touring homes, I\'d love to set up some showings. The first step is getting pre-approved (if you haven\'t already) — I can connect you with a great local lender.\n\nWhat does your schedule look like this week?\n\nDana' },
    ],
  },
  {
    id: 'tpl_new_seller_lead',
    name: 'New Seller Lead Nurture',
    description: 'Engage potential sellers with market data and listing prep tips',
    type: 'seller',
    steps: [
      { id: 's1', order: 1, type: 'email', delay_days: 0, delay_label: 'Immediately', subject: 'Your home\'s value in today\'s market', body: 'Hi {first_name},\n\nThank you for your interest in selling your home! I\'m Dana Massey with Antigravity Real Estate, and I specialize in the East Valley market.\n\nI\'d love to provide you with a complimentary market analysis of your home. This will give you a clear picture of what similar homes in your area are selling for and help you understand your options.\n\nWould you prefer to:\n1. Receive a detailed CMA via email\n2. Schedule a quick in-person walkthrough\n3. Hop on a call to discuss your timeline\n\nLooking forward to helping you make the most of this market!\n\nDana Massey\nAntigravity Real Estate' },
      { id: 's2', order: 2, type: 'sms', delay_days: 1, delay_label: '1 day later', body: 'Hi {first_name}! It\'s Dana from Antigravity RE. I\'d love to get you a home value estimate. What\'s the best way to connect — call, text, or email?' },
      { id: 's3', order: 3, type: 'email', delay_days: 4, delay_label: '4 days later', subject: '5 things that increase your home\'s value', body: 'Hi {first_name},\n\nWhether you\'re selling now or in a few months, here are 5 things that can significantly impact your sale price:\n\n1. Curb appeal — first impressions matter\n2. Kitchen & bath updates — even small refreshes help\n3. Decluttering & staging — buyers need to envision themselves\n4. Professional photography — 90% of buyers start online\n5. Strategic pricing — overpricing costs you more than underpricing\n\nI help my sellers with all of this as part of my listing process. Would you like to learn more about my marketing plan?\n\nDana' },
      { id: 's4', order: 4, type: 'email', delay_days: 8, delay_label: '8 days later', subject: 'What\'s happening in your neighborhood', body: 'Hi {first_name},\n\nI wanted to share what\'s been happening in your area recently:\n\n- Homes are selling in an average of X days\n- The average sale price has [increased/decreased] X% this year\n- Buyer demand remains strong in the East Valley\n\nTiming is everything in real estate. If you\'re curious about where your home fits in this market, I\'d be happy to run the numbers for you.\n\nNo pressure — just information to help you make the best decision.\n\nDana' },
      { id: 's5', order: 5, type: 'sms', delay_days: 12, delay_label: '12 days later', body: 'Hi {first_name}! Homes in your area are moving fast right now. Would you like me to send you a quick snapshot of recent sales near you?' },
      { id: 's6', order: 6, type: 'email', delay_days: 21, delay_label: '21 days later', subject: 'Still thinking about selling?', body: 'Hi {first_name},\n\nJust wanted to follow up and see where you\'re at with your plans. Whether you\'re ready to list next week or next year, I\'m here as a resource.\n\nIf you\'d like, I can:\n- Send you a current CMA for your home\n- Walk through my marketing and pricing strategy\n- Answer any questions about the process\n\nNo obligation — I want to make sure you have all the info you need to make the right decision for your family.\n\nDana' },
    ],
    status: 'template',
  },
  {
    id: 'tpl_open_house_followup',
    name: 'Open House Follow-Up',
    description: 'Nurture leads captured at open houses',
    type: 'open_house',
    steps: [
      { id: 's1', order: 1, type: 'email', delay_days: 0, delay_label: 'Same day', subject: 'Great meeting you at the open house!', body: 'Hi {first_name},\n\nIt was great meeting you at today\'s open house at {property_address}! I hope you enjoyed the tour.\n\nI\'d love to know — what did you think of the home? Are there other properties you\'d like to see?\n\nIf this home interested you, I can get you more details on the seller\'s situation and help you put together a competitive offer.\n\nEither way, I\'m here to help with your home search. Let me know how I can help!\n\nDana Massey\nAntigravity Real Estate' },
      { id: 's2', order: 2, type: 'sms', delay_days: 1, delay_label: '1 day later', body: 'Hi {first_name}! Thanks again for coming to the open house yesterday. Any thoughts on the home? I\'d love to help you find the right one!' },
      { id: 's3', order: 3, type: 'email', delay_days: 3, delay_label: '3 days later', subject: 'Similar homes you might love', body: 'Hi {first_name},\n\nSince you showed interest in {property_address}, I pulled some similar properties in the area that you might like.\n\nWant me to set up showings for any of these? I\'m available this week and would love to show you around.\n\nDana' },
      { id: 's4', order: 4, type: 'email', delay_days: 7, delay_label: '7 days later', subject: 'Your home search — let\'s make a plan', body: 'Hi {first_name},\n\nI wanted to check in and see how your home search is going. If you\'re actively looking, here\'s how I can help:\n\n- Set up automated listings alerts tailored to you\n- Schedule private showings at your convenience\n- Help you get pre-approved if you haven\'t already\n\nWhat does your ideal home look like? Let\'s chat and get you on the right track.\n\nDana' },
      { id: 's5', order: 5, type: 'sms', delay_days: 14, delay_label: '14 days later', body: 'Hey {first_name}! Hope your home search is going well. I have some new listings that just hit the market. Want me to send them your way?' },
    ],
    status: 'template',
  },
  {
    id: 'tpl_past_client',
    name: 'Past Client Check-In',
    description: 'Stay top-of-mind with past clients for referrals and repeat business',
    type: 'past_client',
    steps: [
      { id: 's1', order: 1, type: 'email', delay_days: 0, delay_label: 'Immediately', subject: 'Happy homeversary! + a gift for you', body: 'Hi {first_name},\n\nCan you believe it\'s been [X time] since you closed on your home? I hope you\'re loving it!\n\nI wanted to check in and see how everything is going. Also, I have a small gift I\'d love to drop off — are you available this week?\n\nIf you know anyone thinking about buying or selling, I\'d love the opportunity to help them the way I helped you. Referrals mean the world to me.\n\nHope to see you soon!\n\nDana' },
      { id: 's2', order: 2, type: 'sms', delay_days: 2, delay_label: '2 days later', body: 'Hey {first_name}! Happy homeversary! I\'d love to stop by with a small gift. What day works best for you this week?' },
      { id: 's3', order: 3, type: 'email', delay_days: 7, delay_label: '7 days later', subject: 'Your neighborhood market update', body: 'Hi {first_name},\n\nI thought you might be interested to see what\'s been happening in your neighborhood. Here\'s a quick snapshot of recent activity:\n\n- Homes near you are selling for $X on average\n- Your home\'s estimated value has [increased/remained strong]\n- Demand in your area remains high\n\nEven if you\'re not thinking of selling, it\'s always good to know where you stand. Let me know if you\'d ever like a detailed update.\n\nDana' },
      { id: 's4', order: 4, type: 'email', delay_days: 30, delay_label: '30 days later', subject: 'Quick favor?', body: 'Hi {first_name},\n\nI hope you\'re doing well! I have a quick favor to ask — if you had a great experience working with me, would you mind leaving a review on Google or Zillow?\n\nIt really helps other buyers and sellers find the right agent, and I\'d be so grateful.\n\n[Review Link]\n\nThank you so much! And remember, if you know anyone looking to buy or sell, I\'m always here to help.\n\nDana' },
    ],
    status: 'template',
  },
  {
    id: 'tpl_sphere_nurture',
    name: 'Sphere of Influence Nurture',
    description: 'Stay connected with your SOI — friends, family, past coworkers',
    type: 'sphere',
    steps: [
      { id: 's1', order: 1, type: 'email', delay_days: 0, delay_label: 'Immediately', subject: 'Hey! Quick real estate question for you', body: 'Hey {first_name}!\n\nI hope you\'re doing great! I wanted to reach out because I\'ve been growing my real estate business here in the East Valley and I\'d love your help.\n\nDo you know anyone who\'s thinking about buying or selling a home? I\'m always looking to help great people, and a personal introduction goes a long way.\n\nNo pressure at all — just thought I\'d ask! Let\'s catch up soon.\n\nDana' },
      { id: 's2', order: 2, type: 'sms', delay_days: 3, delay_label: '3 days later', body: 'Hey {first_name}! Just reaching out to say hi. If you ever hear of anyone looking to buy or sell, keep me in mind! Hope you\'re doing awesome.' },
      { id: 's3', order: 3, type: 'email', delay_days: 14, delay_label: '14 days later', subject: 'Cool market stat I thought you\'d find interesting', body: 'Hey {first_name}!\n\nI came across something interesting and thought of you — did you know that home values in the East Valley have [stat]?\n\nWhether you\'re a homeowner curious about your equity or know someone thinking about making a move, I\'m always happy to chat real estate.\n\nHope we can grab coffee soon!\n\nDana' },
    ],
    status: 'template',
  },
  {
    id: 'tpl_expired_listing',
    name: 'Expired Listing Outreach',
    description: 'Re-engage homeowners whose listing expired without selling',
    type: 'expired',
    steps: [
      { id: 's1', order: 1, type: 'email', delay_days: 0, delay_label: 'Immediately', subject: 'I noticed your home didn\'t sell — can I help?', body: 'Hi {first_name},\n\nI noticed your home at {property_address} recently came off the market. I know that can be frustrating, especially when you were counting on a sale.\n\nI\'ve helped several homeowners in similar situations, and I\'d love to share what I think went wrong and how we can fix it. Common reasons listings expire:\n\n1. Pricing strategy that didn\'t match the market\n2. Insufficient marketing and exposure\n3. Poor presentation or staging\n\nI have a different approach that gets results. Would you be open to a quick conversation?\n\nDana Massey\nAntigravity Real Estate' },
      { id: 's2', order: 2, type: 'sms', delay_days: 1, delay_label: '1 day later', body: 'Hi {first_name}, it\'s Dana with Antigravity RE. I saw your listing expired — I have some ideas on how to get it sold. Would you be open to a quick chat?' },
      { id: 's3', order: 3, type: 'email', delay_days: 4, delay_label: '4 days later', subject: 'What I\'d do differently with your listing', body: 'Hi {first_name},\n\nI\'ve been thinking about your home at {property_address} and what it would take to get it sold. Here\'s what my listing strategy includes:\n\n- Professional photography + video tour + drone\n- Targeted social media advertising\n- Strategic pricing based on current market data\n- Open house strategy with neighborhood marketing\n- Weekly communication and transparency\n\nI\'d love to show you my full marketing plan. No obligation — just a conversation to see if we\'re a good fit.\n\nDana' },
      { id: 's4', order: 4, type: 'sms', delay_days: 8, delay_label: '8 days later', body: 'Hey {first_name} — just wanted to follow up one more time. I truly believe I can get your home sold. Happy to meet for a quick coffee to chat. No pressure!' },
      { id: 's5', order: 5, type: 'email', delay_days: 14, delay_label: '14 days later', subject: 'One last thought about your home', body: 'Hi {first_name},\n\nI wanted to reach out one final time. I understand the frustration of a listing that didn\'t sell, and I respect your time.\n\nIf and when you\'re ready to try again, I\'d love to be your agent. I\'ll be here whenever you\'re ready — no expiration date on that offer.\n\nWishing you the best!\n\nDana' },
    ],
    status: 'template',
  },
]

// ─── Step Type Config ───────────────────────────────────────────────────────
const STEP_TYPES = {
  email: { label: 'Email', icon: '✉', color: '#4A90D9' },
  sms:   { label: 'SMS',   icon: '💬', color: '#38A169' },
}

const CAMPAIGN_TYPES = [
  { value: 'buyer',        label: 'Buyer Lead' },
  { value: 'seller',       label: 'Seller Lead' },
  { value: 'open_house',   label: 'Open House Follow-Up' },
  { value: 'past_client',  label: 'Past Client' },
  { value: 'sphere',       label: 'Sphere of Influence' },
  { value: 'expired',      label: 'Expired Listing' },
  { value: 'investor',     label: 'Investor' },
  { value: 'custom',       label: 'Custom' },
]

const DELAY_OPTIONS = [
  { value: 0,  label: 'Immediately' },
  { value: 1,  label: '1 day later' },
  { value: 2,  label: '2 days later' },
  { value: 3,  label: '3 days later' },
  { value: 4,  label: '4 days later' },
  { value: 5,  label: '5 days later' },
  { value: 7,  label: '7 days later' },
  { value: 10, label: '10 days later' },
  { value: 14, label: '14 days later' },
  { value: 21, label: '21 days later' },
  { value: 30, label: '30 days later' },
  { value: 45, label: '45 days later' },
  { value: 60, label: '60 days later' },
  { value: 90, label: '90 days later' },
]

// ─── Variable tokens for templates ──────────────────────────────────────────
const TEMPLATE_VARS = [
  '{first_name}', '{last_name}', '{full_name}', '{email}', '{phone}',
  '{property_address}', '{agent_name}',
]

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function SmartCampaigns() {
  /* ─── Data ─── */
  const { data: contacts } = useContacts()
  const allContacts = contacts ?? []

  /* ─── State ─── */
  const [campaigns, setCampaigns]       = useState(() => loadJSON(CAMPAIGNS_KEY, []))
  const [enrollments, setEnrollments]   = useState(() => loadJSON(ENROLLMENTS_KEY, []))
  const [history, setHistory]           = useState(() => loadJSON(HISTORY_KEY, []))
  const [mainTab, setMainTab]           = useState('campaigns')
  const [editing, setEditing]           = useState(null)          // campaign being edited / created
  const [enrollPanel, setEnrollPanel]   = useState(null)          // campaign id for enrollment panel
  const [detailPanel, setDetailPanel]   = useState(null)          // enrollment id for detail view
  const [contactSearch, setContactSearch] = useState('')
  const [enrollFilter, setEnrollFilter] = useState('all')

  /* ─── Persist ─── */
  useEffect(() => saveJSON(CAMPAIGNS_KEY, campaigns), [campaigns])
  useEffect(() => saveJSON(ENROLLMENTS_KEY, enrollments), [enrollments])
  useEffect(() => saveJSON(HISTORY_KEY, history), [history])

  /* ─── Templates (read-only starters) ─── */
  const templates = STARTER_CAMPAIGNS

  // ═══════════════════════════════════════════════════════════════════════════
  // Campaign CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  const saveCampaign = useCallback((c) => {
    setCampaigns(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next }
      return [...prev, c]
    })
    setEditing(null)
  }, [])

  const deleteCampaign = useCallback((id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id))
    setEnrollments(prev => prev.filter(e => e.campaign_id !== id))
  }, [])

  const duplicateCampaign = useCallback((source) => {
    const newC = {
      ...source,
      id: uid(),
      name: source.name + ' (Copy)',
      status: 'draft',
      created_at: now(),
      steps: source.steps.map(s => ({ ...s, id: uid() })),
    }
    setCampaigns(prev => [...prev, newC])
  }, [])

  const startNewFromTemplate = useCallback((tpl) => {
    setEditing({
      ...tpl,
      id: uid(),
      status: 'draft',
      created_at: now(),
      steps: tpl.steps.map(s => ({ ...s, id: uid() })),
    })
  }, [])

  const startBlank = useCallback(() => {
    setEditing({
      id: uid(),
      name: '',
      description: '',
      type: 'custom',
      status: 'draft',
      created_at: now(),
      steps: [],
    })
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // Enrollment Actions
  // ═══════════════════════════════════════════════════════════════════════════
  const enrollContact = useCallback((campaignId, contact) => {
    const campaign = campaigns.find(c => c.id === campaignId)
    if (!campaign) return
    // Don't double-enroll
    const existing = enrollments.find(e => e.campaign_id === campaignId && e.contact_id === contact.id && e.status === 'active')
    if (existing) return

    const enrollment = {
      id: uid(),
      campaign_id: campaignId,
      campaign_name: campaign.name,
      contact_id: contact.id,
      contact_name: contact.name,
      contact_email: contact.email,
      contact_phone: contact.phone,
      status: 'active',
      current_step: 0,
      enrolled_at: now(),
      next_send_at: now(),
      step_history: [],
      paused_at: null,
      completed_at: null,
      stopped_at: null,
    }
    setEnrollments(prev => [...prev, enrollment])
    addHistory(enrollment.id, campaignId, contact.id, contact.name, campaign.name, 'enrolled', 'Contact enrolled in campaign')
  }, [campaigns, enrollments])

  const pauseEnrollment = useCallback((id) => {
    setEnrollments(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'paused', paused_at: now() } : e
    ))
    const e = enrollments.find(x => x.id === id)
    if (e) addHistory(id, e.campaign_id, e.contact_id, e.contact_name, e.campaign_name, 'paused', 'Campaign paused')
  }, [enrollments])

  const resumeEnrollment = useCallback((id) => {
    setEnrollments(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'active', paused_at: null } : e
    ))
    const e = enrollments.find(x => x.id === id)
    if (e) addHistory(id, e.campaign_id, e.contact_id, e.contact_name, e.campaign_name, 'resumed', 'Campaign resumed')
  }, [enrollments])

  const stopEnrollment = useCallback((id) => {
    setEnrollments(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'stopped', stopped_at: now() } : e
    ))
    const e = enrollments.find(x => x.id === id)
    if (e) addHistory(id, e.campaign_id, e.contact_id, e.contact_name, e.campaign_name, 'stopped', 'Campaign stopped')
  }, [enrollments])

  const markStepSent = useCallback((enrollmentId, stepIndex) => {
    setEnrollments(prev => prev.map(e => {
      if (e.id !== enrollmentId) return e
      const campaign = campaigns.find(c => c.id === e.campaign_id)
      const step = campaign?.steps?.[stepIndex]
      const newHistory = [...(e.step_history ?? []), {
        step_index: stepIndex,
        step_type: step?.type ?? 'email',
        subject: step?.subject ?? '',
        sent_at: now(),
      }]
      const nextStep = stepIndex + 1
      const isComplete = nextStep >= (campaign?.steps?.length ?? 0)
      const nextDelay = campaign?.steps?.[nextStep]?.delay_days ?? 0
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + nextDelay)

      return {
        ...e,
        current_step: isComplete ? stepIndex : nextStep,
        step_history: newHistory,
        status: isComplete ? 'completed' : e.status,
        completed_at: isComplete ? now() : null,
        next_send_at: isComplete ? null : nextDate.toISOString(),
      }
    }))
    const e = enrollments.find(x => x.id === enrollmentId)
    const campaign = campaigns.find(c => c.id === e?.campaign_id)
    const step = campaign?.steps?.[stepIndex]
    if (e) addHistory(enrollmentId, e.campaign_id, e.contact_id, e.contact_name, e.campaign_name, 'step_sent', `${step?.type === 'sms' ? 'SMS' : 'Email'} sent: ${step?.subject || '(SMS)'}`)
  }, [campaigns, enrollments])

  const openGmail = useCallback((enrollment, step) => {
    const contact = allContacts.find(c => c.id === enrollment.contact_id) ?? {}
    const email = contact.email || enrollment.contact_email || ''
    const firstName = (contact.name || enrollment.contact_name || '').split(' ')[0]
    let subject = (step.subject || '').replace(/\{first_name\}/g, firstName).replace(/\{full_name\}/g, contact.name || '')
    let body = (step.body || '').replace(/\{first_name\}/g, firstName).replace(/\{full_name\}/g, contact.name || '').replace(/\{agent_name\}/g, 'Dana Massey')
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }, [allContacts])

  function addHistory(enrollmentId, campaignId, contactId, contactName, campaignName, action, detail) {
    setHistory(prev => [{
      id: uid(),
      enrollment_id: enrollmentId,
      campaign_id: campaignId,
      contact_id: contactId,
      contact_name: contactName,
      campaign_name: campaignName,
      action,
      detail,
      timestamp: now(),
    }, ...prev])
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Stats
  // ═══════════════════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    const active = enrollments.filter(e => e.status === 'active').length
    const paused = enrollments.filter(e => e.status === 'paused').length
    const completed = enrollments.filter(e => e.status === 'completed').length
    const stopped = enrollments.filter(e => e.status === 'stopped').length
    const totalStepsSent = enrollments.reduce((sum, e) => sum + (e.step_history?.length ?? 0), 0)
    return { active, paused, completed, stopped, total: enrollments.length, totalStepsSent }
  }, [enrollments])

  const campaignStats = useCallback((campaignId) => {
    const ce = enrollments.filter(e => e.campaign_id === campaignId)
    return {
      enrolled: ce.length,
      active: ce.filter(e => e.status === 'active').length,
      paused: ce.filter(e => e.status === 'paused').length,
      completed: ce.filter(e => e.status === 'completed').length,
      stopped: ce.filter(e => e.status === 'stopped').length,
      stepsSent: ce.reduce((s, e) => s + (e.step_history?.length ?? 0), 0),
    }
  }, [enrollments])

  // Contact's campaign history
  const contactCampaignHistory = useCallback((contactId) => {
    return enrollments.filter(e => e.contact_id === contactId)
  }, [enrollments])

  // ═══════════════════════════════════════════════════════════════════════════
  // Filtered enrollments
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredEnrollments = useMemo(() => {
    let list = [...enrollments]
    if (enrollFilter !== 'all') list = list.filter(e => e.status === enrollFilter)
    return list.sort((a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at))
  }, [enrollments, enrollFilter])

  // Due today or overdue
  const dueTasks = useMemo(() => {
    const today = new Date().toDateString()
    return enrollments.filter(e => {
      if (e.status !== 'active') return false
      if (!e.next_send_at) return false
      return new Date(e.next_send_at) <= new Date(new Date().setHours(23, 59, 59))
    }).map(e => {
      const campaign = campaigns.find(c => c.id === e.campaign_id)
      const step = campaign?.steps?.[e.current_step]
      return { enrollment: e, campaign, step }
    })
  }, [enrollments, campaigns])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="sc">
      {/* ─── Hero Stats ─── */}
      <div className="sc-stats-row">
        <div className="sc-stat-card sc-stat-card--accent">
          <span className="sc-stat-num">{stats.active}</span>
          <span className="sc-stat-label">Active</span>
        </div>
        <div className="sc-stat-card">
          <span className="sc-stat-num">{stats.paused}</span>
          <span className="sc-stat-label">Paused</span>
        </div>
        <div className="sc-stat-card">
          <span className="sc-stat-num">{stats.completed}</span>
          <span className="sc-stat-label">Completed</span>
        </div>
        <div className="sc-stat-card">
          <span className="sc-stat-num">{stats.totalStepsSent}</span>
          <span className="sc-stat-label">Msgs Sent</span>
        </div>
        <div className="sc-stat-card">
          <span className="sc-stat-num">{campaigns.length}</span>
          <span className="sc-stat-label">Campaigns</span>
        </div>
        <div className="sc-stat-card sc-stat-card--warn">
          <span className="sc-stat-num">{dueTasks.length}</span>
          <span className="sc-stat-label">Due Today</span>
        </div>
      </div>

      {/* ─── Main Tabs ─── */}
      <TabBar
        tabs={[
          { value: 'campaigns', label: 'My Campaigns', count: campaigns.length },
          { value: 'queue',     label: 'Send Queue',   count: dueTasks.length },
          { value: 'active',    label: 'Enrollments',  count: enrollments.length },
          { value: 'history',   label: 'History',       count: history.length },
          { value: 'templates', label: 'Templates',     count: templates.length },
        ]}
        active={mainTab}
        onChange={setMainTab}
      />

      {/* ═══ CAMPAIGNS TAB ═══ */}
      {mainTab === 'campaigns' && (
        <div className="sc-section">
          <SectionHeader
            title="My Campaigns"
            subtitle="Build and manage your email + SMS sequences"
            actions={<Button onClick={startBlank}>+ New Campaign</Button>}
          />
          {campaigns.length === 0 ? (
            <EmptyState
              title="No campaigns yet"
              description="Create a campaign from scratch or use a template to get started."
              action={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={startBlank}>Create Blank</Button>
                  <Button variant="ghost" onClick={() => setMainTab('templates')}>Browse Templates</Button>
                </div>
              }
            />
          ) : (
            <div className="sc-campaign-grid">
              {campaigns.map(c => {
                const cs = campaignStats(c.id)
                return (
                  <Card key={c.id} className="sc-campaign-card" hover>
                    <div className="sc-campaign-card__head">
                      <div>
                        <h3 className="sc-campaign-card__name">{c.name}</h3>
                        <p className="sc-campaign-card__desc">{c.description}</p>
                      </div>
                      <Badge variant={c.status === 'active' ? 'success' : c.status === 'draft' ? 'default' : 'warning'}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="sc-campaign-card__meta">
                      <span>{c.steps?.length ?? 0} steps</span>
                      <span className="sc-dot" />
                      <span>{CAMPAIGN_TYPES.find(t => t.value === c.type)?.label ?? c.type}</span>
                      <span className="sc-dot" />
                      <span>{cs.enrolled} enrolled</span>
                    </div>
                    <div className="sc-campaign-card__stats">
                      <div className="sc-mini-stat"><span className="sc-mini-num">{cs.active}</span> active</div>
                      <div className="sc-mini-stat"><span className="sc-mini-num">{cs.completed}</span> done</div>
                      <div className="sc-mini-stat"><span className="sc-mini-num">{cs.stepsSent}</span> sent</div>
                    </div>
                    <div className="sc-campaign-card__actions">
                      <Button size="sm" onClick={() => setEnrollPanel(c.id)}>+ Enroll</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => duplicateCampaign(c)}>Duplicate</Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this campaign and all enrollments?')) deleteCampaign(c.id) }}>Delete</Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ SEND QUEUE TAB ═══ */}
      {mainTab === 'queue' && (
        <div className="sc-section">
          <SectionHeader title="Send Queue" subtitle="Messages due today — mark as sent after sending" />
          {dueTasks.length === 0 ? (
            <EmptyState title="Queue is clear!" description="No messages are due today. Check back tomorrow." />
          ) : (
            <div className="sc-queue-list">
              {dueTasks.map(({ enrollment, campaign, step }) => (
                <Card key={enrollment.id} className="sc-queue-card">
                  <div className="sc-queue-card__top">
                    <div className="sc-queue-card__type" data-type={step?.type}>
                      {STEP_TYPES[step?.type]?.icon ?? '?'} {STEP_TYPES[step?.type]?.label ?? step?.type}
                    </div>
                    <Badge variant={new Date(enrollment.next_send_at) < new Date() ? 'danger' : 'warning'}>
                      {new Date(enrollment.next_send_at) < new Date(new Date().setHours(0,0,0)) ? 'OVERDUE' : 'Due Today'}
                    </Badge>
                  </div>
                  <h4 className="sc-queue-card__contact">{enrollment.contact_name}</h4>
                  <p className="sc-queue-card__campaign">{campaign?.name ?? 'Unknown'} — Step {(enrollment.current_step ?? 0) + 1} of {campaign?.steps?.length ?? '?'}</p>
                  {step?.subject && <p className="sc-queue-card__subject">Subject: {step.subject}</p>}
                  <div className="sc-queue-card__preview">{step?.body?.slice(0, 200)}...</div>
                  <div className="sc-queue-card__actions">
                    {step?.type === 'email' && (
                      <Button size="sm" variant="ghost" onClick={() => openGmail(enrollment, step)}>Open in Gmail</Button>
                    )}
                    {step?.type === 'sms' && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        const phone = enrollment.contact_phone || ''
                        const firstName = (enrollment.contact_name || '').split(' ')[0]
                        const body = (step.body || '').replace(/\{first_name\}/g, firstName)
                        window.open(`sms:${phone}?body=${encodeURIComponent(body)}`, '_blank')
                      }}>Open SMS</Button>
                    )}
                    <Button size="sm" onClick={() => markStepSent(enrollment.id, enrollment.current_step)}>Mark Sent</Button>
                    <Button size="sm" variant="ghost" onClick={() => pauseEnrollment(enrollment.id)}>Pause</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ ENROLLMENTS TAB ═══ */}
      {mainTab === 'active' && (
        <div className="sc-section">
          <SectionHeader title="All Enrollments" subtitle="Track every contact across all campaigns" />
          <div className="sc-filter-row">
            {['all', 'active', 'paused', 'completed', 'stopped'].map(f => (
              <button key={f} className={`sc-filter-btn ${enrollFilter === f ? 'sc-filter-btn--active' : ''}`} onClick={() => setEnrollFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="sc-filter-count">
                  {f === 'all' ? enrollments.length : enrollments.filter(e => e.status === f).length}
                </span>
              </button>
            ))}
          </div>
          {filteredEnrollments.length === 0 ? (
            <EmptyState title="No enrollments" description="Enroll contacts into campaigns to start sequences." />
          ) : (
            <div className="sc-enrollment-list">
              {filteredEnrollments.map(e => {
                const campaign = campaigns.find(c => c.id === e.campaign_id)
                const totalSteps = campaign?.steps?.length ?? 0
                const completedSteps = e.step_history?.length ?? 0
                const pct = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
                return (
                  <div key={e.id} className="sc-enrollment-row" onClick={() => setDetailPanel(e.id)}>
                    <div className="sc-enrollment-row__left">
                      <div className="sc-enrollment-row__name">{e.contact_name}</div>
                      <div className="sc-enrollment-row__campaign">{e.campaign_name}</div>
                    </div>
                    <div className="sc-enrollment-row__progress">
                      <div className="sc-progress-bar">
                        <div className="sc-progress-bar__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="sc-enrollment-row__step-label">{completedSteps}/{totalSteps} steps</span>
                    </div>
                    <Badge variant={
                      e.status === 'active' ? 'success' :
                      e.status === 'paused' ? 'warning' :
                      e.status === 'completed' ? 'default' : 'danger'
                    }>{e.status}</Badge>
                    <div className="sc-enrollment-row__actions" onClick={ev => ev.stopPropagation()}>
                      {e.status === 'active' && <Button size="sm" variant="ghost" onClick={() => pauseEnrollment(e.id)}>Pause</Button>}
                      {e.status === 'paused' && <Button size="sm" variant="ghost" onClick={() => resumeEnrollment(e.id)}>Resume</Button>}
                      {(e.status === 'active' || e.status === 'paused') && <Button size="sm" variant="ghost" onClick={() => stopEnrollment(e.id)}>Stop</Button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {mainTab === 'history' && (
        <div className="sc-section">
          <SectionHeader title="Campaign History" subtitle="Full audit trail of every action" />
          {history.length === 0 ? (
            <EmptyState title="No history yet" description="History will appear as contacts move through campaigns." />
          ) : (
            <div className="sc-history-list">
              {history.slice(0, 100).map(h => (
                <div key={h.id} className="sc-history-row">
                  <div className="sc-history-row__icon" data-action={h.action}>
                    {h.action === 'enrolled' ? '📥' :
                     h.action === 'step_sent' ? '📤' :
                     h.action === 'paused' ? '⏸' :
                     h.action === 'resumed' ? '▶' :
                     h.action === 'stopped' ? '⏹' :
                     h.action === 'completed' ? '✅' : '📋'}
                  </div>
                  <div className="sc-history-row__content">
                    <span className="sc-history-row__name">{h.contact_name}</span>
                    <span className="sc-history-row__detail">{h.detail}</span>
                    <span className="sc-history-row__campaign">{h.campaign_name}</span>
                  </div>
                  <span className="sc-history-row__time">{fmtDateTime(h.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TEMPLATES TAB ═══ */}
      {mainTab === 'templates' && (
        <div className="sc-section">
          <SectionHeader title="Campaign Templates" subtitle="Pre-built sequences — click to customize and use" />
          <div className="sc-campaign-grid">
            {templates.map(tpl => (
              <Card key={tpl.id} className="sc-campaign-card sc-campaign-card--template" hover>
                <div className="sc-campaign-card__head">
                  <div>
                    <h3 className="sc-campaign-card__name">{tpl.name}</h3>
                    <p className="sc-campaign-card__desc">{tpl.description}</p>
                  </div>
                  <Badge>{CAMPAIGN_TYPES.find(t => t.value === tpl.type)?.label ?? tpl.type}</Badge>
                </div>
                <div className="sc-campaign-card__meta">
                  <span>{tpl.steps.length} steps</span>
                  <span className="sc-dot" />
                  <span>{tpl.steps.filter(s => s.type === 'email').length} emails</span>
                  <span className="sc-dot" />
                  <span>{tpl.steps.filter(s => s.type === 'sms').length} SMS</span>
                </div>
                <div className="sc-template-steps">
                  {tpl.steps.map((s, i) => (
                    <div key={s.id} className="sc-template-step" data-type={s.type}>
                      <span className="sc-template-step__num">{i + 1}</span>
                      <span className="sc-template-step__type">{STEP_TYPES[s.type]?.icon}</span>
                      <span className="sc-template-step__delay">{s.delay_label}</span>
                      {s.subject && <span className="sc-template-step__subject">{s.subject}</span>}
                    </div>
                  ))}
                </div>
                <Button size="sm" onClick={() => startNewFromTemplate(tpl)} style={{ marginTop: 12 }}>Use This Template</Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CAMPAIGN EDITOR PANEL ═══ */}
      <SlidePanel
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id && campaigns.find(c => c.id === editing.id) ? 'Edit Campaign' : 'New Campaign'}
        width={640}
      >
        {editing && <CampaignEditor campaign={editing} onSave={saveCampaign} onCancel={() => setEditing(null)} />}
      </SlidePanel>

      {/* ═══ ENROLL PANEL ═══ */}
      <SlidePanel
        open={!!enrollPanel}
        onClose={() => { setEnrollPanel(null); setContactSearch('') }}
        title="Enroll Contacts"
        subtitle={campaigns.find(c => c.id === enrollPanel)?.name}
        width={480}
      >
        {enrollPanel && (
          <div className="sc-enroll-panel">
            <Input
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
            />
            <div className="sc-enroll-list">
              {allContacts
                .filter(c => {
                  if (!contactSearch) return true
                  const q = contactSearch.toLowerCase()
                  return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q)
                })
                .map(c => {
                  const alreadyEnrolled = enrollments.some(e => e.campaign_id === enrollPanel && e.contact_id === c.id && e.status === 'active')
                  const pastEnrollments = enrollments.filter(e => e.contact_id === c.id)
                  return (
                    <div key={c.id} className={`sc-enroll-contact ${alreadyEnrolled ? 'sc-enroll-contact--enrolled' : ''}`}>
                      <div className="sc-enroll-contact__info">
                        <div className="sc-enroll-contact__name">{c.name}</div>
                        <div className="sc-enroll-contact__detail">{c.email} {c.phone ? `· ${c.phone}` : ''}</div>
                        {pastEnrollments.length > 0 && (
                          <div className="sc-enroll-contact__campaigns">
                            {pastEnrollments.map(e => (
                              <span key={e.id} className="sc-enroll-contact__campaign-tag" data-status={e.status}>
                                {e.campaign_name} ({e.status})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyEnrolled ? 'ghost' : 'primary'}
                        disabled={alreadyEnrolled}
                        onClick={() => enrollContact(enrollPanel, c)}
                      >
                        {alreadyEnrolled ? 'Enrolled' : 'Enroll'}
                      </Button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* ═══ ENROLLMENT DETAIL PANEL ═══ */}
      <SlidePanel
        open={!!detailPanel}
        onClose={() => setDetailPanel(null)}
        title="Enrollment Detail"
        width={520}
      >
        {detailPanel && <EnrollmentDetail
          enrollment={enrollments.find(e => e.id === detailPanel)}
          campaign={campaigns.find(c => c.id === enrollments.find(e => e.id === detailPanel)?.campaign_id)}
          history={history.filter(h => h.enrollment_id === detailPanel)}
          onPause={() => pauseEnrollment(detailPanel)}
          onResume={() => resumeEnrollment(detailPanel)}
          onStop={() => stopEnrollment(detailPanel)}
          onMarkSent={(stepIdx) => markStepSent(detailPanel, stepIdx)}
          onOpenGmail={(enrollment, step) => openGmail(enrollment, step)}
          allEnrollments={enrollments}
        />}
      </SlidePanel>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Campaign Editor Sub-Component
// ═══════════════════════════════════════════════════════════════════════════════
function CampaignEditor({ campaign, onSave, onCancel }) {
  const [form, setForm] = useState({ ...campaign })
  const [expandedStep, setExpandedStep] = useState(null)

  const updateField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const addStep = (type = 'email') => {
    const steps = [...(form.steps || [])]
    const order = steps.length + 1
    steps.push({
      id: uid(),
      order,
      type,
      delay_days: order === 1 ? 0 : 3,
      delay_label: order === 1 ? 'Immediately' : '3 days later',
      subject: type === 'email' ? '' : undefined,
      body: '',
    })
    setForm(prev => ({ ...prev, steps }))
    setExpandedStep(steps.length - 1)
  }

  const updateStep = (idx, updates) => {
    const steps = [...form.steps]
    steps[idx] = { ...steps[idx], ...updates }
    if (updates.delay_days !== undefined) {
      const opt = DELAY_OPTIONS.find(o => o.value === Number(updates.delay_days))
      steps[idx].delay_label = opt?.label ?? `${updates.delay_days} days later`
    }
    setForm(prev => ({ ...prev, steps }))
  }

  const removeStep = (idx) => {
    const steps = form.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }))
    setForm(prev => ({ ...prev, steps }))
    setExpandedStep(null)
  }

  const moveStep = (idx, dir) => {
    const steps = [...form.steps]
    const target = idx + dir
    if (target < 0 || target >= steps.length) return
    ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
    steps.forEach((s, i) => s.order = i + 1)
    setForm(prev => ({ ...prev, steps }))
    setExpandedStep(target)
  }

  return (
    <div className="sc-editor">
      <div className="sc-editor__form">
        <Input label="Campaign Name" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g., New Buyer Lead Nurture" />
        <Textarea label="Description" value={form.description || ''} onChange={e => updateField('description', e.target.value)} rows={2} placeholder="What is this campaign for?" />
        <Select label="Campaign Type" value={form.type} onChange={e => updateField('type', e.target.value)}>
          {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select label="Status" value={form.status || 'draft'} onChange={e => updateField('status', e.target.value)}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </Select>
      </div>

      <div className="sc-editor__steps-header">
        <h4>Steps ({form.steps?.length ?? 0})</h4>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" onClick={() => addStep('email')}>+ Email</Button>
          <Button size="sm" variant="ghost" onClick={() => addStep('sms')}>+ SMS</Button>
        </div>
      </div>

      <div className="sc-editor__steps">
        {(form.steps || []).map((step, idx) => (
          <div key={step.id} className={`sc-step-card ${expandedStep === idx ? 'sc-step-card--expanded' : ''}`} data-type={step.type}>
            <div className="sc-step-card__header" onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}>
              <div className="sc-step-card__num">{idx + 1}</div>
              <div className="sc-step-card__icon">{STEP_TYPES[step.type]?.icon}</div>
              <div className="sc-step-card__summary">
                <span className="sc-step-card__type-label">{STEP_TYPES[step.type]?.label}</span>
                <span className="sc-step-card__delay">{step.delay_label || `${step.delay_days}d`}</span>
                {step.subject && <span className="sc-step-card__subject-preview">{step.subject}</span>}
              </div>
              <div className="sc-step-card__controls">
                <button onClick={e => { e.stopPropagation(); moveStep(idx, -1) }} disabled={idx === 0} title="Move up">↑</button>
                <button onClick={e => { e.stopPropagation(); moveStep(idx, 1) }} disabled={idx === form.steps.length - 1} title="Move down">↓</button>
                <button onClick={e => { e.stopPropagation(); removeStep(idx) }} title="Remove">×</button>
              </div>
            </div>
            {expandedStep === idx && (
              <div className="sc-step-card__body">
                <div className="sc-step-card__row">
                  <Select label="Type" value={step.type} onChange={e => updateStep(idx, { type: e.target.value, subject: e.target.value === 'sms' ? undefined : (step.subject || '') })}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </Select>
                  <Select label="Send After" value={step.delay_days} onChange={e => updateStep(idx, { delay_days: Number(e.target.value) })}>
                    {DELAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </div>
                {step.type === 'email' && (
                  <Input label="Subject Line" value={step.subject || ''} onChange={e => updateStep(idx, { subject: e.target.value })} placeholder="e.g., Welcome! Let's get started" />
                )}
                <Textarea label={step.type === 'sms' ? 'Message' : 'Email Body'} value={step.body || ''} onChange={e => updateStep(idx, { body: e.target.value })} rows={step.type === 'sms' ? 3 : 8} placeholder={step.type === 'sms' ? 'Keep SMS under 160 characters for best delivery' : 'Write your email content here...'} />
                <div className="sc-step-card__vars">
                  <span className="sc-step-card__vars-label">Variables:</span>
                  {TEMPLATE_VARS.map(v => (
                    <button key={v} className="sc-var-tag" onClick={() => {
                      const field = step.type === 'sms' || !step.subject ? 'body' : 'body'
                      updateStep(idx, { [field]: (step[field] || '') + ` ${v}` })
                    }}>{v}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {(!form.steps || form.steps.length === 0) && (
          <div className="sc-editor__empty-steps">
            No steps yet. Add an email or SMS step to build your sequence.
          </div>
        )}
      </div>

      <div className="sc-editor__footer">
        <Button onClick={() => onSave(form)} disabled={!form.name?.trim()}>Save Campaign</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Enrollment Detail Sub-Component
// ═══════════════════════════════════════════════════════════════════════════════
function EnrollmentDetail({ enrollment, campaign, history, onPause, onResume, onStop, onMarkSent, onOpenGmail, allEnrollments }) {
  if (!enrollment) return null

  const steps = campaign?.steps ?? []
  const contactEnrollments = allEnrollments.filter(e => e.contact_id === enrollment.contact_id)

  return (
    <div className="sc-detail">
      <div className="sc-detail__header">
        <h3>{enrollment.contact_name}</h3>
        <Badge variant={
          enrollment.status === 'active' ? 'success' :
          enrollment.status === 'paused' ? 'warning' :
          enrollment.status === 'completed' ? 'default' : 'danger'
        }>{enrollment.status}</Badge>
      </div>

      <div className="sc-detail__info">
        <div><strong>Campaign:</strong> {enrollment.campaign_name}</div>
        <div><strong>Enrolled:</strong> {fmtDateTime(enrollment.enrolled_at)}</div>
        {enrollment.next_send_at && enrollment.status === 'active' && (
          <div><strong>Next send:</strong> {fmtDateTime(enrollment.next_send_at)}</div>
        )}
        {enrollment.completed_at && <div><strong>Completed:</strong> {fmtDateTime(enrollment.completed_at)}</div>}
        {enrollment.stopped_at && <div><strong>Stopped:</strong> {fmtDateTime(enrollment.stopped_at)}</div>}
      </div>

      <div className="sc-detail__actions">
        {enrollment.status === 'active' && <Button size="sm" onClick={onPause}>Pause</Button>}
        {enrollment.status === 'paused' && <Button size="sm" onClick={onResume}>Resume</Button>}
        {(enrollment.status === 'active' || enrollment.status === 'paused') && <Button size="sm" variant="ghost" onClick={onStop}>Stop</Button>}
      </div>

      <h4 className="sc-detail__section-title">Steps Progress</h4>
      <div className="sc-detail__steps">
        {steps.map((step, idx) => {
          const sent = enrollment.step_history?.find(h => h.step_index === idx)
          const isCurrent = idx === enrollment.current_step && enrollment.status === 'active'
          return (
            <div key={step.id} className={`sc-detail__step ${sent ? 'sc-detail__step--sent' : ''} ${isCurrent ? 'sc-detail__step--current' : ''}`} data-type={step.type}>
              <div className="sc-detail__step-num">{idx + 1}</div>
              <div className="sc-detail__step-info">
                <div className="sc-detail__step-type">
                  {STEP_TYPES[step.type]?.icon} {STEP_TYPES[step.type]?.label} — {step.delay_label}
                </div>
                {step.subject && <div className="sc-detail__step-subject">{step.subject}</div>}
                {sent && <div className="sc-detail__step-sent-at">Sent {fmtDateTime(sent.sent_at)}</div>}
              </div>
              <div className="sc-detail__step-actions">
                {sent ? (
                  <span className="sc-detail__check">✓</span>
                ) : isCurrent ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {step.type === 'email' && <Button size="sm" variant="ghost" onClick={() => onOpenGmail(enrollment, step)}>Gmail</Button>}
                    <Button size="sm" onClick={() => onMarkSent(idx)}>Mark Sent</Button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* All campaigns this contact has been in */}
      {contactEnrollments.length > 1 && (
        <>
          <h4 className="sc-detail__section-title">All Campaigns for {enrollment.contact_name.split(' ')[0]}</h4>
          <div className="sc-detail__all-campaigns">
            {contactEnrollments.map(e => (
              <div key={e.id} className="sc-detail__campaign-row">
                <span>{e.campaign_name}</span>
                <Badge size="sm" variant={
                  e.status === 'active' ? 'success' :
                  e.status === 'completed' ? 'default' :
                  e.status === 'paused' ? 'warning' : 'danger'
                }>{e.status}</Badge>
                <span className="sc-detail__campaign-date">{fmtDate(e.enrolled_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h4 className="sc-detail__section-title">Activity Log</h4>
      <div className="sc-detail__log">
        {history.length === 0 ? (
          <p className="sc-detail__log-empty">No activity yet</p>
        ) : (
          history.map(h => (
            <div key={h.id} className="sc-detail__log-row">
              <span className="sc-detail__log-action">{h.action}</span>
              <span className="sc-detail__log-detail">{h.detail}</span>
              <span className="sc-detail__log-time">{fmtDateTime(h.timestamp)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
