import { useState, useMemo } from 'react'
import { Button, Badge, SectionHeader, TabBar, DataTable, Card, SlidePanel, Input, Select, Textarea, AddressLink } from '../../components/ui/index.jsx'
import { useBuyers, useShowingSessionsForContact } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './Buyers.css'

// Map Supabase contact row → internal buyer shape
function mapClient(c) {
  return {
    id:                  c.id,
    name:                c.name ?? '—',
    phone:               c.phone ?? '',
    email:               c.email ?? '',
    source:              c.source ?? 'Client',
    stage:               c.stage  ?? 'New Lead',
    preApproved:         false,
    repAgreement:        !!c.bba_signed,
    budget:              c.budget_min ? `$${Number(c.budget_min).toLocaleString()}${c.budget_max ? `–$${Number(c.budget_max).toLocaleString()}` : '+'}` : '—',
    budget_min:          c.budget_min ?? '',
    budget_max:          c.budget_max ?? '',
    areas:               c.areas ?? [],
    beds:                c.beds_min ?? 0,
    baths:               c.baths_min ?? 0,
    bba_signed:          c.bba_signed ?? false,
    bba_signed_date:     c.bba_signed_date ?? null,
    bba_expiration_date: c.bba_expiration_date ?? null,
    notes:               c.notes ?? '',
    type:                c.type ?? 'buyer',
    showings:            [],
    created_at:          c.created_at,
  }
}


const stages = ['New Lead', 'Pre-Approval', 'Active Search', 'Showing', 'Under Contract', 'Closed', 'Inactive']
const sources = ['Referral', 'Open House', 'Zillow', 'Realtor.com', 'Instagram', 'Facebook', 'Website', 'Client', 'Other']

const stageVariant = {
  'New Lead': 'default', 'Pre-Approval': 'warning', 'Active Search': 'info',
  'Showing': 'info', 'Under Contract': 'accent', 'Closed': 'success', 'Inactive': 'danger',
}

const showingStatusVariant = { 'scheduled': 'info', 'toured': 'default', 'offer-accepted': 'success' }

