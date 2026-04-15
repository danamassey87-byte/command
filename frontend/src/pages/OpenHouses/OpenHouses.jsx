import React, { useState, useEffect, useMemo, Component } from 'react'
import { Button, Badge, SectionHeader, TabBar, DataTable, Card, SlidePanel, Input, Select, Textarea, InfoTip, AddressLink } from '../../components/ui/index.jsx'
import { useOpenHouses, useOHOutreach, useOHTasksForOH, useHostReports, useProperties, useListings } from '../../lib/hooks.js'
import { useBrandSignature } from '../../lib/BrandContext'
import * as DB from '../../lib/supabase.js'
import './OpenHouses.css'

// ─── Error Boundary ──────────────────────────────────────────────────────────
class OpenHousesErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('OpenHouses crashed:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, maxWidth: 600 }}>
          <h2 style={{ color: '#b91c1c', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', marginBottom: 16 }}>The Open Houses page encountered an error. Try refreshing the page.</p>
          <pre style={{ background: '#f3f4f6', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 16, padding: '8px 16px', background: '#7c6350', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const OH_CHECKLIST_KEY = 'oh_checklist_template'

export const DEFAULT_OH_TASKS = [
  // ── Pre-Event ──
  { task_name: 'Create OH Sign In in Lofty',                           category: 'pre',    sort_order: 1  },
  { task_name: 'Set up Curbhero Sign In',                              category: 'pre',    sort_order: 2  },
  { task_name: 'Create Flyers in Canva',                               category: 'pre',    sort_order: 3  },
  { task_name: 'Prep Door Jammer',                                     category: 'pre',    sort_order: 4  },
  { task_name: 'Send materials for printing',                          category: 'pre',    sort_order: 5  },
  { task_name: 'Print Sign-In QR page',                                category: 'pre',    sort_order: 6  },
  { task_name: 'Print QR for other Open Houses',                       category: 'pre',    sort_order: 7  },
  { task_name: 'Print MLS sheet',                                      category: 'pre',    sort_order: 8  },
  { task_name: 'Schedule Flyer Delivery',                              category: 'pre',    sort_order: 9  },
  { task_name: 'Create FB Marketplace Post',                           category: 'pre',    sort_order: 10 },
  { task_name: 'Create IG Post in Canva',                              category: 'pre',    sort_order: 11 },
  { task_name: 'Create IG Stories in Canva',                           category: 'pre',    sort_order: 12 },
  { task_name: 'Set up Manychat Sequence',                             category: 'pre',    sort_order: 13 },
  { task_name: 'Schedule IG Post',                                     category: 'pre',    sort_order: 14 },
  { task_name: 'Schedule IG Stories',                                  category: 'pre',    sort_order: 15 },
  { task_name: 'Add Lofty landing page link to Boards app',            category: 'pre',    sort_order: 16 },
  { task_name: 'Circle Prospect neighborhood',                         category: 'pre',    sort_order: 17 },
  // ── Day-Of ──
  { task_name: 'Post Open House IG Story (live)',                      category: 'day_of', sort_order: 18 },
  { task_name: 'Arrive 45 min early — set up signs & feature sheets',  category: 'day_of', sort_order: 19 },
  { task_name: 'Set up sign-in at entrance (Curbhero / iPad)',         category: 'day_of', sort_order: 20 },
  { task_name: 'Track each group: buyer type + interest level',        category: 'day_of', sort_order: 21 },
  { task_name: 'Note feedback on price, condition, competition',       category: 'day_of', sort_order: 22 },
  { task_name: 'Lock up & collect all signs + materials',              category: 'day_of', sort_order: 23 },
  // ── Post-Event ──
  { task_name: 'Create Thank You image + text in Canva',               category: 'post',   sort_order: 24 },
  { task_name: 'Add Thank You copy to Boards app',                     category: 'post',   sort_order: 25 },
  { task_name: 'Text every sign-in within 2 hours of close',           category: 'post',   sort_order: 26 },
  { task_name: 'Trigger Manychat Thank You sequence',                  category: 'post',   sort_order: 27 },
  { task_name: 'Add hot leads to Lofty & schedule follow-up call',     category: 'post',   sort_order: 28 },
]

function getOHChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem(OH_CHECKLIST_KEY))
    if (Array.isArray(saved) && saved.length > 0) return saved
  } catch { /* fall through */ }
  return DEFAULT_OH_TASKS
}

const OH_STATUS_OPTIONS       = ['scheduled', 'confirmed', 'completed', 'cancelled']
const OUTREACH_STATUS_OPTIONS = ['reached_out', 'accepted', 'declined', 'no_response']

const ohStatusVariant = { confirmed: 'success', scheduled: 'info', completed: 'default', cancelled: 'danger' }
const outreachVariant = { reached_out: 'info', accepted: 'success', declined: 'danger', no_response: 'warning' }
const outreachLabel   = { reached_out: 'Reached Out', accepted: 'Accepted', declined: 'Declined', no_response: 'No Response' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function mapOH(row) {
  const start = row.start_time ?? ''
  const end   = row.end_time   ?? ''
  return {
    id:              row.id,
    address:         row.property?.address   ?? '',
    city:            row.property?.city      ?? '',
    property_id:     row.property_id,
    listing_id:      row.listing_id          ?? '',
    date:            row.date                ?? '',
    start_time:      start,
    end_time:        end,
    time:            start ? (end ? `${start} – ${end}` : start) : '',
    status:          row.status              ?? 'scheduled',
    inquiries:       row.inquiries_count     ?? 0,
    signIn:          row.sign_in_count       ?? 0,
    leads:           row.leads_count         ?? 0,
    notes:           row.notes              ?? '',
    community:           row.community           ?? '',
    agent_name:          row.agent_name          ?? '',
    agent_brokerage:     row.agent_brokerage     ?? '',
    agent_phone:         row.agent_phone         ?? '',
    agent_email:         row.agent_email         ?? '',
    listing_agent:       row.listing_agent       ?? '',
    lofty_landing_page:  row.lofty_landing_page  ?? '',
    lofty_other_oh_page: row.lofty_other_oh_page ?? '',
    groups_through:      row.groups_through      ?? 0,
    leads_converted:     row.leads_converted     ?? 0,
    created_at:          row.created_at,
  }
}

// ─── Conflict detection helper ────────────────────────────────────────────────
function findOHConflicts(existingOHs, date, startTime, endTime) {
  if (!date) return []
  const BUFFER_MINUTES = 60 // 1 hour travel buffer
  const toMin = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }

  const newStart = toMin(startTime)
  const newEnd   = toMin(endTime) ?? (newStart != null ? newStart + 120 : null) // default 2hr window

  return existingOHs.filter(oh => {
    if (oh.date !== date) return false
    if (!oh.start_time) return true // same day, no time = potential conflict
    const ohStart = toMin(oh.start_time)
    const ohEnd   = toMin(oh.end_time) ?? (ohStart + 120)
    if (newStart == null) return true // no time set yet but same day
    // Check overlap with buffer
    return newStart < (ohEnd + BUFFER_MINUTES) && newEnd > (ohStart - BUFFER_MINUTES)
  })
}

// ─── OH Quick Form (new) ──────────────────────────────────────────────────────
function OHQuickForm({ onSave, onClose, saving, error, existingOHs }) {
  const [draft, setDraft] = useState({ address: '', city: '', listing_agent: '', hosted_by: '' })
  const [dates, setDates] = useState([{ date: '', start_time: '', end_time: '' }])
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))
  const setDate = (idx, k, v) => setDates(prev => prev.map((d, i) => i === idx ? { ...d, [k]: v } : d))
  const addDate = () => setDates(prev => [...prev, { date: '', start_time: '', end_time: '' }])
  const removeDate = (idx) => setDates(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  // Check for conflicts on each date
  const conflicts = dates.map(d => findOHConflicts(existingOHs ?? [], d.date, d.start_time, d.end_time))
  const hasConflicts = conflicts.some(c => c.length > 0)

  return (
    <>
      <p className="panel-hint">Fill in what you know — you can add URLs and other details later in the Process tab.</p>
      <div className="panel-section">
        <Input label="Property Address *" value={draft.address} onChange={e => set('address', e.target.value)} placeholder="2222 S Yellow Wood Dr" autoFocus />
        <Input label="City" value={draft.city} onChange={e => set('city', e.target.value)} placeholder="Mesa" />
        <Input label="Listing Agent" value={draft.listing_agent} onChange={e => set('listing_agent', e.target.value)} placeholder="Victoria Cole" />
        <Input label="Hosted By (leave blank if you)" value={draft.hosted_by} onChange={e => set('hosted_by', e.target.value)} placeholder="Agent name if someone else is hosting" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Dates & Times</p>
        {dates.map((d, idx) => (
          <div key={idx} className="oh-date-row">
            {dates.length > 1 && (
              <div className="oh-date-row__header">
                <span className="oh-date-row__label">Day {idx + 1}</span>
                <button className="oh-date-row__remove" onClick={() => removeDate(idx)} title="Remove this date">×</button>
              </div>
            )}
            <Input label="Date" type="date" value={d.date} onChange={e => setDate(idx, 'date', e.target.value)} />
            <div className="panel-row">
              <Input label="Start Time" type="time" value={d.start_time} onChange={e => setDate(idx, 'start_time', e.target.value)} />
              <Input label="End Time" type="time" value={d.end_time} onChange={e => setDate(idx, 'end_time', e.target.value)} />
            </div>
            {/* Conflict warning */}
            {conflicts[idx]?.length > 0 && (
              <div className="oh-conflict-warn">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                <div>
                  <p className="oh-conflict-warn__title">Schedule conflict{conflicts[idx].length > 1 ? 's' : ''}</p>
                  {conflicts[idx].map(c => (
                    <p key={c.id} className="oh-conflict-warn__item">
                      {c.address}{c.time ? ` · ${c.time}` : ''} ({c.status})
                    </p>
                  ))}
                  <p className="oh-conflict-warn__hint">Less than 1 hour buffer between open houses</p>
                </div>
              </div>
            )}
          </div>
        ))}
        <button className="oh-add-date-btn" onClick={addDate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Another Date
        </button>
      </div>

      {hasConflicts && (
        <p className="oh-conflict-notice">You can still schedule — the conflict warning is just a heads-up about tight timing.</p>
      )}
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem', marginTop: 8 }}>{error}</p>}
      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onSave({ ...draft, dates })} disabled={saving || !draft.address.trim()}>
          {saving ? 'Scheduling…' : dates.length > 1 ? `Schedule ${dates.length} Open Houses` : 'Schedule & Start Prep'}
        </Button>
      </div>
    </>
  )
}

// ─── OH Edit Form (full fields) ───────────────────────────────────────────────
function OHForm({ oh, onSave, onDelete, onClose, saving, deleting, error, existingOHs }) {
  const { data: propertiesData } = useProperties()
  const { data: listingsData } = useListings()
  const properties = propertiesData ?? []
  const listings = listingsData ?? []

  const [draft, setDraft] = useState({
    property_id:         oh?.property_id         ?? '',
    listing_id:          oh?.listing_id          ?? '',
    address:             oh?.address             ?? '',
    city:                oh?.city                ?? '',
    community:           oh?.community           ?? '',
    date:                oh?.date                ?? '',
    start_time:          oh?.start_time          ?? '',
    end_time:            oh?.end_time            ?? '',
    status:              oh?.status              ?? 'scheduled',
    listing_agent:       oh?.listing_agent       ?? '',
    lofty_landing_page:  oh?.lofty_landing_page  ?? '',
    lofty_other_oh_page: oh?.lofty_other_oh_page ?? '',
    agent_name:          oh?.agent_name          ?? '',
    agent_brokerage:     oh?.agent_brokerage     ?? '',
    agent_phone:         oh?.agent_phone         ?? '',
    agent_email:         oh?.agent_email         ?? '',
    inquiries:           oh?.inquiries           ?? 0,
    signIn:              oh?.signIn              ?? 0,
    leads:               oh?.leads               ?? 0,
    groups_through:      oh?.groups_through      ?? 0,
    leads_converted:     oh?.leads_converted     ?? 0,
    notes:               oh?.notes               ?? '',
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  // Conflict detection (exclude self)
  const editConflicts = findOHConflicts(
    (existingOHs ?? []).filter(o => o.id !== oh?.id),
    draft.date, draft.start_time, draft.end_time
  )

  // Auto-match listing by property_id
  const matchedListings = listings.filter(l => l.property_id === draft.property_id)

  const handlePropertySelect = (pid) => {
    if (!pid) { set('property_id', ''); return }
    const prop = properties.find(p => p.id === pid)
    if (prop) {
      const autoListing = listings.find(l => l.property_id === pid)
      setDraft(p => ({ ...p, property_id: pid, address: prop.address, city: prop.city ?? '', listing_id: autoListing?.id ?? p.listing_id }))
    }
  }

  const handleListingSelect = (lid) => {
    if (!lid) { set('listing_id', ''); return }
    const listing = listings.find(l => l.id === lid)
    if (listing && listing.property_id) {
      const prop = properties.find(p => p.id === listing.property_id)
      setDraft(p => ({
        ...p,
        listing_id: lid,
        property_id: listing.property_id,
        address: prop?.address ?? p.address,
        city: prop?.city ?? p.city,
      }))
    } else {
      set('listing_id', lid)
    }
  }

  return (
    <>
      <div className="panel-section">
        <Select label="Property" value={draft.property_id} onChange={e => handlePropertySelect(e.target.value)}>
          <option value="">— Select property —</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.address}{p.city ? ` · ${p.city}` : ''}</option>
          ))}
        </Select>
        <Select label="Link to My Listing" value={draft.listing_id} onChange={e => handleListingSelect(e.target.value)}>
          <option value="">— Not linked to a listing —</option>
          {(matchedListings.length > 0 ? matchedListings : listings).map(l => {
            const prop = properties.find(p => p.id === l.property_id)
            return (
              <option key={l.id} value={l.id}>
                {prop?.address ?? 'Unknown'}{prop?.city ? ` · ${prop.city}` : ''} ({l.status})
              </option>
            )
          })}
        </Select>
        <Input label="Community / Subdivision" value={draft.community} onChange={e => set('community', e.target.value)} placeholder="e.g. Sunland Village East" />
        <div className="panel-row">
          <Select label="Status" value={draft.status} onChange={e => set('status', e.target.value)}>
            {OH_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Input label="Date" type="date" value={draft.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div className="panel-row">
          <Input label="Start Time" type="time" value={draft.start_time} onChange={e => set('start_time', e.target.value)} />
          <Input label="End Time" type="time" value={draft.end_time} onChange={e => set('end_time', e.target.value)} />
        </div>
        {editConflicts.length > 0 && (
          <div className="oh-conflict-warn">
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            <div>
              <p className="oh-conflict-warn__title">Schedule conflict{editConflicts.length > 1 ? 's' : ''}</p>
              {editConflicts.map(c => (
                <p key={c.id} className="oh-conflict-warn__item">
                  {c.address}{c.time ? ` · ${c.time}` : ''} ({c.status})
                </p>
              ))}
              <p className="oh-conflict-warn__hint">Less than 1 hour buffer between open houses</p>
            </div>
          </div>
        )}
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Listing Info</p>
        <Input label="Listing Agent" value={draft.listing_agent} onChange={e => set('listing_agent', e.target.value)} placeholder="Victoria Cole" />
        <Input label="Lofty Landing Page URL" value={draft.lofty_landing_page} onChange={e => set('lofty_landing_page', e.target.value)} placeholder="https://danamassey.com/address" />
        <Input label="Lofty Other OH's Page URL" value={draft.lofty_other_oh_page} onChange={e => set('lofty_other_oh_page', e.target.value)} placeholder="https://crm.lofty.com/…" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Hosting Agent (if someone else is hosting)</p>
        <div className="panel-row">
          <Input label="Agent Name" value={draft.agent_name} onChange={e => set('agent_name', e.target.value)} placeholder="Jane Smith" />
          <Input label="Brokerage" value={draft.agent_brokerage} onChange={e => set('agent_brokerage', e.target.value)} placeholder="Keller Williams" />
        </div>
        <div className="panel-row">
          <Input label="Phone" type="tel" value={draft.agent_phone} onChange={e => set('agent_phone', e.target.value)} placeholder="480-555-1234" />
          <Input label="Email" type="email" value={draft.agent_email} onChange={e => set('agent_email', e.target.value)} placeholder="agent@email.com" />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Results (fill after event)</p>
        <div className="panel-row">
          <Input label="Pre-inquiries" type="number" min="0" value={draft.inquiries} onChange={e => set('inquiries', e.target.value)} />
          <Input label="Sign-ins" type="number" min="0" value={draft.signIn} onChange={e => set('signIn', e.target.value)} />
        </div>
        <Input label="Hot Leads" type="number" min="0" value={draft.leads} onChange={e => set('leads', e.target.value)} />
        <div className="panel-row">
          <Input label="# Groups Through" type="number" min="0" value={draft.groups_through} onChange={e => set('groups_through', e.target.value)} />
          <Input label="Leads → Sales" type="number" min="0" value={draft.leads_converted} onChange={e => set('leads_converted', e.target.value)} />
        </div>
      </div>

      <hr className="panel-divider" />
      <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Prep notes, feedback, follow-up actions…" />

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem', marginTop: 8 }}>{error}</p>}

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onSave(draft)} disabled={saving || !draft.property_id}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
          {deleting ? 'Removing…' : 'Delete'}
        </Button>
      </div>
    </>
  )
}

