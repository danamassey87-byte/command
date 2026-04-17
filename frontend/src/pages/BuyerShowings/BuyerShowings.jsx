import { useMemo, useState, useRef, useEffect } from 'react'
import { Badge, Button, SectionHeader, TabBar, DataTable, AddressLink, SlidePanel, Select, Textarea, Input } from '../../components/ui/index.jsx'
import { useShowingSessions, useContacts, useProperties } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import ShowingCalendar from '../../components/ui/ShowingCalendar.jsx'
import './BuyerShowings.css'

const interestVariant = { high: 'success', medium: 'warning', low: 'danger' }

// ─── Property Autocomplete ──────────────────────────────────────────────────
function PropertyAutocomplete({ properties, selected, onSelect, onAddNew }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const filtered = useMemo(() => {
    if (!query) return properties.slice(0, 8)
    const q = query.toLowerCase()
    return properties.filter(p =>
      (p.address ?? '').toLowerCase().includes(q) ||
      (p.city ?? '').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [properties, query])

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Input
        label="Property Address"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Start typing an address..."
        autoComplete="off"
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(p); setQuery(p.address); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                fontSize: '0.82rem', border: 'none', background: selected?.id === p.id ? 'var(--color-bg-hover, #f5f0ea)' : 'none',
                cursor: 'pointer', color: 'var(--brown-dark)',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover, #f5f0ea)'}
              onMouseOut={e => e.currentTarget.style.background = selected?.id === p.id ? 'var(--color-bg-hover, #f5f0ea)' : 'none'}
            >
              <span style={{ fontWeight: 600 }}>{p.address}</span>
              <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>{p.city}{p.price ? ` · $${Number(p.price).toLocaleString()}` : ''}</span>
            </button>
          ))}
          {query.trim() && filtered.length === 0 && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onAddNew(query.trim()); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: '0.82rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--brown-mid)', fontWeight: 600 }}
            >
              + Add "{query.trim()}" as new property
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Schedule Showing Panel ─────────────────────────────────────────────────
function ScheduleShowingPanel({ onClose, onSaved, contacts, properties }) {
  const [contactId, setContactId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [selectedProps, setSelectedProps] = useState([]) // array of property objects
  const [saving, setSaving] = useState(false)

  const addProperty = (prop) => {
    if (selectedProps.find(p => p.id === prop.id)) return
    setSelectedProps(prev => [...prev, prop])
  }

  const addNewProperty = async (address) => {
    try {
      const id = await DB.ensureProperty({ address })
      const newProp = { id, address, city: '', price: null }
      setSelectedProps(prev => [...prev, newProp])
    } catch (e) { alert(e.message) }
  }

  const removeProperty = (id) => {
    setSelectedProps(prev => prev.filter(p => p.id !== id))
  }

  const handleSave = async () => {
    if (!contactId || !date || selectedProps.length === 0) return
    setSaving(true)
    try {
      const session = await DB.createShowingSession({ contact_id: contactId, date, notes: notes.trim() || null })
      for (const prop of selectedProps) {
        await DB.createShowing({ session_id: session.id, property_id: prop.id, contact_id: contactId, status: 'scheduled' })
      }
      await DB.logActivity('showing_scheduled', `Scheduled ${selectedProps.length} showing(s) for ${date}`, { contactId })
      onSaved()
      onClose()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const buyers = (contacts ?? []).filter(c => c.type === 'buyer' || c.type === 'both')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Select label="Buyer *" value={contactId} onChange={e => setContactId(e.target.value)}>
        <option value="">— Select Buyer —</option>
        {buyers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Input label="Date *" type="date" value={date} onChange={e => setDate(e.target.value)} />

      <PropertyAutocomplete
        properties={properties ?? []}
        selected={null}
        onSelect={addProperty}
        onAddNew={addNewProperty}
      />

      {selectedProps.length > 0 && (
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 4 }}>Properties to show ({selectedProps.length})</p>
          {selectedProps.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6, marginBottom: 4 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{p.address}{p.city ? `, ${p.city}` : ''}</span>
              <button onClick={() => removeProperty(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '0.9rem' }}>×</button>
            </div>
          ))}
        </div>
      )}

      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any showing notes, lockbox codes, instructions..." />

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Button onClick={handleSave} disabled={saving || !contactId || !date || selectedProps.length === 0}>
          {saving ? 'Scheduling...' : `Schedule ${selectedProps.length || ''} Showing${selectedProps.length > 1 ? 's' : ''}`}
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}
const priceLabels = { too_high: 'Too High', fair: 'Fair', too_low: 'Good Value' }

