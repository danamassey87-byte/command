import { useState, useMemo } from 'react'
import { Button, Badge, SectionHeader, Card, DataTable, SlidePanel, Input, Select, Textarea, AddressLink } from '../../components/ui/index.jsx'
import { useInvestors } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './Investors.css'

const STRATEGIES = ['buy-hold', 'fix-flip', 'multi-family']
const strategyDisplay = { 'buy-hold': 'Buy & Hold', 'fix-flip': 'Fix & Flip', 'multi-family': 'Multi-Family' }
const strategyDb      = { 'Buy & Hold': 'buy-hold', 'Fix & Flip': 'fix-flip', 'Multi-Family': 'multi-family' }

const feedbackVariant = {
  yes:   { badge: 'success', label: 'Yes',   icon: '✓' },
  no:    { badge: 'danger',  label: 'No',    icon: '✗' },
  maybe: { badge: 'warning', label: 'Maybe', icon: '?' },
}

const strategyVariant = {
  'Buy & Hold':   'info',
  'Fix & Flip':   'warning',
  'Multi-Family': 'success',
  'buy-hold':     'info',
  'fix-flip':     'warning',
  'multi-family': 'success',
}

// ─── Map Supabase row → local shape ──────────────────────────────────────────
function mapInvestor(row) {
  const contact = row.contact ?? {}
  const strategy = row.strategy ?? 'buy-hold'
  return {
    id:       row.id,
    name:     contact.name  ?? row.buy_box_type ?? 'Investor',
    contact:  contact.name  ?? '',
    phone:    contact.phone ?? '',
    email:    contact.email ?? '',
    strategy: strategyDisplay[strategy] ?? strategy,
    strategyDb: strategy,
    assets:   row.assets_count ?? 0,
    buyBox: {
      type:     row.buy_box_type     ?? 'SFR',
      priceMin: row.buy_box_price_min ?? 0,
      priceMax: row.buy_box_price_max ?? 0,
      areas:    row.buy_box_areas    ?? [],
      minBeds:  row.buy_box_min_beds ?? 0,
      minBaths: row.buy_box_min_baths ?? 0,
      maxDom:   row.buy_box_max_dom  ?? 60,
      maxHoa:   row.buy_box_max_hoa  ?? null,
      minCapRate: row.buy_box_min_cap_rate ?? null,
      notes:    row.buy_box_notes   ?? '',
    },
    properties: (row.investor_feedback ?? []).map(f => ({
      id:       f.id,
      address:  f.property?.address ?? '',
      price:    f.property?.price ? `$${Number(f.property.price).toLocaleString()}` : '—',
      status:   f.status ?? 'maybe',
      feedback: f.notes  ?? '',
    })),
    contact_id: row.contact_id,
    created_at: row.created_at,
  }
}


