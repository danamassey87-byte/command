import { useState, useMemo, useRef, useCallback } from 'react'
import { Button, Badge, SectionHeader, TabBar, DataTable, SlidePanel, Input, Select, Textarea } from '../../components/ui/index.jsx'
import { useProspects } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './ProspectingList.css'

// ─── Source Config ──────────────────────────────────────────────────────────
const SOURCE_META = {
  expired:    { label: 'Expired',           color: 'danger',  icon: 'clock' },
  fsbo:       { label: 'FSBO',             color: 'warning', icon: 'home' },
  circle:     { label: 'Circle',           color: 'info',    icon: 'map-pin' },
  soi:        { label: 'Personal Circle',  color: 'accent',  icon: 'heart' },
  referral:   { label: 'Referral',         color: 'success', icon: 'user' },
  open_house: { label: 'OH Lead',          color: 'default', icon: 'users' },
}

const STATUSES = ['new', 'contacted', 'nurturing', 'hot', 'converted', 'dead']

const STATUS_VARIANT = {
  new:       'default',
  contacted: 'info',
  nurturing: 'accent',
  hot:       'warning',
  converted: 'success',
  dead:      'danger',
}

// ─── Per-Source Workflow Definitions ─────────────────────────────────────────
const WORKFLOWS = {
  expired: [
    { id: 'letter1',     label: 'Letter 1 — Initial Mailer',       group: 'Mail' },
    { id: 'letter2',     label: 'Letter 2 — Follow-Up Mailer',     group: 'Mail' },
    { id: 'letter3',     label: 'Letter 3 — Final Mailer',         group: 'Mail' },
    { id: 'call1',       label: 'Call 1 — Initial Outreach',       group: 'Calls' },
    { id: 'call2',       label: 'Call 2 — Follow-Up',              group: 'Calls' },
    { id: 'call3',       label: 'Call 3 — Value Add',              group: 'Calls' },
    { id: 'call4',       label: 'Call 4 — Final Attempt',          group: 'Calls' },
    { id: 'text1',       label: 'Text 1 — Initial',                group: 'Text' },
    { id: 'text2',       label: 'Text 2 — Follow-Up',              group: 'Text' },
    { id: 'email1',      label: 'Email 1 — Initial Outreach',      group: 'Email' },
    { id: 'email2',      label: 'Email 2 — Follow-Up',             group: 'Email' },
    { id: 'cannonball',  label: 'Cannonball Package Sent',         group: 'Cannonball' },
    { id: 'cb_followup', label: 'Cannonball Follow-Up Call',       group: 'Cannonball' },
  ],
  fsbo: [
    { id: 'drive_by',    label: 'Drive-By / Locate Property',     group: 'In Person' },
    { id: 'door_knock',  label: 'Door Knock — Introduce Yourself', group: 'In Person' },
    { id: 'leave_packet',label: 'Leave Info Packet',               group: 'In Person' },
    { id: 'call1',       label: 'Call 1 — Initial Contact',        group: 'Calls' },
    { id: 'call2',       label: 'Call 2 — Share CMA',              group: 'Calls' },
    { id: 'call3',       label: 'Call 3 — Offer Help',             group: 'Calls' },
    { id: 'text1',       label: 'Text 1 — Introduction',           group: 'Text' },
    { id: 'text2',       label: 'Text 2 — Follow-Up',              group: 'Text' },
    { id: 'email1',      label: 'Email 1 — Market Data',           group: 'Email' },
    { id: 'email2',      label: 'Email 2 — Listing Presentation',  group: 'Email' },
    { id: 'cma_sent',    label: 'CMA Sent',                        group: 'Materials' },
    { id: 'appt_set',    label: 'Listing Appointment Set',         group: 'Conversion' },
  ],
  circle: [
    { id: 'identify',    label: 'Identify Target Area',            group: 'Prep' },
    { id: 'pull_list',   label: 'Pull Homeowner List',             group: 'Prep' },
    { id: 'door_knock',  label: 'Door Knock — Neighborhood',       group: 'In Person' },
    { id: 'leave_flyer', label: 'Leave Just Listed/Sold Flyer',    group: 'In Person' },
    { id: 'call1',       label: 'Call 1 — Introduce Yourself',     group: 'Calls' },
    { id: 'call2',       label: 'Call 2 — Market Update',          group: 'Calls' },
    { id: 'text1',       label: 'Text — Quick Introduction',       group: 'Text' },
    { id: 'email1',      label: 'Email — Neighborhood Activity',   group: 'Email' },
    { id: 'invite_oh',   label: 'Invite to Open House',            group: 'Engagement' },
    { id: 'add_to_farm', label: 'Add to Farm / Drip',              group: 'Conversion' },
  ],
  soi: [
    { id: 'reach_out',   label: 'Initial Reach Out — Check In',    group: 'Contact' },
    { id: 'coffee',      label: 'Coffee / Lunch / In Person',      group: 'Contact' },
    { id: 'call1',       label: 'Phone Call — Catch Up',            group: 'Calls' },
    { id: 'text1',       label: 'Text — Personal Message',          group: 'Text' },
    { id: 'social',      label: 'Engage on Social Media',           group: 'Social' },
    { id: 'birthday',    label: 'Send Birthday / Anniversary Card', group: 'Touches' },
    { id: 'pop_by',      label: 'Pop-By Gift Drop',                 group: 'Touches' },
    { id: 'newsletter',  label: 'Add to Monthly Newsletter',        group: 'Drip' },
    { id: 'ask_referral',label: 'Ask for Referral',                  group: 'Conversion' },
    { id: 'referral_received', label: 'Referral Received',           group: 'Conversion' },
  ],
  referral: [
    { id: 'thank_referrer',   label: 'Thank the Referrer',           group: 'Start' },
    { id: 'initial_contact',  label: 'Initial Contact — Introduce',  group: 'Contact' },
    { id: 'call1',            label: 'Follow-Up Call',                group: 'Calls' },
    { id: 'text1',            label: 'Text — Friendly Follow-Up',    group: 'Text' },
    { id: 'email_intro',      label: 'Email — Detailed Introduction', group: 'Email' },
    { id: 'needs_assessment',  label: 'Needs Assessment / Consult',   group: 'Qualify' },
    { id: 'send_listings',    label: 'Send Listings / CMA',          group: 'Qualify' },
    { id: 'set_appt',         label: 'Set Appointment',              group: 'Conversion' },
    { id: 'referral_gift',    label: 'Send Referral Thank-You Gift',  group: 'Close' },
  ],
  open_house: [
    { id: 'thank_text',     label: 'Thank You Text — Same Day',      group: 'Day 1' },
    { id: 'thank_email',    label: 'Thank You Email — Same Day',      group: 'Day 1' },
    { id: 'call1',          label: 'Follow-Up Call — Day 2',          group: 'Follow-Up' },
    { id: 'text_listings',  label: 'Text — Send Similar Listings',    group: 'Follow-Up' },
    { id: 'email_listings', label: 'Email — Curated Property List',   group: 'Follow-Up' },
    { id: 'call2',          label: 'Call 2 — Check Interest',         group: 'Follow-Up' },
    { id: 'add_to_drip',    label: 'Add to Drip Campaign',           group: 'Nurture' },
    { id: 'set_showing',    label: 'Set Private Showing',             group: 'Conversion' },
    { id: 'buyer_consult',  label: 'Buyer Consultation Booked',       group: 'Conversion' },
  ],
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—'
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtPhone(str) {
  if (!str) return ''
  const d = str.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return str
}

// ─── CSV Parser ─────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; continue }
      inQuotes = !inQuotes; continue
    }
    if (ch === ',' && !inQuotes) {
      lines.push(current); current = ''; continue
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      lines.push(current); current = ''
      continue
    }
    current += ch
  }
  if (current) lines.push(current)

  // Reconstruct rows from flat cells
  if (lines.length === 0) return { headers: [], rows: [] }
  // We need to re-parse properly as rows
  const rawLines = text.split(/\r?\n/).filter(l => l.trim())
  const rows = rawLines.map(line => {
    const cells = []
    let cell = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cell += '"'; i++; continue }
        q = !q; continue
      }
      if (ch === ',' && !q) { cells.push(cell.trim()); cell = ''; continue }
      cell += ch
    }
    cells.push(cell.trim())
    return cells
  })
  const headers = rows[0] || []
  return { headers, rows: rows.slice(1) }
}