// ─── Tasks Panel ──────────────────────────────────────────────────────────────
function TasksPanel({ ohId }) {
  const { data: tasksData, loading, refetch } = useOHTasksForOH(ohId)
  const tasks    = tasksData ?? []
  const [seeding, setSeeding]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [taskEdits, setTaskEdits] = useState({})
  const [addingTo, setAddingTo] = useState(null) // which category is getting a new task
  const [newTaskName, setNewTaskName] = useState('')
  const [addingSaving, setAddingSaving] = useState(false)
  const [dragTaskId, setDragTaskId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null) // category key being hovered

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const seedTasks = async () => {
    setSeeding(true)
    try {
      await DB.bulkCreateOHTasks(getOHChecklist().map(t => ({ ...t, open_house_id: ohId })))
      await refetch()
    } catch { /* silent */ } finally { setSeeding(false) }
  }

  const toggleTask = async (task) => {
    const completed = !task.completed
    try {
      await DB.updateOHTask(task.id, { completed, completed_at: completed ? new Date().toISOString() : null })
      await refetch()
    } catch { /* silent */ }
  }

  const saveTaskEdit = async (task) => {
    const edits = taskEdits[task.id] ?? {}
    try {
      await DB.updateOHTask(task.id, {
        due_date: edits.due_date !== undefined ? (edits.due_date || null) : task.due_date,
        doc_link: edits.doc_link !== undefined ? (edits.doc_link.trim() || null) : task.doc_link,
      })
      await refetch()
      setEditingId(null)
    } catch { /* silent */ }
  }

  const setEdit = (id, field, val) =>
    setTaskEdits(p => ({ ...p, [id]: { ...(p[id] ?? {}), [field]: val } }))

  const openEdit = (task) => {
    setEditingId(editingId === task.id ? null : task.id)
    setTaskEdits(p => ({ ...p, [task.id]: { due_date: task.due_date ?? '', doc_link: task.doc_link ?? '' } }))
  }

  const handleAddTask = async (category, scope) => {
    if (!newTaskName.trim()) return
    setAddingSaving(true)
    try {
      // Always add to this open house
      const catTasks = tasks.filter(t => t.category === category)
      const maxSort = catTasks.length > 0 ? Math.max(...catTasks.map(t => t.sort_order)) : 0
      await DB.createOHTask({ open_house_id: ohId, task_name: newTaskName.trim(), category, sort_order: maxSort + 1 })

      // If global, also update the template in localStorage
      if (scope === 'global') {
        const current = getOHChecklist()
        const catGlobal = current.filter(t => t.category === category)
        const maxGlobalSort = catGlobal.length > 0 ? Math.max(...catGlobal.map(t => t.sort_order)) : 0
        const updated = [...current, { task_name: newTaskName.trim(), category, sort_order: maxGlobalSort + 1 }]
        localStorage.setItem(OH_CHECKLIST_KEY, JSON.stringify(updated))
      }

      await refetch()
      setNewTaskName('')
      setAddingTo(null)
    } catch { /* silent */ } finally { setAddingSaving(false) }
  }

  const handleDrop = async (targetCategory) => {
    setDropTarget(null)
    if (!dragTaskId) return
    const task = tasks.find(t => t.id === dragTaskId)
    if (!task || task.category === targetCategory) { setDragTaskId(null); return }
    try {
      const catTasks = tasks.filter(t => t.category === targetCategory)
      const maxSort = catTasks.length > 0 ? Math.max(...catTasks.map(t => t.sort_order)) : 0
      await DB.updateOHTask(task.id, { category: targetCategory, sort_order: maxSort + 1 })
      await refetch()
    } catch { /* silent */ }
    setDragTaskId(null)
  }

  const groups = [
    { key: 'pre',    label: 'Pre-Event',  icon: '📣', color: 'var(--brown-mid)' },
    { key: 'day_of', label: 'Day-Of',     icon: '🏡', color: '#22c55e'          },
    { key: 'post',   label: 'Follow-Up',  icon: '📞', color: '#6366f1'          },
  ]

  if (loading) return <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Loading tasks…</p>

  if (!tasks.length) return (
    <div className="oh-tasks-empty">
      <p>No tasks set up yet for this open house.</p>
      <Button variant="primary" size="sm" onClick={seedTasks} disabled={seeding}>
        {seeding ? 'Setting up…' : 'Initialize Standard Checklist'}
      </Button>
    </div>
  )

  return (
    <div className="oh-tasks-grid">
      {groups.map(group => {
        const groupTasks = tasks.filter(t => t.category === group.key)
        if (!groupTasks.length) return null
        const done = groupTasks.filter(t => t.completed).length
        return (
          <Card
            key={group.key}
            className={`oh-task-card${dropTarget === group.key ? ' oh-task-card--drop-target' : ''}`}
            onDragOver={e => { e.preventDefault(); setDropTarget(group.key) }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={e => { e.preventDefault(); handleDrop(group.key) }}
          >
            <div className="oh-task-card__header">
              <span>{group.icon}</span>
              <h3 className="oh-task-card__title">{group.label}</h3>
              <span className="oh-task-group__count">{done}/{groupTasks.length}</span>
            </div>
            <div className="oh-task-card__bar">
              <div className="oh-task-card__bar-fill" style={{ width: `${(done / groupTasks.length) * 100}%`, background: group.color }} />
            </div>
            <div className="oh-task-group__items">
              {groupTasks.map(task => {
                const isEditing = editingId === task.id
                const dueDate   = task.due_date ? new Date(task.due_date + 'T12:00:00') : null
                const isOverdue = dueDate && dueDate < today && !task.completed
                const isSoon    = dueDate && !isOverdue && (dueDate - today) / 86400000 <= 2 && !task.completed
                return (
                  <div
                    key={task.id}
                    className={`oh-task-row${task.completed ? ' oh-task-row--done' : ''}${dragTaskId === task.id ? ' oh-task-row--dragging' : ''}`}
                    draggable
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={() => { setDragTaskId(null); setDropTarget(null) }}
                  >
                    <div className="oh-task-row__main">
                      <button className={`oh-task-check${task.completed ? ' oh-task-check--done' : ''}`} onClick={() => toggleTask(task)}>
                        {task.completed
                          ? <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="var(--brown-mid)"/><polyline points="4.5 8 7 10.5 11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="var(--color-border)" strokeWidth="1.5"/></svg>
                        }
                      </button>
                      <span className={`oh-task-name${task.completed ? ' oh-task-name--done' : ''}`}>{task.task_name}</span>
                      <div className="oh-task-row__meta">
                        {dueDate && (
                          <span className={`oh-task-due${isOverdue ? ' oh-task-due--overdue' : isSoon ? ' oh-task-due--soon' : ''}`}>
                            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {task.doc_link && (
                          <a href={task.doc_link} target="_blank" rel="noreferrer" className="oh-task-link" title="Open document">
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3"/><path d="M10 2h4v4"/><line x1="14" y1="2" x2="8" y2="8"/></svg>
                          </a>
                        )}
                        <button className="oh-task-edit-btn" onClick={() => openEdit(task)} title="Set due date / doc link">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/><circle cx="3" cy="8" r="1"/></svg>
                        </button>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="oh-task-edit-row">
                        <Input label="Due Date" type="date" value={taskEdits[task.id]?.due_date ?? ''} onChange={e => setEdit(task.id, 'due_date', e.target.value)} />
                        <Input label="Doc Link (URL)" value={taskEdits[task.id]?.doc_link ?? ''} onChange={e => setEdit(task.id, 'doc_link', e.target.value)} placeholder="https://…" />
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <Button size="sm" variant="primary" onClick={() => saveTaskEdit(task)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add task inline */}
            {addingTo === group.key ? (
              <div className="oh-add-task-form">
                <input
                  className="oh-add-task-input"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="New task name..."
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Escape') { setAddingTo(null); setNewTaskName('') } }}
                />
                <div className="oh-add-task-actions">
                  <Button size="sm" variant="primary" onClick={() => handleAddTask(group.key, 'local')} disabled={addingSaving || !newTaskName.trim()}>
                    This OH Only
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleAddTask(group.key, 'global')} disabled={addingSaving || !newTaskName.trim()}>
                    + Add to All Future OHs
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setNewTaskName('') }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button className="oh-add-task-btn" onClick={() => { setAddingTo(group.key); setNewTaskName('') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Task
              </button>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ─── OH Detail ────────────────────────────────────────────────────────────────
function OHDetail({ oh, onBack, onEdit }) {
  return (
    <div className="oh-detail">
      <div className="oh-detail__nav">
        <button className="oh-detail__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Open Houses
        </button>
        <Button variant="ghost" size="sm" onClick={onEdit}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        >Edit</Button>
      </div>

      <div className="oh-detail__header">
        <div>
          <h2 className="oh-detail__address"><AddressLink address={oh.address} city={oh.city}>{oh.address}</AddressLink></h2>
          <p className="oh-detail__meta">
            {oh.city}{oh.community ? ` · ${oh.community}` : ''} &bull;{' '}
            {oh.date ? new Date(oh.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '—'}
            {oh.time ? ` · ${oh.time}` : ''}
          </p>
          {oh.listing_agent && <p className="oh-detail__agent">Listing Agent: {oh.listing_agent}</p>}
          {(oh.agent_name || oh.agent_brokerage) && (
            <p className="oh-detail__agent">
              Host: {oh.agent_name}{oh.agent_brokerage ? ` · ${oh.agent_brokerage}` : ''}{oh.agent_phone ? ` · ${oh.agent_phone}` : ''}
            </p>
          )}
        </div>
        <Badge variant={ohStatusVariant[oh.status]}>{oh.status}</Badge>
      </div>

      <div className="oh-detail__stats">
        <div className="oh-detail__stat"><p className="oh-detail__stat-value">{oh.groups_through}</p><p className="oh-detail__stat-label">Groups</p></div>
        <div className="oh-detail__stat"><p className="oh-detail__stat-value">{oh.leads}</p><p className="oh-detail__stat-label">Hot Leads</p></div>
        <div className="oh-detail__stat"><p className="oh-detail__stat-value">{oh.leads_converted}</p><p className="oh-detail__stat-label">→ Sales</p></div>
        <div className="oh-detail__stat"><p className="oh-detail__stat-value">{oh.signIn}</p><p className="oh-detail__stat-label">Sign-ins</p></div>
      </div>
      {/* Sign-In Kiosk Link */}
      {typeof oh.id === 'string' && (
        <div className="oh-detail__links" style={{ marginBottom: oh.lofty_landing_page ? 0 : 12 }}>
          <a
            href={`${window.location.origin}/oh-signin/${oh.id}`}
            target="_blank"
            rel="noreferrer"
            className="oh-detail__link"
            style={{ background: 'var(--brown-dark)', color: '#fff', padding: '8px 14px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            📋 Open Sign-In Kiosk
          </a>
          <button
            onClick={() => {
              const url = `${window.location.origin}/oh-signin/${oh.id}`
              navigator.clipboard.writeText(url)
              alert('Sign-in link copied!\n\n' + url)
            }}
            className="oh-detail__link"
            style={{ background: 'none', border: '1px solid #e0dbd6', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            Copy Link
          </button>
        </div>
      )}

      {oh.lofty_landing_page && (
        <div className="oh-detail__links">
          <a href={oh.lofty_landing_page} target="_blank" rel="noreferrer" className="oh-detail__link">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3"/><path d="M10 2h4v4"/><line x1="14" y1="2" x2="8" y2="8"/></svg>
            Lofty Sign-In Page
          </a>
          {oh.lofty_other_oh_page && (
            <a href={oh.lofty_other_oh_page} target="_blank" rel="noreferrer" className="oh-detail__link">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3"/><path d="M10 2h4v4"/><line x1="14" y1="2" x2="8" y2="8"/></svg>
              Other OH's Page
            </a>
          )}
        </div>
      )}

      {oh.notes && (
        <Card className="oh-detail__notes"><p className="oh-detail__notes-label">Notes</p><p>{oh.notes}</p></Card>
      )}

      {/* Sign-In Attendees */}
      {typeof oh.id === 'string' && <AttendeesPanel ohId={oh.id} />}

      <div className="oh-detail__tasks-section">
        <h3 className="oh-detail__tasks-title">Process Checklist</h3>
        {typeof oh.id === 'string'
          ? <TasksPanel ohId={oh.id} />
          : <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Save this open house to DB to track tasks.</p>
        }
      </div>
    </div>
  )
}

/* ─── Attendees Panel (admin view of sign-ins) ──────────────────────────── */
function AttendeesPanel({ ohId }) {
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    DB.getOHSignIns(ohId).then(({ data }) => {
      setAttendees(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [ohId])

  if (loading) return null
  if (attendees.length === 0 && !expanded) return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none', fontSize: '0.78rem', color: 'var(--brown-mid)', cursor: 'pointer', padding: 0 }}>
        📋 No sign-ins yet
      </button>
    </div>
  )

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

  const skipTraceCount = attendees.filter(a => a.skip_trace_needed && !a.skip_trace_completed).length
  const partialCount = attendees.filter(a => a.is_partial).length

  async function markSkipTraced(id) {
    await DB.updateOHSignIn(id, { skip_trace_completed: true })
    setAttendees(prev => prev.map(a => a.id === id ? { ...a, skip_trace_completed: true } : a))
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--brown-dark)', margin: 0 }}>
          Sign-Ins ({attendees.length})
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {skipTraceCount > 0 && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#fef7e0', color: '#b8860b' }}>
              {skipTraceCount} need skip trace
            </span>
          )}
          {partialCount > 0 && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#fce8e6', color: '#c5221f' }}>
              {partialCount} partial
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {attendees.map(a => {
          const needsTrace = a.skip_trace_needed && !a.skip_trace_completed
          const isPartial = a.is_partial

          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem',
              background: needsTrace ? '#fef7e0' : isPartial ? '#fce8e6' : '#faf8f5',
              border: needsTrace ? '1px solid #e8d48a' : isPartial ? '1px solid #f0c0b8' : '1px solid transparent',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: needsTrace ? '#c99a2e' : a.working_with_agent ? 'var(--brown-light)' : 'var(--sage-green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {(a.first_name?.[0] || '').toUpperCase()}{(a.last_name?.[0] || '').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--brown-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {a.first_name} {a.last_name}
                  {isPartial && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#c5221f', color: '#fff' }}>
                      PARTIAL
                    </span>
                  )}
                  {needsTrace && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#b8860b', color: '#fff' }}>
                      SKIP TRACE
                    </span>
                  )}
                  {a.skip_trace_completed && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'var(--sage-green)', color: '#fff' }}>
                      TRACED
                    </span>
                  )}
                  {a.working_with_agent && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                      has agent{a.agent_name ? `: ${a.agent_name}` : ''}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {a.email ? <span>{a.email}</span> : <span style={{ color: '#c5221f', fontStyle: 'italic' }}>no email</span>}
                  {a.phone ? <span>{a.phone}</span> : <span style={{ color: '#c5221f', fontStyle: 'italic' }}>no phone</span>}
                  {a.timeframe && <span>Timeframe: {a.timeframe}</span>}
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                {fmtTime(a.created_at)}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {a.pre_approved && <span title="Pre-approved" style={{ fontSize: '0.75rem' }}>✅</span>}
                {a.need_to_sell && <span title="Needs to sell" style={{ fontSize: '0.75rem' }}>🏠</span>}
                {!a.working_with_agent && <span title="No agent — hot lead!" style={{ fontSize: '0.75rem' }}>🔥</span>}
                {needsTrace && (
                  <button
                    onClick={() => markSkipTraced(a.id)}
                    title="Mark as skip traced"
                    style={{ background: 'none', border: '1px solid #e0dbd6', borderRadius: 4, padding: '2px 6px', fontSize: '0.65rem', cursor: 'pointer', color: 'var(--brown-dark)' }}
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Date range helpers ───────────────────────────────────────────────────────
const DATE_RANGES = [
  { value: 'all',    label: 'All Time'    },
  { value: '7d',     label: 'Last 7 Days' },
  { value: '30d',    label: 'Last 30 Days'},
  { value: '3m',     label: 'Last 3 Mo'  },
  { value: '6m',     label: 'Last 6 Mo'  },
  { value: 'ytd',    label: 'YTD'         },
  { value: 'custom', label: 'Custom'      },
]

function getDateBounds(range, customFrom, customTo) {
  const now   = new Date()
  const today = now.toISOString().slice(0, 10)
  if (range === 'all')    return { from: null, to: null }
  if (range === '7d')     { const d = new Date(now); d.setDate(d.getDate() - 7);   return { from: d.toISOString().slice(0,10), to: today } }
  if (range === '30d')    { const d = new Date(now); d.setDate(d.getDate() - 30);  return { from: d.toISOString().slice(0,10), to: today } }
  if (range === '3m')     { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { from: d.toISOString().slice(0,10), to: today } }
  if (range === '6m')     { const d = new Date(now); d.setMonth(d.getMonth() - 6); return { from: d.toISOString().slice(0,10), to: today } }
  if (range === 'ytd')    return { from: `${now.getFullYear()}-01-01`, to: today }
  if (range === 'custom') return { from: customFrom || null, to: customTo || null }
  return { from: null, to: null }
}

// ─── Scheduled Tab ────────────────────────────────────────────────────────────
function ScheduledTab({ openHouses, loading, refetch }) {
  const [filter, setFilter]         = useState('all')
  const [dateRange, setDateRange]   = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [selectedOH, setSelectedOH] = useState(null)
  const [panelOpen, setPanelOpen]   = useState(false)
  const [editingOH, setEditingOH]   = useState(null)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState(null)

  const openCreate = () => { setEditingOH(null); setPanelOpen(true) }
  const openEdit   = (oh) => { setEditingOH(oh); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditingOH(null); setError(null) }

  // Active upcoming first (asc), completed/cancelled at bottom (desc)
  const sortedOHs = useMemo(() => {
    const active   = openHouses.filter(o => !['completed','cancelled'].includes(o.status))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    const finished = openHouses.filter(o =>  ['completed','cancelled'].includes(o.status))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return [...active, ...finished]
  }, [openHouses])

  // Date range filter
  const { from: drFrom, to: drTo } = getDateBounds(dateRange, customFrom, customTo)
  const dateFiltered = useMemo(() => sortedOHs.filter(oh => {
    if (!drFrom && !drTo) return true
    if (!oh.date) return false
    if (drFrom && oh.date < drFrom) return false
    if (drTo   && oh.date > drTo)   return false
    return true
  }), [sortedOHs, drFrom, drTo])

  const handleQuickSave = async (draft) => {
    setSaving(true); setError(null)
    try {
      const property_id = await DB.ensureProperty({ address: draft.address.trim(), city: draft.city.trim() || null })
      const datesList = draft.dates || [{ date: '', start_time: '', end_time: '' }]
      let lastCreated = null

      for (const dt of datesList) {
        const dbRow = {
          property_id,
          date:          dt.date       || null,
          start_time:    dt.start_time || null,
          end_time:      dt.end_time   || null,
          status:        'scheduled',
          listing_agent: draft.listing_agent.trim() || null,
          agent_name:    draft.hosted_by?.trim()    || null,
        }
        const created = await DB.createOpenHouse(dbRow)
        await DB.bulkCreateOHTasks(getOHChecklist().map(t => ({ ...t, open_house_id: created.id })))
        const dateLabel = dt.date ? ` on ${dt.date}` : ''
        await DB.logActivity('open_house_created', `Scheduled open house: ${draft.address}${dateLabel}`, { propertyId: property_id })
        lastCreated = { id: created.id, dt }
      }

      await refetch()
      closePanel()

      if (lastCreated) {
        const dt = lastCreated.dt
        const timeStr = dt.start_time ? (dt.end_time ? `${dt.start_time} – ${dt.end_time}` : dt.start_time) : ''
        const newOH = { id: lastCreated.id, address: draft.address.trim(), city: draft.city.trim(), property_id, date: dt.date || '', start_time: dt.start_time || '', end_time: dt.end_time || '', time: timeStr, status: 'scheduled', inquiries: 0, signIn: 0, leads: 0, notes: '', community: '', agent_name: '', agent_brokerage: '', agent_phone: '', agent_email: '', listing_agent: draft.listing_agent.trim(), lofty_landing_page: '', lofty_other_oh_page: '', groups_through: 0, leads_converted: 0 }
        setSelectedOH(newOH)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (draft) => {
    setSaving(true); setError(null)
    try {
      if (!editingOH || typeof editingOH.id !== 'string') return
      const dbRow = {
        property_id:     draft.property_id || editingOH.property_id,
        listing_id:      draft.listing_id  || null,
        date:            draft.date            || null,
        start_time:      draft.start_time      || null,
        end_time:        draft.end_time        || null,
        status:          draft.status,
        community:           (draft.community ?? '').trim()           || null,
        listing_agent:       (draft.listing_agent ?? '').trim()       || null,
        lofty_landing_page:  (draft.lofty_landing_page ?? '').trim()  || null,
        lofty_other_oh_page: (draft.lofty_other_oh_page ?? '').trim() || null,
        agent_name:          (draft.agent_name ?? '').trim()          || null,
        agent_brokerage:     (draft.agent_brokerage ?? '').trim()     || null,
        agent_phone:         (draft.agent_phone ?? '').trim()         || null,
        agent_email:         (draft.agent_email ?? '').trim()         || null,
        inquiries_count:     Number(draft.inquiries)      || 0,
        sign_in_count:       Number(draft.signIn)         || 0,
        leads_count:         Number(draft.leads)          || 0,
        groups_through:      Number(draft.groups_through) || 0,
        leads_converted:     Number(draft.leads_converted) || 0,
        notes:               (draft.notes ?? '').trim()   || null,
      }
      await DB.updateOpenHouse(editingOH.id, dbRow)
      await DB.logActivity('open_house_updated', `Updated open house: ${editingOH.address}`, { propertyId: dbRow.property_id })
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingOH || typeof editingOH.id !== 'string') return
    if (!confirm(`Remove open house at ${editingOH.address}?`)) return
    setDeleting(true)
    try {
      await DB.logActivity('open_house_deleted', `Removed open house: ${editingOH.address}`)
      await DB.deleteOpenHouse(editingOH.id)
      await refetch()
      closePanel()
      if (selectedOH?.id === editingOH.id) setSelectedOH(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  if (selectedOH) {
    const oh = openHouses.find(o => o.id === selectedOH.id) ?? selectedOH
    return (
      <>
        <OHDetail oh={oh} onBack={() => setSelectedOH(null)} onEdit={() => openEdit(oh)} />
        <SlidePanel open={panelOpen} onClose={closePanel} title="Edit Open House" subtitle={editingOH?.address} width={480}>
          <OHForm key={editingOH?.id || 'new'} oh={editingOH} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} error={error} existingOHs={openHouses} />
        </SlidePanel>
      </>
    )
  }

  const filtered = dateFiltered.filter(oh => filter === 'all' || oh.status === filter)
  const counts = {
    all:       dateFiltered.length,
    confirmed: dateFiltered.filter(o => o.status === 'confirmed').length,
    scheduled: dateFiltered.filter(o => o.status === 'scheduled').length,
    completed: dateFiltered.filter(o => o.status === 'completed').length,
  }

  const columns = [
    {
      key: 'address', label: 'Property',
      render: (v, row) => (
        <div>
          <AddressLink address={v} city={row.city} className="lead-address">{v}</AddressLink>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.city}{row.community ? ` · ${row.community}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'agent_name', label: 'Host Agent',
      render: (v, row) => v ? (
        <div>
          <p style={{ fontSize: '0.82rem' }}>{v}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.agent_brokerage}</p>
        </div>
      ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    { key: 'date', label: 'Date', render: v => fmtDate(v) },
    { key: 'time', label: 'Time' },
    { key: 'signIn', label: 'Sign-ins' },
    { key: 'leads', label: 'Hot Leads', render: v => v > 0 ? <Badge variant="success" size="sm">{v}</Badge> : '—' },
    { key: 'status', label: 'Status', render: v => <Badge variant={ohStatusVariant[v]}>{v}</Badge> },
    {
      key: 'actions', label: '',
      render: (_, row) => {
        const isPast = row.date && row.date < new Date().toISOString().slice(0, 10)
        const canComplete = !['completed', 'cancelled'].includes(row.status)
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            {canComplete && isPast && (
              <Button size="sm" variant="ghost" onClick={async e => {
                e.stopPropagation()
                await DB.updateOpenHouse(row.id, { status: 'completed' })
                await refetch()
              }}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
              >Complete</Button>
            )}
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedOH(row) }}>Tasks</Button>
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row) }}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
            >Edit</Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      {/* Date range strip */}
      <div className="oh-date-strip">
        {DATE_RANGES.map(r => (
          <button
            key={r.value}
            className={`oh-date-btn${dateRange === r.value ? ' oh-date-btn--active' : ''}`}
            onClick={() => setDateRange(r.value)}
          >{r.label}</button>
        ))}
      </div>
      {dateRange === 'custom' && (
        <div className="oh-date-custom">
          <Input label="From" type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <Input label="To"   type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   />
        </div>
      )}

      <div className="oh-tab-header">
        <TabBar
          tabs={[
            { label: 'All',       value: 'all',       count: counts.all       },
            { label: 'Confirmed', value: 'confirmed', count: counts.confirmed },
            { label: 'Scheduled', value: 'scheduled', count: counts.scheduled },
            { label: 'Completed', value: 'completed', count: counts.completed },
          ]}
          active={filter}
          onChange={setFilter}
        />
        <Button variant="primary" size="sm" onClick={openCreate}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >Schedule Open House</Button>
      </div>
      <DataTable columns={columns} rows={filtered} />
      <SlidePanel open={panelOpen} onClose={closePanel} title={editingOH ? 'Edit Open House' : 'Schedule Open House'} subtitle={editingOH?.address} width={editingOH ? 480 : 440}>
        {editingOH ? (
          <OHForm key={editingOH.id} oh={editingOH} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} error={error} />
        ) : (
          <OHQuickForm onSave={handleQuickSave} onClose={closePanel} saving={saving} error={error} existingOHs={openHouses} />
        )}
      </SlidePanel>
    </>
  )
}

// ─── Outreach Form ────────────────────────────────────────────────────────────
function OutreachForm({ record, onSave, onClose, saving, error }) {
  const isNew = !record?.id
  const [draft, setDraft] = useState({
    outreach_date: record?.outreach_date ?? '',
    address:       record?.address       ?? '',
    community:     record?.community     ?? '',
    agent_name:    record?.agent_name    ?? '',
    brokerage:     record?.brokerage     ?? '',
    phone:         record?.phone         ?? '',
    email:         record?.email         ?? '',
    status:         record?.status         ?? 'reached_out',
    contact_method: record?.contact_method ?? 'email',
    notes:          record?.notes          ?? '',
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  return (
    <>
      <div className="panel-section">
        <Input label="Outreach Date" type="date" value={draft.outreach_date} onChange={e => set('outreach_date', e.target.value)} />
        <Input label="Property Address *" value={draft.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, Mesa, AZ 85209" />
        <Input label="Community / Subdivision" value={draft.community} onChange={e => set('community', e.target.value)} placeholder="e.g. Sunland Village East" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Agent Info</p>
        <div className="panel-row">
          <Input label="Agent Name" value={draft.agent_name} onChange={e => set('agent_name', e.target.value)} />
          <Input label="Brokerage" value={draft.brokerage} onChange={e => set('brokerage', e.target.value)} />
        </div>
        <div className="panel-row">
          <Input label="Phone" type="tel" value={draft.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Email" type="email" value={draft.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <div className="panel-row">
          <Select label="Status" value={draft.status} onChange={e => set('status', e.target.value)}>
            {OUTREACH_STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{outreachLabel[s]}</option>
            ))}
          </Select>
          <Select label="How Contacted" value={draft.contact_method ?? 'email'} onChange={e => set('contact_method', e.target.value)}>
            <option value="email">Email</option>
            <option value="text">Text</option>
            <option value="phone">Phone Call</option>
            <option value="door">Door Knock</option>
            <option value="letter">Letter</option>
          </Select>
        </div>
        <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Response details, decline reason, etc." />
      </div>

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem', marginTop: 8 }}>{error}</p>}
      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onSave(draft)} disabled={saving || !draft.address.trim()}>
          {saving ? 'Saving…' : isNew ? 'Add Outreach' : 'Save Changes'}
        </Button>
      </div>
    </>
  )
}

// ─── Outreach Tab ──────────────────────────────────────────────────────────────
// ─── CSV import parser ────────────────────────────────────────────────────────
// Expected columns (case-insensitive): date, address, community, agent_name, brokerage, phone, email, status, notes
function parseOutreachCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'))
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const cols = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
    return {
      outreach_date: obj.date       || obj.outreach_date || null,
      address:       obj.address    || '',
      community:     obj.community  || null,
      agent_name:    obj.agent_name || obj.agent || null,
      brokerage:     obj.brokerage  || null,
      phone:         obj.phone      || null,
      email:         obj.email      || null,
      status:        OUTREACH_STATUS_OPTIONS.includes(obj.status) ? obj.status : 'reached_out',
      notes:         obj.notes      || null,
    }
  }).filter(r => r.address)
}

function OutreachTab({ records, loading, refetch }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [panelOpen, setPanelOpen]       = useState(false)
  const [editing, setEditing]           = useState(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)
  // Inline notes editing
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteVal, setNoteVal]             = useState('')
  // CSV import
  const [importing, setImporting]         = useState(false)
  const [importError, setImportError]     = useState(null)
  const fileRef = React.useRef()

  const openCreate = () => { setEditing(null); setPanelOpen(true) }
  const openEdit   = (r) => { setEditing(r);   setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditing(null); setError(null) }

  const handleSave = async (draft) => {
    setSaving(true); setError(null)
    try {
      const row = {
        outreach_date: draft.outreach_date || null,
        address:       draft.address.trim(),
        community:     draft.community.trim() || null,
        agent_name:    draft.agent_name.trim() || null,
        brokerage:     draft.brokerage.trim()  || null,
        phone:          draft.phone.trim()          || null,
        email:          draft.email.trim()          || null,
        status:         draft.status,
        contact_method: draft.contact_method        ?? 'email',
        notes:          draft.notes.trim()          || null,
      }
      if (editing?.id) {
        await DB.updateOHOutreach(editing.id, row)
      } else {
        await DB.createOHOutreach(row)
        await DB.logActivity('outreach_created', `Added OH outreach: ${draft.address}`)
      }
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const saveNote = async (id) => {
    try {
      await DB.updateOHOutreach(id, { notes: noteVal.trim() || null })
      await refetch()
      setEditingNoteId(null)
    } catch { /* silent */ }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportError(null)
    try {
      const text = await file.text()
      const rows = parseOutreachCSV(text)
      if (!rows.length) throw new Error('No valid rows found in CSV')
      await Promise.all(rows.map(r => DB.createOHOutreach(r)))
      await refetch()
      await DB.logActivity('outreach_imported', `Imported ${rows.length} outreach records from CSV`)
    } catch (e) {
      setImportError(e.message)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const counts = { all: records.length }
  OUTREACH_STATUS_OPTIONS.forEach(s => { counts[s] = records.filter(r => r.status === s).length })
  const filtered = statusFilter === 'all' ? records : records.filter(r => r.status === statusFilter)

  return (
    <>
      <div className="oh-tab-header">
        <div className="oh-filter-pills">
          {['all', ...OUTREACH_STATUS_OPTIONS].map(s => (
            <button
              key={s}
              className={`oh-filter-pill${statusFilter === s ? ' oh-filter-pill--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? `All (${counts.all})` : `${outreachLabel[s]} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
          >{importing ? 'Importing…' : 'Import CSV'}</Button>
          <Button variant="primary" size="sm" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >Add Outreach</Button>
        </div>
      </div>
      {importError && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{importError}</p>}

      <div className="oh-outreach-wrap">
        <table className="outreach-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Property</th>
              <th>Agent</th>
              <th>Brokerage</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="outreach-empty">No outreach records</td></tr>
            )}
            {filtered.map(r => {
              const agentFirst = (sig.full_name || '').split(' ')[0] || ''
              const smsBody = encodeURIComponent(`Hi ${r.agent_name ?? 'there'}! This is ${agentFirst} with ${sig.brokerage || ''}. I'd love to host an open house at your listing at ${r.address}. Would you be open to it?`)
              const emailBody = encodeURIComponent(`Hi ${r.agent_name ?? 'there'},\n\nThis is ${sig.full_name || ''} with ${sig.brokerage || ''}. I wanted to reach out about your listing at ${r.address}.\n\nI'd love to host an open house for you. Would you be open to discussing?\n\nBest,\n${sig.full_name || ''}\n${sig.brokerage || ''}`)
              return (
              <tr key={r.id}>
                <td className="outreach-td--date">{fmtDate(r.outreach_date)}</td>
                <td className="outreach-td--address">
                  <AddressLink address={r.address}>{r.address}</AddressLink>
                  {r.community && <p className="outreach-sub">{r.community}</p>}
                </td>
                <td>{r.agent_name ?? '—'}</td>
                <td>{r.brokerage ?? '—'}</td>
                <td className="outreach-td--contact">
                  {r.phone && <a href={`tel:${r.phone.replace(/\D/g,'')}`} className="outreach-contact-link">📞 {r.phone}</a>}
                  {r.phone && <a href={`sms:${r.phone.replace(/\D/g,'')}&body=${smsBody}`} className="outreach-contact-link outreach-contact-link--sms">💬 Text</a>}
                  {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent('Open House Opportunity - ' + r.address)}&body=${emailBody}`} className="outreach-contact-link outreach-contact-link--email">✉️ Email</a>}
                  {!r.phone && !r.email && '—'}
                </td>
                <td><Badge variant={outreachVariant[r.status]} size="sm">{outreachLabel[r.status]}</Badge></td>
                <td className="outreach-td--notes">
                  {editingNoteId === r.id ? (
                    <div className="outreach-note-edit">
                      <textarea
                        className="outreach-note-textarea"
                        value={noteVal}
                        onChange={e => setNoteVal(e.target.value)}
                        rows={3}
                        autoFocus
                        placeholder="Add a note…"
                      />
                      <div className="outreach-note-actions">
                        <button className="outreach-note-save" onClick={() => saveNote(r.id)}>Save</button>
                        <button className="outreach-note-cancel" onClick={() => setEditingNoteId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`outreach-note-text${!r.notes ? ' outreach-note-text--empty' : ''}`}
                      onClick={() => { setEditingNoteId(r.id); setNoteVal(r.notes ?? '') }}
                      title="Click to edit note"
                    >
                      {r.notes || 'Add note…'}
                    </span>
                  )}
                </td>
                <td><Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button></td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <SlidePanel open={panelOpen} onClose={closePanel} title={editing ? 'Edit Outreach' : 'Add Outreach Contact'} width={480}>
        <OutreachForm record={editing} onSave={handleSave} onClose={closePanel} saving={saving} error={error} />
      </SlidePanel>
    </>
  )
}

// ─── Host Report Form (Dana's fields) ─────────────────────────────────────────
function HostReportForm({ report, listings, onSave, onClose, saving, error }) {
  const isNew = !report?.id
  const [draft, setDraft] = useState({
    listing_id:         report?.listing_id         ?? '',
    oh_date:            report?.oh_date            ?? '',
    start_time:         report?.start_time         ?? '',
    end_time:           report?.end_time           ?? '',
    agent_name:         report?.agent_name         ?? '',
    agent_brokerage:    report?.agent_brokerage    ?? '',
    agent_phone:        report?.agent_phone        ?? '',
    agent_email:        report?.agent_email        ?? '',
    // Pre-OH activities
    pre_oh_activities:  report?.pre_oh_activities  ?? '',
    // Attendance
    groups_through:     report?.groups_through     ?? 0,
    sign_in_count:      report?.sign_in_count      ?? 0,
    inquiries_count:    report?.inquiries_count    ?? 0,
    leads_count:        report?.leads_count        ?? 0,
    // Feedback
    overall_feedback:   report?.overall_feedback   ?? '',
    price_perception:   report?.price_perception   ?? '',
    overall_impression: report?.overall_impression ?? '',
    condition_notes:    report?.condition_notes    ?? '',
    common_questions:   report?.common_questions   ?? '',
    // Offer interest
    offer_interest:     report?.offer_interest     ?? '',
    // Notes
    notes:              report?.notes              ?? '',
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  // Agent attendees (repeatable rows)
  const [agentAttendees, setAgentAttendees] = useState(
    Array.isArray(report?.leads_json?.filter?.(l => l.type === 'agent'))
      ? report.leads_json.filter(l => l.type === 'agent')
      : []
  )
  const addAgent    = () => setAgentAttendees(p => [...p, { name: '', brokerage: '', phone: '', email: '', type: 'agent' }])
  const setAgent    = (i, f, v) => setAgentAttendees(p => p.map((a, idx) => idx === i ? { ...a, [f]: v } : a))
  const removeAgent = (i) => setAgentAttendees(p => p.filter((_, idx) => idx !== i))

  // Visitor leads (non-agent)
  const [leads, setLeads] = useState(
    Array.isArray(report?.leads_json?.filter?.(l => l.type !== 'agent'))
      ? report.leads_json.filter(l => l.type !== 'agent')
      : (Array.isArray(report?.leads_json) ? report.leads_json : [])
  )
  const addLead    = () => setLeads(p => [...p, { name: '', phone: '', email: '', interest: 'buyer' }])
  const setLead    = (i, f, v) => setLeads(p => p.map((l, idx) => idx === i ? { ...l, [f]: v } : l))
  const removeLead = (i) => setLeads(p => p.filter((_, idx) => idx !== i))

  const handleSubmit = () => {
    const combined = [
      ...leads,
      ...agentAttendees.map(a => ({ ...a, type: 'agent' })),
    ]
    onSave({ ...draft, leads_json: combined })
  }

  return (
    <>
      <div className="panel-section">
        <Select label="Listing Address *" value={draft.listing_id} onChange={e => set('listing_id', e.target.value)}>
          <option value="">— Select listing —</option>
          {listings.map(l => (
            <option key={l.id} value={l.id}>
              {l.property?.address ?? 'Unknown'}{l.property?.city ? ` · ${l.property.city}` : ''}
            </option>
          ))}
        </Select>
        <div className="panel-row">
          <Input label="Open House Date" type="date" value={draft.oh_date} onChange={e => set('oh_date', e.target.value)} />
        </div>
        <div className="panel-row">
          <Input label="Start Time" type="time" value={draft.start_time} onChange={e => set('start_time', e.target.value)} />
          <Input label="End Time" type="time" value={draft.end_time} onChange={e => set('end_time', e.target.value)} />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Hosting Agent Info</p>
        <div className="panel-row">
          <Input label="Agent Name" value={draft.agent_name} onChange={e => set('agent_name', e.target.value)} />
          <Input label="Brokerage" value={draft.agent_brokerage} onChange={e => set('agent_brokerage', e.target.value)} />
        </div>
        <div className="panel-row">
          <Input label="Phone" type="tel" value={draft.agent_phone} onChange={e => set('agent_phone', e.target.value)} />
          <Input label="Email" type="email" value={draft.agent_email} onChange={e => set('agent_email', e.target.value)} />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Pre-Open House Activities</p>
        <Textarea rows={3} value={draft.pre_oh_activities} onChange={e => set('pre_oh_activities', e.target.value)}
          placeholder="Door knocking, circle prospecting, flyer drops, social media…" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Attendance & Traffic</p>
        <div className="panel-row">
          <Input label="# Groups Through" type="number" min="0" value={draft.groups_through} onChange={e => set('groups_through', e.target.value)} />
          <Input label="Sign-in Count" type="number" min="0" value={draft.sign_in_count} onChange={e => set('sign_in_count', e.target.value)} />
        </div>
        <div className="panel-row">
          <Input label="Inquiries" type="number" min="0" value={draft.inquiries_count} onChange={e => set('inquiries_count', e.target.value)} />
          <Input label="Hot Leads" type="number" min="0" value={draft.leads_count} onChange={e => set('leads_count', e.target.value)} />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Overall Feedback (Positive & Negative)</p>
        <Textarea rows={4} value={draft.overall_feedback} onChange={e => set('overall_feedback', e.target.value)}
          placeholder="What went well? What concerns came up? General buyer sentiment…" />
        <div className="panel-row" style={{ marginTop: 8 }}>
          <Select label="Price Perception" value={draft.price_perception} onChange={e => set('price_perception', e.target.value)}>
            <option value="">— Select —</option>
            <option value="too_high">Too High</option>
            <option value="fair">Fair / Right</option>
            <option value="too_low">Too Low (great value!)</option>
          </Select>
          <Select label="Overall Impression" value={draft.overall_impression} onChange={e => set('overall_impression', e.target.value)}>
            <option value="">— Select —</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="neutral">Neutral</option>
            <option value="concerns">Concerns raised</option>
          </Select>
        </div>
        <Textarea label="Condition / Staging Notes" rows={2} value={draft.condition_notes} onChange={e => set('condition_notes', e.target.value)} placeholder="What did visitors say about condition, staging, etc.?" />
        <Textarea label="Common Questions Asked" rows={2} value={draft.common_questions} onChange={e => set('common_questions', e.target.value)} placeholder="What did people ask about most?" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Offer Interest</p>
        <Select value={draft.offer_interest} onChange={e => set('offer_interest', e.target.value)}>
          <option value="">— Select —</option>
          <option value="yes">Yes — someone hinted at an offer</option>
          <option value="no">No</option>
          <option value="maybe">Maybe — showed strong interest</option>
        </Select>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <div className="oh-leads-header">
          <p className="panel-section-label">Agent Attendees</p>
          <Button size="sm" variant="ghost" onClick={addAgent}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >Add Agent</Button>
        </div>
        {agentAttendees.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No agent attendees logged yet.</p>}
        {agentAttendees.map((agent, i) => (
          <div key={i} className="oh-lead-row">
            <Input placeholder="Agent Name" value={agent.name} onChange={e => setAgent(i, 'name', e.target.value)} />
            <Input placeholder="Brokerage" value={agent.brokerage} onChange={e => setAgent(i, 'brokerage', e.target.value)} />
            <Input placeholder="Phone" value={agent.phone} onChange={e => setAgent(i, 'phone', e.target.value)} />
            <Input placeholder="Email" value={agent.email} onChange={e => setAgent(i, 'email', e.target.value)} />
            <button className="oh-lead-remove" onClick={() => removeAgent(i)} title="Remove">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          </div>
        ))}
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <div className="oh-leads-header">
          <p className="panel-section-label">Visitor Leads</p>
          <Button size="sm" variant="ghost" onClick={addLead}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >Add Lead</Button>
        </div>
        {leads.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No visitor leads captured yet.</p>}
        {leads.map((lead, i) => (
          <div key={i} className="oh-lead-row">
            <Input placeholder="Name" value={lead.name} onChange={e => setLead(i, 'name', e.target.value)} />
            <Input placeholder="Phone" value={lead.phone} onChange={e => setLead(i, 'phone', e.target.value)} />
            <Input placeholder="Email" value={lead.email} onChange={e => setLead(i, 'email', e.target.value)} />
            <Select value={lead.interest} onChange={e => setLead(i, 'interest', e.target.value)}>
              <option value="buyer">Buyer</option>
              <option value="neighbor">Neighbor</option>
              <option value="investor">Investor</option>
              <option value="other">Other</option>
            </Select>
            <button className="oh-lead-remove" onClick={() => removeLead(i)} title="Remove">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          </div>
        ))}
      </div>

      <hr className="panel-divider" />
      <Textarea label="Additional Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything else to relay to the seller…" />

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem', marginTop: 8 }}>{error}</p>}
      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving || !draft.listing_id}>
          {saving ? 'Saving…' : isNew ? 'Submit Report' : 'Save Changes'}
        </Button>
      </div>
    </>
  )
}

// ─── Host Reports Tab ─────────────────────────────────────────────────────────
function HostReportsTab({ reports, listings, refetch }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)

  const openCreate = () => { setEditing(null); setPanelOpen(true) }
  const openEdit   = (r) => { setEditing(r);   setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditing(null); setError(null) }

  const impressionVariant = { excellent: 'success', good: 'info', neutral: 'default', concerns: 'warning' }
  const impressionLabel   = { excellent: 'Excellent', good: 'Good', neutral: 'Neutral', concerns: 'Concerns' }
  const priceVariant      = { too_high: 'danger', fair: 'success', too_low: 'info' }
  const priceLabel        = { too_high: 'Too High', fair: 'Fair', too_low: 'Too Low' }

  const handleSave = async (draft) => {
    setSaving(true); setError(null)
    try {
      const row = {
        listing_id:         draft.listing_id || null,
        oh_date:            draft.oh_date     || null,
        start_time:         draft.start_time  || null,
        end_time:           draft.end_time    || null,
        agent_name:         draft.agent_name.trim()       || null,
        agent_brokerage:    draft.agent_brokerage.trim()  || null,
        agent_phone:        draft.agent_phone.trim()      || null,
        agent_email:        draft.agent_email.trim()      || null,
        sign_in_count:      Number(draft.sign_in_count)   || 0,
        inquiries_count:    Number(draft.inquiries_count) || 0,
        leads_count:        Number(draft.leads_count)     || 0,
        price_perception:   draft.price_perception   || null,
        overall_impression: draft.overall_impression || null,
        condition_notes:    draft.condition_notes.trim()  || null,
        common_questions:   draft.common_questions.trim() || null,
        offer_interest:     draft.offer_interest ?? false,
        leads_json:         draft.leads_json ?? [],
        notes:              draft.notes.trim() || null,
      }
      if (editing?.id) {
        await DB.updateHostReport(editing.id, row)
      } else {
        await DB.createHostReport(row)
        await DB.logActivity('host_report_submitted', 'Host report submitted for listing')
      }
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="oh-tab-header">
        <p className="oh-tab-desc">Reports from agents who hosted open houses on your listings.</p>
        <Button variant="primary" size="sm" onClick={openCreate}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >Log Host Report</Button>
      </div>

      {reports.length === 0 ? (
        <div className="oh-empty">
          <p>No host reports yet. Use the button above to log a report from a hosting agent.</p>
        </div>
      ) : (
        <div className="oh-reports-grid">
          {reports.map(r => {
            const addr  = r.listing?.property?.address ?? 'Unknown listing'
            const leads = Array.isArray(r.leads_json) ? r.leads_json : []
            return (
              <div key={r.id} className="oh-report-card">
                <div className="oh-report-card__header">
                  <div>
                    <AddressLink address={addr} className="oh-report-card__address">{addr}</AddressLink>
                    <p className="oh-report-card__meta">{fmtDate(r.oh_date)}{r.start_time ? ` · ${r.start_time}` : ''}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
                </div>
                {(r.agent_name || r.agent_brokerage) && (
                  <p className="oh-report-card__agent">Hosted by {r.agent_name}{r.agent_brokerage ? ` · ${r.agent_brokerage}` : ''}</p>
                )}
                <div className="oh-report-card__stats">
                  <div className="oh-report-stat"><span>{r.sign_in_count}</span><span>Sign-ins</span></div>
                  <div className="oh-report-stat"><span>{r.inquiries_count}</span><span>Inquiries</span></div>
                  <div className="oh-report-stat"><span>{r.leads_count}</span><span>Leads</span></div>
                </div>
                <div className="oh-report-card__badges">
                  {r.overall_impression && <Badge variant={impressionVariant[r.overall_impression]} size="sm">{impressionLabel[r.overall_impression]}</Badge>}
                  {r.price_perception   && <Badge variant={priceVariant[r.price_perception]} size="sm">Price: {priceLabel[r.price_perception]}</Badge>}
                  {r.offer_interest     && <Badge variant="success" size="sm">Offer Interest</Badge>}
                </div>
                {r.condition_notes  && <p className="oh-report-card__note"><strong>Condition:</strong> {r.condition_notes}</p>}
                {r.common_questions && <p className="oh-report-card__note"><strong>Questions:</strong> {r.common_questions}</p>}
                {leads.length > 0 && (
                  <div className="oh-report-card__leads">
                    <p className="oh-report-card__leads-title">{leads.length} Lead{leads.length !== 1 ? 's' : ''} Captured</p>
                    {leads.map((l, i) => (
                      <p key={i} className="oh-report-lead-row">
                        {l.name}{l.phone ? ` · ${l.phone}` : ''}{l.email ? ` · ${l.email}` : ''}
                        {' '}<span className="oh-report-lead-type">{l.interest}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={closePanel} title={editing ? 'Edit Host Report' : 'Log Host Report'} width={520}>
        <HostReportForm key={editing?.id || 'new'} report={editing} listings={listings} onSave={handleSave} onClose={closePanel} saving={saving} error={error} />
      </SlidePanel>
    </>
  )
}

// ─── Process Tab ──────────────────────────────────────────────────────────────
function ProcessTab({ openHouses, refetch }) {
  // Show active + upcoming OHs; default to the soonest upcoming one
  const active = useMemo(() => {
    const upcoming = openHouses
      .filter(o => !['completed', 'cancelled'].includes(o.status))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    const recent = openHouses
      .filter(o => o.status === 'completed')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 3)
    return [...upcoming, ...recent]
  }, [openHouses])

  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [detailDraft, setDetailDraft] = useState({})
  const [detailOpen, setDetailOpen] = useState(false)

  // Auto-select first upcoming OH
  const selectedOH = active.find(o => o.id === selectedId) ?? active[0] ?? null

  // Inline detail update (date, time, Lofty URL)
  const openDetailEdit = (oh) => {
    setDetailDraft({
      date:               oh.date               ?? '',
      start_time:         oh.start_time         ?? '',
      end_time:           oh.end_time           ?? '',
      listing_agent:      oh.listing_agent      ?? '',
      lofty_landing_page: oh.lofty_landing_page ?? '',
    })
    setDetailOpen(true)
  }
  const saveDetail = async () => {
    if (!selectedOH) return
    setSaving(true)
    try {
      await DB.updateOpenHouse(selectedOH.id, {
        date:               detailDraft.date               || null,
        start_time:         detailDraft.start_time         || null,
        end_time:           detailDraft.end_time           || null,
        listing_agent:      detailDraft.listing_agent.trim() || null,
        lofty_landing_page: detailDraft.lofty_landing_page.trim() || null,
      })
      await refetch()
      setDetailOpen(false)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  if (!active.length) return (
    <div className="process-empty">
      <p>No open houses scheduled yet.</p>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Go to the Scheduled tab and click "Schedule Open House" to get started.</p>
    </div>
  )

  return (
    <div className="process-tab">
      {/* OH selector strip */}
      <div className="process-oh-strip">
        {active.map(oh => (
          <button
            key={oh.id}
            className={`process-oh-card${(selectedOH?.id === oh.id) ? ' process-oh-card--active' : ''}${oh.status === 'completed' ? ' process-oh-card--completed' : ''}`}
            onClick={() => setSelectedId(oh.id)}
          >
            <span className="process-oh-card__address">{oh.address}</span>
            <p className="process-oh-card__date">
              {oh.date ? new Date(oh.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date set'}
            </p>
            <Badge variant={ohStatusVariant[oh.status]} size="sm">{oh.status}</Badge>
          </button>
        ))}
      </div>

      {selectedOH && (
        <div className="process-content">
          {/* Header with key info + quick-edit */}
          <div className="process-header">
            <div className="process-header__info">
              <h2 className="process-header__address"><AddressLink address={selectedOH.address} city={selectedOH.city}>{selectedOH.address}</AddressLink></h2>
              <div className="process-header__meta">
                {selectedOH.listing_agent && <span>Listing Agent: <strong>{selectedOH.listing_agent}</strong></span>}
                {selectedOH.date && (
                  <span>{new Date(selectedOH.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}{selectedOH.time ? ` · ${selectedOH.time}` : ''}</span>
                )}
                {!selectedOH.date && <span className="process-header__missing">No date set yet</span>}
              </div>
              {selectedOH.lofty_landing_page && (
                <a href={selectedOH.lofty_landing_page} target="_blank" rel="noreferrer" className="oh-detail__link" style={{ marginTop: 4 }}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3"/><path d="M10 2h4v4"/><line x1="14" y1="2" x2="8" y2="8"/></svg>
                  Lofty Sign-In Page
                </a>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => openDetailEdit(selectedOH)}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
            >Update Details</Button>
          </div>

          {/* Inline detail edit */}
          {detailOpen && (
            <Card className="process-detail-edit">
              <p className="panel-section-label" style={{ marginBottom: 10 }}>Open House Details</p>
              <div className="panel-row">
                <Input label="Date" type="date" value={detailDraft.date} onChange={e => setDetailDraft(p => ({ ...p, date: e.target.value }))} />
                <Input label="Start Time" type="time" value={detailDraft.start_time} onChange={e => setDetailDraft(p => ({ ...p, start_time: e.target.value }))} />
                <Input label="End Time" type="time" value={detailDraft.end_time} onChange={e => setDetailDraft(p => ({ ...p, end_time: e.target.value }))} />
              </div>
              <Input label="Listing Agent" value={detailDraft.listing_agent} onChange={e => setDetailDraft(p => ({ ...p, listing_agent: e.target.value }))} placeholder="Victoria Cole" />
              <Input label="Lofty Landing Page URL" value={detailDraft.lofty_landing_page} onChange={e => setDetailDraft(p => ({ ...p, lofty_landing_page: e.target.value }))} placeholder="https://danamassey.com/address" />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button size="sm" variant="primary" onClick={saveDetail} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setDetailOpen(false)}>Cancel</Button>
              </div>
            </Card>
          )}

          {/* Full process checklist */}
          <div className="process-checklist-section">
            <h3 className="process-checklist-title">Process Checklist</h3>
            <TasksPanel ohId={selectedOH.id} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Calendar View ───────────────────────────────────────────────────────────
function CalendarView({ openHouses, onSelectOH }) {
  const [viewMode, setViewMode] = useState('week')  // 'week' | '3day' | 'weekend'
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  })

  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = today.toISOString().slice(0,10)

  // Calculate visible days based on view mode and anchor
  const visibleDays = useMemo(() => {
    const days = []
    if (viewMode === 'weekend') {
      // Find the Saturday of this week (or next if past Saturday)
      const d = new Date(anchorDate)
      const dow = d.getDay()
      const satOffset = dow <= 6 ? (6 - dow) : 0
      d.setDate(d.getDate() + satOffset)
      days.push(new Date(d))
      const sun = new Date(d); sun.setDate(sun.getDate() + 1)
      days.push(sun)
    } else if (viewMode === '3day') {
      for (let i = 0; i < 3; i++) {
        const d = new Date(anchorDate)
        d.setDate(d.getDate() + i)
        days.push(d)
      }
    } else {
      // Full week — start on the anchor day's Monday
      const d = new Date(anchorDate)
      const dow = d.getDay()
      const mondayOffset = dow === 0 ? -6 : 1 - dow
      d.setDate(d.getDate() + mondayOffset)
      for (let i = 0; i < 7; i++) {
        const day = new Date(d)
        day.setDate(day.getDate() + i)
        days.push(day)
      }
    }
    return days
  }, [viewMode, anchorDate])

  const navigate = (dir) => {
    setAnchorDate(prev => {
      const d = new Date(prev)
      if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
      else if (viewMode === '3day') d.setDate(d.getDate() + dir * 3)
      else d.setDate(d.getDate() + dir * 7) // weekend skips by week
      return d
    })
  }

  const goToday = () => {
    const d = new Date(); d.setHours(0,0,0,0)
    setAnchorDate(d)
  }

  // Group open houses by date
  const ohByDate = useMemo(() => {
    const map = {}
    openHouses.forEach(oh => {
      if (!oh.date) return
      if (!map[oh.date]) map[oh.date] = []
      map[oh.date].push(oh)
    })
    return map
  }, [openHouses])

  const gridCols = viewMode === 'week' ? 7 : viewMode === '3day' ? 3 : 2
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  // Header label
  const headerLabel = useMemo(() => {
    if (!visibleDays.length) return ''
    const first = visibleDays[0]
    const last = visibleDays[visibleDays.length - 1]
    const fmtOpts = { month: 'short', day: 'numeric' }
    if (first.getMonth() === last.getMonth()) {
      return `${first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} ${first.getDate()}–${last.getDate()}`
    }
    return `${first.toLocaleDateString('en-US', fmtOpts)} – ${last.toLocaleDateString('en-US', { ...fmtOpts, year: 'numeric' })}`
  }, [visibleDays])

  return (
    <div>
      <div className="oh-calendar-controls">
        <div className="oh-cal-view-btns">
          <button className={`oh-cal-view-btn${viewMode === 'week' ? ' oh-cal-view-btn--active' : ''}`} onClick={() => setViewMode('week')}>Full Week</button>
          <button className={`oh-cal-view-btn${viewMode === '3day' ? ' oh-cal-view-btn--active' : ''}`} onClick={() => setViewMode('3day')}>3 Days</button>
          <button className={`oh-cal-view-btn${viewMode === 'weekend' ? ' oh-cal-view-btn--active' : ''}`} onClick={() => setViewMode('weekend')}>Weekend</button>
        </div>
        <button className="oh-cal-today-btn" onClick={goToday}>Today</button>
        <div className="oh-cal-nav">
          <button className="oh-cal-nav-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="10 12 6 8 10 4"/></svg>
          </button>
          <span className="oh-cal-nav-label">{headerLabel}</span>
          <button className="oh-cal-nav-btn" onClick={() => navigate(1)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 4 10 8 6 12"/></svg>
          </button>
        </div>
      </div>

      <div className={`oh-cal-grid oh-cal-grid--${gridCols}`}>
        {/* Day headers */}
        {visibleDays.map((d, i) => (
          <div key={`h-${i}`} className="oh-cal-day-header">
            {dayNames[d.getDay()]} {d.getDate()}
          </div>
        ))}

        {/* Day cells */}
        {visibleDays.map((d, i) => {
          const dateStr = d.toISOString().slice(0,10)
          const isToday = dateStr === todayStr
          const dayOHs  = ohByDate[dateStr] ?? []

          return (
            <div key={`d-${i}`} className={`oh-cal-day${isToday ? ' oh-cal-day--today' : ''}`}>
              <span className="oh-cal-day__number">
                {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {dayOHs.map(oh => {
                const isHosted = !!oh.agent_name
                return (
                  <div
                    key={oh.id}
                    className={`oh-cal-event${isHosted ? ' oh-cal-event--hosted' : ' oh-cal-event--hosting'}`}
                    onClick={() => onSelectOH?.(oh)}
                  >
                    {oh.time && <span className="oh-cal-event__time">{oh.time}</span>}
                    <span className="oh-cal-event__address">{oh.address}</span>
                    {isHosted && <span className="oh-cal-event__host">{oh.agent_name} hosting</span>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function OpenHousesPage() {
  return (
    <OpenHousesErrorBoundary>
      <OpenHouses />
    </OpenHousesErrorBoundary>
  )
}

// ─── Day-of Banner ───────────────────────────────────────────────────────────
function DayOfBanner({ openHouses, onGoToProcess }) {
  const today = new Date().toISOString().slice(0, 10)
  const todaysOHs = openHouses.filter(oh => oh.date === today && !['cancelled'].includes(oh.status))
  if (!todaysOHs.length) return null

  const label = todaysOHs.length === 1
    ? todaysOHs[0].address
    : `${todaysOHs.length} open houses`
  const timeStr = todaysOHs.length === 1 && todaysOHs[0].time ? ` at ${todaysOHs[0].time}` : ''

  return (
    <div className="oh-day-banner">
      <span className="oh-day-banner__icon">🏡</span>
      <div className="oh-day-banner__text">
        <p className="oh-day-banner__title">You have {label} today{timeStr}!</p>
        <p className="oh-day-banner__sub">Check your process checklist to make sure everything is ready.</p>
      </div>
      <div className="oh-day-banner__action">
        <Button variant="primary" size="sm" onClick={onGoToProcess}>View Checklist</Button>
      </div>
    </div>
  )
}

function OpenHouses() {
  const [mainTab, setMainTab] = useState('scheduled')

  const { data: ohData,       loading: ohLoading,       refetch: refetchOH       } = useOpenHouses()
  const { data: outreachData, loading: outreachLoading, refetch: refetchOutreach } = useOHOutreach()
  const { data: reportsData,  refetch: refetchReports  } = useHostReports()
  const { data: listingsData } = useListings()

  const openHouses = useMemo(() => (ohData       ?? []).map(mapOH), [ohData])
  const outreach   = outreachData ?? []
  const reports    = reportsData  ?? []
  const listings   = listingsData ?? []

  return (
    <div className="open-houses">
      <DayOfBanner openHouses={openHouses} onGoToProcess={() => setMainTab('process')} />
      <SectionHeader
        title="Open Houses"
        subtitle="Scheduling, outreach tracking, and host reports"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <InfoTip text="Scheduled: upcoming open houses you've booked. Process: checklist of tasks to do before/during/after each OH. Outreach: agents you've contacted about hosting. Host Reports: post-OH summaries with lead counts and feedback." position="bottom" />
      </div>
      <TabBar
        tabs={[
          { label: 'Scheduled',     value: 'scheduled',    count: openHouses.length },
          { label: 'Calendar',      value: 'calendar'                               },
          { label: 'Process',       value: 'process'                                },
          { label: 'Outreach',      value: 'outreach',     count: outreach.length   },
          { label: 'Host Reports',  value: 'host_reports', count: reports.length    },
        ]}
        active={mainTab}
        onChange={setMainTab}
      />

      {mainTab === 'scheduled'    && <ScheduledTab    openHouses={openHouses} loading={ohLoading}       refetch={refetchOH}       />}
      {mainTab === 'calendar'     && <CalendarView    openHouses={openHouses} onSelectOH={() => setMainTab('scheduled')} />}
      {mainTab === 'process'      && <ProcessTab      openHouses={openHouses}                           refetch={refetchOH}       />}
      {mainTab === 'outreach'     && <OutreachTab     records={outreach}      loading={outreachLoading} refetch={refetchOutreach} />}
      {mainTab === 'host_reports' && <HostReportsTab  reports={reports}       listings={listings}       refetch={refetchReports}  />}
    </div>
  )
}
