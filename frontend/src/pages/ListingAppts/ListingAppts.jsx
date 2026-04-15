import { useState, useMemo } from 'react'
import { Button, Badge, SectionHeader, TabBar, Card, SlidePanel, Input, Select, Textarea } from '../../components/ui/index.jsx'
import { useListingAppointments, useApptChecklist, useContacts } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './ListingAppts.css'

const OUTCOMES = ['pending','won','lost','cancelled','rescheduled']
const outcomeVariant = { pending:'info', won:'success', lost:'danger', cancelled:'default', rescheduled:'warning' }

const PREP_TASKS = [
  'Research seller background & motivation',
  'Run Comparable Market Analysis (CMA)',
  'Define pricing strategy & recommendation',
  'Build listing presentation deck',
  'Print pre-listing packet',
  'Research neighborhood, schools & recent sales',
  'Plan walkthrough talking points & objection responses',
]

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return '—'
  return dt.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
}

function fmtTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt)) return ''
  return dt.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
}

function getContactName(appt) {
  return appt.contact?.name || '—'
}

function getAddress(appt) {
  const addr = appt.property?.address || ''
  const city = appt.property?.city || ''
  return [addr, city].filter(Boolean).join(', ') || '—'
}

// ─── Appointment Form ──────────────────────────────────────────────────────────
function ApptForm({ appt, contacts, onSave, onDelete, onClose, saving, deleting, error }) {
  const isNew = !appt?.id
  const [draft, setDraft] = useState({
    contact_id:              appt?.contact_id              ?? appt?.contact?.id ?? '',
    scheduled_date:          appt?.scheduled_at ? new Date(appt.scheduled_at).toISOString().slice(0, 10) : '',
    scheduled_time:          appt?.scheduled_at ? new Date(appt.scheduled_at).toTimeString().slice(0, 5) : '',
    listing_price_discussed: appt?.listing_price_discussed ?? '',
    outcome:                 appt?.outcome                 ?? 'pending',
    lost_reason:             appt?.lost_reason             ?? '',
    notes:                   appt?.notes                   ?? '',
  })
  const [contactSearch, setContactSearch] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return (contacts ?? []).slice(0, 20)
    const q = contactSearch.toLowerCase()
    return (contacts ?? []).filter(c => c.name?.toLowerCase().includes(q)).slice(0, 20)
  }, [contacts, contactSearch])

  const selectedContact = (contacts ?? []).find(c => c.id === draft.contact_id)

  const startAddNew = () => {
    setAddingNew(true)
    setNewContact({ name: contactSearch.trim(), phone: '', email: '' })
  }

  const cancelAddNew = () => {
    setAddingNew(false)
    setNewContact({ name: '', phone: '', email: '' })
  }

  return (
    <>
      <div className="panel-section">
        <p className="panel-section-label">Client</p>
        {selectedContact ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <Badge variant="success">{selectedContact.name}</Badge>
            <Button variant="ghost" size="sm" onClick={() => set('contact_id', '')}>Change</Button>
          </div>
        ) : addingNew ? (
          <div className="la-new-contact-form">
            <div className="la-new-contact-header">
              <span className="la-new-contact-title">New Contact</span>
              <Button variant="ghost" size="sm" onClick={cancelAddNew}>Cancel</Button>
            </div>
            <Input label="Name *" value={newContact.name}
              onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
              placeholder="Jane Smith" autoFocus />
            <Input label="Phone" value={newContact.phone} type="tel"
              onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
              placeholder="(480) 555-1234" />
            <Input label="Email" value={newContact.email} type="email"
              onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
              placeholder="jane@email.com" />
          </div>
        ) : (
          <>
            <Input
              label="Search contacts"
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              placeholder="Type a name…"
              autoFocus={isNew}
            />
            {contactSearch.trim() && (
              <div className="la-contact-results">
                {filteredContacts.map(c => (
                  <button key={c.id} className="la-contact-result" onClick={() => { set('contact_id', c.id); setContactSearch('') }}>
                    <span className="la-contact-result-name">{c.name}</span>
                    <span className="la-contact-result-meta">{c.type} {c.phone ? `· ${c.phone}` : ''}</span>
                  </button>
                ))}
                <button className="la-contact-result la-contact-add-new" onClick={startAddNew}>
                  <span className="la-contact-result-name">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ verticalAlign:'middle', marginRight:6 }}>
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add "{contactSearch.trim()}" as new contact
                  </span>
                </button>
              </div>
            )}
          </>
        )}
        <Input label="Estimated List Price ($)" type="number" value={draft.listing_price_discussed} onChange={e => set('listing_price_discussed', e.target.value)} placeholder="550000" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Appointment</p>
        <div className="panel-row">
          <Input label="Date" type="date" value={draft.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
          <Input label="Time" type="time" value={draft.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
        </div>
        <div className="panel-row">
          <Select label="Outcome" value={draft.outcome} onChange={e => set('outcome', e.target.value)}>
            {OUTCOMES.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </Select>
        </div>
        {draft.outcome === 'lost' && (
          <Input label="Lost Reason" value={draft.lost_reason} onChange={e => set('lost_reason', e.target.value)} placeholder="Chose another agent, price disagreement, not ready…" />
        )}
      </div>

      <hr className="panel-divider" />
      <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Seller situation, motivation, timeline, concerns…" />

      {error && <p style={{ color:'var(--color-danger)', fontSize:'0.82rem', marginTop:8 }}>{error}</p>}
      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm"
          onClick={() => onSave(draft, addingNew ? newContact : null)}
          disabled={saving || (!draft.contact_id && !addingNew) || (addingNew && !newContact.name.trim())}>
          {saving ? 'Saving…' : isNew ? 'Add Appointment' : 'Save Changes'}
        </Button>
        {!isNew && (
          <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
            {deleting ? 'Removing…' : 'Delete'}
          </Button>
        )}
      </div>
    </>
  )
}

// ─── Prep Checklist (loaded per appointment) ───────────────────────────────────
function PrepChecklist({ apptId, onWon }) {
  const { data: tasksData, loading, refetch } = useApptChecklist(apptId)
  const tasks   = tasksData ?? []
  const [seeding, setSeeding] = useState(false)

  const seed = async () => {
    setSeeding(true)
    try {
      await DB.bulkCreateApptChecklist(
        PREP_TASKS.map((task_name, i) => ({ appointment_id: apptId, task_name, sort_order: i }))
      )
      await refetch()
    } catch { /* silent */ } finally { setSeeding(false) }
  }

  const toggle = async (task) => {
    const completed = !task.completed
    try {
      await DB.updateApptChecklistItem(task.id, {
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      await refetch()
    } catch { /* silent */ }
  }

  if (loading) return <p style={{ fontSize:'0.82rem', color:'var(--color-text-muted)' }}>Loading checklist…</p>

  if (!tasks.length) return (
    <div className="la-checklist-empty">
      <p>No prep tasks yet.</p>
      <Button variant="primary" size="sm" onClick={seed} disabled={seeding}>
        {seeding ? 'Setting up…' : 'Initialize Prep Checklist'}
      </Button>
    </div>
  )

  const done = tasks.filter(t => t.completed).length
  const pct  = Math.round((done / tasks.length) * 100)

  return (
    <div className="la-checklist">
      <div className="la-checklist-progress">
        <div className="la-checklist-bar">
          <div className="la-checklist-bar-fill" style={{ width:`${pct}%` }} />
        </div>
        <span className="la-checklist-pct">{done}/{tasks.length} done</span>
      </div>
      {tasks.map(task => (
        <div key={task.id} className={`la-task-row${task.completed ? ' la-task-row--done' : ''}`}>
          <button className={`la-task-check${task.completed ? ' la-task-check--done' : ''}`} onClick={() => toggle(task)}>
            {task.completed
              ? <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="var(--brown-mid)"/><polyline points="4.5 8 7 10.5 11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="var(--color-border)" strokeWidth="1.5"/></svg>
            }
          </button>
          <span className={`la-task-name${task.completed ? ' la-task-name--done' : ''}`}>{task.task_name}</span>
          {task.completed && task.completed_at && (
            <span className="la-task-date">{new Date(task.completed_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Appointment Detail SlidePanel body ───────────────────────────────────────
function ApptDetail({ appt, onEdit, onClose, onCreateListing }) {
  return (
    <>
      <div className="la-detail-header">
        <div>
          <h3 className="la-detail-name">{getContactName(appt)}</h3>
          <p className="la-detail-address">{getAddress(appt)}</p>
          <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
            <Badge variant={outcomeVariant[appt.outcome]}>{appt.outcome}</Badge>
            {appt.listing_price_discussed && (
              <Badge variant="default">${Number(appt.listing_price_discussed).toLocaleString()}</Badge>
            )}
          </div>
          {appt.scheduled_at && (
            <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', marginTop:6 }}>
              {fmtDate(appt.scheduled_at)} at {fmtTime(appt.scheduled_at)}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        >Edit</Button>
      </div>

      {appt.notes && (
        <Card style={{ padding:'12px 14px', marginBottom:4 }}>
          <p style={{ fontSize:'0.75rem', color:'var(--color-text-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>Notes</p>
          <p style={{ fontSize:'0.82rem', color:'var(--brown-dark)' }}>{appt.notes}</p>
        </Card>
      )}

      {appt.outcome === 'won' && (
        <Button variant="primary" size="sm" style={{ marginBottom:8 }} onClick={() => onCreateListing(appt)}>
          Create Listing from This Appointment →
        </Button>
      )}

      <h4 className="la-checklist-title">Pre-Appointment Prep</h4>
      {typeof appt.id === 'string'
        ? <PrepChecklist apptId={appt.id} />
        : <p style={{ fontSize:'0.82rem', color:'var(--color-text-muted)' }}>Save appointment first to access prep checklist.</p>
      }

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ListingAppts() {
  const { data, loading, refetch } = useListingAppointments()
  const { data: contactsData, refetch: refetchContacts } = useContacts()
  const appts = data ?? []
  const contacts = contactsData ?? []

  const [tab, setTab]             = useState('upcoming')
  const [panelMode, setPanelMode] = useState(null) // 'detail' | 'form'
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [editingAppt, setEditingAppt]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]     = useState(null)

  const openDetail = (appt) => { setSelectedAppt(appt); setEditingAppt(null); setPanelMode('detail') }
  const openCreate = () => { setEditingAppt(null); setSelectedAppt(null); setPanelMode('form') }
  const openEdit   = (appt) => { setEditingAppt(appt); setPanelMode('form') }
  const closePanel = () => { setPanelMode(null); setEditingAppt(null); setSelectedAppt(null); setError(null) }

  const handleSave = async (draft, newContactData) => {
    setSaving(true); setError(null)
    try {
      // If adding a new contact inline, create it first
      let contactId = draft.contact_id
      if (newContactData && !contactId) {
        const created = await DB.createContact({
          name:  newContactData.name.trim(),
          phone: newContactData.phone?.trim() || null,
          email: newContactData.email?.trim() || null,
          type:  'seller',
        })
        contactId = created.id
        refetchContacts()
      }

      // Build scheduled_at from date + time
      let scheduled_at = null
      if (draft.scheduled_date) {
        const timePart = draft.scheduled_time || '09:00'
        scheduled_at = new Date(`${draft.scheduled_date}T${timePart}`).toISOString()
      }

      const row = {
        contact_id:              contactId || null,
        scheduled_at,
        listing_price_discussed: draft.listing_price_discussed ? Number(draft.listing_price_discussed) : null,
        outcome:                 draft.outcome,
        lost_reason:             draft.lost_reason?.trim() || null,
        notes:                   draft.notes?.trim() || null,
      }
      let saved
      if (editingAppt?.id) {
        saved = await DB.updateListingAppointment(editingAppt.id, row)
        await DB.logActivity('appt_updated', `Updated listing appointment: ${getContactName(editingAppt)}`)
      } else {
        saved = await DB.createListingAppointment(row)
        // Auto-seed checklist
        await DB.bulkCreateApptChecklist(
          PREP_TASKS.map((task_name, i) => ({ appointment_id: saved.id, task_name, sort_order: i }))
        )
        await DB.logActivity('appt_created', `New listing appointment: ${newContactData?.name?.trim() || contacts.find(c => c.id === contactId)?.name || 'Client'}`)
      }
      await refetch()
      // Open detail after create
      if (!editingAppt) {
        setSelectedAppt({ ...row, id: saved.id, created_at: saved.created_at, contact: saved.contact, property: saved.property })
        setPanelMode('detail')
      } else {
        closePanel()
      }
    } catch (e) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editingAppt?.id) return
    if (!confirm(`Remove appointment with ${getContactName(editingAppt)}?`)) return
    setDeleting(true)
    try {
      await DB.deleteListingAppointment(editingAppt.id)
      await refetch()
      closePanel()
    } catch (e) { setError(e.message) }
    finally { setDeleting(false) }
  }

  const handleCreateListing = (appt) => {
    sessionStorage.setItem('newListing', JSON.stringify({
      address: appt.property?.address, city: appt.property?.city,
      listPrice: appt.listing_price_discussed,
      seller_name: getContactName(appt),
    }))
    window.location.href = '/sellers'
  }

  const upcoming = useMemo(() =>
    appts.filter(a => ['pending','rescheduled'].includes(a.outcome))
      .sort((a,b) => (a.scheduled_at||'').localeCompare(b.scheduled_at||''))
  , [appts])

  const history = useMemo(() =>
    appts.filter(a => ['won','lost','cancelled'].includes(a.outcome))
      .sort((a,b) => (b.scheduled_at||'').localeCompare(a.scheduled_at||''))
  , [appts])

  const wonCount  = appts.filter(a => a.outcome === 'won').length
  const totalDone = appts.filter(a => ['won','lost'].includes(a.outcome)).length
  const winRate   = totalDone > 0 ? Math.round((wonCount / totalDone) * 100) : null

  // Get the full appt from data when selectedAppt might be stale
  const currentAppt = selectedAppt?.id
    ? (appts.find(a => a.id === selectedAppt.id) ?? selectedAppt)
    : selectedAppt

  const columns = () => [
    {
      key: 'contact', label: 'Client',
      render: (_, row) => (
        <div>
          <p style={{ fontWeight:600, fontSize:'0.85rem' }}>{getContactName(row)}</p>
          <p style={{ fontSize:'0.72rem', color:'var(--color-text-muted)' }}>{getAddress(row)}</p>
        </div>
      ),
    },
    { key: 'scheduled_at', label: 'Date', render: v => fmtDate(v) },
    { key: 'scheduled_at_time', label: 'Time', render: (_, row) => fmtTime(row.scheduled_at) || '—' },
    {
      key: 'listing_price_discussed', label: 'Est. Price',
      render: v => v ? `$${Number(v).toLocaleString()}` : '—',
    },
    { key: 'outcome', label: 'Outcome', render: v => <Badge variant={outcomeVariant[v]}>{v}</Badge> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div style={{ display:'flex', gap:6 }}>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openDetail(row) }}>Prep</Button>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row) }}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
          >Edit</Button>
        </div>
      ),
    },
  ]

  if (loading && !appts.length) return <div className="page-loading">Loading appointments…</div>

  return (
    <div className="listing-appts">
      <SectionHeader
        title="Listing Appointments"
        subtitle="Track pre-listing prep and win/loss outcomes"
        actions={
          <Button variant="primary" size="md" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >Add Appointment</Button>
        }
      />

      {winRate !== null && (
        <div className="la-stats-row">
          <Card className="la-stat-card">
            <p className="la-stat-value">{appts.length}</p>
            <p className="la-stat-label">Total Appointments</p>
          </Card>
          <Card className="la-stat-card">
            <p className="la-stat-value">{wonCount}</p>
            <p className="la-stat-label">Listings Won</p>
          </Card>
          <Card className="la-stat-card">
            <p className="la-stat-value" style={{ color: winRate >= 60 ? 'var(--color-success)' : winRate >= 40 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
              {winRate}%
            </p>
            <p className="la-stat-label">Win Rate</p>
          </Card>
          <Card className="la-stat-card">
            <p className="la-stat-value">{upcoming.length}</p>
            <p className="la-stat-label">Upcoming</p>
          </Card>
        </div>
      )}

      <TabBar
        tabs={[
          { label:'Upcoming', value:'upcoming', count: upcoming.length },
          { label:'Won / Lost', value:'history', count: history.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'upcoming' && (
        upcoming.length === 0
          ? <p className="la-empty">No upcoming appointments. Add one to get started.</p>
          : <div className="la-table-wrap">
              <table className="la-table">
                <thead><tr>{columns().map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>
                  {upcoming.map(row => (
                    <tr key={row.id} className="la-table-row" onClick={() => openDetail(row)}>
                      {columns().map(c => (
                        <td key={c.key}>{c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {tab === 'history' && (
        history.length === 0
          ? <p className="la-empty">No completed appointments yet.</p>
          : <div className="la-table-wrap">
              <table className="la-table">
                <thead><tr>{columns().map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.id} className={`la-table-row la-table-row--${row.outcome}`} onClick={() => openDetail(row)}>
                      {columns().map(c => (
                        <td key={c.key}>{c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {/* Detail panel */}
      <SlidePanel open={panelMode === 'detail'} onClose={closePanel}
        title={currentAppt ? getContactName(currentAppt) : 'Appointment'} subtitle={currentAppt ? getAddress(currentAppt) : ''} width={480}>
        {currentAppt && (
          <ApptDetail
            appt={currentAppt}
            onEdit={() => openEdit(currentAppt)}
            onClose={closePanel}
            onCreateListing={handleCreateListing}
          />
        )}
      </SlidePanel>

      {/* Form panel */}
      <SlidePanel open={panelMode === 'form'} onClose={closePanel}
        title={editingAppt ? 'Edit Appointment' : 'Add Appointment'}
        subtitle={editingAppt ? getContactName(editingAppt) : ''} width={460}>
        <ApptForm
          key={editingAppt?.id || 'new'}
          appt={editingAppt}
          contacts={contacts}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closePanel}
          saving={saving}
          deleting={deleting}
          error={error}
        />
      </SlidePanel>
    </div>
  )
}