// ─── Investor Form ────────────────────────────────────────────────────────────
function InvestorForm({ investor, onSave, onDelete, onClose, saving, deleting }) {
  const isNew = !investor?.id || typeof investor.id === 'number'
  const [draft, setDraft] = useState({
    name:       investor?.name       ?? '',
    phone:      investor?.phone      ?? '',
    email:      investor?.email      ?? '',
    strategy:   investor?.strategyDb ?? investor?.strategy ?? 'buy-hold',
    assets:     investor?.assets     ?? 0,
    buyBoxType:     investor?.buyBox?.type     ?? 'SFR',
    priceMin:       investor?.buyBox?.priceMin ?? '',
    priceMax:       investor?.buyBox?.priceMax ?? '',
    areas:          (investor?.buyBox?.areas ?? []).join(', '),
    minBeds:        investor?.buyBox?.minBeds  ?? '',
    minBaths:       investor?.buyBox?.minBaths ?? '',
    maxDom:         investor?.buyBox?.maxDom   ?? '',
    maxHoa:         investor?.buyBox?.maxHoa   ?? '',
    minCapRate:     investor?.buyBox?.minCapRate ?? '',
    buyBoxNotes:    investor?.buyBox?.notes    ?? '',
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const handleSave = () => onSave(draft)

  return (
    <>
      <div className="panel-section">
        <p className="panel-section-label">Contact</p>
        <Input label="Name / Entity *" value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Stone Capital Group" />
        <div className="panel-row">
          <Input label="Phone" value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="(480) 555-0000" />
          <Input label="Email" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
        </div>
        <div className="panel-row">
          <Select label="Strategy" value={draft.strategy} onChange={e => set('strategy', e.target.value)}>
            {STRATEGIES.map(s => <option key={s} value={s}>{strategyDisplay[s]}</option>)}
          </Select>
          <Input label="Current Assets" type="number" min="0" value={draft.assets} onChange={e => set('assets', e.target.value)} />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Buy Box</p>
        <Input label="Property Type" value={draft.buyBoxType} onChange={e => set('buyBoxType', e.target.value)} placeholder="SFR, Duplex, etc." />
        <div className="panel-row">
          <Input label="Price Min ($)" type="number" value={draft.priceMin} onChange={e => set('priceMin', e.target.value)} placeholder="350000" />
          <Input label="Price Max ($)" type="number" value={draft.priceMax} onChange={e => set('priceMax', e.target.value)} placeholder="450000" />
        </div>
        <Input label="Target Areas (comma-separated)" value={draft.areas} onChange={e => set('areas', e.target.value)} placeholder="Gilbert, Chandler, Mesa" />
        <div className="panel-row">
          <Input label="Min Beds" type="number" min="0" value={draft.minBeds} onChange={e => set('minBeds', e.target.value)} />
          <Input label="Min Baths" type="number" min="0" value={draft.minBaths} onChange={e => set('minBaths', e.target.value)} />
        </div>
        <div className="panel-row">
          <Input label="Max DOM" type="number" min="0" value={draft.maxDom} onChange={e => set('maxDom', e.target.value)} placeholder="60" />
          <Input label="Max HOA ($/mo)" type="number" min="0" value={draft.maxHoa} onChange={e => set('maxHoa', e.target.value)} placeholder="200" />
        </div>
        <Input label="Min Cap Rate (%)" type="number" step="0.1" value={draft.minCapRate} onChange={e => set('minCapRate', e.target.value)} placeholder="6" />
        <Textarea label="Buy Box Notes" rows={2} value={draft.buyBoxNotes} onChange={e => set('buyBoxNotes', e.target.value)} placeholder="Special requirements, deal breakers…" />
      </div>

      {investor?.created_at && (
        <p className="panel-timestamp">Added {new Date(investor.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      )}

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !draft.name.trim()}>
          {saving ? 'Saving…' : isNew ? 'Add Investor' : 'Save Changes'}
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

// ─── Investor Detail ──────────────────────────────────────────────────────────
function InvestorDetail({ investor, onBack, onEdit, onFeedbackChange }) {
  const [properties, setProperties] = useState(investor.properties)

  const setFeedback = async (id, status) => {
    const updated = properties.map(p => p.id === id ? { ...p, status } : p)
    setProperties(updated)
    onFeedbackChange(id, status)
  }

  const yes   = properties.filter(p => p.status === 'yes').length
  const maybe = properties.filter(p => p.status === 'maybe').length
  const no    = properties.filter(p => p.status === 'no').length

  return (
    <div className="investor-detail">
      <div className="investor-detail__nav">
        <button className="oh-detail__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Investors
        </button>
        <Button variant="ghost" size="sm" onClick={onEdit}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        >Edit Profile</Button>
      </div>

      <div className="investor-detail__header">
        <div>
          <div className="investor-detail__badges">
            <Badge variant={strategyVariant[investor.strategy]} size="sm">{investor.strategy}</Badge>
          </div>
          <h2 className="investor-detail__name">{investor.name}</h2>
          <p className="investor-detail__contact-info">{investor.phone} &bull; {investor.email}</p>
          {investor.created_at && (
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Added {new Date(investor.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="investor-detail__stat">
          <p className="investor-detail__stat-value">{investor.assets}</p>
          <p className="investor-detail__stat-label">Current Assets</p>
        </div>
      </div>

      <Card className="investor-buy-box">
        <h3 className="investor-buy-box__title">Buy Box</h3>
        <div className="investor-buy-box__grid">
          <div className="investor-buy-box__item">
            <p className="investor-buy-box__item-label">Property Type</p>
            <p className="investor-buy-box__item-value">{investor.buyBox.type}</p>
          </div>
          <div className="investor-buy-box__item">
            <p className="investor-buy-box__item-label">Price Range</p>
            <p className="investor-buy-box__item-value">
              ${(investor.buyBox.priceMin / 1000).toFixed(0)}K – ${(investor.buyBox.priceMax / 1000).toFixed(0)}K
            </p>
          </div>
          <div className="investor-buy-box__item">
            <p className="investor-buy-box__item-label">Target Areas</p>
            <p className="investor-buy-box__item-value">{investor.buyBox.areas.join(', ')}</p>
          </div>
          {investor.buyBox.minBeds > 0 && (
            <div className="investor-buy-box__item">
              <p className="investor-buy-box__item-label">Min Beds/Baths</p>
              <p className="investor-buy-box__item-value">{investor.buyBox.minBeds}bd / {investor.buyBox.minBaths}ba+</p>
            </div>
          )}
          <div className="investor-buy-box__item">
            <p className="investor-buy-box__item-label">Max DOM</p>
            <p className="investor-buy-box__item-value">{investor.buyBox.maxDom} days</p>
          </div>
          {investor.buyBox.maxHoa && (
            <div className="investor-buy-box__item">
              <p className="investor-buy-box__item-label">Max HOA</p>
              <p className="investor-buy-box__item-value">${investor.buyBox.maxHoa}/mo</p>
            </div>
          )}
          {investor.buyBox.minCapRate && (
            <div className="investor-buy-box__item">
              <p className="investor-buy-box__item-label">Min Cap Rate</p>
              <p className="investor-buy-box__item-value">{investor.buyBox.minCapRate}%</p>
            </div>
          )}
        </div>
        {investor.buyBox.notes && (
          <div className="investor-buy-box__notes">
            <p className="investor-buy-box__notes-label">Notes</p>
            <p>{investor.buyBox.notes}</p>
          </div>
        )}
      </Card>

      <div className="investor-feedback-section">
        <div className="investor-feedback-header">
          <h3>Property Feedback Loop</h3>
          <div className="investor-feedback-counts">
            <span className="investor-feedback-count investor-feedback-count--yes">{yes} Yes</span>
            <span className="investor-feedback-count investor-feedback-count--maybe">{maybe} Maybe</span>
            <span className="investor-feedback-count investor-feedback-count--no">{no} No</span>
          </div>
        </div>

        {properties.length === 0 ? (
          <div className="investor-feedback-empty">
            <p>No properties added yet. Add properties to start the feedback loop.</p>
          </div>
        ) : (
          <div className="feedback-cards">
            {properties.map(prop => (
              <div key={prop.id} className={`feedback-card feedback-card--${prop.status}`}>
                <div className="feedback-card__body">
                  <AddressLink address={prop.address} className="feedback-card__address">{prop.address}</AddressLink>
                  <p className="feedback-card__price">{prop.price}</p>
                  {prop.feedback && <p className="feedback-card__note">"{prop.feedback}"</p>}
                </div>
                <div className="feedback-card__actions">
                  {['yes', 'maybe', 'no'].map(s => (
                    <button
                      key={s}
                      className={`feedback-btn feedback-btn--${s} ${prop.status === s ? 'feedback-btn--active' : ''}`}
                      onClick={() => setFeedback(prop.id, s)}
                    >
                      {feedbackVariant[s].icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Investors Page ──────────────────────────────────────────────────────
export default function Investors() {
  const { data: dbData, loading, refetch } = useInvestors()
  const investors = useMemo(() => (dbData ?? []).map(mapInvestor), [dbData])

  const [selectedInvestor, setSelectedInvestor] = useState(null)
  const [panelOpen, setPanelOpen]   = useState(false)
  const [editingInvestor, setEditingInvestor] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState(null)

  const openCreate = () => { setEditingInvestor(null); setPanelOpen(true) }
  const openEdit   = (inv) => { setEditingInvestor(inv); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditingInvestor(null); setError(null) }

  const handleSave = async (draft) => {
    setSaving(true)
    setError(null)
    try {
      // Ensure contact exists
      let contact_id = editingInvestor?.contact_id ?? null
      if (!contact_id) {
        const contact = await DB.createContact({
          name:  draft.name.trim(),
          phone: draft.phone.trim() || null,
          email: draft.email.trim() || null,
          type:  'investor',
        })
        contact_id = contact.id
      } else {
        await DB.updateContact(contact_id, {
          name:  draft.name.trim(),
          phone: draft.phone.trim() || null,
          email: draft.email.trim() || null,
        })
      }

      const dbRow = {
        contact_id,
        strategy:          draft.strategy,
        assets_count:      Number(draft.assets) || 0,
        buy_box_type:      draft.buyBoxType.trim() || null,
        buy_box_price_min: draft.priceMin ? Number(draft.priceMin) : null,
        buy_box_price_max: draft.priceMax ? Number(draft.priceMax) : null,
        buy_box_areas:     draft.areas ? draft.areas.split(',').map(a => a.trim()).filter(Boolean) : [],
        buy_box_min_beds:  draft.minBeds ? Number(draft.minBeds) : null,
        buy_box_min_baths: draft.minBaths ? Number(draft.minBaths) : null,
        buy_box_max_dom:   draft.maxDom ? Number(draft.maxDom) : null,
        buy_box_max_hoa:   draft.maxHoa ? Number(draft.maxHoa) : null,
        buy_box_min_cap_rate: draft.minCapRate ? Number(draft.minCapRate) : null,
        buy_box_notes:     draft.buyBoxNotes.trim() || null,
      }

      if (editingInvestor && typeof editingInvestor.id === 'string') {
        await DB.updateInvestor(editingInvestor.id, dbRow)
        await DB.logActivity('investor_updated', `Updated investor: ${draft.name}`, { contactId: contact_id })
      } else {
        await DB.createInvestor(dbRow)
        await DB.logActivity('investor_created', `New investor added: ${draft.name}`, { contactId: contact_id })
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
    if (!editingInvestor || typeof editingInvestor.id !== 'string') return
    if (!confirm(`Remove investor ${editingInvestor.name}?`)) return
    setDeleting(true)
    try {
      await DB.logActivity('investor_deleted', `Removed investor: ${editingInvestor.name}`)
      await DB.deleteInvestor(editingInvestor.id)
      await refetch()
      closePanel()
      if (selectedInvestor?.id === editingInvestor.id) setSelectedInvestor(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleFeedbackChange = async (feedbackId, status) => {
    if (typeof feedbackId !== 'string') return // mock data
    try {
      await DB.upsertFeedback({ id: feedbackId, status })
      await DB.logActivity('feedback_updated', `Property feedback updated to: ${status}`)
    } catch (e) { /* silent */ }
  }

  if (loading && !investors.length) return <div className="page-loading">Loading investors…</div>

  if (selectedInvestor) {
    const investor = investors.find(i => i.id === selectedInvestor.id) ?? selectedInvestor
    return (
      <>
        <InvestorDetail
          investor={investor}
          onBack={() => setSelectedInvestor(null)}
          onEdit={() => openEdit(investor)}
          onFeedbackChange={handleFeedbackChange}
        />
        <SlidePanel open={panelOpen} onClose={closePanel} title={editingInvestor ? 'Edit Investor' : 'Add Investor'} subtitle={editingInvestor?.name} width={480}>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
          <InvestorForm investor={editingInvestor} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
        </SlidePanel>
      </>
    )
  }

  const columns = [
    {
      key: 'name', label: 'Investor',
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.contact}</p>
        </div>
      ),
    },
    { key: 'strategy', label: 'Strategy', render: v => <Badge variant={strategyVariant[v]} size="sm">{v}</Badge> },
    { key: 'assets', label: 'Assets', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    {
      key: 'buyBox', label: 'Buy Box',
      render: v => `${v.type} · $${(v.priceMin/1000).toFixed(0)}K–$${(v.priceMax/1000).toFixed(0)}K`,
    },
    {
      key: 'properties', label: 'Properties Reviewed',
      render: v => {
        const yes = v.filter(p => p.status === 'yes').length
        return v.length > 0 ? <span><strong>{yes}</strong>/{v.length} interested</span> : '—'
      },
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedInvestor(row) }}>View Profile</Button>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row) }}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
          >Edit</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="investors">
      <SectionHeader
        title="Investors"
        subtitle="Investor profiles, buy boxes, and property feedback loop"
        actions={
          <Button variant="primary" size="md" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          >Add Investor</Button>
        }
      />

      <div className="investors__summary">
        <div className="investors__summary-stat">
          <p className="investors__summary-value">{investors.length}</p>
          <p className="investors__summary-label">Active Investors</p>
        </div>
        <div className="investors__summary-stat">
          <p className="investors__summary-value">{investors.reduce((a, i) => a + i.assets, 0)}</p>
          <p className="investors__summary-label">Total Assets</p>
        </div>
        <div className="investors__summary-stat">
          <p className="investors__summary-value">{investors.reduce((a, i) => a + i.properties.length, 0)}</p>
          <p className="investors__summary-label">Properties Reviewed</p>
        </div>
        <div className="investors__summary-stat">
          <p className="investors__summary-value">
            {investors.reduce((a, i) => a + i.properties.filter(p => p.status === 'yes').length, 0)}
          </p>
          <p className="investors__summary-label">Interested</p>
        </div>
      </div>

      <DataTable columns={columns} rows={investors} onRowClick={setSelectedInvestor} />

      <SlidePanel open={panelOpen} onClose={closePanel} title={editingInvestor ? 'Edit Investor' : 'Add Investor'} subtitle={editingInvestor?.name} width={480}>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
        <InvestorForm investor={editingInvestor} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
      </SlidePanel>
    </div>
  )
}