// ─── Buyer Edit Form ───────────────────────────────────────────────────────────
function BuyerForm({ buyer, onSave, onDelete, onClose, saving, deleting }) {
  const isNew = !buyer?.id || typeof buyer.id === 'number'
  const [draft, setDraft] = useState({
    name:                buyer?.name ?? '',
    phone:               buyer?.phone ?? '',
    email:               buyer?.email ?? '',
    type:                buyer?.type ?? 'buyer',
    source:              buyer?.source ?? 'Client',
    stage:               buyer?.stage ?? 'New Lead',
    budget_min:          buyer?.budget_min ?? '',
    budget_max:          buyer?.budget_max ?? '',
    areas:               Array.isArray(buyer?.areas) ? buyer.areas.join(', ') : (buyer?.areas ?? ''),
    beds_min:            buyer?.beds ?? buyer?.beds_min ?? '',
    baths_min:           buyer?.baths ?? buyer?.baths_min ?? '',
    bba_signed:          buyer?.bba_signed ?? buyer?.repAgreement ?? false,
    bba_signed_date:     buyer?.bba_signed_date ?? '',
    bba_expiration_date: buyer?.bba_expiration_date ?? '',
    notes:               buyer?.notes ?? '',
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    onSave({
      name:                draft.name.trim(),
      phone:               draft.phone.trim() || null,
      email:               draft.email.trim() || null,
      source:              draft.source || null,
      stage:               draft.stage,
      budget_min:          draft.budget_min !== '' ? Number(draft.budget_min) : null,
      budget_max:          draft.budget_max !== '' ? Number(draft.budget_max) : null,
      areas:               draft.areas ? draft.areas.split(',').map(a => a.trim()).filter(Boolean) : [],
      beds_min:            draft.beds_min !== '' ? Number(draft.beds_min) : null,
      baths_min:           draft.baths_min !== '' ? Number(draft.baths_min) : null,
      bba_signed:          draft.bba_signed,
      bba_signed_date:     draft.bba_signed && draft.bba_signed_date ? draft.bba_signed_date : null,
      bba_expiration_date: draft.bba_signed && draft.bba_expiration_date ? draft.bba_expiration_date : null,
      notes:               draft.notes.trim() || null,
      type:                draft.type,
    })
  }

  return (
    <>
      <div className="panel-section">
        <Input label="Full Name *" value={draft.name} onChange={e => set('name', e.target.value)} placeholder="First & Last Name" />
        <div className="panel-row">
          <Input label="Phone" value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="(480) 555-0000" />
          <Input label="Email" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
        </div>
        <div className="panel-row">
          <Select label="Client Type" value={draft.type} onChange={e => set('type', e.target.value)}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="both">Buyer & Seller</option>
          </Select>
          <Select label="Source" value={draft.source} onChange={e => set('source', e.target.value)}>
            {sources.map(s => <option key={s}>{s}</option>)}
          </Select>
        </div>
        <Select label="Stage" value={draft.stage} onChange={e => set('stage', e.target.value)}>
          {stages.map(s => <option key={s}>{s}</option>)}
        </Select>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Requirements</p>
        <div className="panel-row">
          <Input label="Budget Min ($)" type="number" value={draft.budget_min} onChange={e => set('budget_min', e.target.value)} placeholder="450000" />
          <Input label="Budget Max ($)" type="number" value={draft.budget_max} onChange={e => set('budget_max', e.target.value)} placeholder="500000" />
        </div>
        <div className="panel-row">
          <Input label="Min Beds" type="number" value={draft.beds_min} onChange={e => set('beds_min', e.target.value)} min="0" />
          <Input label="Min Baths" type="number" value={draft.baths_min} onChange={e => set('baths_min', e.target.value)} min="0" />
        </div>
        <Input label="Target Areas (comma-separated)" value={draft.areas} onChange={e => set('areas', e.target.value)} placeholder="Gilbert, Chandler, Mesa" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Compliance</p>
        <label className="buyer-checkbox-label">
          <input type="checkbox" checked={draft.bba_signed} onChange={e => set('bba_signed', e.target.checked)} />
          BBA / Buyer Representation Agreement Signed
        </label>
        {draft.bba_signed && (
          <div className="panel-row" style={{ marginTop: 10 }}>
            <Input label="Signed Date" type="date" value={draft.bba_signed_date} onChange={e => set('bba_signed_date', e.target.value)} />
            <Input label="Expiration Date" type="date" value={draft.bba_expiration_date} onChange={e => set('bba_expiration_date', e.target.value)} />
          </div>
        )}
      </div>

      <hr className="panel-divider" />
      <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Key requirements, timeline, financing notes…" />

      {buyer?.created_at && (
        <p className="panel-timestamp">Added {new Date(buyer.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      )}

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !draft.name.trim()}>
          {saving ? 'Saving…' : isNew ? 'Add Buyer' : 'Save Changes'}
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

// ─── Buyer Detail ─────────────────────────────────────────────────────────────
function BuyerDetail({ buyer, onBack, onEdit }) {
  const { data: sessionsData, refetch: refetchSessions } = useShowingSessionsForContact(buyer.id)
  const sessions = sessionsData ?? []

  const [editingShowingId, setEditingShowingId] = useState(null)
  const [showingDraft, setShowingDraft]         = useState({})
  const [savingShowing, setSavingShowing]       = useState(false)

  const openShowingEdit = (showing) => {
    setEditingShowingId(showing.id)
    setShowingDraft({
      prep_notes:         showing.prep_notes        ?? '',
      buyer_feedback:     showing.buyer_feedback     ?? '',
      feedback_price:     showing.feedback_price     ?? '',
      feedback_condition: showing.feedback_condition ?? '',
      would_offer:        showing.would_offer        ?? false,
      follow_up_sent:     showing.follow_up_sent     ?? false,
      interest_level:     showing.interest_level     ?? '',
    })
  }

  const saveShowingEdit = async (showingId) => {
    setSavingShowing(true)
    try {
      await DB.updateShowing(showingId, {
        prep_notes:         showingDraft.prep_notes.trim()        || null,
        buyer_feedback:     showingDraft.buyer_feedback.trim()    || null,
        feedback_price:     showingDraft.feedback_price           || null,
        feedback_condition: showingDraft.feedback_condition       || null,
        would_offer:        showingDraft.would_offer,
        follow_up_sent:     showingDraft.follow_up_sent,
        interest_level:     showingDraft.interest_level           || null,
      })
      await refetchSessions()
      setEditingShowingId(null)
    } catch { /* silent */ } finally { setSavingShowing(false) }
  }

  const setSD = (k, v) => setShowingDraft(p => ({ ...p, [k]: v }))

  const allShowings = sessions.flatMap(s => (s.showings ?? []).map(sh => ({ ...sh, sessionDate: s.date })))
  const interestVariant = { high:'success', medium:'warning', low:'danger' }
  const priceLabel = { too_high:'Too High', fair:'Fair', too_low:'Good Value' }
  const priceVariant = { too_high:'danger', fair:'success', too_low:'info' }

  return (
    <div className="buyer-detail">
      <div className="buyer-detail__nav">
        <button className="oh-detail__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Buyers
        </button>
        <Button variant="ghost" size="sm" onClick={onEdit}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        >Edit Buyer</Button>
      </div>

      <div className="buyer-detail__header">
        <div>
          <h2 className="buyer-detail__name">{buyer.name}</h2>
          <p className="buyer-detail__contact">{buyer.phone} &bull; {buyer.email}</p>
          <div className="buyer-detail__tags">
            <Badge variant={stageVariant[buyer.stage]}>{buyer.stage}</Badge>
            {buyer.repAgreement && <Badge variant="accent" size="sm">BBA Signed ✓</Badge>}
          </div>
        </div>
        <div className="buyer-detail__quick-stats">
          <div className="buyer-detail__stat">
            <p className="buyer-detail__stat-value">{buyer.budget}</p>
            <p className="buyer-detail__stat-label">Budget</p>
          </div>
          <div className="buyer-detail__stat">
            <p className="buyer-detail__stat-value">{buyer.beds}bd / {buyer.baths}ba</p>
            <p className="buyer-detail__stat-label">Requirements</p>
          </div>
          <div className="buyer-detail__stat">
            <p className="buyer-detail__stat-value">{(buyer.areas ?? []).join(', ') || '—'}</p>
            <p className="buyer-detail__stat-label">Target Areas</p>
          </div>
        </div>
      </div>

      {buyer.notes && (
        <Card className="buyer-detail__notes">
          <p className="oh-detail__notes-label">Notes</p>
          <p style={{ fontSize:'0.85rem', color:'var(--brown-dark)' }}>{buyer.notes}</p>
        </Card>
      )}

      {buyer.created_at && (
        <p style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', marginTop:-4 }}>
          Added {new Date(buyer.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
        </p>
      )}

      {/* ── Showings ── */}
      <div className="buyer-detail__showings-section">
        <div className="buyer-detail__showings-header">
          <h3>Properties Shown ({allShowings.length})</h3>
        </div>

        {allShowings.length === 0 ? (
          <div className="buyer-detail__showings-empty">
            <p>No properties shown yet. Showing sessions for this buyer will appear here once logged via Showing Sessions.</p>
          </div>
        ) : (
          <div className="showing-cards">
            {allShowings.map((sh) => {
              const isEditing = editingShowingId === sh.id
              return (
                <div key={sh.id} className={`showing-card showing-card--${sh.status ?? 'scheduled'}`}>
                  <div className="showing-card__body" style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div>
                        <AddressLink
                          address={sh.property?.address}
                          city={sh.property?.city}
                          className="showing-card__address"
                        >
                          {sh.property?.address ?? '—'}
                        </AddressLink>
                        <p className="showing-card__city">
                          {sh.property?.city ?? ''}
                          {sh.property?.price ? ` · $${Number(sh.property.price).toLocaleString()}` : ''}
                        </p>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                        {sh.interest_level && <Badge variant={interestVariant[sh.interest_level] ?? 'default'} size="sm">{sh.interest_level}</Badge>}
                        {sh.feedback_price && <Badge variant={priceVariant[sh.feedback_price] ?? 'default'} size="sm">{priceLabel[sh.feedback_price]}</Badge>}
                        {sh.would_offer && <Badge variant="accent" size="sm">Would Offer</Badge>}
                        {sh.follow_up_sent && <Badge variant="success" size="sm">Follow-up Sent</Badge>}
                      </div>
                    </div>

                    {!isEditing && (
                      <>
                        {sh.prep_notes && <p className="showing-card__feedback" style={{ marginTop:6 }}><strong>Prep:</strong> {sh.prep_notes}</p>}
                        {sh.buyer_feedback && <p className="showing-card__feedback"><strong>Feedback:</strong> {sh.buyer_feedback}</p>}
                        <button className="showing-edit-btn" onClick={() => openShowingEdit(sh)}>
                          {sh.buyer_feedback || sh.prep_notes ? 'Edit notes' : '+ Add prep & feedback'}
                        </button>
                      </>
                    )}

                    {isEditing && (
                      <div className="showing-edit-form">
                        <div className="showing-edit-grid">
                          <div>
                            <label className="showing-edit-label">Interest Level</label>
                            <select className="showing-edit-select" value={showingDraft.interest_level} onChange={e => setSD('interest_level', e.target.value)}>
                              <option value="">—</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                          <div>
                            <label className="showing-edit-label">Price Perception</label>
                            <select className="showing-edit-select" value={showingDraft.feedback_price} onChange={e => setSD('feedback_price', e.target.value)}>
                              <option value="">—</option>
                              <option value="too_high">Too High</option>
                              <option value="fair">Fair</option>
                              <option value="too_low">Good Value</option>
                            </select>
                          </div>
                        </div>
                        <textarea
                          className="showing-edit-textarea"
                          placeholder="Pre-showing prep notes (talking points, things to highlight)…"
                          rows={2}
                          value={showingDraft.prep_notes}
                          onChange={e => setSD('prep_notes', e.target.value)}
                        />
                        <textarea
                          className="showing-edit-textarea"
                          placeholder="Buyer reaction & feedback after the showing…"
                          rows={2}
                          value={showingDraft.buyer_feedback}
                          onChange={e => setSD('buyer_feedback', e.target.value)}
                        />
                        <div className="showing-edit-checks">
                          <label className="showing-edit-check-label">
                            <input type="checkbox" checked={showingDraft.would_offer} onChange={e => setSD('would_offer', e.target.checked)} />
                            Would make an offer
                          </label>
                          <label className="showing-edit-check-label">
                            <input type="checkbox" checked={showingDraft.follow_up_sent} onChange={e => setSD('follow_up_sent', e.target.checked)} />
                            Follow-up sent
                          </label>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <Button size="sm" variant="primary" onClick={() => saveShowingEdit(sh.id)} disabled={savingShowing}>
                            {savingShowing ? 'Saving…' : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingShowingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Buyers Page ─────────────────────────────────────────────────────────
export default function Buyers() {
  const { data: clientsData, loading, refetch } = useBuyers()
  const buyers = useMemo(() =>
    (clientsData ?? []).map(mapClient), [clientsData]
  )

  const [filter, setFilter]               = useState('all')
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [panelOpen, setPanelOpen]         = useState(false)
  const [editingBuyer, setEditingBuyer]   = useState(null)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [error, setError]                 = useState(null)

  const openCreate = () => { setEditingBuyer(null); setPanelOpen(true) }
  const openEdit   = (buyer) => { setEditingBuyer(buyer); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditingBuyer(null); setError(null) }

  const handleSave = async (data) => {
    setSaving(true)
    setError(null)
    try {
      if (editingBuyer && typeof editingBuyer.id === 'string') {
        await DB.updateContact(editingBuyer.id, data)
        await DB.logActivity('contact_updated', `Updated buyer: ${data.name}`, { contactId: editingBuyer.id })
      } else {
        const result = await DB.createContact(data)
        await DB.logActivity('contact_created', `New buyer added: ${data.name}`, { contactId: result.id })
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
    if (!editingBuyer || typeof editingBuyer.id !== 'string') return
    if (!confirm(`Remove ${editingBuyer.name} from your buyers?`)) return
    setDeleting(true)
    try {
      await DB.logActivity('contact_deleted', `Removed buyer: ${editingBuyer.name}`, { contactId: editingBuyer.id })
      await DB.deleteContact(editingBuyer.id)
      await refetch()
      closePanel()
      if (selectedBuyer?.id === editingBuyer.id) setSelectedBuyer(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  // Inline field update — saves a single field without opening the panel
  const [savingInline, setSavingInline] = useState({})
  const inlineUpdate = async (id, field, value) => {
    setSavingInline(p => ({ ...p, [id + field]: true }))
    try {
      await DB.updateContact(id, { [field]: value })
      await refetch()
    } catch { /* silent */ } finally {
      setSavingInline(p => ({ ...p, [id + field]: false }))
    }
  }

  // Inline BBA date editing
  const [bbaEditId, setBbaEditId] = useState(null)
  const [bbaDraft, setBbaDraft]   = useState({ bba_signed_date: '', bba_expiration_date: '' })

  const openBbaEdit = (row, e) => {
    e.stopPropagation()
    const today = new Date().toISOString().slice(0, 10)
    const expiry = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
    setBbaDraft({
      bba_signed_date:     row.bba_signed_date ?? today,
      bba_expiration_date: row.bba_expiration_date ?? expiry,
    })
    setBbaEditId(row.id)
  }

  const saveBba = async (id, signed) => {
    setSavingInline(p => ({ ...p, [id + 'bba_signed']: true }))
    try {
      await DB.updateContact(id, {
        bba_signed:          signed,
        bba_signed_date:     signed ? (bbaDraft.bba_signed_date || null) : null,
        bba_expiration_date: signed ? (bbaDraft.bba_expiration_date || null) : null,
      })
      await refetch()
      setBbaEditId(null)
    } catch { /* silent */ } finally {
      setSavingInline(p => ({ ...p, [id + 'bba_signed']: false }))
    }
  }

  if (loading && !buyers.length) return <div className="page-loading">Loading buyers…</div>

  if (selectedBuyer) {
    const buyer = buyers.find(b => b.id === selectedBuyer.id) ?? selectedBuyer
    return (
      <>
        <BuyerDetail
          buyer={buyer}
          onBack={() => setSelectedBuyer(null)}
          onEdit={() => openEdit(buyer)}
        />
        <SlidePanel
          open={panelOpen}
          onClose={closePanel}
          title={editingBuyer ? 'Edit Buyer' : 'Add Buyer'}
          subtitle={editingBuyer?.name}
          width={460}
        >
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
          <BuyerForm buyer={editingBuyer} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
        </SlidePanel>
      </>
    )
  }

  const filtered = buyers.filter(b => filter === 'all' || b.stage === filter)

  const columns = [
    {
      key: 'name', label: 'Buyer',
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.source}</p>
        </div>
      ),
    },
    { key: 'budget', label: 'Budget' },
    { key: 'areas', label: 'Target Areas', render: v => Array.isArray(v) ? v.join(', ') : v },
    {
      key: 'stage', label: 'Stage',
      render: (v, row) => (
        <select
          className={`buyer-inline-select buyer-inline-select--stage buyer-inline-select--${(v ?? '').toLowerCase().replace(/\s+/g, '-')}`}
          value={v ?? ''}
          disabled={!!savingInline[row.id + 'stage']}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); inlineUpdate(row.id, 'stage', e.target.value) }}
        >
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    {
      key: 'source', label: 'Source',
      render: (v, row) => (
        <select
          className="buyer-inline-select buyer-inline-select--source"
          value={v ?? ''}
          disabled={!!savingInline[row.id + 'source']}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); inlineUpdate(row.id, 'source', e.target.value) }}
        >
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    {
      key: 'repAgreement', label: 'BBA',
      render: (v, row) => {
        const isSaving = !!savingInline[row.id + 'bba_signed']
        const isEditing = bbaEditId === row.id
        const fmt = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'

        if (isEditing) {
          return (
            <div className="bba-inline-form" onClick={e => e.stopPropagation()}>
              <div className="bba-inline-dates">
                <label className="bba-inline-label">Signed
                  <input type="date" className="bba-inline-date" value={bbaDraft.bba_signed_date}
                    onChange={e => setBbaDraft(p => ({ ...p, bba_signed_date: e.target.value }))} />
                </label>
                <label className="bba-inline-label">Expires
                  <input type="date" className="bba-inline-date" value={bbaDraft.bba_expiration_date}
                    onChange={e => setBbaDraft(p => ({ ...p, bba_expiration_date: e.target.value }))} />
                </label>
              </div>
              <div className="bba-inline-actions">
                <button className="bba-inline-save" disabled={isSaving} onClick={() => saveBba(row.id, true)}>
                  {isSaving ? '…' : 'Save'}
                </button>
                <button className="bba-inline-cancel" onClick={() => setBbaEditId(null)}>✕</button>
              </div>
            </div>
          )
        }

        return (
          <div onClick={e => e.stopPropagation()}>
            <button
              className={`buyer-inline-toggle ${v ? 'buyer-inline-toggle--on' : 'buyer-inline-toggle--off'}`}
              disabled={isSaving}
              onClick={e => { if (v) { saveBba(row.id, false) } else { openBbaEdit(row, e) } }}
              title={v ? 'BBA signed — click to unmark' : 'Not signed — click to set dates'}
            >
              {isSaving ? '…' : v ? '✓ Signed' : 'Pending'}
            </button>
            {v && (
              <div className="bba-date-line" onClick={e => openBbaEdit(row, e)}>
                {fmt(row.bba_signed_date)} → {fmt(row.bba_expiration_date)}
              </div>
            )}
          </div>
        )
      },
    },
    { key: 'showings', label: 'Showings', render: v => <span style={{ fontWeight: 600 }}>{Array.isArray(v) ? v.length : 0}</span> },
    {
      key: 'edit', label: '',
      render: (_, row) => (
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row) }}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        >Edit</Button>
      ),
    },
  ]

  const pipelineCounts = stages.reduce((acc, s) => { acc[s] = buyers.filter(b => b.stage === s).length; return acc }, {})

  return (
    <div className="buyers">
      <SectionHeader
        title="Buyers"
        subtitle="CRM pipeline and compliance tracking"
        actions={
          <Button variant="primary" size="md" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          >Add Buyer</Button>
        }
      />

      <div className="pipeline-strip">
        {stages.map(stage => (
          <div key={stage} className={`pipeline-stage ${pipelineCounts[stage] > 0 ? 'pipeline-stage--active' : ''}`}>
            <span className="pipeline-stage__count">{pipelineCounts[stage]}</span>
            <span className="pipeline-stage__label">{stage}</span>
          </div>
        ))}
      </div>

      <TabBar
        tabs={[
          { label: 'All', value: 'all', count: buyers.length },
          { label: 'Active Search', value: 'Active Search' },
          { label: 'Showing', value: 'Showing' },
          { label: 'Under Contract', value: 'Under Contract' },
        ]}
        active={filter}
        onChange={setFilter}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={setSelectedBuyer} />

      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editingBuyer ? 'Edit Buyer' : 'Add Buyer'}
        subtitle={editingBuyer?.name}
        width={460}
      >
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
        <BuyerForm buyer={editingBuyer} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
      </SlidePanel>
    </div>
  )
}