// Mappable prospect fields
const CSV_FIELDS = [
  { key: '',             label: '— Skip —' },
  { key: 'name',         label: 'Name' },
  { key: 'phone',        label: 'Phone' },
  { key: 'email',        label: 'Email' },
  { key: 'address',      label: 'Address' },
  { key: 'city',         label: 'City' },
  { key: 'zip',          label: 'Zip' },
  { key: 'mls_id',       label: 'MLS #' },
  { key: 'list_price',   label: 'List Price' },
  { key: 'notes',        label: 'Notes' },
  { key: 'labels',       label: 'Labels (comma-separated)' },
]

// Auto-guess mapping from header names
function guessMapping(header) {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (/^(name|fullname|ownername|contactname|owner)$/.test(h)) return 'name'
  if (/^(phone|phonenumber|cell|mobile|tel)$/.test(h)) return 'phone'
  if (/^(email|emailaddress|mail)$/.test(h)) return 'email'
  if (/^(address|streetaddress|street|propertyaddress)$/.test(h)) return 'address'
  if (/^(city|town)$/.test(h)) return 'city'
  if (/^(zip|zipcode|postalcode|postal)$/.test(h)) return 'zip'
  if (/^(mls|mlsid|mlsnumber|mlsno)$/.test(h)) return 'mls_id'
  if (/^(price|listprice|askingprice|listingprice)$/.test(h)) return 'list_price'
  if (/^(notes|comments|description)$/.test(h)) return 'notes'
  if (/^(label|labels|tag|tags|category)$/.test(h)) return 'labels'
  return ''
}