// ─── Edit Panel ──────────────────────────────────────────────────────────────
function ShowingEditPanel({ showing, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    interest_level:     showing?.interest_level     ?? '',
    feedback_price:     showing?.feedback_price     ?? '',
    feedback_condition: showing?.feedback_condition ?? '',
    buyer_feedback:     showing?.buyer_feedback     ?? '',
    prep_notes:         showing?.prep_notes         ?? '',
    would_offer:        showing?.would_offer        ?? false,
    follow_up_sent:     showing?.follow_up_sent     ?? false,
    status:             showing?.status             ?? 'toured',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await DB.updateShowing(showing.id, {
        interest_level:     draft.interest_level     || null,
        feedback_price:     draft.feedback_price     || null,
        feedback_condition: draft.feedback_condition  || null,
        buyer_feedback:     draft.buyer_feedback.trim() || null,
        prep_notes:         draft.prep_notes.trim()    || null,
        would_offer:        draft.would_offer,
        follow_up_sent:     draft.follow_up_sent,
        status:             draft.status             || null,
      })
      await onSaved()
      onClose()
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const addr = showing?.property?.address ?? '—'
  const city = showing?.property?.city ?? ''
  const price = showing?.property?.price ? `$${Number(showing.property.price).toLocaleString()}` : ''

  return (
    <>
      <div className="bs-edit-property">
        <AddressLink address={addr} city={city}>{addr}</AddressLink>
        <p className="bs-edit-meta">{city}{price ? ` · ${price}` : ''}</p>
        <p className="bs-edit-meta">Buyer: <strong>{showing?.clientName ?? '—'}</strong> · {showing?.sessionDate ? new Date(showing.sessionDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</p>
      </div>

      <hr className="panel-divider" />

      <div className="panel-section">
        <p className="panel-section-label">Assessment</p>
        <div className="panel-row">
          <Select label="Interest Level" value={draft.interest_level} onChange={e => set('interest_level', e.target.value)}>
            <option value="">—</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select label="Price Perception" value={draft.feedback_price} onChange={e => set('feedback_price', e.target.value)}>
            <option value="">—</option>
            <option value="too_high">Too High</option>
            <option value="fair">Fair</option>
            <option value="too_low">Good Value</option>
          </Select>
        </div>
        <Select label="Condition" value={draft.feedback_condition} onChange={e => set('feedback_condition', e.target.value)}>
          <option value="">—</option>
          <option value="move_in_ready">Move-in Ready</option>
          <option value="needs_cosmetic">Needs Cosmetic Work</option>
          <option value="needs_major">Needs Major Work</option>
        </Select>
        <Select label="Status" value={draft.status} onChange={e => set('status', e.target.value)}>
          <option value="scheduled">Scheduled</option>
          <option value="toured">Toured</option>
          <option value="offer-accepted">Offer Accepted</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <hr className="panel-divider" />

      <div className="panel-section">
        <p className="panel-section-label">Notes</p>
        <Textarea label="Prep Notes" rows={2} value={draft.prep_notes} onChange={e => set('prep_notes', e.target.value)} placeholder="Talking points, things to highlight…" />
        <Textarea label="Buyer Feedback" rows={3} value={draft.buyer_feedback} onChange={e => set('buyer_feedback', e.target.value)} placeholder="Buyer's reaction, what they liked/disliked…" />
      </div>

      <hr className="panel-divider" />

      <div className="panel-section">
        <p className="panel-section-label">Follow-up</p>
        <div className="bs-check-row">
          <label className="bs-check-label">
            <input type="checkbox" checked={draft.would_offer} onChange={e => set('would_offer', e.target.checked)} />
            Would make an offer
          </label>
          <label className="bs-check-label">
            <input type="checkbox" checked={draft.follow_up_sent} onChange={e => set('follow_up_sent', e.target.checked)} />
            Follow-up sent
          </label>
        </div>
      </div>

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function BuyerShowings() {
  const { data: sessions, loading, refetch } = useShowingSessions()
  const { data: contactsData } = useContacts()
  const { data: propertiesData } = useProperties()
  const [view, setView] = useState('list')
  const [clientFilter, setClientFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [editingShowing, setEditingShowing] = useState(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const clientNames = useMemo(() => {
    if (!sessions) return []
    const names = new Set()
    sessions.forEach(s => { if (s.contact?.name) names.add(s.contact.name) })
    return [...names].sort()
  }, [sessions])

  const allShowings = useMemo(() => {
    if (!sessions) return []
    return sessions.flatMap(s =>
      (s.showings ?? []).map(sh => ({
        ...sh,
        sessionDate: s.date,
        clientName: s.contact?.name ?? '—',
        clientId: s.contact?.id,
      }))
    ).sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? ''))
  }, [sessions])

  const filtered = useMemo(() => {
    let rows = allShowings
    if (clientFilter !== 'all') rows = rows.filter(r => r.clientName === clientFilter)
    if (timeFilter === 'today') rows = rows.filter(r => r.sessionDate === today)
    else if (timeFilter === 'upcoming') rows = rows.filter(r => r.sessionDate >= today)
    else if (timeFilter === 'past') rows = rows.filter(r => r.sessionDate < today)
    return rows
  }, [allShowings, clientFilter, timeFilter, today])

  const counts = useMemo(() => {
    const match = r => clientFilter === 'all' || r.clientName === clientFilter
    return {
      all: allShowings.filter(match).length,
      today: allShowings.filter(r => r.sessionDate === today && match(r)).length,
      upcoming: allShowings.filter(r => r.sessionDate >= today && match(r)).length,
      past: allShowings.filter(r => r.sessionDate < today && match(r)).length,
    }
  }, [allShowings, clientFilter, today])

  const columns = [
    { key: 'sessionDate', label: 'Date', render: v => v ? new Date(v + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
    { key: 'clientName', label: 'Buyer', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { key: 'property', label: 'Property', render: v => v ? <AddressLink address={v.address} city={v.city}>{v.address}</AddressLink> : '—' },
    { key: 'property', label: 'City', render: v => v?.city ?? '—' },
    { key: 'property', label: 'Price', render: v => v?.price ? `$${Number(v.price).toLocaleString()}` : '—' },
    { key: 'interest_level', label: 'Interest', render: v => v ? <Badge variant={interestVariant[v]} size="sm">{v}</Badge> : '—' },
    { key: 'buyer_feedback', label: 'Feedback', render: v => v ? <span className="bs-feedback-cell" title={v}>{v}</span> : '—' },
    {
      key: 'edit', label: '',
      render: (_, row) => (
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setEditingShowing(row) }}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        >Edit</Button>
      ),
    },
  ]

  if (loading) return <div className="page-loading">Loading showings…</div>

  return (
    <div className="buyer-showings">
      <SectionHeader
        title="Buyer Showings"
        subtitle={`${filtered.length} showing${filtered.length !== 1 ? 's' : ''}${clientFilter !== 'all' ? ` for ${clientFilter}` : ''}`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button onClick={() => setScheduleOpen(true)}>+ Schedule Showing</Button>
          <div className="buyers__view-toggle">
            <button className={`buyers__view-btn ${view === 'list' ? 'buyers__view-btn--active' : ''}`} onClick={() => setView('list')} title="List">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button className={`buyers__view-btn ${view === 'calendar' ? 'buyers__view-btn--active' : ''}`} onClick={() => setView('calendar')} title="Calendar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
          </div>
          </div>
        }
      />

      <div className="bs-filters">
        <div className="bs-client-filter">
          <label className="bs-filter-label">Client</label>
          <select className="bs-client-select" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="all">All Buyers</option>
            {clientNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        <TabBar
          tabs={[
            { label: 'All', value: 'all', count: counts.all },
            { label: 'Today', value: 'today', count: counts.today },
            { label: 'Upcoming', value: 'upcoming', count: counts.upcoming },
            { label: 'Past', value: 'past', count: counts.past },
          ]}
          active={timeFilter}
          onChange={setTimeFilter}
        />
      </div>

      {view === 'list' ? (
        <DataTable columns={columns} rows={filtered} onRowClick={setEditingShowing} />
      ) : (
        <ShowingCalendar
          sessions={(sessions ?? []).filter(s =>
            clientFilter === 'all' || s.contact?.name === clientFilter
          )}
        />
      )}

      <SlidePanel
        open={!!editingShowing}
        onClose={() => setEditingShowing(null)}
        title="Edit Showing"
        subtitle={editingShowing?.property?.address}
        width={480}
      >
        {editingShowing && (
          <ShowingEditPanel
            showing={editingShowing}
            onClose={() => setEditingShowing(null)}
            onSaved={refetch}
          />
        )}
      </SlidePanel>

      {/* ─── Schedule Showing Panel ─── */}
      <SlidePanel
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule Showing"
        subtitle="Select a buyer and properties to show"
        width={500}
      >
        <ScheduleShowingPanel
          onClose={() => setScheduleOpen(false)}
          onSaved={refetch}
          contacts={contactsData}
          properties={propertiesData}
        />
      </SlidePanel>
    </div>
  )
}
