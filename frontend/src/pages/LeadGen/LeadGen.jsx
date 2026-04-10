import { useState, useMemo } from 'react'
import { Button, Badge, SectionHeader, TabBar, DataTable, SlidePanel, Input, Select, Textarea, InfoTip, AddressLink } from '../../components/ui/index.jsx'
import { useLeads } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './LeadGen.css'

const STAGES = [
  'Identified', 'Day 1 — Card Sent', 'Day 3 — Call #1',
  'Day 7 — Call #2', 'Day 14 — Email', 'Day 21 — Final Call',
  'Converted', 'Dead',
]

const stageVariant = {
  'Identified':          'default',
  'Day 1 — Card Sent':   'accent',
  'Day 3 — Call #1':     'info',
  'Day 7 — Call #2':     'info',
  'Day 14 — Email':      'warning',
  'Day 21 — Final Call': 'warning',
  'Converted':           'success',
  'Dead':                'danger',
}

// ─── Map Supabase row → local shape ──────────────────────────────────────────
function mapLead(row) {
  const p = row.property ?? {}
  return {
    id:          row.id,
    address:     p.address     ?? '',
    city:        p.city        ?? '',
    zip:         p.zip         ?? '',
    expiredDate: p.expired_date ?? '',
    mlsId:       p.mls_id      ?? '',
    listPrice:   p.price ? `$${Number(p.price).toLocaleString()}` : '—',
    listPriceRaw: p.price ?? '',
    dom:         p.dom         ?? 0,
    stage:       row.stage     ?? 'Identified',
    relisted:    row.relisted  ?? false,
    notes:       row.notes     ?? '',
    property_id: row.property_id,
    next_follow_up: row.next_follow_up_date ?? '',
    last_contact:   row.last_contact_date   ?? '',
    letter_sent_at: row.letter_sent_at      ?? null,
    created_at:  row.created_at,
  }
}