// ─── CSV Import Modal ───────────────────────────────────────────────────────
function CsvImportModal({ open, onClose, defaultSource, onImported }) {
  const fileRef = useRef(null)
  const [step, setStep]           = useState('upload') // upload | map | preview | importing | done
  const [csvData, setCsvData]     = useState(null)
  const [mapping, setMapping]     = useState({})
  const [importSource, setImportSource] = useState(defaultSource || 'expired')
  const [importStatus, setImportStatus] = useState('new')
  const [importLabels, setImportLabels] = useState('')
  const [progress, setProgress]   = useState({ done: 0, total: 0, errors: [] })

  const reset = () => {
    setStep('upload'); setCsvData(null); setMapping({}); setImportLabels('')
    setProgress({ done: 0, total: 0, errors: [] })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result)
      if (!parsed.headers.length) return
      setCsvData(parsed)
      // Auto-guess mapping
      const auto = {}
      parsed.headers.forEach((h, i) => { auto[i] = guessMapping(h) })
      setMapping(auto)
      setStep('map')
    }
    reader.readAsText(file)
  }

  const setMap = (colIdx, field) => setMapping(p => ({ ...p, [colIdx]: field }))

  const previewRows = useMemo(() => {
    if (!csvData) return []
    return csvData.rows.slice(0, 5).map(cells => {
      const obj = {}
      Object.entries(mapping).forEach(([colIdx, field]) => {
        if (field && cells[colIdx] !== undefined) obj[field] = cells[colIdx]
      })
      return obj
    })
  }, [csvData, mapping])

  const hasNameMapping = Object.values(mapping).includes('name')

  const handleImport = async () => {
    setStep('importing')
    const rows = csvData.rows
    const total = rows.length
    setProgress({ done: 0, total, errors: [] })
    const globalLabels = importLabels.split(',').map(l => l.trim()).filter(Boolean)

    // Build rows in batches of 50
    const batchSize = 50
    const allErrors = []
    let done = 0

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map(cells => {
        const obj = { source: importSource, status: importStatus, workflow_steps: {} }
        Object.entries(mapping).forEach(([colIdx, field]) => {
          if (!field || cells[colIdx] === undefined) return
          const val = cells[colIdx]?.trim()
          if (!val) return
          if (field === 'list_price') {
            obj[field] = Number(val.replace(/[$,]/g, '')) || null
          } else if (field === 'labels') {
            const parsed = val.split(',').map(l => l.trim()).filter(Boolean)
            obj.labels = [...new Set([...globalLabels, ...parsed])]
          } else {
            obj[field] = val
          }
        })
        // Add global labels if not already set from column
        if (!obj.labels && globalLabels.length) obj.labels = globalLabels
        return obj
      }).filter(obj => obj.name) // Must have a name

      if (batch.length) {
        try {
          await DB.bulkCreateProspects(batch)
          done += batch.length
        } catch (e) {
          allErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${e.message}`)
          done += batch.length
        }
      } else {
        done += rows.slice(i, i + batchSize).length
      }
      setProgress({ done, total, errors: allErrors })
    }

    setStep('done')
    onImported()
  }

  if (!open) return null

  return (
    <div className="csv-overlay" onClick={onClose}>
      <div className="csv-modal" onClick={e => e.stopPropagation()}>
        <div className="csv-modal__header">
          <h2 className="csv-modal__title">Import CSV</h2>
          <button className="csv-modal__close" onClick={() => { reset(); onClose() }}>✕</button>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="csv-modal__body">
            <p className="csv-modal__hint">Upload a .csv file with your prospect data. You'll map columns in the next step.</p>
            <div className="csv-upload-zone" onClick={() => fileRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Click to choose a file or drag & drop</span>
              <span className="csv-upload-zone__sub">.csv files only</span>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 'map' && csvData && (
          <div className="csv-modal__body">
            <p className="csv-modal__hint">Map your CSV columns to prospect fields. We auto-detected what we could.</p>

            <div className="csv-map__settings">
              <Select label="Import as Source" value={importSource} onChange={e => setImportSource(e.target.value)}>
                {Object.entries(SOURCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
              <Select label="Default Status" value={importStatus} onChange={e => setImportStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </Select>
              <Input label="Labels (apply to all)" value={importLabels} onChange={e => setImportLabels(e.target.value)} placeholder="hot lead, MLS expired, etc." />
            </div>

            <div className="csv-map__table-wrap">
              <table className="csv-map__table">
                <thead>
                  <tr>
                    <th>CSV Column</th>
                    <th>Sample Data</th>
                    <th>Map To</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.headers.map((h, i) => (
                    <tr key={i}>
                      <td className="csv-map__col-name">{h}</td>
                      <td className="csv-map__sample">{csvData.rows[0]?.[i] || '—'}</td>
                      <td>
                        <select
                          className="csv-map__select"
                          value={mapping[i] || ''}
                          onChange={e => setMap(i, e.target.value)}
                        >
                          {CSV_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!hasNameMapping && <p className="csv-modal__warn">You must map at least one column to "Name" to import.</p>}

            <div className="csv-modal__footer">
              <Button variant="ghost" size="sm" onClick={reset}>Back</Button>
              <span className="csv-modal__count">{csvData.rows.length} rows found</span>
              <Button variant="primary" size="sm" disabled={!hasNameMapping} onClick={() => setStep('preview')}>Preview</Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="csv-modal__body">
            <p className="csv-modal__hint">Preview of first 5 rows. Does this look right?</p>
            <div className="csv-map__table-wrap">
              <table className="csv-map__table">
                <thead>
                  <tr>
                    {CSV_FIELDS.filter(f => f.key && Object.values(mapping).includes(f.key)).map(f => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {CSV_FIELDS.filter(f => f.key && Object.values(mapping).includes(f.key)).map(f => (
                        <td key={f.key}>{row[f.key] || '—'}</td>
                      ))}
                      <td><Badge variant={SOURCE_META[importSource]?.color} size="sm">{SOURCE_META[importSource]?.label}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="csv-modal__footer">
              <Button variant="ghost" size="sm" onClick={() => setStep('map')}>Back</Button>
              <span className="csv-modal__count">{csvData.rows.length} rows will be imported</span>
              <Button variant="primary" size="sm" onClick={handleImport}>
                Import {csvData.rows.length} Prospects
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="csv-modal__body csv-modal__body--center">
            <div className="csv-progress">
              <div className="csv-progress__bar">
                <div className="csv-progress__fill" style={{ width: `${progress.total ? (progress.done / progress.total * 100) : 0}%` }} />
              </div>
              <p className="csv-progress__text">Importing {progress.done} of {progress.total}…</p>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && (
          <div className="csv-modal__body csv-modal__body--center">
            <div className="csv-done">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
                <circle cx="12" cy="12" r="10" /><polyline points="9 12 11.5 14.5 15.5 9.5" />
              </svg>
              <p className="csv-done__text">Imported {progress.done} prospects</p>
              {progress.errors.length > 0 && (
                <div className="csv-done__errors">
                  {progress.errors.map((e, i) => <p key={i} className="csv-done__error">{e}</p>)}
                </div>
              )}
              <Button variant="primary" size="sm" onClick={() => { reset(); onClose() }}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Labels Inline Editor ───────────────────────────────────────────────────
function LabelsEditor({ labels, onChange }) {
  const [input, setInput] = useState('')
  const arr = labels || []

  const addLabel = () => {
    const val = input.trim()
    if (!val || arr.includes(val)) return
    onChange([...arr, val])
    setInput('')
  }

  const removeLabel = (label) => {
    onChange(arr.filter(l => l !== label))
  }

  return (
    <div className="labels-editor">
      <p className="panel-section-label">Labels</p>
      <div className="labels-editor__tags">
        {arr.map(l => (
          <span key={l} className="labels-editor__tag">
            {l}
            <button className="labels-editor__remove" onClick={() => removeLabel(l)}>✕</button>
          </span>
        ))}
      </div>
      <div className="labels-editor__input-row">
        <input
          className="labels-editor__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel() } }}
          placeholder="Type a label and press Enter…"
        />
        <button className="labels-editor__add" onClick={addLabel} disabled={!input.trim()}>Add</button>
      </div>
    </div>
  )
}

// ─── Workflow Checklist ─────────────────────────────────────────────────────
function WorkflowChecklist({ source, steps, onChange }) {
  const workflow = WORKFLOWS[source] || []
  if (!workflow.length) return null

  const groups = []
  const seen = new Set()
  workflow.forEach(step => {
    if (!seen.has(step.group)) {
      seen.add(step.group)
      groups.push(step.group)
    }
  })

  const completed = Object.keys(steps || {}).filter(k => steps[k]).length
  const total = workflow.length
  const pct = total ? Math.round(completed / total * 100) : 0

  return (
    <div className="wf-checklist">
      <div className="wf-checklist__header">
        <span className="wf-checklist__title">Workflow</span>
        <span className="wf-checklist__pct">{completed}/{total} — {pct}%</span>
      </div>
      <div className="wf-checklist__progress">
        <div className="wf-checklist__bar" style={{ width: `${pct}%` }} />
      </div>
      {groups.map(group => (
        <div key={group} className="wf-checklist__group">
          <span className="wf-checklist__group-label">{group}</span>
          {workflow.filter(s => s.group === group).map(step => {
            const done = !!steps?.[step.id]
            return (
              <button
                key={step.id}
                className={`wf-checklist__step ${done ? 'wf-checklist__step--done' : ''}`}
                onClick={() => {
                  const next = { ...steps }
                  if (done) {
                    delete next[step.id]
                  } else {
                    next[step.id] = new Date().toISOString()
                  }
                  onChange(next)
                }}
              >
                <span className="wf-checklist__check">
                  {done ? (
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <circle cx="10" cy="10" r="9" fill="var(--brown-mid)" opacity="0.15" stroke="var(--brown-mid)" strokeWidth="1.5" />
                      <polyline points="6 10 9 13 14 7" fill="none" stroke="var(--brown-dark)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <circle cx="10" cy="10" r="9" fill="none" stroke="var(--brown-light)" strokeWidth="1.5" />
                    </svg>
                  )}
                </span>
                <span className="wf-checklist__label">{step.label}</span>
                {done && <span className="wf-checklist__date">{new Date(steps[step.id]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Prospect Form ──────────────────────────────────────────────────────────
function ProspectForm({ prospect, defaultSource, onSave, onDelete, onConvert, onClose, saving, deleting }) {
  const isNew = !prospect?.id
  const showAddress = ['expired', 'fsbo', 'circle'].includes(prospect?.source || defaultSource)
  const [draft, setDraft] = useState({
    name:           prospect?.name           ?? '',
    phone:          prospect?.phone          ?? '',
    email:          prospect?.email          ?? '',
    source:         prospect?.source         ?? defaultSource ?? 'expired',
    status:         prospect?.status         ?? 'new',
    address:        prospect?.address        ?? '',
    city:           prospect?.city           ?? '',
    zip:            prospect?.zip            ?? '',
    mls_id:         prospect?.mls_id         ?? '',
    list_price:     prospect?.list_price     ?? '',
    last_contacted: prospect?.last_contacted ?? '',
    next_follow_up: prospect?.next_follow_up ?? '',
    notes:          prospect?.notes          ?? '',
    labels:         prospect?.labels         ?? [],
    workflow_steps: prospect?.workflow_steps  ?? {},
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const sourceShowsAddress = ['expired', 'fsbo', 'circle'].includes(draft.source)

  return (
    <>
      <div className="panel-section">
        <Input label="Name *" value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
        <div className="panel-row">
          <Input label="Phone" value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="(480) 555-1234" />
          <Input label="Email" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="jane@email.com" />
        </div>
        <div className="panel-row">
          <Select label="Source" value={draft.source} onChange={e => set('source', e.target.value)}>
            {Object.entries(SOURCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Select label="Status" value={draft.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </Select>
        </div>
      </div>

      {sourceShowsAddress && (
        <>
          <hr className="panel-divider" />
          <div className="panel-section">
            <p className="panel-section-label">Property</p>
            <Input label="Address" value={draft.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
            <div className="panel-row">
              <Input label="City" value={draft.city} onChange={e => set('city', e.target.value)} placeholder="Gilbert" />
              <Input label="Zip" value={draft.zip} onChange={e => set('zip', e.target.value)} placeholder="85296" />
            </div>
            <div className="panel-row">
              <Input label="MLS #" value={draft.mls_id} onChange={e => set('mls_id', e.target.value)} placeholder="MLS0000000" />
              <Input label="List Price ($)" type="number" value={draft.list_price} onChange={e => set('list_price', e.target.value)} placeholder="450000" />
            </div>
          </div>
        </>
      )}

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Tracking</p>
        <div className="panel-row">
          <Input label="Last Contacted" type="date" value={draft.last_contacted} onChange={e => set('last_contacted', e.target.value)} />
          <Input label="Next Follow-up" type="date" value={draft.next_follow_up} onChange={e => set('next_follow_up', e.target.value)} />
        </div>
        <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Conversation notes, details, follow-up reminders…" />
      </div>

      <hr className="panel-divider" />
      <LabelsEditor labels={draft.labels} onChange={val => set('labels', val)} />

      <hr className="panel-divider" />
      <WorkflowChecklist
        source={draft.source}
        steps={draft.workflow_steps}
        onChange={steps => set('workflow_steps', steps)}
      />

      {prospect?.created_at && (
        <p className="panel-timestamp">Added {new Date(prospect.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      )}

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onSave(draft)} disabled={saving || !draft.name.trim()}>
          {saving ? 'Saving…' : isNew ? 'Add Prospect' : 'Save Changes'}
        </Button>
        {!isNew && prospect.status !== 'converted' && (
          <Button variant="accent" size="sm" onClick={() => onConvert(prospect)}>
            Convert to Client
          </Button>
        )}
        {!isNew && (
          <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
            {deleting ? 'Removing…' : 'Delete'}
          </Button>
        )}
      </div>
    </>
  )
}

// ─── Main ProspectingList ───────────────────────────────────────────────────
export default function ProspectingList({ source, title, subtitle }) {
  // If source is null, show ALL prospects (unified view)
  const { data: raw, loading, refetch } = useProspects(source)
  const prospects = raw ?? []

  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [search, setSearch]             = useState('')
  const [panelOpen, setPanelOpen]       = useState(false)
  const [editing, setEditing]           = useState(null)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [error, setError]               = useState(null)
  const [csvOpen, setCsvOpen]           = useState(false)

  const openCreate = () => { setEditing(null); setPanelOpen(true) }
  const openEdit   = (p)  => { setEditing(p); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditing(null); setError(null) }

  const handleSave = async (draft) => {
    setSaving(true)
    setError(null)
    try {
      const row = {
        name:           draft.name.trim(),
        phone:          draft.phone.trim()          || null,
        email:          draft.email.trim()          || null,
        source:         draft.source,
        status:         draft.status,
        address:        draft.address.trim()        || null,
        city:           draft.city.trim()           || null,
        zip:            draft.zip.trim()            || null,
        mls_id:         draft.mls_id.trim()         || null,
        list_price:     draft.list_price ? Number(draft.list_price) : null,
        last_contacted: draft.last_contacted        || null,
        next_follow_up: draft.next_follow_up        || null,
        notes:          draft.notes.trim()          || null,
        labels:         draft.labels?.length ? draft.labels : [],
        workflow_steps:  draft.workflow_steps,
      }
      if (editing?.id) {
        await DB.updateProspect(editing.id, row)
      } else {
        await DB.createProspect(row)
      }
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editing?.id) return
    if (!confirm(`Remove ${editing.name}?`)) return
    setDeleting(true)
    try {
      await DB.deleteProspect(editing.id)
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleConvert = async (prospect) => {
    if (!confirm(`Convert ${prospect.name} to a client in the CRM?`)) return
    setSaving(true)
    try {
      const contact = await DB.createContact({
        name:   prospect.name,
        phone:  prospect.phone,
        email:  prospect.email,
        type:   'buyer',
        source: SOURCE_META[prospect.source]?.label || prospect.source,
        notes:  prospect.notes,
      })
      await DB.updateProspect(prospect.id, {
        status: 'converted',
        converted_contact_id: contact.id,
      })
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (sourceFilter !== 'all' && p.source !== sourceFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const match = (p.name || '').toLowerCase().includes(q)
          || (p.email || '').toLowerCase().includes(q)
          || (p.phone || '').includes(q)
          || (p.address || '').toLowerCase().includes(q)
          || (p.city || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [prospects, statusFilter, sourceFilter, search])

  const counts = useMemo(() => ({
    all:       prospects.length,
    new:       prospects.filter(p => p.status === 'new').length,
    contacted: prospects.filter(p => p.status === 'contacted').length,
    nurturing: prospects.filter(p => p.status === 'nurturing').length,
    hot:       prospects.filter(p => p.status === 'hot').length,
    converted: prospects.filter(p => p.status === 'converted').length,
    dead:      prospects.filter(p => p.status === 'dead').length,
  }), [prospects])

  // ─── Workflow progress helper ─────────────────────────────────────────
  const wfProgress = (p) => {
    const workflow = WORKFLOWS[p.source]
    if (!workflow?.length) return null
    const done = Object.keys(p.workflow_steps || {}).filter(k => p.workflow_steps[k]).length
    return { done, total: workflow.length, pct: Math.round(done / workflow.length * 100) }
  }

  // ─── Status dropdown in table ─────────────────────────────────────────
  const updateStatus = async (id, status) => {
    try {
      await DB.updateProspect(id, { status })
      await refetch()
    } catch {}
  }

  // ─── Table columns ───────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', label: 'Name',
      render: (v, row) => (
        <div className="pl-name-cell">
          <span className="pl-name">{v}</span>
          {row.phone && <span className="pl-sub">{fmtPhone(row.phone)}</span>}
        </div>
      ),
    },
    ...(!source ? [{
      key: 'source', label: 'Source',
      render: (v) => <Badge variant={SOURCE_META[v]?.color || 'default'} size="sm">{SOURCE_META[v]?.label || v}</Badge>,
    }] : []),
    {
      key: 'labels', label: 'Labels',
      render: (v) => {
        const arr = v || []
        if (!arr.length) return <span className="pl-muted">—</span>
        return (
          <div className="pl-labels">
            {arr.slice(0, 3).map(l => <span key={l} className="pl-label-pill">{l}</span>)}
            {arr.length > 3 && <span className="pl-label-more">+{arr.length - 3}</span>}
          </div>
        )
      },
    },
    {
      key: 'address', label: 'Property',
      render: (v, row) => v ? (
        <div className="pl-name-cell">
          <span className="pl-name">{v}</span>
          {row.city && <span className="pl-sub">{row.city}, AZ {row.zip}</span>}
        </div>
      ) : <span className="pl-muted">—</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (v, row) => (
        <select
          className="stage-select"
          value={v}
          onClick={e => e.stopPropagation()}
          onChange={e => updateStatus(row.id, e.target.value)}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      ),
    },
    {
      key: 'workflow_steps', label: 'Workflow',
      render: (_, row) => {
        const prog = wfProgress(row)
        if (!prog) return <span className="pl-muted">—</span>
        return (
          <div className="pl-wf-mini">
            <div className="pl-wf-mini__track">
              <div className="pl-wf-mini__fill" style={{ width: `${prog.pct}%` }} />
            </div>
            <span className="pl-wf-mini__label">{prog.done}/{prog.total}</span>
          </div>
        )
      },
    },
    {
      key: 'next_follow_up', label: 'Next Follow-up',
      render: (v) => {
        if (!v) return <span className="pl-muted">—</span>
        const d = new Date(v + 'T12:00:00')
        const now = new Date()
        const overdue = d < now
        return <span className={overdue ? 'pl-overdue' : ''}>{fmtDate(v)}</span>
      },
    },
    { key: 'last_contacted', label: 'Last Contact', render: v => fmtDate(v) },
  ]

  if (loading && !prospects.length) return <div className="page-loading">Loading prospects…</div>

  return (
    <div className="prospect-list">
      <SectionHeader
        title={title || 'All Prospects'}
        subtitle={subtitle || 'Track and manage your prospecting pipeline'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="md" onClick={() => setCsvOpen(true)}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
            >Import CSV</Button>
            <Button variant="ghost" size="md" onClick={openCreate}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
            >Add Prospect</Button>
          </div>
        }
      />

      {/* ─── Status Pipeline Strip ─── */}
      <div className="pipeline-strip">
        {STATUSES.filter(s => s !== 'dead').map(status => {
          const count = prospects.filter(p => p.status === status).length
          return (
            <div key={status} className={`pipeline-stage ${count > 0 ? 'pipeline-stage--active' : ''}`}>
              <span className="pipeline-stage__count">{count}</span>
              <span className="pipeline-stage__label">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </div>
          )
        })}
      </div>

      {/* ─── Filters ─── */}
      <div className="pl-filters">
        <TabBar
          tabs={[
            { label: 'All',       value: 'all',       count: counts.all },
            { label: 'New',       value: 'new',       count: counts.new },
            { label: 'Contacted', value: 'contacted', count: counts.contacted },
            { label: 'Nurturing', value: 'nurturing', count: counts.nurturing },
            { label: 'Hot',       value: 'hot',       count: counts.hot },
            { label: 'Converted', value: 'converted', count: counts.converted },
          ]}
          active={statusFilter}
          onChange={setStatusFilter}
        />
        <div className="pl-filters__row">
          {!source && (
            <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="pl-source-filter">
              <option value="all">All Sources</option>
              {Object.entries(SOURCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          )}
          <Input placeholder="Search name, phone, email, address…" value={search} onChange={e => setSearch(e.target.value)} className="pl-search" />
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} onRowClick={openEdit} />

      <SlidePanel open={panelOpen} onClose={closePanel} title={editing ? `Edit — ${editing.name}` : 'Add Prospect'} subtitle={editing ? SOURCE_META[editing.source]?.label : null} width={500}>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem', marginBottom: 8 }}>{error}</p>}
        <ProspectForm
          prospect={editing}
          defaultSource={source || 'expired'}
          onSave={handleSave}
          onDelete={handleDelete}
          onConvert={handleConvert}
          onClose={closePanel}
          saving={saving}
          deleting={deleting}
        />
      </SlidePanel>

      <CsvImportModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        defaultSource={source || 'expired'}
        onImported={refetch}
      />
    </div>
  )
}
