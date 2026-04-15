import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Button, Badge, SectionHeader, TabBar, SlidePanel, Input, Textarea } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import { emitExpiredApptFollowup, resolveExpiredApptFollowup } from '../../lib/notifications.js'
import INITIAL_DATA from './expiredData.js'
import './ExpiredCannonball.css'

// ─── Status Model ────────────────────────────────────────────────────────────
// A contact has exactly one status at a time:
//   new            — default, no special treatment; runs standard L1/L2/L3 letter sequence
//   cannonball     — hand-picked high-priority target; gets the premium cannonball letter
//                    sequence (different / better letters) BEFORE or instead of L1/L2/L3
//   appt_scheduled — listing appointment booked / actively converting — pushed to Sellers,
//                    kept on the expired page in its own tab so conversions can be tracked
//   relisted       — property is back on the market; archived to the Relisted tab
const STATUS_META = {
  new:            { label: 'New',                color: '#8b7a68', bg: 'rgba(139,122,104,0.12)' },
  cannonball:     { label: 'Cannonball (VIP)',   color: '#A0522D', bg: 'rgba(160,82,45,0.12)' },
  appt_scheduled: { label: 'Listing Appt Set',   color: '#228b22', bg: 'rgba(34,139,34,0.12)' },
  relisted:       { label: 'Relisted',           color: '#e67e22', bg: 'rgba(230,126,34,0.12)' },
}

// Migrate legacy `tag` values ('green'|'purple'|'relisted') onto the new `status` field.
function migrateStatus(c) {
  if (c.status) return c
  if (c.tag === 'green')    return { ...c, status: 'appt_scheduled', tag: '' }
  if (c.tag === 'purple')   return { ...c, status: 'cannonball',     tag: '' }
  if (c.tag === 'relisted') return { ...c, status: 'relisted',       tag: '' }
  return { ...c, status: 'new', tag: '' }
}

const LS_KEY = 'expired_cannonball_data'
const SCRIPTS_KEY = 'expired_cannonball_scripts'
const MLS_URL_KEY = 'expired_cannonball_mls_url'
// Flexmls search-by-MLS pattern (works once you're logged into ARMLS Flexmls in the same browser).
// Override via the "MLS Link" button if your MLS uses a different URL scheme.
const DEFAULT_MLS_URL = 'https://armls.flexmls.com/cgi-bin/mainmenu.cgi?cmd=url+search/x_search.html&srchtype=8&mlsnum={mls}'

function buildMlsUrl(mls) {
  if (!mls) return ''
  const template = localStorage.getItem(MLS_URL_KEY) || DEFAULT_MLS_URL
  return template.replace(/\{mls\}/g, encodeURIComponent(mls))
}

// ─── Canva Letter Templates ─────────────────────────────────────────────────
// Standard expired letter sequence (L1/L2/L3) goes to all new contacts.
// Cannonball letters (CB1/CB2) are the premium handwritten-style sequence sent to
// hand-picked high-priority homes — BEFORE (or instead of) the standard sequence.
// Swap these Canva URLs out as new templates are designed.
const LETTER_LINKS = {
  l1: 'https://canva.link/og51v330nxcpmw0',
  l2: 'https://canva.link/d26zrhaoynb2u25',
  l3: 'https://canva.link/45c06yt714dwau7',
  l1_6mo: 'https://canva.link/0d0kq7ekrbk7fb3',
  cb1: 'https://canva.link/og51v330nxcpmw0', // TODO: replace with cannonball letter 1 template
  cb2: 'https://canva.link/d26zrhaoynb2u25', // TODO: replace with cannonball letter 2 template
}

// ─── Cannonball Process Steps ────────────────────────────────────────────────
const CANNONBALL_STEPS = [
  { key: 'cb_cma', label: 'Pull CMA / Market Analysis for their property' },
  { key: 'cb_letter', label: 'Write personalized hand-written note' },
  { key: 'cb_plan', label: 'Print professional marketing plan' },
  { key: 'cb_assemble', label: 'Assemble package (ball + note + CMA + marketing plan + testimonials + bio)' },
  { key: 'cb_mail', label: 'Mail the Cannonball package' },
  { key: 'cb_call', label: 'Follow-up call (4 days after mail, Mon-Fri)' },
  { key: 'cb_appt', label: 'Set listing appointment' },
]

// ─── Outreach Definitions ────────────────────────────────────────────────────
const CALL_STEPS = [
  { key: 'call1', label: 'Call 1 — Initial Outreach' },
  { key: 'call2', label: 'Call 2 — Follow-Up' },
  { key: 'call3', label: 'Call 3 — Value Add' },
  { key: 'call4', label: 'Call 4 — Final Attempt' },
]
const TEXT_STEPS = [
  { key: 'text1', label: 'Text 1 — Initial' },
  { key: 'text2', label: 'Text 2 — Follow-Up' },
]
const EMAIL_STEPS = [
  { key: 'email1', label: 'Email 1 — Initial Outreach' },
  { key: 'email2', label: 'Email 2 — Follow-Up' },
]

// 6-month follow-up (only if no response & not relisted/sold)
const SIXMO_STEPS = [
  { key: 'sixmo_call', label: '6-Month Call — Re-Engage', type: 'call' },
  { key: 'sixmo_text', label: '6-Month Text — Re-Engage', type: 'text' },
  { key: 'sixmo_email', label: '6-Month Email — Re-Engage', type: 'email' },
]