// ─── Lead Form ────────────────────────────────────────────────────────────────
function LeadForm({ lead, onSave, onDelete, onClose, saving, deleting }) {
  const isNew = !lead?.id || typeof lead.id === 'number'
  const [draft, setDraft] = useState({
    address:     lead?.address     ?? '',
    city:        lead?.city        ?? '',
    zip:         lead?.zip         ?? '',
    mlsId:       lead?.mlsId       ?? '',
    listPrice:   lead?.listPriceRaw ?? '',
    dom:         lead?.dom         ?? '',
    expiredDate: lead?.expiredDate  ?? '',
    stage:       lead?.stage       ?? 'Identified',
    relisted:    lead?.relisted    ?? false,
    next_follow_up: lead?.next_follow_up ?? '',
    last_contact:   lead?.last_contact   ?? '',
    notes:       lead?.notes       ?? '',
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const handleSave = () => onSave(draft)

  return (
    <>
      <div className="panel-section">
        <Input label="Property Address *" value={draft.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
        <div className="panel-row">
          <Input label="City" value={draft.city} onChange={e => set('city', e.target.value)} placeholder="Gilbert" />
          <Input label="Zip" value={draft.zip} onChange={e => set('zip', e.target.value)} placeholder="85296" />
        </div>
        <div className="panel-row">
          <Input label="MLS #" value={draft.mlsId} onChange={e => set('mlsId', e.target.value)} placeholder="MLS0000000" />
          <Input label="List Price ($)" type="number" value={draft.listPrice} onChange={e => set('listPrice', e.target.value)} placeholder="450000" />
        </div>
        <div className="panel-row">
          <Input label="DOM" type="number" min="0" value={draft.dom} onChange={e => set('dom', e.target.value)} placeholder="90" />
          <Input label="Expired Date" type="date" value={draft.expiredDate} onChange={e => set('expiredDate', e.target.value)} />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Outreach</p>
        <Select label="Stage" value={draft.stage} onChange={e => set('stage', e.target.value)}>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </Select>
        <div className="panel-row">
          <Input label="Last Contact" type="date" value={draft.last_contact} onChange={e => set('last_contact', e.target.value)} />
          <Input label="Next Follow-up" type="date" value={draft.next_follow_up} onChange={e => set('next_follow_up', e.target.value)} />
        </div>
        <label className="buyer-checkbox-label">
          <input type="checkbox" checked={draft.relisted} onChange={e => set('relisted', e.target.checked)} />
          Property has been relisted with another agent
        </label>
      </div>

      <hr className="panel-divider" />
      <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Contact attempts, owner details, follow-up notes…" />

      {lead?.created_at && (
        <p className="panel-timestamp">Added {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      )}

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !draft.address.trim()}>
          {saving ? 'Saving…' : isNew ? 'Add Lead' : 'Save Changes'}
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

// ─── Main LeadGen Page ────────────────────────────────────────────────────────
export default function LeadGen() {
  const { data: dbData, loading, refetch } = useLeads()
  const dbLeads = useMemo(() => (dbData ?? []).map(mapLead), [dbData])
  const [localStages, setLocalStages] = useState({})

  // Merge DB data with any local stage overrides (for instant UI feedback)
  const leads = dbLeads.map(l => ({ ...l, stage: localStages[l.id] ?? l.stage }))

  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [scanningAll, setScanningAll] = useState(false)
  const [scanningId, setScanningId] = useState(null)
  const [letteringId, setLetteringId] = useState(null)

  const markLetter = async (id, e) => {
    e.stopPropagation()
    if (typeof id !== 'string') return
    setLetteringId(id)
    try {
      await DB.markLetterSent(id)
      await refetch()
    } catch { /* silent */ } finally {
      setLetteringId(null)
    }
  }
  const [panelOpen, setPanelOpen]   = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState(null)

  const openCreate = () => { setEditingLead(null); setPanelOpen(true) }
  const openEdit   = (lead) => { setEditingLead(lead); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditingLead(null); setError(null) }

  const updateStage = async (id, stage) => {
    setLocalStages(prev => ({ ...prev, [id]: stage }))
    if (typeof id === 'string') {
      try {
        await DB.updateLead(id, { stage })
        await DB.logActivity('lead_updated', `Lead stage updated to: ${stage}`)
      } catch (e) { /* silent */ }
    }
  }

  const handleSave = async (draft) => {
    setSaving(true)
    setError(null)
    try {
      const property_id = await DB.ensureProperty({
        address: draft.address, city: draft.city, zip: draft.zip,
        mls_id: draft.mlsId || null,
        price: draft.listPrice ? Number(draft.listPrice) : null,
        dom: draft.dom ? Number(draft.dom) : null,
        expired_date: draft.expiredDate || null,
      })
      const dbRow = {
        property_id,
        stage:              draft.stage,
        relisted:           draft.relisted,
        last_contact_date:  draft.last_contact   || null,
        next_follow_up_date: draft.next_follow_up || null,
        notes:              draft.notes.trim()   || null,
      }
      if (editingLead && typeof editingLead.id === 'string') {
        await DB.updateLead(editingLead.id, dbRow)
        await DB.logActivity('lead_updated', `Updated expired lead: ${draft.address}`, { propertyId: property_id })
      } else {
        await DB.createLead(dbRow)
        await DB.logActivity('lead_created', `New expired cannonball added: ${draft.address}`, { propertyId: property_id })
        // Auto-push into the contacts Database (fire-and-forget)
        DB.ensureContact({
          name: draft.address || 'Expired Lead',
          type: 'lead',
          source: 'Expired Listing',
          lead_source: 'expired',
          mls_status: draft.relisted ? 'relisted' : 'expired',
          notes: `LeadGen lead: ${draft.address}, ${draft.city || ''} ${draft.zip || ''}`.trim(),
        }).catch(err => console.warn('Failed to sync lead to contacts:', err))
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
    if (!editingLead || typeof editingLead.id !== 'string') return
    if (!confirm(`Remove lead at ${editingLead.address}?`)) return
    setDeleting(true)
    try {
      await DB.logActivity('lead_deleted', `Removed lead: ${editingLead.address}`)
      await DB.deleteLead(editingLead.id)
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const simulateScan = (id) => {
    setScanningId(id)
    setTimeout(() => {
      setScanningId(null)
    }, 1400)
  }

  const simulateScanAll = () => {
    setScanningAll(true)
    setTimeout(() => setScanningAll(false), 2200)
  }

  if (loading && !leads.length) return <div className="page-loading">Loading leads…</div>

  const filtered = leads.filter(l => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active'    && !['Converted', 'Dead'].includes(l.stage)) ||
      (filter === 'converted' && l.stage === 'Converted') ||
      (filter === 'relisted'  && l.relisted)
    const matchesSearch =
      !search ||
      l.address.toLowerCase().includes(search.toLowerCase()) ||
      l.mlsId.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const counts = {
    all:       leads.length,
    active:    leads.filter(l => !['Converted', 'Dead'].includes(l.stage)).length,
    converted: leads.filter(l => l.stage === 'Converted').length,
    relisted:  leads.filter(l => l.relisted).length,
  }

  const columns = [
    {
      key: 'address', label: 'Address',
      render: (v, row) => (
        <div>
          <AddressLink address={v} city={row.city} className="lead-address">{v}</AddressLink>
          <p className="lead-city">{row.city}, AZ {row.zip}</p>
        </div>
      ),
    },
    { key: 'mlsId', label: 'MLS #' },
    { key: 'listPrice', label: 'List Price' },
    { key: 'dom', label: 'DOM', render: v => <span className="dom-pill">{v}d</span> },
    { key: 'expiredDate', label: 'Expired', render: v => v ? new Date(v + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' },
    {
      key: 'stage', label: 'Stage',
      render: (v, row) => (
        <select
          className="stage-select"
          value={v}
          onClick={e => e.stopPropagation()}
          onChange={e => updateStage(row.id, e.target.value)}
        >
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    {
      key: 'relisted', label: 'Relisted?',
      render: v => v
        ? <Badge variant="warning" size="sm">Relisted</Badge>
        : <Badge variant="default" size="sm">Not Relisted</Badge>,
    },
    {
      key: 'next_follow_up', label: 'Next Follow-up',
      render: v => v ? new Date(v + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
    },
    {
      key: 'letter_sent_at', label: 'Letter',
      render: (v, row) => v ? (
        <span style={{ fontSize: '0.72rem', color: 'var(--color-success)' }}>
          ✓ {new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ) : (
        <button
          className="letter-btn"
          onClick={e => markLetter(row.id, e)}
          disabled={letteringId === row.id}
        >
          {letteringId === row.id ? '…' : '📨 Sent'}
        </button>
      ),
    },
    {
      key: 'scan', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" disabled={scanningId === row.id || scanningAll} onClick={e => { e.stopPropagation(); simulateScan(row.id) }}>
            {scanningId === row.id ? <span className="scanning-dots">Scanning<span>.</span><span>.</span><span>.</span></span> : 'Scan'}
          </Button>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row) }}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
          >Edit</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="lead-gen">
      <SectionHeader
        title="Cannonball Expireds"
        subtitle="Workflow tracker for expired listings — outreach pipeline"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="md" onClick={openCreate}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
            >Add Lead</Button>
            <Button variant="accent" size="md" disabled={scanningAll} onClick={simulateScanAll}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>}
            >{scanningAll ? 'Scanning All…' : 'Batch Relist Scan'}</Button>
          </div>
        }
      />

      <div className="pipeline-strip" style={{ position: 'relative' }}>
        {/* Pipeline overview */}
        <InfoTip text="Pipeline summary across all stages. Move leads through stages using the edit panel. 'Dead' leads are hidden here but still in your All tab." position="bottom" />
        {STAGES.filter(s => s !== 'Dead').map(stage => {
          const count = leads.filter(l => l.stage === stage).length
          return (
            <div key={stage} className={`pipeline-stage ${count > 0 ? 'pipeline-stage--active' : ''}`}>
              <span className="pipeline-stage__count">{count}</span>
              <span className="pipeline-stage__label">{stage}</span>
            </div>
          )
        })}
      </div>

      <div className="lead-gen__filters">
        <TabBar
          tabs={[
            { label: 'All', value: 'all', count: counts.all },
            { label: 'Active', value: 'active', count: counts.active },
            { label: 'Converted', value: 'converted', count: counts.converted },
            { label: 'Relisted', value: 'relisted', count: counts.relisted },
          ]}
          active={filter}
          onChange={setFilter}
        />
        <Input placeholder="Search address or MLS #…" value={search} onChange={e => setSearch(e.target.value)} className="lead-gen__search" />
      </div>

      <DataTable columns={columns} rows={filtered} />

      {scanningAll && (
        <div className="scan-overlay">
          <div className="scan-overlay__inner">
            <div className="scan-spinner" />
            <p>Running Relist Scan for all {leads.length} properties…</p>
          </div>
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={closePanel} title={editingLead ? 'Edit Lead' : 'Add Expired Lead'} subtitle={editingLead?.address} width={460}>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
        <LeadForm key={editingLead?.id || 'new'} lead={editingLead} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
      </SlidePanel>
    </div>
  )
}
