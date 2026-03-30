import { useState, useMemo, useCallback } from 'react'
import { Button, Badge, SectionHeader, TabBar, SlidePanel, Input, Textarea } from '../../components/ui/index.jsx'
import INITIAL_DATA from './expiredData.js'
import './ExpiredCannonball.css'

const LS_KEY = 'expired_cannonball_data'
const SCRIPTS_KEY = 'expired_cannonball_scripts'

// ─── Canva Letter Templates ─────────────────────────────────────────────────
const LETTER_LINKS = {
  l1: 'https://canva.link/og51v330nxcpmw0',
  l2: 'https://canva.link/d26zrhaoynb2u25',
  l3: 'https://canva.link/45c06yt714dwau7',
  l1_6mo: 'https://canva.link/0d0kq7ekrbk7fb3',
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
  call1: `Hi {name}, this is Dana Massey with Antigravity Real Estate. I noticed your property at {address} in {city} recently came off the market, and I wanted to reach out.

I specialize in the East Valley area and I'd love to chat about what happened with your listing and see if there's anything I can do to help.

Would you have a few minutes to talk?`,

  call2: `Hi {name}, this is Dana again with Antigravity Real Estate. I reached out a few days ago about your property at {address}.

I know the selling process can be frustrating, especially when a listing doesn't work out the first time. I've been putting together some market data for your area and I think there's a real opportunity here.

Would you be open to a quick conversation?`,

  call3: `Hi {name}, it's Dana with Antigravity Real Estate. I wanted to follow up one more time about {address}.

I actually put together a complimentary market analysis for your property — the numbers are really interesting given what's been happening in {city} lately.

I'd love to share it with you, no strings attached. When would be a good time?`,

  call4: `Hi {name}, Dana Massey here with Antigravity Real Estate. I've reached out a few times about your property at {address} and I don't want to be a pest!

I just wanted to let you know — if you ever decide to relist, I'm here to help. I'll send you my info so you have it on file.

Wishing you all the best!`,

  text1: `Hi {name}! This is Dana Massey with Antigravity Real Estate. I noticed your home at {address} recently came off the market. Would you be open to a quick chat about your options? No pressure at all.`,

  text2: `Hey {name}, just following up — I put together a free market analysis for your property at {address}. Happy to share it anytime. Just let me know!`,

  email1: `Subject: Your property at {address}

Hi {name},

I hope this finds you well. I noticed that your listing at {address} in {city} recently expired, and I wanted to reach out.

I understand how frustrating it can be when a home doesn't sell as expected. I specialize in the East Valley market and have a strong track record of getting homes sold — even ones that didn't work out the first time.

I'd love the opportunity to share what I'd do differently and put together a complimentary market analysis for your property.

Would you be open to a brief conversation?

Best regards,
Dana Massey
Antigravity Real Estate`,

  email2: `Subject: Quick update on {address}

Hi {name},

Just a quick follow-up — I've been keeping an eye on the market in {city} and there's been some interesting movement that could work in your favor.

I put together an updated market snapshot for properties like yours at {address}. I'd love to share it with you.

No pressure at all — just want to make sure you have the best information available if you decide to relist.

Let me know if you'd like to chat!

Best,
Dana Massey
Antigravity Real Estate`,

  // ── 6-Month Follow-Up Scripts ──
  sixmo_call: `Hi {name}, this is Dana Massey with Antigravity Real Estate. We connected a while back about your property at {address} in {city}.

I wanted to circle back because the market has shifted quite a bit over the last several months. I've seen some really strong activity in your neighborhood lately and I think the timing could be right if you've been thinking about relisting.

I'd love to put together a fresh market analysis for you — no obligation at all. Would you have a few minutes to chat about what's been happening in your area?`,

  sixmo_text: `Hi {name}! It's Dana Massey with Antigravity Real Estate. It's been a while since we last connected about your property at {address}. The market in {city} has changed a lot — I'd love to share an updated analysis with you if you're still thinking about selling. No pressure, just want to make sure you have the latest info!`,

  sixmo_email: `Subject: 6-month market update for {address}

Hi {name},

I hope you've been well! It's been about six months since we last connected regarding your property at {address} in {city}, and I wanted to reach out with a quick update.

The market in your area has seen some notable changes since then. I've been tracking sales in your neighborhood and put together a fresh Comparative Market Analysis that I think you'll find really interesting.

If you've been considering relisting or are just curious about where your home's value stands today, I'd be happy to walk you through it — absolutely no obligation.

Would you be open to a quick conversation?

Best regards,
Dana Massey
Antigravity Real Estate`,
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

// ─── Load / Save ─────────────────────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved.length) return saved
    }
  } catch {}
  return INITIAL_DATA.map(c => ({
    ...c,
    tag: '',
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

  // Script popup state
  const [scriptPopup, setScriptPopup] = useState(null) // { contact, scriptKey, type: 'call'|'text'|'email' }

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
    setContacts(prev => {
      const next = prev.map(c => c.id === id ? { ...c, tag: 'relisted', relistedDate: new Date().toISOString().split('T')[0] } : c)
      saveData(next)
      return next
    })
  }, [])

  // ── Check if relisted (opens Redfin search) ──
  const checkRelisted = useCallback((contact) => {
    const q = encodeURIComponent(`${contact.address} ${contact.city} AZ ${contact.zip}`)
    window.open(`https://www.redfin.com/search#query=${q}`, '_blank')
  }, [])

  // ── Check All mode helpers ──
  const nonRelistedContacts = useMemo(() => contacts.filter(c => c.tag !== 'relisted'), [contacts])

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
    }
  }

  // ── Label Printing (Avery 5160) ──
  const openLabelModal = () => {
    // Pre-select all current filtered contacts with property address
    const sel = {}
    filtered.forEach(c => { sel[c.id] = 'property' })
    setLabelSelections(sel)
    setLabelSelectAll(true)
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
      const sel = {}
      filtered.forEach(c => { sel[c.id] = labelSelections[c.id] || 'property' })
      setLabelSelections(sel)
      setLabelSelectAll(true)
    }
  }

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
    if (filter === 'green') list = list.filter(c => c.tag === 'green')
    else if (filter === 'purple') list = list.filter(c => c.tag === 'purple')
    else if (filter === 'relisted') list = list.filter(c => c.tag === 'relisted')
    else if (filter === 'letters') list = list.filter(c => !c.l1 || !c.l2 || !c.l3)
    else if (filter === 'cannonball') list = list.filter(c => c.cb || c.tag === 'purple')
    else if (filter === 'followup') list = list.filter(c => c.followUpDate && !c.followUpDone)
    else if (filter === 'appt') list = list.filter(c => c.appt)
    else if (filter === 'all') list = list.filter(c => c.tag !== 'relisted')

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
  }, [contacts, filter, search, sortByExpired])

  // ── Stats ──
  const stats = useMemo(() => {
    const total = contacts.length
    const allLettersDone = contacts.filter(c => c.l1 && c.l2 && c.l3).length
    const cbReady = contacts.filter(c => c.tag === 'purple').length
    const cbSent = contacts.filter(c => c.cb).length
    const followUpDue = contacts.filter(c => c.followUpDate && !c.followUpDone).length
    const apptSet = contacts.filter(c => c.appt).length
    const greenCount = contacts.filter(c => c.tag === 'green').length
    const relistedCount = contacts.filter(c => c.tag === 'relisted').length
    return { total, allLettersDone, cbReady, cbSent, followUpDue, apptSet, greenCount, relistedCount }
  }, [contacts])

  const openDetail = (contact) => { setSelected(contact); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setSelected(null) }

  const toggleTag = useCallback((id, tag) => {
    setContacts(prev => {
      const c = prev.find(x => x.id === id)
      if (!c) return prev
      const next = prev.map(x => x.id === id ? { ...x, tag: c.tag === tag ? '' : tag } : x)
      saveData(next)
      return next
    })
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
        <div className="ec-kpi"><span className="ec-kpi__val">{stats.total}</span><span className="ec-kpi__label">Total</span></div>
        <div className="ec-kpi"><span className="ec-kpi__val">{stats.allLettersDone}</span><span className="ec-kpi__label">All Letters Sent</span></div>
        <div className="ec-kpi ec-kpi--purple"><span className="ec-kpi__val">{stats.cbReady}</span><span className="ec-kpi__label">Cannonball Queue</span></div>
        <div className="ec-kpi"><span className="ec-kpi__val">{stats.cbSent}</span><span className="ec-kpi__label">CB Sent</span></div>
        <div className="ec-kpi"><span className="ec-kpi__val">{stats.followUpDue}</span><span className="ec-kpi__label">Follow-Up Due</span></div>
        <div className="ec-kpi ec-kpi--green"><span className="ec-kpi__val">{stats.greenCount}</span><span className="ec-kpi__label">Reached Out</span></div>
        <div className="ec-kpi ec-kpi--success"><span className="ec-kpi__val">{stats.apptSet}</span><span className="ec-kpi__label">Appts Set</span></div>
        <div className="ec-kpi ec-kpi--orange"><span className="ec-kpi__val">{stats.relistedCount}</span><span className="ec-kpi__label">Relisted</span></div>
      </div>

      {/* ── Filters ── */}
      <div className="ec-filters">
        <TabBar
          tabs={[
            { label: 'All', value: 'all', count: contacts.length },
            { label: 'Reached Out', value: 'green', count: stats.greenCount },
            { label: 'Cannonball Queue', value: 'purple', count: stats.cbReady },
            { label: 'Letters In Progress', value: 'letters', count: contacts.filter(c => !c.l1 || !c.l2 || !c.l3).length },
            { label: 'Follow-Up Due', value: 'followup', count: stats.followUpDue },
            { label: 'Appts Set', value: 'appt', count: stats.apptSet },
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

      {/* ── Table ── */}
      <div className="ec-table-wrap">
        <table className="ec-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Name</th>
              <th>Property Address</th>
              <th>City</th>
              <th>MLS #</th>
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
                className={`ec-row ${c.tag === 'green' ? 'ec-row--green' : ''} ${c.tag === 'purple' ? 'ec-row--purple' : ''} ${c.tag === 'relisted' ? 'ec-row--relisted' : ''}`}
                onClick={() => openDetail(c)}
              >
                <td className="ec-row__status" onClick={e => e.stopPropagation()}>
                  {c.tag === 'relisted' ? (
                    <button className="ec-status-pill ec-status-pill--orange" onClick={() => updateContact(c.id, { tag: '', relistedDate: '' })}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                      Relisted
                    </button>
                  ) : c.tag === 'green' ? (
                    <button className="ec-status-pill ec-status-pill--green" onClick={() => toggleTag(c.id, 'green')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Reached Out
                    </button>
                  ) : c.tag === 'purple' ? (
                    <button className="ec-status-pill ec-status-pill--purple" onClick={() => toggleTag(c.id, 'purple')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Cannonball
                    </button>
                  ) : (
                    <div className="ec-status-picker">
                      <button className="ec-status-dot ec-status-dot--green" title="Mark as Reached Out" onClick={() => toggleTag(c.id, 'green')} />
                      <button className="ec-status-dot ec-status-dot--purple" title="Add to Cannonball Queue" onClick={() => toggleTag(c.id, 'purple')} />
                    </div>
                  )}
                </td>
                <td className="ec-row__name">{c.name}</td>
                <td className="ec-row__addr">{c.address}</td>
                <td>{c.city}</td>
                <td className="ec-row__mls">{c.mls || '—'}</td>
                <td>{fmtDate(c.expDate) || '—'}</td>
                <td className="ec-muted">{daysAgo !== null ? `${daysAgo}d` : '—'}</td>
                <td>{fmtDate(c.mailDate)}</td>
                <td><LetterPips c={c} /></td>
                <td><OutreachPips c={c} /></td>
                <td>
                  {c.cb
                    ? <Badge variant="success" size="sm">Sent</Badge>
                    : c.tag === 'purple'
                      ? <Badge variant="accent" size="sm">Queued</Badge>
                      : <span className="ec-muted">—</span>
                  }
                </td>
                <td>
                  {c.appt
                    ? <Badge variant="success" size="sm">Set</Badge>
                    : <span className="ec-muted">—</span>
                  }
                </td>
                <td onClick={e => e.stopPropagation()}>
                  {c.tag === 'relisted' ? (
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
              <tr><td colSpan="13" className="ec-empty">No contacts match this filter</td></tr>
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
            toggleTag={toggleTag}
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
                  Expected columns: name, address, city, zip, mls, expDate, phone, email, mailAddr, mailDate
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
      {showLabelModal && (
        <div className="ec-script-overlay" onClick={() => setShowLabelModal(false)}>
          <div className="ec-script-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: '90vh' }}>
            <div className="ec-script-popup__header">
              <div>
                <h3>Print Avery 5160 Labels</h3>
                <p className="ec-script-popup__contact">
                  Select contacts and choose property or mailing address for each. {Object.keys(labelSelections).length} selected.
                </p>
              </div>
              <button className="ec-script-popup__close" onClick={() => setShowLabelModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ec-script-popup__body" style={{ padding: 0 }}>
              <table className="ec-label-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={labelSelectAll} onChange={toggleAllLabels} />
                    </th>
                    <th>Name</th>
                    <th>Address to Print</th>
                    <th style={{ width: 120 }}>Use</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const isSelected = !!labelSelections[c.id]
                    const addrType = labelSelections[c.id] || 'property'
                    const displayAddr = addrType === 'mailing' && c.mailAddr
                      ? c.mailAddr
                      : `${c.address}, ${c.city}, AZ ${c.zip}`
                    return (
                      <tr key={c.id} className={isSelected ? 'ec-label-row--selected' : ''}>
                        <td>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleLabelContact(c.id)} />
                        </td>
                        <td className="ec-row__name" style={{ fontSize: '0.78rem' }}>{c.name}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--brown-dark)' }}>{displayAddr}</td>
                        <td>
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
            </div>
            <div className="ec-script-popup__actions">
              <Button variant="primary" size="md" onClick={printLabels} disabled={!Object.keys(labelSelections).length}>
                Print {Object.keys(labelSelections).length} Label{Object.keys(labelSelections).length !== 1 ? 's' : ''}
              </Button>
              <Button variant="ghost" size="md" onClick={() => setShowLabelModal(false)}>Cancel</Button>
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
function ContactDetail({ contact: c, contacts, scripts, updateContact, toggleStep, toggleTag, markRelisted, checkRelisted, markOutreach, openScriptAndCall, openScriptForText, openScriptForEmail }) {
  const fresh = contacts.find(x => x.id === c.id) || c

  return (
    <div className="ec-detail">
      {/* Contact Info */}
      <div className="ec-detail__section">
        <p className="ec-detail__label">Contact Info</p>
        <div className="ec-detail__info-grid">
          <div>
            <span className="ec-detail__field-label">Phone</span>
            {fresh.phone
              ? <span className="ec-detail__field-val ec-muted" style={{ fontSize: '0.78rem' }}>{fmtPhone(fresh.phone)}</span>
              : <span className="ec-detail__field-val ec-muted">No phone</span>
            }
          </div>
          <div>
            <span className="ec-detail__field-label">Email</span>
            {fresh.email
              ? <span className="ec-detail__field-val" style={{ fontSize: '0.78rem' }}>{fresh.email}</span>
              : <span className="ec-detail__field-val ec-muted">No email</span>
            }
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
              <span className="ec-detail__field-val">{fresh.mls}</span>
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
        </div>
      </div>

      <hr className="panel-divider" />

      {/* Status Tags */}
      <div className="ec-detail__section">
        <p className="ec-detail__label">Status</p>
        <div className="ec-detail__tag-row">
          <button
            className={`ec-detail__tag ec-detail__tag--green ${fresh.tag === 'green' ? 'ec-detail__tag--active' : ''}`}
            onClick={() => toggleTag(fresh.id, 'green')}
          >
            Reached Out / Listing Appt
          </button>
          <button
            className={`ec-detail__tag ec-detail__tag--purple ${fresh.tag === 'purple' ? 'ec-detail__tag--active' : ''}`}
            onClick={() => toggleTag(fresh.id, 'purple')}
          >
            Cannonball Queue
          </button>
          <button
            className={`ec-detail__tag ec-detail__tag--orange ${fresh.tag === 'relisted' ? 'ec-detail__tag--active' : ''}`}
            onClick={() => fresh.tag === 'relisted' ? updateContact(fresh.id, { tag: '', relistedDate: '' }) : markRelisted(fresh.id)}
          >
            Relisted
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => checkRelisted(fresh)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: '-2px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Check on Redfin
          </Button>
        </div>
      </div>

      <hr className="panel-divider" />

      {/* Letter Progress */}
      <div className="ec-detail__section">
        <p className="ec-detail__label">Letter Progress</p>
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
  const isRelisted = fresh.tag === 'relisted'
  const hasResponded = fresh.tag === 'green' || fresh.appt
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