// ─── Default Scripts ─────────────────────────────────────────────────────────
const DEFAULT_SCRIPTS = {
  call1: `Hi {name}, this is Dana Massey with REAL Broker. I noticed your property at {address} in {city} recently came off the market, and I wanted to reach out.

I specialize in the East Valley area and I'd love to chat about what happened with your listing and see if there's anything I can do to help.

Would you have a few minutes to talk?`,

  call2: `Hi {name}, this is Dana again with REAL Broker. I reached out a few days ago about your property at {address}.

I know the selling process can be frustrating, especially when a listing doesn't work out the first time. I've been putting together some market data for your area and I think there's a real opportunity here.

Would you be open to a quick conversation?`,

  call3: `Hi {name}, it's Dana with REAL Broker. I wanted to follow up one more time about {address}.

I actually put together a complimentary market analysis for your property — the numbers are really interesting given what's been happening in {city} lately.

I'd love to share it with you, no strings attached. When would be a good time?`,

  call4: `Hi {name}, Dana Massey here with REAL Broker. I've reached out a few times about your property at {address} and I don't want to be a pest!

I just wanted to let you know — if you ever decide to relist, I'm here to help. I'll send you my info so you have it on file.

Wishing you all the best!`,

  text1: `Hi {name}! This is Dana Massey with REAL Broker. I noticed your home at {address} recently came off the market. Would you be open to a quick chat about your options? No pressure at all.`,

  text2: `Hey {name}, just following up — I put together a free market analysis for your property at {address}. Happy to share it anytime. Just let me know!`,

  email1: `Subject: Your property at {address}

Hi {name},

I hope this finds you well. I noticed that your listing at {address} in {city} recently expired, and I wanted to reach out.

I understand how frustrating it can be when a home doesn't sell as expected. I specialize in the East Valley market and have a strong track record of getting homes sold — even ones that didn't work out the first time.

I'd love the opportunity to share what I'd do differently and put together a complimentary market analysis for your property.

Would you be open to a brief conversation?

Best regards,
Dana Massey
REAL Broker`,

  email2: `Subject: Quick update on {address}

Hi {name},

Just a quick follow-up — I've been keeping an eye on the market in {city} and there's been some interesting movement that could work in your favor.

I put together an updated market snapshot for properties like yours at {address}. I'd love to share it with you.

No pressure at all — just want to make sure you have the best information available if you decide to relist.

Let me know if you'd like to chat!

Best,
Dana Massey
REAL Broker`,

  // ── 6-Month Follow-Up Scripts ──
  sixmo_call: `Hi {name}, this is Dana Massey with REAL Broker. We connected a while back about your property at {address} in {city}.

I wanted to circle back because the market has shifted quite a bit over the last several months. I've seen some really strong activity in your neighborhood lately and I think the timing could be right if you've been thinking about relisting.

I'd love to put together a fresh market analysis for you — no obligation at all. Would you have a few minutes to chat about what's been happening in your area?`,

  sixmo_text: `Hi {name}! It's Dana Massey with REAL Broker. It's been a while since we last connected about your property at {address}. The market in {city} has changed a lot — I'd love to share an updated analysis with you if you're still thinking about selling. No pressure, just want to make sure you have the latest info!`,

  sixmo_email: `Subject: 6-month market update for {address}

Hi {name},

I hope you've been well! It's been about six months since we last connected regarding your property at {address} in {city}, and I wanted to reach out with a quick update.

The market in your area has seen some notable changes since then. I've been tracking sales in your neighborhood and put together a fresh Comparative Market Analysis that I think you'll find really interesting.

If you've been considering relisting or are just curious about where your home's value stands today, I'd be happy to walk you through it — absolutely no obligation.

Would you be open to a quick conversation?

Best regards,
Dana Massey
REAL Broker`,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcFollowUpDate(mailDateStr) {
  if (!mailDateStr) return ''
  const d = new Date(mailDateStr + 'T12:00:00')
  d.setDate(d.getDate() + 4)
  const day = d.getDay()
  if (day === 6) d.setDate(d.getDate() + 2)
  if (day === 0) d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function fmtDate(str) {
  if (!str) return ''
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtPrice(p) {
  if (p === null || p === undefined || p === '') return ''
  const n = Number(String(p).replace(/[^0-9.]/g, ''))
  if (!n || Number.isNaN(n)) return ''
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtPhone(p) {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return p
}

function isExpiredOver6Months(expDate) {
  if (!expDate) return false
  const exp = new Date(expDate + 'T12:00:00')
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  return exp < sixMonthsAgo
}

function fillScript(template, contact) {
  if (!template) return ''
  return template
    .replace(/\{name\}/g, contact.name || '')
    .replace(/\{address\}/g, contact.address || '')
    .replace(/\{city\}/g, contact.city || '')
    .replace(/\{zip\}/g, contact.zip || '')
    .replace(/\{mls\}/g, contact.mls || '')
    .replace(/\{phone\}/g, fmtPhone(contact.phone) || '')
    .replace(/\{email\}/g, contact.email || '')
}

// ─── Status Pill (table cell) ────────────────────────────────────────────────
// Click to open a dropdown menu of every status. Module-level so its internal
// open/close state survives re-renders of the parent page.
function StatusPill({ status, onSelect }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[status] || STATUS_META.new
  return (
    <div className="ec-status-pill-wrap" style={{ position: 'relative' }}>
      <button
        type="button"
        className={`ec-status-pill ec-status-pill--${status}`}
        onClick={() => setOpen(o => !o)}
        style={{ background: meta.bg, color: meta.color, borderColor: meta.color }}
        title="Click to change status"
      >
        <span className="ec-status-dot-mini" style={{ background: meta.color }} />
        {meta.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div className="ec-status-menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 11, marginTop: 4, background: '#fff', border: '1px solid var(--color-border, #e5dfd7)', borderRadius: 8, boxShadow: '0 4px 16px rgba(52,41,34,0.12)', padding: 4, minWidth: 170 }}>
            {Object.entries(STATUS_META).map(([key, m]) => (
              <button
                key={key}
                type="button"
                className="ec-status-menu-item"
                onClick={() => { setOpen(false); onSelect(key) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px',
                  background: status === key ? m.bg : 'transparent', color: m.color,
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                {m.label}
                {status === key && <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Load / Save ─────────────────────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved.length) return saved.map(migrateStatus)
    }
  } catch {}
  return INITIAL_DATA.map(c => migrateStatus({
    ...c,
    status: 'new',
    cbMailDate: '',
    followUpDate: '',
    followUpDone: false,
    cbSteps: {},
    outreach: {},  // { call1: { done: false, date: '' }, text1: {...}, email1: {...} }
    notes: '',
  }))
}

function saveData(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function loadScripts() {
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY)
    if (raw) return { ...DEFAULT_SCRIPTS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_SCRIPTS }
}

function saveScripts(scripts) {
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts))
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ExpiredCannonball() {
  const [contacts, setContacts] = useState(loadData)
  const [scripts, setScripts] = useState(loadScripts)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showProcess, setShowProcess] = useState(false)
  const [showScriptEditor, setShowScriptEditor] = useState(false)
  const [sortByExpired, setSortByExpired] = useState('none') // 'none' | 'newest' | 'oldest'
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [checkAllMode, setCheckAllMode] = useState(false)
  const [checkAllIndex, setCheckAllIndex] = useState(0)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelSelections, setLabelSelections] = useState({}) // { [id]: 'property' | 'mailing' | false }
  const [labelSelectAll, setLabelSelectAll] = useState(false)
  const [showStatusHelp, setShowStatusHelp] = useState(false)
  const [mlsUrlTemplate, setMlsUrlTemplate] = useState(() => localStorage.getItem(MLS_URL_KEY) || DEFAULT_MLS_URL)
  const [apptModal, setApptModal] = useState(null) // { contact } — confirmation before pushing to Sellers
  const [apptSaving, setApptSaving] = useState(false)
  const [apptError, setApptError] = useState(null)
  const [apptDateInput, setApptDateInput] = useState('') // actual appointment date (yyyy-mm-dd)

  // Won / Lost outcome modals (live on contacts already in appt_scheduled status)
  const [wonModal, setWonModal] = useState(null)   // { contact }
  const [lostModal, setLostModal] = useState(null) // { contact }
  const [outcomeSaving, setOutcomeSaving] = useState(false)
  const [outcomeError, setOutcomeError] = useState(null)
  const [wonForm, setWonForm] = useState({
    signedDate: '',
    expiresDate: '',
    listPrice: '',
    commissionRate: '',
    notes: '',
  })
  const [lostReason, setLostReason] = useState('')

  // Filters on top of the tab filters: outcome (for appt_scheduled tab) + date range.
  const [outcomeFilter, setOutcomeFilter] = useState('all') // all|pending|won|lost
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  // Apply a preset date range. `preset` shapes:
  //   { kind: 'days', days: 30 }  — last N days up to today
  //   { kind: 'ytd' }             — Jan 1 of current year → today
  //   { kind: 'quarter', spec: 'Q1-2025' | 'FY-2024' }
  const applyDatePreset = useCallback((preset) => {
    const fmt = (d) => d.toISOString().split('T')[0]
    const today = new Date()
    if (preset.kind === 'days') {
      const start = new Date(); start.setDate(start.getDate() - preset.days)
      setDateRange({ start: fmt(start), end: fmt(today) })
      return
    }
    if (preset.kind === 'ytd') {
      const start = new Date(today.getFullYear(), 0, 1)
      setDateRange({ start: fmt(start), end: fmt(today) })
      return
    }
    if (preset.kind === 'quarter') {
      const match = /^(Q[1-4]|FY)-(\d{4})$/.exec(preset.spec || '')
      if (!match) return
      const [, q, yearStr] = match
      const year = Number(yearStr)
      let start, end
      if (q === 'FY') {
        start = new Date(year, 0, 1)
        end   = new Date(year, 11, 31)
      } else {
        const qNum = Number(q.slice(1))          // 1..4
        const startMonth = (qNum - 1) * 3         // 0,3,6,9
        start = new Date(year, startMonth, 1)
        end   = new Date(year, startMonth + 3, 0) // last day of quarter
      }
      setDateRange({ start: fmt(start), end: fmt(end) })
    }
  }, [])

  const openApptModal = useCallback((contact) => {
    setApptDateInput(contact.apptDate || new Date().toISOString().split('T')[0])
    setApptError(null)
    setApptModal({ contact })
  }, [])

  const openWonModal = useCallback((contact) => {
    setWonForm({
      signedDate: contact.agreementSignedDate || new Date().toISOString().split('T')[0],
      expiresDate: contact.agreementExpiresDate || '',
      listPrice: contact.signedListPrice || contact.currentPrice || contact.expiredPrice || '',
      commissionRate: contact.commissionRate || '',
      notes: contact.signedNotes || '',
    })
    setOutcomeError(null)
    setWonModal({ contact })
  }, [])

  const openLostModal = useCallback((contact) => {
    setLostReason(contact.lostReason || '')
    setOutcomeError(null)
    setLostModal({ contact })
  }, [])

  const editMlsUrl = () => {
    const next = window.prompt(
      'MLS link template — use {mls} as the placeholder for the MLS number.\n\nExample:\nhttps://armls.flexmls.com/.../mlsnum={mls}',
      mlsUrlTemplate
    )
    if (next === null) return
    const trimmed = next.trim()
    if (!trimmed) {
      localStorage.removeItem(MLS_URL_KEY)
      setMlsUrlTemplate(DEFAULT_MLS_URL)
    } else {
      localStorage.setItem(MLS_URL_KEY, trimmed)
      setMlsUrlTemplate(trimmed)
    }
  }

  // Script popup state
  const [scriptPopup, setScriptPopup] = useState(null) // { contact, scriptKey, type: 'call'|'text'|'email' }

  // ─── Auto-sync all expireds into the contacts Database ─────────────────────
  // Runs once on mount. For every expired that doesn't yet have a contactId,
  // call ensureContact (which deduplicates by email → phone → name) and store
  // the resulting contact_id back on the localStorage record.
  const syncedRef = useRef(false)
  useEffect(() => {
    if (syncedRef.current) return
    syncedRef.current = true
    ;(async () => {
      let changed = false
      const updated = [...contacts]
      for (let i = 0; i < updated.length; i++) {
        const c = updated[i]
        if (c.contactId) continue // already synced
        try {
          const contactId = await DB.ensureContact({
            name: c.name || 'Expired Seller',
            email: c.email?.trim() || null,
            phone: c.phone?.trim() || null,
            type: 'lead',
            source: 'Expired Listing',
            lead_source: 'expired',
            mls_status: c.status === 'relisted' ? 'relisted' : 'expired',
            notes: c.address ? `Expired listing: ${c.address}, ${c.city || ''} ${c.zip || ''}`.trim() : null,
          })
          updated[i] = { ...c, contactId }
          changed = true
        } catch (err) {
          console.warn('Failed to sync expired to contacts:', c.name, err)
        }
      }
      if (changed) {
        saveData(updated)
        setContacts(updated)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (newData) => { setContacts(newData); saveData(newData) }

  const updateContact = useCallback((id, changes) => {
    setContacts(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...changes } : c)
      saveData(next)
      return next
    })
    setSelected(prev => prev?.id === id ? { ...prev, ...changes } : prev)
  }, [])

  const updateScript = (key, value) => {
    const next = { ...scripts, [key]: value }
    setScripts(next)
    saveScripts(next)
  }

  // ── Outreach helpers ──
  const markOutreach = useCallback((id, key) => {
    setContacts(prev => {
      const c = prev.find(x => x.id === id)
      if (!c) return prev
      const outreach = { ...c.outreach }
      const today = new Date().toISOString().split('T')[0]
      outreach[key] = outreach[key]?.done
        ? { done: false, date: '' }
        : { done: true, date: today }
      const next = prev.map(x => x.id === id ? { ...x, outreach } : x)
      saveData(next)
      return next
    })
  }, [])

  const openScriptAndCall = useCallback((contact, scriptKey) => {
    setScriptPopup({ contact, scriptKey, type: 'call' })
    // Initiate the phone call
    window.location.href = `tel:${contact.phone}`
  }, [])

  const openScriptForText = useCallback((contact, scriptKey) => {
    setScriptPopup({ contact, scriptKey, type: 'text' })
  }, [])

  const openScriptForEmail = useCallback((contact, scriptKey) => {
    setScriptPopup({ contact, scriptKey, type: 'email' })
  }, [])

  // ── Mark as relisted ──
  const markRelisted = useCallback((id) => {
    let contactId = null
    setContacts(prev => {
      const next = prev.map(c => {
        if (c.id !== id) return c
        contactId = c.contactId
        return { ...c, status: 'relisted', relistedDate: new Date().toISOString().split('T')[0] }
      })
      saveData(next)
      return next
    })
    setSelected(prev => prev?.id === id ? { ...prev, status: 'relisted' } : prev)
    // Update mls_status on the linked contact in the Database
    if (contactId) {
      DB.updateContact(contactId, { mls_status: 'relisted' }).catch(err =>
        console.warn('Failed to update contact mls_status:', err))
    }
  }, [])

  // ── Check if relisted (opens Redfin search) ──
  const checkRelisted = useCallback((contact) => {
    const q = encodeURIComponent(`${contact.address} ${contact.city} AZ ${contact.zip}`)
    window.open(`https://www.redfin.com/search#query=${q}`, '_blank')
  }, [])

  // ── Check All mode helpers ──
  const nonRelistedContacts = useMemo(() => contacts.filter(c => c.status !== 'relisted'), [contacts])

  const startCheckAll = () => {
    setCheckAllMode(true)
    setCheckAllIndex(0)
  }

  const checkAllNext = () => {
    if (checkAllIndex < nonRelistedContacts.length - 1) {
      setCheckAllIndex(prev => prev + 1)
    } else {
      setCheckAllMode(false)
    }
  }

  const checkAllSkip = () => {
    checkAllNext()
  }

  const checkAllMarkRelisted = () => {
    const c = nonRelistedContacts[checkAllIndex]
    if (c) markRelisted(c.id)
    checkAllNext()
  }

  // ── CSV Upload ──
  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target.result)
    reader.readAsText(file)
  }

  const parseCsvAndImport = () => {
    if (!csvText.trim()) return
    const lines = csvText.trim().split('\n')
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))
    const maxId = contacts.reduce((max, c) => Math.max(max, c.id), 0)
    const newContacts = []
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      header.forEach((h, idx) => { row[h] = vals[idx] || '' })
      newContacts.push({
        id: maxId + i,
        name: row.name || row.owner || row.contact || '',
        mls: row.mls || row.mls_number || row.mlsnumber || '',
        expDate: row.expdate || row.expired || row.expiration || row.exp_date || row.expiration_date || '',
        address: row.address || row.property || row.street || '',
        city: row.city || '',
        zip: row.zip || row.zipcode || row.zip_code || '',
        email: row.email || '',
        phone: row.phone || row.phonenumber || row.phone_number || '',
        mailAddr: row.mailaddr || row.mailing_address || row.mail_address || '',
        mailDate: row.maildate || row.mail_date || '',
        expiredPrice: row.expiredprice || row.expired_price || row.listprice || row.list_price || row.price || '',
        currentPrice: row.currentprice || row.current_price || row.relistprice || row.relist_price || row.newprice || '',
        l1: false, l2: false, l3: false, cb: false, appt: false,
        tag: '',
        cbMailDate: '',
        followUpDate: '',
        followUpDone: false,
        cbSteps: {},
        outreach: {},
        notes: '',
      })
    }
    if (newContacts.length) {
      const merged = [...contacts, ...newContacts]
      update(merged)
      setCsvText('')
      setShowCsvUpload(false)
      // Fire-and-forget: sync new CSV imports into the contacts Database
      ;(async () => {
        let changed = false
        const synced = [...merged]
        for (let i = contacts.length; i < synced.length; i++) {
          const c = synced[i]
          if (c.contactId) continue
          try {
            const contactId = await DB.ensureContact({
              name: c.name || 'Expired Seller',
              email: c.email?.trim() || null,
              phone: c.phone?.trim() || null,
              type: 'lead',
              source: 'Expired Listing',
              lead_source: 'expired',
              mls_status: 'expired',
              notes: c.address ? `Expired listing: ${c.address}, ${c.city || ''} ${c.zip || ''}`.trim() : null,
            })
            synced[i] = { ...c, contactId }
            changed = true
          } catch (err) {
            console.warn('Failed to sync CSV expired to contacts:', c.name, err)
          }
        }
        if (changed) { saveData(synced); setContacts(synced) }
      })()
    }
  }

  // ── Label Printing (Avery 5160) ──
  const [labelSearch, setLabelSearch] = useState('')
  const openLabelModal = () => {
    // Start with NOTHING selected so Dana can explicitly pick all, some, or one.
    setLabelSelections({})
    setLabelSelectAll(false)
    setLabelSearch('')
    setShowLabelModal(true)
  }

  const toggleLabelContact = (id) => {
    setLabelSelections(prev => {
      const next = { ...prev }
      if (next[id]) { delete next[id] } else { next[id] = 'property' }
      return next
    })
  }

  const setLabelAddr = (id, type) => {
    setLabelSelections(prev => ({ ...prev, [id]: type }))
  }

  const toggleAllLabels = () => {
    if (labelSelectAll) {
      setLabelSelections({})
      setLabelSelectAll(false)
    } else {
      const sel = { ...labelSelections }
      labelFiltered.forEach(c => { sel[c.id] = sel[c.id] || 'property' })
      setLabelSelections(sel)
      setLabelSelectAll(true)
    }
  }

  const selectNoLabels = () => {
    setLabelSelections({})
    setLabelSelectAll(false)
  }

  const selectAllLabelsFiltered = () => {
    const sel = { ...labelSelections }
    labelFiltered.forEach(c => { sel[c.id] = sel[c.id] || 'property' })
    setLabelSelections(sel)
    setLabelSelectAll(true)
  }

  // Rows shown inside the label modal: the current tab's filtered list, narrowed further
  // by the modal's own search box. Declared lazily so the handlers above can reference it.
  const labelFiltered = useMemo(() => {
    if (!labelSearch.trim()) return filtered
    const q = labelSearch.trim().toLowerCase()
    return filtered.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.mls || '').includes(q)
    )
  }, [filtered, labelSearch])

  const printLabels = () => {
    const selected = contacts.filter(c => labelSelections[c.id])
    if (!selected.length) return

    const labels = selected.map(c => {
      const useMailAddr = labelSelections[c.id] === 'mailing' && c.mailAddr
      let addrLines
      if (useMailAddr) {
        addrLines = c.mailAddr.split(',').map(s => s.trim())
      } else {
        addrLines = [`${c.address}`, `${c.city}, AZ ${c.zip}`]
      }
      return { name: c.name, lines: addrLines }
    })

    // Avery 5160: 30 labels/sheet, 3 cols x 10 rows
    // Sheet: 8.5" x 11"  |  Label: 2.625" x 1"
    // Top margin: 0.5"  |  Left margin: 0.1875" (3/16")
    // Gutter: 0.125" between columns
    const win = window.open('', '_blank')
    if (!win) return

    const labelHtml = labels.map((l, i) => {
      const nameLine = l.name.length > 32 ? l.name.substring(0, 30) + '...' : l.name
      return `<div class="label">
        <div class="label-name">${nameLine}</div>
        ${l.lines.map(line => `<div class="label-addr">${line}</div>`).join('')}
      </div>`
    }).join('')

    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Avery 5160 Labels</title>
<style>
  @page {
    size: letter;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
  }
  .sheet {
    width: 8.5in;
    min-height: 11in;
    padding-top: 0.5in;
    padding-left: 0.1875in;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
  }
  .label {
    width: 2.625in;
    height: 1in;
    padding: 0.15in 0.2in;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    margin-right: 0.125in;
  }
  .label:nth-child(3n) {
    margin-right: 0;
  }
  .label-name {
    font-weight: 700;
    font-size: 10pt;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .label-addr {
    font-size: 9pt;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: #f5f0eb;
    border-bottom: 1px solid #ddd;
    font-family: Arial, sans-serif;
  }
  .header-bar h2 { font-size: 14px; color: #342922; }
  .header-bar span { font-size: 12px; color: #888; }
  .header-bar button {
    padding: 8px 20px;
    background: #342922;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .header-bar button:hover { background: #4a3a30; }
  @media print {
    .header-bar { display: none; }
    body { margin: 0; }
  }
</style>
</head>
<body>
<div class="header-bar">
  <div>
    <h2>Avery 5160 Labels</h2>
    <span>${labels.length} label${labels.length !== 1 ? 's' : ''} — ${Math.ceil(labels.length / 30)} sheet${Math.ceil(labels.length / 30) !== 1 ? 's' : ''}</span>
  </div>
  <button onclick="window.print()">Print Labels</button>
</div>
<div class="sheet">
${labelHtml}
</div>
</body>
</html>`)
    win.document.close()
  }

  // ── Filters ──
  const filtered = useMemo(() => {
    let list = contacts
    // Main views
    if (filter === 'all')            list = list.filter(c => c.status !== 'relisted' && c.status !== 'appt_scheduled')
    else if (filter === 'standard')  list = list.filter(c => c.status === 'new')
    else if (filter === 'cannonball') list = list.filter(c => c.status === 'cannonball')
    else if (filter === 'appt_scheduled') list = list.filter(c => c.status === 'appt_scheduled')
    else if (filter === 'relisted')  list = list.filter(c => c.status === 'relisted')
    // Sub-filters (exclude archived by default)
    else if (filter === 'letters')   list = list.filter(c => c.status !== 'relisted' && (!c.l1 || !c.l2 || !c.l3))
    else if (filter === 'followup')  list = list.filter(c => c.status !== 'relisted' && c.followUpDate && !c.followUpDone)

    // Outcome sub-filter — only meaningful on the Appt Scheduled tab.
    if (filter === 'appt_scheduled' && outcomeFilter !== 'all') {
      list = list.filter(c => (c.apptOutcome || 'pending') === outcomeFilter)
    }

    // Date range filter. The reference date depends on the current tab:
    //   appt_scheduled → filter by apptDate
    //   relisted       → filter by relistedDate
    //   everything else → filter by expDate
    if (dateRange.start || dateRange.end) {
      const startMs = dateRange.start ? new Date(dateRange.start + 'T00:00:00').getTime() : -Infinity
      const endMs = dateRange.end ? new Date(dateRange.end + 'T23:59:59').getTime() : Infinity
      const pickDate = (c) => {
        if (filter === 'appt_scheduled') return c.apptDate || c.apptScheduledDate
        if (filter === 'relisted')       return c.relistedDate
        return c.expDate
      }
      list = list.filter(c => {
        const d = pickDate(c)
        if (!d) return false
        const ms = new Date(d + 'T12:00:00').getTime()
        return ms >= startMs && ms <= endMs
      })
    }

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.mls && c.mls.includes(q))
      )
    }

    // Sort by expired date
    if (sortByExpired === 'newest') {
      list = [...list].sort((a, b) => {
        if (!a.expDate && !b.expDate) return 0
        if (!a.expDate) return 1
        if (!b.expDate) return -1
        return new Date(b.expDate) - new Date(a.expDate)
      })
    } else if (sortByExpired === 'oldest') {
      list = [...list].sort((a, b) => {
        if (!a.expDate && !b.expDate) return 0
        if (!a.expDate) return 1
        if (!b.expDate) return -1
        return new Date(a.expDate) - new Date(b.expDate)
      })
    }

    return list
  }, [contacts, filter, search, sortByExpired, outcomeFilter, dateRange])

  // ── Stats ──
  const stats = useMemo(() => {
    const total = contacts.length
    const active = contacts.filter(c => c.status !== 'relisted' && c.status !== 'appt_scheduled').length
    const allLettersDone = contacts.filter(c => c.l1 && c.l2 && c.l3).length
    const standardCount = contacts.filter(c => c.status === 'new').length
    const cannonballCount = contacts.filter(c => c.status === 'cannonball').length
    const apptScheduledCount = contacts.filter(c => c.status === 'appt_scheduled').length
    const relistedCount = contacts.filter(c => c.status === 'relisted').length
    const cbSent = contacts.filter(c => c.cb).length
    const followUpDue = contacts.filter(c => c.status !== 'relisted' && c.followUpDate && !c.followUpDone).length
    return { total, active, allLettersDone, standardCount, cannonballCount, apptScheduledCount, relistedCount, cbSent, followUpDue }
  }, [contacts])

  const openDetail = (contact) => { setSelected(contact); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setSelected(null) }

  const setStatus = useCallback((id, nextStatus) => {
    setContacts(prev => {
      const c = prev.find(x => x.id === id)
      if (!c) return prev
      const changes = { status: nextStatus }
      if (nextStatus === 'relisted' && !c.relistedDate) {
        changes.relistedDate = new Date().toISOString().split('T')[0]
      }
      if (nextStatus === 'appt_scheduled' && !c.apptScheduledDate) {
        changes.apptScheduledDate = new Date().toISOString().split('T')[0]
      }
      const next = prev.map(x => x.id === id ? { ...x, ...changes } : x)
      saveData(next)
      return next
    })
    setSelected(prev => prev?.id === id ? { ...prev, status: nextStatus } : prev)
  }, [])

  // Push an expired contact into Sellers (People) by creating the contact + property + a
  // lead-status listing row in Supabase. Called when Dana marks a contact as
  // "Listing Appt Scheduled" and confirms the prompt.
  const confirmApptScheduled = useCallback(async (contact) => {
    setApptSaving(true)
    setApptError(null)
    try {
      // 1. Ensure the property exists (match by mls_id → address, create if missing).
      const property_id = await DB.ensureProperty({
        address: contact.address || '',
        city: contact.city || '',
        zip: contact.zip || '',
        state: 'AZ',
        mls_id: contact.mls || null,
        price: contact.expiredPrice ? Number(String(contact.expiredPrice).replace(/[^0-9.]/g, '')) : null,
        expired_date: contact.expDate || null,
      })

      // 2. Create the seller contact. Note: we don't dedupe against existing contacts here —
      //    the contact_merge migration handles dupe collapse on email/phone.
      const newContact = await DB.createContact({
        name: contact.name || 'Expired Seller',
        phone: contact.phone?.trim() || null,
        email: contact.email?.trim() || null,
        type: 'seller',
        source: 'expired',
        lead_source: 'expired_listing',
        notes: contact.notes?.trim() || null,
      })

      // 3. Create the listing row with status='lead' so it lands on the Sellers page
      //    (signed/active listings live on the separate Listings page post-split).
      const priceNum = (p) => p ? Number(String(p).replace(/[^0-9.]/g, '')) || null : null
      const newListing = await DB.createListing({
        property_id,
        contact_id: newContact.id,
        type: 'expired',
        status: 'lead',
        source: 'my_expired',
        list_price: priceNum(contact.currentPrice) || priceNum(contact.expiredPrice),
        notes: `Pushed from Expired / Cannonball tracker on ${new Date().toLocaleDateString()}.\n${contact.notes?.trim() || ''}`.trim(),
      })

      // 4. Flip local status + store the back-reference.
      const today = new Date().toISOString().split('T')[0]
      const apptDate = apptDateInput || today
      setContacts(prev => {
        const next = prev.map(x => x.id === contact.id ? {
          ...x,
          status: 'appt_scheduled',
          apptOutcome: x.apptOutcome || 'pending',
          apptDate,
          apptScheduledDate: today,
          sellersListingId: newListing.id,
          sellersContactId: newContact.id,
          sellersPropertyId: property_id,
        } : x)
        saveData(next)
        return next
      })
      setSelected(prev => prev?.id === contact.id ? {
        ...prev,
        status: 'appt_scheduled',
        apptOutcome: prev.apptOutcome || 'pending',
        apptDate,
        apptScheduledDate: today,
        sellersListingId: newListing.id,
      } : prev)

      // 5. Schedule the weekly Monday follow-up reminder. Fire-and-forget — a
      //    notifications failure shouldn't block the save.
      emitExpiredApptFollowup({
        expiredId: contact.id,
        name: contact.name,
        address: contact.address,
        apptDate,
      }).catch(err => console.error('Failed to schedule follow-up reminder:', err))

      setApptModal(null)
    } catch (err) {
      console.error('Failed to push to Sellers:', err)
      setApptError(err?.message || 'Could not save to Sellers. Check the console for details.')
    } finally {
      setApptSaving(false)
    }
  }, [apptDateInput])

  // Flip status locally without pushing to Sellers (fallback if Supabase is unreachable).
  const markApptScheduledLocalOnly = useCallback((id) => {
    const today = new Date().toISOString().split('T')[0]
    const apptDate = apptDateInput || today
    let snapshot = null
    setContacts(prev => {
      const next = prev.map(x => x.id === id ? {
        ...x,
        status: 'appt_scheduled',
        apptOutcome: x.apptOutcome || 'pending',
        apptDate,
        apptScheduledDate: today,
      } : x)
      snapshot = next.find(x => x.id === id)
      saveData(next)
      return next
    })
    setSelected(prev => prev?.id === id ? { ...prev, status: 'appt_scheduled', apptOutcome: 'pending', apptDate } : prev)
    // Even without the Supabase push, still schedule the weekly reminder.
    if (snapshot) {
      emitExpiredApptFollowup({
        expiredId: snapshot.id,
        name: snapshot.name,
        address: snapshot.address,
        apptDate,
      }).catch(err => console.error('Failed to schedule follow-up reminder:', err))
    }
    setApptModal(null)
    setApptError(null)
  }, [apptDateInput])

  // ── Mark Won / Mark Lost ────────────────────────────────────────────────────
  const priceNum = (p) => p ? (Number(String(p).replace(/[^0-9.]/g, '')) || null) : null

  const confirmWon = useCallback(async (contact) => {
    setOutcomeSaving(true)
    setOutcomeError(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const signed = {
        apptOutcome: 'won',
        apptOutcomeDate: today,
        agreementSignedDate: wonForm.signedDate || today,
        agreementExpiresDate: wonForm.expiresDate || null,
        signedListPrice: wonForm.listPrice || '',
        commissionRate: wonForm.commissionRate || '',
        signedNotes: wonForm.notes || '',
      }

      // If we have a linked Supabase listing, promote it from 'lead' to
      // 'signed' and stamp the signed-agreement fields so it graduates onto
      // the signed-Listings page. `coming_soon` is reserved for the moment
      // Dana actually enters it in the MLS as Coming Soon — she bumps that
      // status manually via the inline MLS picker on the Listings page.
      if (contact.sellersListingId) {
        try {
          await DB.updateListing(contact.sellersListingId, {
            status: 'signed',
            listing_agreement_signed: true,
            agreement_signed_date: wonForm.signedDate || today,
            agreement_expires_date: wonForm.expiresDate || null,
            list_price: priceNum(wonForm.listPrice) ?? null,
            commission_rate: wonForm.commissionRate ? Number(wonForm.commissionRate) : null,
            notes: wonForm.notes?.trim() || null,
          })
        } catch (err) {
          console.error('Failed to update Supabase listing:', err)
          setOutcomeError(`Local state saved, but updating Sellers failed: ${err.message || err}`)
        }
      }

      setContacts(prev => {
        const next = prev.map(x => x.id === contact.id ? { ...x, ...signed } : x)
        saveData(next)
        return next
      })
      setSelected(prev => prev?.id === contact.id ? { ...prev, ...signed } : prev)

      // Resolve any outstanding follow-up reminder for this expired contact.
      resolveExpiredApptFollowup(contact.id).catch(err => console.error('Failed to resolve follow-up reminder:', err))

      if (!outcomeError) setWonModal(null)
    } catch (err) {
      console.error('Mark Won failed:', err)
      setOutcomeError(err?.message || 'Could not mark as Won.')
    } finally {
      setOutcomeSaving(false)
    }
  }, [wonForm, outcomeError])

  const confirmLost = useCallback(async (contact) => {
    setOutcomeSaving(true)
    setOutcomeError(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const changes = {
        apptOutcome: 'lost',
        apptOutcomeDate: today,
        lostReason: lostReason?.trim() || '',
      }
      setContacts(prev => {
        const next = prev.map(x => x.id === contact.id ? { ...x, ...changes } : x)
        saveData(next)
        return next
      })
      setSelected(prev => prev?.id === contact.id ? { ...prev, ...changes } : prev)
      resolveExpiredApptFollowup(contact.id).catch(err => console.error('Failed to resolve follow-up reminder:', err))
      setLostModal(null)
    } catch (err) {
      setOutcomeError(err?.message || 'Could not mark as Lost.')
    } finally {
      setOutcomeSaving(false)
    }
  }, [lostReason])

  // Reopen a closed outcome (clears won/lost back to pending).
  const reopenAppt = useCallback((id) => {
    setContacts(prev => {
      const next = prev.map(x => x.id === id ? {
        ...x,
        apptOutcome: 'pending',
        apptOutcomeDate: '',
        lostReason: '',
      } : x)
      saveData(next)
      return next
    })
    setSelected(prev => prev?.id === id ? { ...prev, apptOutcome: 'pending', apptOutcomeDate: '', lostReason: '' } : prev)
  }, [])


  const toggleStep = useCallback((id, key) => {
    setContacts(prev => {
      const c = prev.find(x => x.id === id)
      if (!c) return prev
      const newSteps = { ...c.cbSteps, [key]: !c.cbSteps?.[key] }
      const changes = { cbSteps: newSteps }
      if (key === 'cb_mail' && !c.cbSteps?.cb_mail) {
        const today = new Date().toISOString().split('T')[0]
        changes.cb = true
        changes.cbMailDate = today
        changes.followUpDate = calcFollowUpDate(today)
      }
      if (key === 'cb_appt' && !c.cbSteps?.cb_appt) changes.appt = true
      if (key === 'cb_call' && !c.cbSteps?.cb_call) changes.followUpDone = true
      const next = prev.map(x => x.id === id ? { ...x, ...changes } : x)
      saveData(next)
      return next
    })
  }, [])

  // ── Letter progress indicator ──
  const LetterPips = ({ c }) => (
    <div className="ec-pips">
      <span className={`ec-pip ${c.l1 ? 'ec-pip--done' : ''}`} title="Letter 1">1</span>
      <span className={`ec-pip ${c.l2 ? 'ec-pip--done' : ''}`} title="Letter 2">2</span>
      <span className={`ec-pip ${c.l3 ? 'ec-pip--done' : ''}`} title="Letter 3">3</span>
      <span className={`ec-pip ec-pip--cb ${c.cb ? 'ec-pip--done' : ''}`} title="Cannonball">CB</span>
    </div>
  )

  // ── Outreach pips for table ──
  const OutreachPips = ({ c }) => {
    const allSteps = [...CALL_STEPS, ...TEXT_STEPS, ...EMAIL_STEPS, ...SIXMO_STEPS]
    const totalDone = allSteps.filter(s => c.outreach?.[s.key]?.done).length
    if (!totalDone) return <span className="ec-muted">—</span>
    const hasSixMo = SIXMO_STEPS.some(s => c.outreach?.[s.key]?.done)
    return (
      <div className="ec-outreach-pips">
        {CALL_STEPS.map(s => (
          <span key={s.key} className={`ec-opip ec-opip--call ${c.outreach?.[s.key]?.done ? 'ec-opip--done' : ''}`} title={s.label}>C{s.key.slice(-1)}</span>
        ))}
        {TEXT_STEPS.map(s => (
          <span key={s.key} className={`ec-opip ec-opip--text ${c.outreach?.[s.key]?.done ? 'ec-opip--done' : ''}`} title={s.label}>T{s.key.slice(-1)}</span>
        ))}
        {EMAIL_STEPS.map(s => (
          <span key={s.key} className={`ec-opip ec-opip--email ${c.outreach?.[s.key]?.done ? 'ec-opip--done' : ''}`} title={s.label}>E{s.key.slice(-1)}</span>
        ))}
        {hasSixMo && <span className={`ec-opip ec-opip--sixmo ec-opip--done`} title="6-Month Follow-Up">6M</span>}
      </div>
    )
  }

  return (
    <div className="ec-page">
      <SectionHeader
        title="Expired / Cannonball Tracker"
        subtitle={`${stats.total} contacts across all mail waves`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="ghost" size="md" onClick={() => setShowProcess(!showProcess)}>
              {showProcess ? 'Hide Process' : 'Cannonball Process'}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setShowScriptEditor(!showScriptEditor)}>
              {showScriptEditor ? 'Hide Scripts' : 'Edit Scripts'}
            </Button>
            <Button variant="ghost" size="md" onClick={startCheckAll} title="Check all properties for relisting">
              Check All Relisted
            </Button>
            <Button variant="ghost" size="md" onClick={() => setShowCsvUpload(true)}>
              Upload CSV
            </Button>
            <Button variant="ghost" size="md" onClick={openLabelModal}>
              Print Labels
            </Button>
            <a href={LETTER_LINKS.l1} target="_blank" rel="noopener noreferrer" className="ec-template-link">L1</a>
            <a href={LETTER_LINKS.l2} target="_blank" rel="noopener noreferrer" className="ec-template-link">L2</a>
            <a href={LETTER_LINKS.l3} target="_blank" rel="noopener noreferrer" className="ec-template-link">L3</a>
            <a href={LETTER_LINKS.l1_6mo} target="_blank" rel="noopener noreferrer" className="ec-template-link ec-template-link--alt">L1 (6mo+)</a>
          </div>
        }
      />

      {/* ── Cannonball Process Reference ── */}
      {showProcess && (
        <div className="ec-process-card">
          <h3>The Cannonball Expired Listing Process</h3>
          <div className="ec-process-grid">
            <div className="ec-process-phase">
              <h4>Phase 1 — Letters</h4>
              <ol>
                <li><strong>Letter 1</strong> — Initial outreach letter mailed within 1 week of listing expiration.
                  <a href={LETTER_LINKS.l1} target="_blank" rel="noopener noreferrer"> Open in Canva</a>
                  {' '}| Use <a href={LETTER_LINKS.l1_6mo} target="_blank" rel="noopener noreferrer">6-month+ version</a> if expired &gt; 6 months ago.
                </li>
                <li><strong>Letter 2</strong> — Follow-up letter, ~7 days after Letter 1. Different angle / value prop.
                  <a href={LETTER_LINKS.l2} target="_blank" rel="noopener noreferrer"> Open in Canva</a>
                </li>
                <li><strong>Letter 3</strong> — Final letter with urgency / social proof / market data.
                  <a href={LETTER_LINKS.l3} target="_blank" rel="noopener noreferrer"> Open in Canva</a>
                </li>
              </ol>
            </div>
            <div className="ec-process-phase">
              <h4>Phase 2 — Cannonball Package</h4>
              <ol start="4">
                <li><strong>Pull CMA</strong> — Comparative Market Analysis for their specific property</li>
                <li><strong>Hand-written note</strong> — Personal, authentic, reference their property specifically</li>
                <li><strong>Print marketing plan</strong> — Show exactly how you will sell their home</li>
                <li><strong>Assemble the package:</strong>
                  <ul>
                    <li>Oversized padded envelope or small box</li>
                    <li>Rubber / foam "cannonball" ball</li>
                    <li>Hand-written note</li>
                    <li>CMA printout</li>
                    <li>Professional marketing plan</li>
                    <li>Recent success stories / testimonials</li>
                    <li>Your bio & branding materials</li>
                  </ul>
                </li>
                <li><strong>Mail the Cannonball package</strong></li>
              </ol>
            </div>
            <div className="ec-process-phase">
              <h4>Phase 3 — Follow-Up Outreach</h4>
              <ol start="9">
                <li><strong>4 phone calls</strong> — spaced out, scripts auto-populate when you click to call</li>
                <li><strong>2 text messages</strong> — tap to view script and send</li>
                <li><strong>2 emails</strong> — tap to view script and send</li>
                <li><strong>Set the listing appointment</strong></li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ── Script Editor ── */}
      {showScriptEditor && (
        <ScriptEditor scripts={scripts} updateScript={updateScript} onReset={() => { setScripts({ ...DEFAULT_SCRIPTS }); saveScripts({ ...DEFAULT_SCRIPTS }) }} />
      )}

      {/* ── KPI Strip ── */}
      <div className="ec-kpis">
        <div className="ec-kpi"><span className="ec-kpi__val">{stats.active}</span><span className="ec-kpi__label">Active</span></div>
        <div className="ec-kpi"><span className="ec-kpi__val">{stats.standardCount}</span><span className="ec-kpi__label">Standard</span></div>
        <div className="ec-kpi ec-kpi--purple"><span className="ec-kpi__val">{stats.cannonballCount}</span><span className="ec-kpi__label">Cannonball (VIP)</span></div>
        <div className="ec-kpi"><span className="ec-kpi__val">{stats.allLettersDone}</span><span className="ec-kpi__label">All Letters Sent</span></div>
        <div className="ec-kpi"><span className="ec-kpi__val">{stats.followUpDue}</span><span className="ec-kpi__label">Follow-Up Due</span></div>
        <div className="ec-kpi ec-kpi--success"><span className="ec-kpi__val">{stats.apptScheduledCount}</span><span className="ec-kpi__label">Appts Scheduled</span></div>
        <div className="ec-kpi ec-kpi--orange"><span className="ec-kpi__val">{stats.relistedCount}</span><span className="ec-kpi__label">Relisted</span></div>
      </div>

      {/* ── Filters ── */}
      <div className="ec-filters">
        <TabBar
          tabs={[
            { label: 'All Active', value: 'all', count: stats.active },
            { label: 'Standard Outreach', value: 'standard', count: stats.standardCount },
            { label: 'Cannonball (VIP)', value: 'cannonball', count: stats.cannonballCount },
            { label: 'Appt Scheduled', value: 'appt_scheduled', count: stats.apptScheduledCount },
            { label: 'Letters In Progress', value: 'letters', count: contacts.filter(c => c.status !== 'relisted' && (!c.l1 || !c.l2 || !c.l3)).length },
            { label: 'Follow-Up Due', value: 'followup', count: stats.followUpDue },
            { label: 'Relisted', value: 'relisted', count: stats.relistedCount },
          ]}
          active={filter}
          onChange={setFilter}
        />
        <select
          className="ec-sort-select"
          value={sortByExpired}
          onChange={e => setSortByExpired(e.target.value)}
        >
          <option value="none">Sort: Default</option>
          <option value="newest">Expired: Most Recent</option>
          <option value="oldest">Expired: Longest Ago</option>
        </select>
        <Input placeholder="Search name, address, MLS..." value={search} onChange={e => setSearch(e.target.value)} className="ec-search" />
      </div>

      {/* ── Secondary filter bar: date range + (contextual) outcome sub-filter ── */}
      <div className="ec-secondary-filters">
        <div className="ec-date-range">
          <label className="ec-date-range__label">
            {filter === 'appt_scheduled' ? 'Appt date:' : filter === 'relisted' ? 'Relisted date:' : 'Expired date:'}
          </label>
          <input
            type="date"
            className="ec-date-input"
            value={dateRange.start}
            onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
            aria-label="Start date"
          />
          <span className="ec-date-range__dash">→</span>
          <input
            type="date"
            className="ec-date-input"
            value={dateRange.end}
            onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
            aria-label="End date"
          />
          {(dateRange.start || dateRange.end) && (
            <button type="button" className="ec-date-range__clear" onClick={() => setDateRange({ start: '', end: '' })} title="Clear date range">×</button>
          )}
          {/* Quick presets */}
          <div className="ec-date-presets">
            {[
              { label: '7d',  kind: 'days', days: 7  },
              { label: '30d', kind: 'days', days: 30 },
              { label: '90d', kind: 'days', days: 90 },
              { label: 'YTD', kind: 'ytd' },
            ].map(p => (
              <button
                key={p.label}
                type="button"
                className="ec-date-preset"
                onClick={() => applyDatePreset(p)}
              >{p.label}</button>
            ))}
            {/* Quarter dropdown — current year Q1–Q4 + full previous year + previous year by quarter */}
            <select
              className="ec-date-preset ec-date-preset--select"
              value=""
              onChange={e => {
                if (!e.target.value) return
                applyDatePreset({ kind: 'quarter', spec: e.target.value })
                e.target.value = ''
              }}
            >
              <option value="">Quarter…</option>
              <optgroup label={`${new Date().getFullYear()} (this year)`}>
                <option value={`Q1-${new Date().getFullYear()}`}>Q1</option>
                <option value={`Q2-${new Date().getFullYear()}`}>Q2</option>
                <option value={`Q3-${new Date().getFullYear()}`}>Q3</option>
                <option value={`Q4-${new Date().getFullYear()}`}>Q4</option>
              </optgroup>
              <optgroup label={`${new Date().getFullYear() - 1} (last year)`}>
                <option value={`FY-${new Date().getFullYear() - 1}`}>Full year</option>
                <option value={`Q1-${new Date().getFullYear() - 1}`}>Q1</option>
                <option value={`Q2-${new Date().getFullYear() - 1}`}>Q2</option>
                <option value={`Q3-${new Date().getFullYear() - 1}`}>Q3</option>
                <option value={`Q4-${new Date().getFullYear() - 1}`}>Q4</option>
              </optgroup>
            </select>
          </div>
        </div>
        {filter === 'appt_scheduled' && (
          <div className="ec-outcome-filter">
            {[
              { key: 'all',     label: 'All',     count: contacts.filter(c => c.status === 'appt_scheduled').length },
              { key: 'pending', label: 'Pending', count: contacts.filter(c => c.status === 'appt_scheduled' && (c.apptOutcome || 'pending') === 'pending').length },
              { key: 'won',     label: 'Won',     count: contacts.filter(c => c.status === 'appt_scheduled' && c.apptOutcome === 'won').length },
              { key: 'lost',    label: 'Lost',    count: contacts.filter(c => c.status === 'appt_scheduled' && c.apptOutcome === 'lost').length },
            ].map(opt => (
              <button
                key={opt.key}
                type="button"
                className={`ec-outcome-btn ec-outcome-btn--${opt.key} ${outcomeFilter === opt.key ? 'ec-outcome-btn--active' : ''}`}
                onClick={() => setOutcomeFilter(opt.key)}
              >
                {opt.label} <span className="ec-outcome-btn__count">{opt.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="ec-table-wrap">
        <table className="ec-table">
          <thead>
            <tr>
              <th>
                Status
                <button
                  type="button"
                  className="ec-help-btn"
                  title="What do the status circles mean?"
                  onClick={e => { e.stopPropagation(); setShowStatusHelp(true) }}
                  style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: 0, verticalAlign: 'middle' }}
                >ⓘ</button>
              </th>
              <th>Name</th>
              <th>Property Address</th>
              <th>City</th>
              <th>
                MLS #
                <button
                  type="button"
                  className="ec-help-btn"
                  title="Edit MLS link URL template"
                  onClick={e => { e.stopPropagation(); editMlsUrl() }}
                  style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: 0, verticalAlign: 'middle' }}
                >⚙</button>
              </th>
              <th>Exp $</th>
              <th>List $</th>
              <th>Expired</th>
              <th>Days Ago</th>
              <th>Mail Date</th>
              <th>Letters</th>
              <th>Outreach</th>
              <th>CB</th>
              <th>Appt</th>
              <th>Relist Check</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const daysAgo = c.expDate ? Math.floor((Date.now() - new Date(c.expDate + 'T12:00:00').getTime()) / 86400000) : null
              return (
              <tr
                key={c.id}
                className={`ec-row ec-row--${c.status || 'new'}`}
                onClick={() => openDetail(c)}
              >
                <td className="ec-row__status" onClick={e => e.stopPropagation()}>
                  <StatusPill
                    status={c.status || 'new'}
                    onSelect={next => {
                      if (next === 'appt_scheduled' && c.status !== 'appt_scheduled') {
                        openApptModal(c)
                      } else {
                        setStatus(c.id, next)
                      }
                    }}
                  />
                </td>
                <td className="ec-row__name">{c.name}</td>
                <td className="ec-row__addr">{c.address}</td>
                <td>{c.city}</td>
                <td className="ec-row__mls" onClick={e => e.stopPropagation()}>
                  {c.mls
                    ? <a href={buildMlsUrl(c.mls)} target="_blank" rel="noopener noreferrer" className="ec-mls-link">{c.mls}</a>
                    : '—'}
                </td>
                <td className="ec-muted" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{fmtPrice(c.expiredPrice) || '—'}</td>
                <td className="ec-muted" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{fmtPrice(c.currentPrice) || '—'}</td>
                <td>{fmtDate(c.expDate) || '—'}</td>
                <td className="ec-muted">{daysAgo !== null ? `${daysAgo}d` : '—'}</td>
                <td>{fmtDate(c.mailDate)}</td>
                <td><LetterPips c={c} /></td>
                <td><OutreachPips c={c} /></td>
                <td>
                  {c.cb
                    ? <Badge variant="success" size="sm">Sent</Badge>
                    : c.status === 'cannonball'
                      ? <Badge variant="accent" size="sm">Queued</Badge>
                      : <span className="ec-muted">—</span>
                  }
                </td>
                <td>
                  {c.appt || c.status === 'appt_scheduled'
                    ? <Badge variant="success" size="sm">Set</Badge>
                    : <span className="ec-muted">—</span>
                  }
                </td>
                <td onClick={e => e.stopPropagation()}>
                  {c.status === 'relisted' ? (
                    <span className="ec-muted" style={{ fontSize: '0.68rem' }}>{fmtDate(c.relistedDate)}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="ec-relist-btn" onClick={() => checkRelisted(c)} title="Search on Redfin">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </button>
                      <button className="ec-relist-btn ec-relist-btn--mark" onClick={() => markRelisted(c.id)} title="Mark as relisted">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="15" className="ec-empty">No contacts match this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Detail Panel ── */}
      <SlidePanel open={panelOpen} onClose={closePanel} title={selected?.name || ''} subtitle={selected?.address} width={560}>
        {selected && (
          <ContactDetail
            contact={selected}
            contacts={contacts}
            scripts={scripts}
            updateContact={updateContact}
            toggleStep={toggleStep}
            setStatus={setStatus}
            requestApptScheduled={() => openApptModal(selected)}
            openWonModal={() => openWonModal(selected)}
            openLostModal={() => openLostModal(selected)}
            reopenAppt={() => reopenAppt(selected.id)}
            markRelisted={markRelisted}
            checkRelisted={checkRelisted}
            markOutreach={markOutreach}
            openScriptAndCall={openScriptAndCall}
            openScriptForText={openScriptForText}
            openScriptForEmail={openScriptForEmail}
          />
        )}
      </SlidePanel>

      {/* ── Check All Relisted Modal ── */}
      {checkAllMode && nonRelistedContacts.length > 0 && (
        <div className="ec-script-overlay" onClick={() => setCheckAllMode(false)}>
          <div className="ec-script-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="ec-script-popup__header">
              <div>
                <span className="ec-script-popup__type" style={{ background: '#e67e22' }}>RELIST CHECK</span>
                <h3>{nonRelistedContacts[checkAllIndex]?.name}</h3>
                <p className="ec-script-popup__contact">
                  {nonRelistedContacts[checkAllIndex]?.address}, {nonRelistedContacts[checkAllIndex]?.city}, AZ {nonRelistedContacts[checkAllIndex]?.zip}
                  {nonRelistedContacts[checkAllIndex]?.mls && <> — MLS #{nonRelistedContacts[checkAllIndex].mls}</>}
                </p>
                <p className="ec-script-popup__contact" style={{ marginTop: 4 }}>
                  Property {checkAllIndex + 1} of {nonRelistedContacts.length}
                </p>
              </div>
              <button className="ec-script-popup__close" onClick={() => setCheckAllMode(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ec-script-popup__body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: 16 }}>Has this property been relisted?</p>
              <Button variant="accent" size="md" onClick={() => checkRelisted(nonRelistedContacts[checkAllIndex])} style={{ marginBottom: 8 }}>
                Search on Redfin
              </Button>
            </div>
            <div className="ec-script-popup__actions">
              <Button variant="primary" size="md" onClick={checkAllMarkRelisted}>
                Yes — Mark Relisted
              </Button>
              <Button variant="ghost" size="md" onClick={checkAllSkip}>
                No — Skip to Next
              </Button>
              <Button variant="ghost" size="md" onClick={() => setCheckAllMode(false)}>
                Stop Checking
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Upload Modal ── */}
      {showCsvUpload && (
        <div className="ec-script-overlay" onClick={() => { setShowCsvUpload(false); setCsvText('') }}>
          <div className="ec-script-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="ec-script-popup__header">
              <div>
                <h3>Upload CSV</h3>
                <p className="ec-script-popup__contact">
                  Expected columns: name, address, city, zip, mls, expDate, phone, email, mailAddr, mailDate, expiredPrice, currentPrice
                </p>
              </div>
              <button className="ec-script-popup__close" onClick={() => { setShowCsvUpload(false); setCsvText('') }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ec-script-popup__body">
              <div className="ec-csv-upload-area">
                <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ marginBottom: 12 }} />
                {csvText && (
                  <div className="ec-csv-preview">
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>PREVIEW</p>
                    <pre style={{ fontSize: '0.7rem', maxHeight: 200, overflow: 'auto', background: 'var(--cream)', padding: 10, borderRadius: 6 }}>
                      {csvText.split('\n').slice(0, 6).join('\n')}
                      {csvText.split('\n').length > 6 ? `\n... ${csvText.split('\n').length - 1} total rows` : ''}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            <div className="ec-script-popup__actions">
              <Button variant="primary" size="md" onClick={parseCsvAndImport} disabled={!csvText}>
                Import {csvText ? `(${csvText.trim().split('\n').length - 1} rows)` : ''}
              </Button>
              <Button variant="ghost" size="md" onClick={() => { setShowCsvUpload(false); setCsvText('') }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Label Printing Modal ── */}
      {showLabelModal && (() => {
        const selectedCount = Object.keys(labelSelections).length
        const sheetCount = Math.ceil(selectedCount / 30)
        return (
        <div className="ec-script-overlay" onClick={() => setShowLabelModal(false)}>
          <div className="ec-script-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="ec-script-popup__header">
              <div>
                <h3>Print Avery 5160 Labels</h3>
                <p className="ec-script-popup__contact">
                  Pick one, some, or all contacts. Each selected row prints one label. Currently filtered to <strong>{filtered.length}</strong> {filter === 'all' ? 'active' : filter.replace('_', ' ')} contact{filtered.length !== 1 ? 's' : ''}.
                </p>
              </div>
              <button className="ec-script-popup__close" onClick={() => setShowLabelModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border, #e5dfd7)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--cream, #faf7f2)' }}>
              <Input
                placeholder="Search within this view (name, address, MLS)…"
                value={labelSearch}
                onChange={e => setLabelSearch(e.target.value)}
                style={{ flex: '1 1 220px', minWidth: 0 }}
              />
              <Button variant="ghost" size="sm" onClick={selectAllLabelsFiltered}>Select All{labelSearch ? ' (shown)' : ''}</Button>
              <Button variant="ghost" size="sm" onClick={selectNoLabels} disabled={selectedCount === 0}>Clear</Button>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--brown-dark, #342922)' }}>{selectedCount}</strong> selected · {sheetCount || 0} sheet{sheetCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="ec-script-popup__body" style={{ padding: 0, overflow: 'auto', flex: 1 }}>
              {labelFiltered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  No contacts match this search.
                </div>
              ) : (
                <table className="ec-label-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input type="checkbox" checked={labelSelectAll && labelFiltered.every(c => labelSelections[c.id])} onChange={toggleAllLabels} title="Toggle all shown" />
                      </th>
                      <th>Name</th>
                      <th>Address to Print</th>
                      <th style={{ width: 120 }}>Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labelFiltered.map(c => {
                      const isSelected = !!labelSelections[c.id]
                      const addrType = labelSelections[c.id] || 'property'
                      const displayAddr = addrType === 'mailing' && c.mailAddr
                        ? c.mailAddr
                        : `${c.address}, ${c.city}, AZ ${c.zip}`
                      return (
                        <tr key={c.id} className={isSelected ? 'ec-label-row--selected' : ''} onClick={() => toggleLabelContact(c.id)} style={{ cursor: 'pointer' }}>
                          <td onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleLabelContact(c.id)} />
                          </td>
                          <td className="ec-row__name" style={{ fontSize: '0.78rem' }}>{c.name}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--brown-dark)' }}>{displayAddr}</td>
                          <td onClick={e => e.stopPropagation()}>
                            {isSelected && (
                              <select
                                className="ec-label-addr-select"
                                value={addrType}
                                onChange={e => setLabelAddr(c.id, e.target.value)}
                              >
                                <option value="property">Property</option>
                                {c.mailAddr && <option value="mailing">Mailing</option>}
                              </select>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="ec-script-popup__actions">
              <Button variant="primary" size="md" onClick={printLabels} disabled={selectedCount === 0}>
                Print {selectedCount || ''} Label{selectedCount !== 1 ? 's' : ''}
              </Button>
              <Button variant="ghost" size="md" onClick={() => setShowLabelModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ── Listing Appt Scheduled Confirmation Modal ── */}
      {apptModal && (
        <div className="ec-script-overlay" onClick={() => !apptSaving && (setApptModal(null), setApptError(null))}>
          <div className="ec-script-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="ec-script-popup__header">
              <div>
                <span className="ec-script-popup__type" style={{ background: STATUS_META.appt_scheduled.color }}>LISTING APPT</span>
                <h3>Push {apptModal.contact.name} to Sellers?</h3>
                <p className="ec-script-popup__contact">
                  {apptModal.contact.address}, {apptModal.contact.city}
                </p>
              </div>
              <button className="ec-script-popup__close" disabled={apptSaving} onClick={() => { setApptModal(null); setApptError(null) }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ec-script-popup__body" style={{ padding: '20px 24px', fontSize: '0.82rem', lineHeight: 1.55 }}>
              <p style={{ marginBottom: 12 }}>
                This will create the following in Supabase so this lead lives in <strong>People → Sellers</strong>:
              </p>
              <ul style={{ margin: '0 0 12px 18px', padding: 0, color: 'var(--brown-dark)' }}>
                <li><strong>Contact</strong> — {apptModal.contact.name} {apptModal.contact.email && <>· {apptModal.contact.email}</>} {apptModal.contact.phone && <>· {fmtPhone(apptModal.contact.phone)}</>}</li>
                <li><strong>Property</strong> — {apptModal.contact.address}, {apptModal.contact.city}, AZ {apptModal.contact.zip} {apptModal.contact.mls && <>· MLS #{apptModal.contact.mls}</>}</li>
                <li><strong>Listing</strong> — type: expired, status: lead, source: my_expired {apptModal.contact.currentPrice || apptModal.contact.expiredPrice ? <>· {fmtPrice(apptModal.contact.currentPrice || apptModal.contact.expiredPrice)}</> : null}</li>
              </ul>
              <div style={{ marginBottom: 12, padding: 10, background: 'var(--cream, #faf7f2)', borderRadius: 6 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>APPOINTMENT DATE</label>
                <input
                  type="date"
                  value={apptDateInput}
                  onChange={e => setApptDateInput(e.target.value)}
                  className="ec-date-input"
                  style={{ width: '100%' }}
                  disabled={apptSaving}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                  A weekly follow-up reminder will fire every Monday starting after this date, until you mark the outcome Won or Lost.
                </p>
              </div>
              <p style={{ marginBottom: 12, color: 'var(--color-text-muted)' }}>
                The contact stays on this page — just moves to the <em>Appt Scheduled</em> tab so you can track conversions. If the contact or property already exists in Supabase you may end up with a duplicate; the contact_merge migration will collapse dupes on email/phone.
              </p>
              {apptError && (
                <div style={{ background: 'rgba(230,126,34,0.12)', border: '1px solid rgba(230,126,34,0.4)', color: '#b45309', padding: 10, borderRadius: 6, fontSize: '0.78rem' }}>
                  <strong>Couldn't push to Sellers:</strong> {apptError}
                  <br />You can still mark it scheduled locally and add it to Sellers by hand.
                </div>
              )}
            </div>
            <div className="ec-script-popup__actions">
              <Button variant="primary" size="md" onClick={() => confirmApptScheduled(apptModal.contact)} disabled={apptSaving}>
                {apptSaving ? 'Saving…' : 'Push to Sellers & Mark Scheduled'}
              </Button>
              <Button variant="ghost" size="md" onClick={() => markApptScheduledLocalOnly(apptModal.contact.id)} disabled={apptSaving}>
                Mark Scheduled (local only)
              </Button>
              <Button variant="ghost" size="md" onClick={() => { setApptModal(null); setApptError(null) }} disabled={apptSaving}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Won Modal — captures signed agreement details ── */}
      {wonModal && (
        <div className="ec-script-overlay" onClick={() => !outcomeSaving && (setWonModal(null), setOutcomeError(null))}>
          <div className="ec-script-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="ec-script-popup__header">
              <div>
                <span className="ec-script-popup__type" style={{ background: '#1f6b1f' }}>WON — SIGNED</span>
                <h3>Mark {wonModal.contact.name} as Won</h3>
                <p className="ec-script-popup__contact">
                  {wonModal.contact.address}, {wonModal.contact.city}
                </p>
              </div>
              <button className="ec-script-popup__close" disabled={outcomeSaving} onClick={() => { setWonModal(null); setOutcomeError(null) }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ec-script-popup__body" style={{ padding: '20px 24px', fontSize: '0.82rem' }}>
              <p style={{ marginBottom: 12, color: 'var(--color-text-muted)' }}>
                Enter the signed listing agreement details. This promotes the linked Sellers listing from <em>lead</em> to <em>signed</em> and stamps the agreement on it so it graduates to the Listings page. Bump it to <em>coming_soon</em> or <em>active</em> from the Listings page once you actually enter it in the MLS.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 3 }}>SIGNED DATE</span>
                  <input type="date" className="ec-date-input" value={wonForm.signedDate} onChange={e => setWonForm(f => ({ ...f, signedDate: e.target.value }))} disabled={outcomeSaving} style={{ width: '100%' }} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 3 }}>AGREEMENT EXPIRES</span>
                  <input type="date" className="ec-date-input" value={wonForm.expiresDate} onChange={e => setWonForm(f => ({ ...f, expiresDate: e.target.value }))} disabled={outcomeSaving} style={{ width: '100%' }} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 3 }}>LIST PRICE</span>
                  <Input type="text" inputMode="numeric" placeholder="$" value={wonForm.listPrice} onChange={e => setWonForm(f => ({ ...f, listPrice: e.target.value }))} disabled={outcomeSaving} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 3 }}>COMMISSION %</span>
                  <Input type="text" inputMode="decimal" placeholder="e.g. 2.5" value={wonForm.commissionRate} onChange={e => setWonForm(f => ({ ...f, commissionRate: e.target.value }))} disabled={outcomeSaving} />
                </label>
              </div>
              <Textarea
                label="Notes"
                rows={2}
                value={wonForm.notes}
                onChange={e => setWonForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any terms, concessions, or context worth remembering…"
                disabled={outcomeSaving}
              />
              {outcomeError && (
                <div style={{ background: 'rgba(230,126,34,0.12)', border: '1px solid rgba(230,126,34,0.4)', color: '#b45309', padding: 10, borderRadius: 6, fontSize: '0.78rem', marginTop: 10 }}>
                  {outcomeError}
                </div>
              )}
            </div>
            <div className="ec-script-popup__actions">
              <Button variant="primary" size="md" onClick={() => confirmWon(wonModal.contact)} disabled={outcomeSaving || !wonForm.signedDate}>
                {outcomeSaving ? 'Saving…' : 'Mark Won & Move to Signed'}
              </Button>
              <Button variant="ghost" size="md" onClick={() => { setWonModal(null); setOutcomeError(null) }} disabled={outcomeSaving}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Lost Modal ── */}
      {lostModal && (
        <div className="ec-script-overlay" onClick={() => !outcomeSaving && (setLostModal(null), setOutcomeError(null))}>
          <div className="ec-script-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="ec-script-popup__header">
              <div>
                <span className="ec-script-popup__type" style={{ background: '#a72e2e' }}>LOST</span>
                <h3>Mark {lostModal.contact.name} as Lost</h3>
                <p className="ec-script-popup__contact">
                  {lostModal.contact.address}, {lostModal.contact.city}
                </p>
              </div>
              <button className="ec-script-popup__close" disabled={outcomeSaving} onClick={() => { setLostModal(null); setOutcomeError(null) }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ec-script-popup__body" style={{ padding: '20px 24px', fontSize: '0.82rem' }}>
              <p style={{ marginBottom: 10, color: 'var(--color-text-muted)' }}>
                Closes the follow-up reminder loop. Captures a reason for your win/loss pattern review. The contact stays on this page in the <em>Lost</em> bucket.
              </p>
              <Textarea
                label="Why did you lose it? (optional)"
                rows={3}
                value={lostReason}
                onChange={e => setLostReason(e.target.value)}
                placeholder="e.g. went with a friend/family agent, price expectations too high, decided not to sell…"
                disabled={outcomeSaving}
              />
              {outcomeError && (
                <div style={{ background: 'rgba(230,126,34,0.12)', border: '1px solid rgba(230,126,34,0.4)', color: '#b45309', padding: 10, borderRadius: 6, fontSize: '0.78rem', marginTop: 10 }}>
                  {outcomeError}
                </div>
              )}
            </div>
            <div className="ec-script-popup__actions">
              <Button variant="primary" size="md" onClick={() => confirmLost(lostModal.contact)} disabled={outcomeSaving}>
                {outcomeSaving ? 'Saving…' : 'Mark Lost'}
              </Button>
              <Button variant="ghost" size="md" onClick={() => { setLostModal(null); setOutcomeError(null) }} disabled={outcomeSaving}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Help Modal ── */}
      {showStatusHelp && (
        <div className="ec-script-overlay" onClick={() => setShowStatusHelp(false)}>
          <div className="ec-script-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="ec-script-popup__header">
              <div>
                <h3>Statuses — What They Mean</h3>
                <p className="ec-script-popup__contact">Click the status pill in the table to change it. Each contact has exactly one status.</p>
              </div>
              <button className="ec-script-popup__close" onClick={() => setShowStatusHelp(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ec-script-popup__body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: STATUS_META.new.color, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>New — Standard Outreach</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                      The default for every imported expired. Runs the normal Letter 1 → 2 → 3 mail sequence plus the regular call/text/email follow-ups. These show up in the <em>All Active</em> and <em>Standard Outreach</em> tabs.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: STATUS_META.cannonball.color, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Cannonball (VIP) — Premium Track</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Hand-picked high-priority homes you want to go hard on from day one. Unlocks a separate Cannonball Letter sequence in the detail panel (CB1, CB2, plus the physical cannonball package — CMA, handwritten note, marketing plan). These letters go out <strong>before</strong> the standard L1/L2/L3 wave. Shows up in the dedicated <em>Cannonball (VIP)</em> tab so you can manage them apart from the regular pipeline.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: STATUS_META.appt_scheduled.color, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Listing Appt Scheduled — Converted</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Set when you've booked a listing appointment. Automatically pushes a lead into <strong>People → Sellers</strong> (creates the contact + property + a lead-status listing) and moves the contact into the <em>Appt Scheduled</em> tab so you can track your conversion rate. They stay visible on the expired page — just in a separate bucket.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: STATUS_META.relisted.color, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Relisted — Archive</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                      The property is back on the market with another agent. Auto-hides from all active tabs and moves to the <em>Relisted</em> archive tab.
                    </div>
                  </div>
                </div>
                <div style={{ background: 'var(--cream)', padding: 12, borderRadius: 8, fontSize: '0.78rem', lineHeight: 1.5 }}>
                  <strong>Rule of thumb:</strong> New = "normal flow." Cannonball = "this one's worth extra effort — give them the premium treatment." Appt Scheduled = "booked — they're officially in Sellers now." Relisted = "out of reach, archive it."
                </div>
              </div>
            </div>
            <div className="ec-script-popup__actions">
              <Button variant="primary" size="md" onClick={() => setShowStatusHelp(false)}>Got it</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Script Popup Overlay ── */}
      {scriptPopup && (
        <ScriptPopup
          contact={scriptPopup.contact}
          scriptKey={scriptPopup.scriptKey}
          type={scriptPopup.type}
          script={scripts[scriptPopup.scriptKey] || ''}
          onClose={() => setScriptPopup(null)}
          onMarkDone={() => {
            markOutreach(scriptPopup.contact.id, scriptPopup.scriptKey)
            setScriptPopup(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Script Popup (overlay when calling / texting / emailing) ────────────────
function ScriptPopup({ contact, scriptKey, type, script, onClose, onMarkDone }) {
  const filled = fillScript(script, contact)
  const typeLabels = { call: 'Phone Script', text: 'Text Script', email: 'Email Script' }
  const stepLabel = [...CALL_STEPS, ...TEXT_STEPS, ...EMAIL_STEPS, ...SIXMO_STEPS].find(s => s.key === scriptKey)?.label || scriptKey

  const handleSendText = () => {
    const body = encodeURIComponent(filled)
    window.open(`sms:${contact.phone}?body=${body}`, '_self')
  }

  const handleSendEmail = () => {
    const lines = filled.split('\n')
    const subjectLine = lines[0]?.startsWith('Subject:') ? lines[0].replace('Subject:', '').trim() : `Your property at ${contact.address}`
    const bodyText = lines[0]?.startsWith('Subject:') ? lines.slice(1).join('\n').trim() : filled
    const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(bodyText)}`
    window.location.href = mailto
  }

  return (
    <div className="ec-script-overlay" onClick={onClose}>
      <div className="ec-script-popup" onClick={e => e.stopPropagation()}>
        <div className="ec-script-popup__header">
          <div>
            <span className={`ec-script-popup__type ec-script-popup__type--${type}`}>{typeLabels[type]}</span>
            <h3>{stepLabel}</h3>
            <p className="ec-script-popup__contact">
              {contact.name} — {contact.address}, {contact.city}
              {contact.phone && <> — {fmtPhone(contact.phone)}</>}
            </p>
          </div>
          <button className="ec-script-popup__close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="ec-script-popup__body">
          {filled.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00A0'}</p>
          ))}
        </div>
        <div className="ec-script-popup__actions">
          {type === 'text' && contact.phone && (
            <Button variant="accent" size="md" onClick={handleSendText}>
              Open in Messages
            </Button>
          )}
          {type === 'email' && contact.email && (
            <Button variant="accent" size="md" onClick={handleSendEmail}>
              Open in Mail
            </Button>
          )}
          <Button variant="primary" size="md" onClick={onMarkDone}>
            Mark {type === 'call' ? 'Call' : type === 'text' ? 'Text' : 'Email'} Complete
          </Button>
          <Button variant="ghost" size="md" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Contact Detail Panel ────────────────────────────────────────────────────
function ContactDetail({ contact: c, contacts, scripts, updateContact, toggleStep, setStatus, requestApptScheduled, openWonModal, openLostModal, reopenAppt, markRelisted, checkRelisted, markOutreach, openScriptAndCall, openScriptForText, openScriptForEmail }) {
  const fresh = contacts.find(x => x.id === c.id) || c

  return (
    <div className="ec-detail">
      {/* Contact Info */}
      <div className="ec-detail__section">
        <p className="ec-detail__label">Contact Info</p>
        <div className="ec-detail__info-grid">
          <div>
            <span className="ec-detail__field-label">Phone</span>
            <Input
              type="tel"
              placeholder="Add phone"
              value={fresh.phone || ''}
              onChange={e => updateContact(fresh.id, { phone: e.target.value })}
              style={{ fontSize: '0.78rem' }}
            />
          </div>
          <div>
            <span className="ec-detail__field-label">Email</span>
            <Input
              type="email"
              placeholder="Add email"
              value={fresh.email || ''}
              onChange={e => updateContact(fresh.id, { email: e.target.value })}
              style={{ fontSize: '0.78rem' }}
            />
          </div>
          <div>
            <span className="ec-detail__field-label">Property</span>
            <span className="ec-detail__field-val">{fresh.address}, {fresh.city}, AZ {fresh.zip}</span>
          </div>
          {fresh.mailAddr && (
            <div>
              <span className="ec-detail__field-label">Mailing Address</span>
              <span className="ec-detail__field-val">{fresh.mailAddr}</span>
            </div>
          )}
          {fresh.mls && (
            <div>
              <span className="ec-detail__field-label">MLS #</span>
              <span className="ec-detail__field-val">
                <a href={buildMlsUrl(fresh.mls)} target="_blank" rel="noopener noreferrer" className="ec-mls-link">{fresh.mls}</a>
              </span>
            </div>
          )}
          {fresh.expDate && (
            <div>
              <span className="ec-detail__field-label">Expired</span>
              <span className="ec-detail__field-val">
                {fmtDate(fresh.expDate)}
                {isExpiredOver6Months(fresh.expDate) && <Badge variant="warning" size="sm" style={{ marginLeft: 6 }}>6mo+</Badge>}
              </span>
            </div>
          )}
          <div>
            <span className="ec-detail__field-label">Expired List Price</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="$ at time of expiration"
              value={fresh.expiredPrice || ''}
              onChange={e => updateContact(fresh.id, { expiredPrice: e.target.value })}
              style={{ fontSize: '0.78rem' }}
            />
          </div>
          <div>
            <span className="ec-detail__field-label">Current List Price {fresh.status === 'relisted' ? '(relisted)' : '(if active)'}</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="$ current / relisted price"
              value={fresh.currentPrice || ''}
              onChange={e => updateContact(fresh.id, { currentPrice: e.target.value })}
              style={{ fontSize: '0.78rem' }}
            />
          </div>
        </div>
      </div>

      <hr className="panel-divider" />

      {/* Status */}
      <div className="ec-detail__section">
        <p className="ec-detail__label">Status</p>
        <div className="ec-detail__tag-row">
          <button
            className={`ec-detail__tag ec-detail__tag--new ${fresh.status === 'new' ? 'ec-detail__tag--active' : ''}`}
            onClick={() => setStatus(fresh.id, 'new')}
            title="Standard expired — runs the normal L1/L2/L3 letter sequence"
          >
            Standard
          </button>
          <button
            className={`ec-detail__tag ec-detail__tag--purple ${fresh.status === 'cannonball' ? 'ec-detail__tag--active' : ''}`}
            onClick={() => setStatus(fresh.id, 'cannonball')}
            title="High-priority target — gets the premium cannonball letter sequence"
          >
            Cannonball (VIP)
          </button>
          <button
            className={`ec-detail__tag ec-detail__tag--green ${fresh.status === 'appt_scheduled' ? 'ec-detail__tag--active' : ''}`}
            onClick={() => fresh.status === 'appt_scheduled' ? setStatus(fresh.id, 'new') : requestApptScheduled()}
            title="Listing appointment booked — auto-creates a lead in Sellers"
          >
            Listing Appt Scheduled
          </button>
          <button
            className={`ec-detail__tag ec-detail__tag--orange ${fresh.status === 'relisted' ? 'ec-detail__tag--active' : ''}`}
            onClick={() => fresh.status === 'relisted' ? setStatus(fresh.id, 'new') : markRelisted(fresh.id)}
          >
            Relisted
          </button>
        </div>
        {fresh.status === 'appt_scheduled' && (
          <div className="ec-appt-outcome" style={{ marginTop: 10, padding: 10, background: 'rgba(34,139,34,0.05)', border: '1px solid rgba(34,139,34,0.18)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.78rem' }}>
                <strong>Appointment</strong>
                {fresh.apptDate && <> · {fmtDate(fresh.apptDate)}</>}
                {' · '}
                <span style={{
                  display: 'inline-block', padding: '1px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                  background: fresh.apptOutcome === 'won' ? 'rgba(34,139,34,0.15)' : fresh.apptOutcome === 'lost' ? 'rgba(200,60,60,0.14)' : 'rgba(200,160,90,0.18)',
                  color: fresh.apptOutcome === 'won' ? '#1f6b1f' : fresh.apptOutcome === 'lost' ? '#a72e2e' : '#8a6b22',
                }}>
                  {fresh.apptOutcome === 'won' ? 'WON' : fresh.apptOutcome === 'lost' ? 'LOST' : 'PENDING'}
                </span>
              </div>
              {fresh.sellersListingId && (
                <a href="/sellers" className="ec-canva-link" style={{ fontSize: '0.72rem' }}>View in Sellers →</a>
              )}
            </div>
            {fresh.apptOutcome === 'won' && (
              <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Signed {fmtDate(fresh.agreementSignedDate)}
                {fresh.signedListPrice && <> · {fmtPrice(fresh.signedListPrice)}</>}
                {fresh.commissionRate && <> · {fresh.commissionRate}% commission</>}
                {fresh.agreementExpiresDate && <> · expires {fmtDate(fresh.agreementExpiresDate)}</>}
              </div>
            )}
            {fresh.apptOutcome === 'lost' && fresh.lostReason && (
              <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Lost: {fresh.lostReason}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {fresh.apptOutcome !== 'won' && (
                <Button variant="primary" size="sm" onClick={openWonModal}>
                  {fresh.apptOutcome === 'lost' ? 'Mark Won Instead' : 'Mark Won — Signed'}
                </Button>
              )}
              {fresh.apptOutcome !== 'lost' && (
                <Button variant="ghost" size="sm" onClick={openLostModal}>
                  {fresh.apptOutcome === 'won' ? 'Mark Lost Instead' : 'Mark Lost'}
                </Button>
              )}
              {(fresh.apptOutcome === 'won' || fresh.apptOutcome === 'lost') && (
                <Button variant="ghost" size="sm" onClick={reopenAppt}>Reopen</Button>
              )}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 8, marginBottom: 0 }}>
              Weekly follow-up reminders run every Monday until you mark this Won or Lost.
            </p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => checkRelisted(fresh)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: '-2px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Check on Redfin
          </Button>
        </div>
      </div>

      <hr className="panel-divider" />

      {/* Cannonball Letter Progress — only shown when status is cannonball */}
      {fresh.status === 'cannonball' && (
        <>
          <div className="ec-detail__section" style={{ background: 'rgba(160,82,45,0.06)', padding: 12, borderRadius: 8, border: '1px solid rgba(160,82,45,0.18)' }}>
            <p className="ec-detail__label" style={{ color: '#A0522D' }}>
              Cannonball Letter Sequence (VIP)
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
              Premium letters go out BEFORE the standard L1/L2/L3 wave. Mark each one as sent.
            </p>
            <div className="ec-detail__letter-row">
              <label className="ec-check-item">
                <input type="checkbox" checked={!!fresh.cbl1} onChange={() => updateContact(fresh.id, { cbl1: !fresh.cbl1, cbl1Date: !fresh.cbl1 ? new Date().toISOString().split('T')[0] : '' })} />
                <span>CB Letter 1 {fresh.cbl1Date && <span className="ec-muted" style={{ fontSize: '0.7rem' }}>· {fmtDate(fresh.cbl1Date)}</span>}</span>
                <a href={LETTER_LINKS.cb1} target="_blank" rel="noopener noreferrer" className="ec-canva-link" onClick={e => e.stopPropagation()}>Canva</a>
              </label>
              <label className="ec-check-item">
                <input type="checkbox" checked={!!fresh.cbl2} onChange={() => updateContact(fresh.id, { cbl2: !fresh.cbl2, cbl2Date: !fresh.cbl2 ? new Date().toISOString().split('T')[0] : '' })} />
                <span>CB Letter 2 {fresh.cbl2Date && <span className="ec-muted" style={{ fontSize: '0.7rem' }}>· {fmtDate(fresh.cbl2Date)}</span>}</span>
                <a href={LETTER_LINKS.cb2} target="_blank" rel="noopener noreferrer" className="ec-canva-link" onClick={e => e.stopPropagation()}>Canva</a>
              </label>
              <label className="ec-check-item">
                <input type="checkbox" checked={!!fresh.cbPackage} onChange={() => updateContact(fresh.id, { cbPackage: !fresh.cbPackage, cbPackageDate: !fresh.cbPackage ? new Date().toISOString().split('T')[0] : '' })} />
                <span>Cannonball Package (CMA + handwritten note + marketing plan) {fresh.cbPackageDate && <span className="ec-muted" style={{ fontSize: '0.7rem' }}>· {fmtDate(fresh.cbPackageDate)}</span>}</span>
              </label>
            </div>
          </div>
          <hr className="panel-divider" />
        </>
      )}

      {/* Letter Progress */}
      <div className="ec-detail__section">
        <p className="ec-detail__label">
          {fresh.status === 'cannonball' ? 'Standard Letter Sequence (fallback)' : 'Letter Progress'}
        </p>
        <div className="ec-detail__letter-row">
          <label className="ec-check-item">
            <input type="checkbox" checked={fresh.l1} onChange={() => updateContact(fresh.id, { l1: !fresh.l1 })} />
            <span>Letter 1 {isExpiredOver6Months(fresh.expDate) ? '(6mo+ version)' : ''}</span>
            <a href={isExpiredOver6Months(fresh.expDate) ? LETTER_LINKS.l1_6mo : LETTER_LINKS.l1} target="_blank" rel="noopener noreferrer" className="ec-canva-link" onClick={e => e.stopPropagation()}>Canva</a>
          </label>
          <label className="ec-check-item">
            <input type="checkbox" checked={fresh.l2} onChange={() => updateContact(fresh.id, { l2: !fresh.l2 })} />
            <span>Letter 2</span>
            <a href={LETTER_LINKS.l2} target="_blank" rel="noopener noreferrer" className="ec-canva-link" onClick={e => e.stopPropagation()}>Canva</a>
          </label>
          <label className="ec-check-item">
            <input type="checkbox" checked={fresh.l3} onChange={() => updateContact(fresh.id, { l3: !fresh.l3 })} />
            <span>Letter 3</span>
            <a href={LETTER_LINKS.l3} target="_blank" rel="noopener noreferrer" className="ec-canva-link" onClick={e => e.stopPropagation()}>Canva</a>
          </label>
        </div>
        <p className="ec-detail__mailed">Letters mailed: {fmtDate(fresh.mailDate)}</p>
      </div>

      <hr className="panel-divider" />

      {/* ── Phone Call Outreach ── */}
      <div className="ec-detail__section">
        <p className="ec-detail__label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px', marginRight: 4 }}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          Phone Calls
        </p>
        <div className="ec-outreach-list">
          {CALL_STEPS.map(step => {
            const done = fresh.outreach?.[step.key]?.done
            const date = fresh.outreach?.[step.key]?.date
            return (
              <div key={step.key} className={`ec-outreach-row ${done ? 'ec-outreach-row--done' : ''}`}>
                <input type="checkbox" checked={!!done} onChange={() => markOutreach(fresh.id, step.key)} />
                <span className="ec-outreach-row__label">{step.label}</span>
                {date && <span className="ec-outreach-row__date">{fmtDate(date)}</span>}
                {fresh.phone && (
                  <button
                    className="ec-outreach-action ec-outreach-action--call"
                    onClick={() => openScriptAndCall(fresh, step.key)}
                    title="Call with script"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    Call
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <hr className="panel-divider" />

      {/* ── Text Outreach ── */}
      <div className="ec-detail__section">
        <div className="ec-detail__label-row">
          <p className="ec-detail__label" style={{ margin: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px', marginRight: 4 }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Text Messages
          </p>
          <div className="ec-mode-toggle">
            <button
              className={`ec-mode-btn ${(fresh.textMode || 'manual') === 'manual' ? 'ec-mode-btn--active' : ''}`}
              onClick={() => updateContact(fresh.id, { textMode: 'manual' })}
            >Manual</button>
            <button
              className={`ec-mode-btn ${fresh.textMode === 'campaign' ? 'ec-mode-btn--active' : ''}`}
              onClick={() => updateContact(fresh.id, { textMode: 'campaign' })}
            >Smart Campaign</button>
          </div>
        </div>
        {fresh.textMode === 'campaign' ? (
          <div className="ec-campaign-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            <span>Texts will be sent automatically via the <strong>Expired Listing Outreach</strong> campaign. <a href="/campaigns/manage">Manage Campaigns</a></span>
          </div>
        ) : (
          <div className="ec-outreach-list">
            {TEXT_STEPS.map(step => {
              const done = fresh.outreach?.[step.key]?.done
              const date = fresh.outreach?.[step.key]?.date
              return (
                <div key={step.key} className={`ec-outreach-row ${done ? 'ec-outreach-row--done' : ''}`}>
                  <input type="checkbox" checked={!!done} onChange={() => markOutreach(fresh.id, step.key)} />
                  <span className="ec-outreach-row__label">{step.label}</span>
                  {date && <span className="ec-outreach-row__date">{fmtDate(date)}</span>}
                  {fresh.phone && (
                    <button
                      className="ec-outreach-action ec-outreach-action--text"
                      onClick={() => openScriptForText(fresh, step.key)}
                      title="Text with script"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      Text
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <hr className="panel-divider" />

      {/* ── Email Outreach ── */}
      <div className="ec-detail__section">
        <div className="ec-detail__label-row">
          <p className="ec-detail__label" style={{ margin: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px', marginRight: 4 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Emails
          </p>
          <div className="ec-mode-toggle">
            <button
              className={`ec-mode-btn ${(fresh.emailMode || 'manual') === 'manual' ? 'ec-mode-btn--active' : ''}`}
              onClick={() => updateContact(fresh.id, { emailMode: 'manual' })}
            >Manual</button>
            <button
              className={`ec-mode-btn ${fresh.emailMode === 'campaign' ? 'ec-mode-btn--active' : ''}`}
              onClick={() => updateContact(fresh.id, { emailMode: 'campaign' })}
            >Smart Campaign</button>
          </div>
        </div>
        {fresh.emailMode === 'campaign' ? (
          <div className="ec-campaign-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            <span>Emails will be sent automatically via the <strong>Expired Listing Outreach</strong> campaign. <a href="/campaigns/manage">Manage Campaigns</a></span>
          </div>
        ) : (
          <div className="ec-outreach-list">
            {EMAIL_STEPS.map(step => {
              const done = fresh.outreach?.[step.key]?.done
              const date = fresh.outreach?.[step.key]?.date
              return (
                <div key={step.key} className={`ec-outreach-row ${done ? 'ec-outreach-row--done' : ''}`}>
                  <input type="checkbox" checked={!!done} onChange={() => markOutreach(fresh.id, step.key)} />
                  <span className="ec-outreach-row__label">{step.label}</span>
                  {date && <span className="ec-outreach-row__date">{fmtDate(date)}</span>}
                  {fresh.email && (
                    <button
                      className="ec-outreach-action ec-outreach-action--email"
                      onClick={() => openScriptForEmail(fresh, step.key)}
                      title="Email with script"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      Email
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <hr className="panel-divider" />

      {/* ── 6-Month Follow-Up ── */}
      <SixMonthSection
        fresh={fresh}
        markOutreach={markOutreach}
        openScriptAndCall={openScriptAndCall}
        openScriptForText={openScriptForText}
        openScriptForEmail={openScriptForEmail}
      />

      <hr className="panel-divider" />

      {/* Cannonball Process */}
      <div className="ec-detail__section">
        <p className="ec-detail__label">Cannonball Process</p>
        <div className="ec-detail__cb-steps">
          {CANNONBALL_STEPS.map(step => {
            const done = fresh.cbSteps?.[step.key] || false
            const isCallStep = step.key === 'cb_call'
            return (
              <label key={step.key} className={`ec-check-item ${done ? 'ec-check-item--done' : ''}`}>
                <input type="checkbox" checked={done} onChange={() => toggleStep(fresh.id, step.key)} />
                <span>{step.label}</span>
                {isCallStep && fresh.followUpDate && (
                  <span className="ec-call-date">Call on: <strong>{fmtDate(fresh.followUpDate)}</strong></span>
                )}
              </label>
            )
          })}
        </div>
        {fresh.cbMailDate && (
          <p className="ec-detail__mailed">Cannonball mailed: {fmtDate(fresh.cbMailDate)} | Follow-up call: {fmtDate(fresh.followUpDate)}</p>
        )}
      </div>

      <hr className="panel-divider" />

      {/* Notes */}
      <div className="ec-detail__section">
        <Textarea
          label="Notes"
          rows={3}
          value={fresh.notes || ''}
          onChange={e => updateContact(fresh.id, { notes: e.target.value })}
          placeholder="Contact attempts, conversation notes, objections..."
        />
      </div>
    </div>
  )
}

// ─── 6-Month Follow-Up Section ───────────────────────────────────────────────
function SixMonthSection({ fresh, markOutreach, openScriptAndCall, openScriptForText, openScriptForEmail }) {
  // Calculate when the 6-month follow-up is due (6 months after mail date)
  const sixMoDueDate = useMemo(() => {
    if (!fresh.mailDate) return ''
    const d = new Date(fresh.mailDate + 'T12:00:00')
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().split('T')[0]
  }, [fresh.mailDate])

  const today = new Date().toISOString().split('T')[0]
  const isDue = sixMoDueDate && today >= sixMoDueDate
  const isRelisted = fresh.status === 'relisted'
  const hasResponded = fresh.status === 'appt_scheduled' || fresh.appt
  const isBlocked = isRelisted || hasResponded

  // Any 6mo outreach done?
  const anySixMoDone = SIXMO_STEPS.some(s => fresh.outreach?.[s.key]?.done)

  return (
    <div className="ec-detail__section">
      <p className="ec-detail__label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px', marginRight: 4 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        6-Month Follow-Up
      </p>

      {isBlocked && !anySixMoDone ? (
        <div className="ec-sixmo-blocked">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          <span>
            {isRelisted
              ? 'Skipped — property has been relisted or sold.'
              : 'Skipped — contact has responded / listing appt set.'}
          </span>
        </div>
      ) : !isDue && !anySixMoDone ? (
        <div className="ec-sixmo-pending">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>
            Follow-up due <strong>{fmtDate(sixMoDueDate)}</strong>
            {' '}— will activate if home hasn't been relisted/sold and no response by then.
          </span>
        </div>
      ) : (
        <div className="ec-outreach-list">
          {SIXMO_STEPS.map(step => {
            const done = fresh.outreach?.[step.key]?.done
            const date = fresh.outreach?.[step.key]?.date
            return (
              <div key={step.key} className={`ec-outreach-row ${done ? 'ec-outreach-row--done' : ''}`}>
                <input type="checkbox" checked={!!done} onChange={() => markOutreach(fresh.id, step.key)} />
                <span className="ec-outreach-row__label">{step.label}</span>
                {date && <span className="ec-outreach-row__date">{fmtDate(date)}</span>}
                {step.type === 'call' && fresh.phone && (
                  <button className="ec-outreach-action ec-outreach-action--call" onClick={() => openScriptAndCall(fresh, step.key)} title="Call with script">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    Call
                  </button>
                )}
                {step.type === 'text' && fresh.phone && (
                  <button className="ec-outreach-action ec-outreach-action--text" onClick={() => openScriptForText(fresh, step.key)} title="Text with script">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    Text
                  </button>
                )}
                {step.type === 'email' && fresh.email && (
                  <button className="ec-outreach-action ec-outreach-action--email" onClick={() => openScriptForEmail(fresh, step.key)} title="Email with script">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Email
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Script Editor ───────────────────────────────────────────────────────────
const SCRIPT_TABS = [
  { key: 'calls', label: 'Calls', steps: CALL_STEPS, color: 'call' },
  { key: 'texts', label: 'Texts', steps: TEXT_STEPS, color: 'text' },
  { key: 'emails', label: 'Emails', steps: EMAIL_STEPS, color: 'email' },
  { key: 'sixmo', label: '6-Month', steps: SIXMO_STEPS, color: 'sixmo' },
]

const SAMPLE_CONTACT = {
  name: 'John Smith', address: '1234 E Main St', city: 'Gilbert',
  zip: '85296', phone: '4805551234', email: 'john@example.com', mls: '6912345',
}

function ScriptEditor({ scripts, updateScript, onReset }) {
  const [activeTab, setActiveTab] = useState('calls')
  const [editingKey, setEditingKey] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const tab = SCRIPT_TABS.find(t => t.key === activeTab)

  return (
    <div className="ec-script-editor">
      <div className="ec-se-header">
        <div>
          <h3>Outreach Scripts</h3>
          <p className="ec-script-editor__hint">
            Variables: <code>{'{name}'}</code> <code>{'{address}'}</code> <code>{'{city}'}</code> <code>{'{zip}'}</code> <code>{'{phone}'}</code> <code>{'{email}'}</code>
          </p>
        </div>
        <div className="ec-se-header__actions">
          <button
            className={`ec-se-preview-btn ${showPreview ? 'ec-se-preview-btn--active' : ''}`}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Edit Mode' : 'Preview'}
          </button>
          <button className="ec-se-reset-btn" onClick={onReset}>Reset All</button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ec-se-tabs">
        {SCRIPT_TABS.map(t => (
          <button
            key={t.key}
            className={`ec-se-tab ec-se-tab--${t.color} ${activeTab === t.key ? 'ec-se-tab--active' : ''}`}
            onClick={() => { setActiveTab(t.key); setEditingKey(null) }}
          >
            {t.label}
            <span className="ec-se-tab__count">{t.steps.length}</span>
          </button>
        ))}
      </div>

      {/* Script cards */}
      <div className="ec-se-cards">
        {tab.steps.map(step => {
          const isEditing = editingKey === step.key
          const script = scripts[step.key] || ''
          const filled = fillScript(script, SAMPLE_CONTACT)

          return (
            <div key={step.key} className={`ec-se-card ${isEditing ? 'ec-se-card--editing' : ''}`}>
              <div className="ec-se-card__header" onClick={() => setEditingKey(isEditing ? null : step.key)}>
                <span className={`ec-script-editor__badge ec-script-editor__badge--${tab.color}`}>
                  {tab.key === 'sixmo' ? '6MO' : tab.label.slice(0, -1).toUpperCase()}
                </span>
                <span className="ec-se-card__title">{step.label}</span>
                <span className="ec-se-card__toggle">{isEditing ? '—' : '+'}</span>
              </div>

              {!isEditing && (
                <p className="ec-se-card__preview-line">
                  {script ? (showPreview ? filled : script).split('\n')[0].slice(0, 100) + (script.length > 100 ? '...' : '') : 'No script set — click to add one'}
                </p>
              )}

              {isEditing && (
                <div className="ec-se-card__body">
                  {showPreview ? (
                    <div className="ec-se-card__preview-full">
                      <p className="ec-se-card__preview-label">Preview (sample: John Smith, 1234 E Main St, Gilbert)</p>
                      {filled.split('\n').map((line, i) => (
                        <p key={i}>{line || '\u00A0'}</p>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="ec-script-editor__textarea"
                      rows={10}
                      value={script}
                      onChange={e => updateScript(step.key, e.target.value)}
                      placeholder={`Write your ${step.label} script here...\n\nUse {name}, {address}, {city} to auto-fill contact info.`}
                      autoFocus
                    />
                  )}
                  {!showPreview && DEFAULT_SCRIPTS[step.key] && script !== DEFAULT_SCRIPTS[step.key] && (
                    <button className="ec-se-card__reset" onClick={() => updateScript(step.key, DEFAULT_SCRIPTS[step.key])}>
                      Reset to default
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
