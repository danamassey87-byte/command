import { useState, useMemo } from 'react'
import { Button, Badge, SectionHeader, TabBar, DataTable, Card, CheckItem, SlidePanel, Input, Select, Textarea, AddressLink } from '../../components/ui/index.jsx'
import { useListings, useTasksForListing } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './Sellers.css'

// ─── Checklist definitions ────────────────────────────────────────────────────
const launchChecklist = [
  { label: 'Professional photography scheduled',           phase: 'prep' },
  { label: 'Pre-listing walkthrough complete',             phase: 'prep' },
  { label: 'Comparable market analysis delivered',         phase: 'prep' },
  { label: 'Listing agreement signed',                     phase: 'prep' },
  { label: 'Disclosure package prepared',                  phase: 'prep' },
  { label: 'Coming Soon status activated in MLS',          phase: 'mls' },
  { label: 'Yard sign & lockbox installed',                phase: 'mls' },
  { label: 'Listing goes Active in MLS',                   phase: 'mls' },
  { label: 'Syndication to Zillow, Realtor.com confirmed', phase: 'mls' },
  { label: 'Social media announcement posted',             phase: 'marketing' },
  { label: 'Just Listed postcards mailed to neighborhood', phase: 'marketing' },
  { label: 'Feature sheets printed for showings',          phase: 'marketing' },
  { label: 'First open house scheduled',                   phase: 'marketing' },
  { label: 'Showing feedback system enabled',              phase: 'marketing' },
]

const relaunchChecklist = [
  { label: 'Seller consultation — review market feedback',             phase: 'analysis' },
  { label: 'Pricing strategy re-evaluated with new comps',             phase: 'analysis' },
  { label: 'Identify reasons for no offers (price, condition, photos)', phase: 'analysis' },
  { label: 'New professional photos taken (if needed)',                phase: 'refresh' },
  { label: 'Property improvements / staging implemented',              phase: 'refresh' },
  { label: 'Listing description rewritten with new angle',             phase: 'refresh' },
  { label: 'Price reduced to competitive position',                    phase: 'relaunch' },
  { label: 'Status changed to Active again in MLS',                   phase: 'relaunch' },
  { label: 'Price Change announcement on social media',                phase: 'relaunch' },
  { label: 'Re-mail to neighborhood with new price',                  phase: 'relaunch' },
  { label: 'New open house scheduled within 2 weeks',                  phase: 'relaunch' },
  { label: 'Notify buyer-side agents with price change',               phase: 'relaunch' },
]

const phaseLabels = {
  prep:     { label: 'Preparation', color: '#5a87b4' },
  mls:      { label: 'MLS',         color: '#6a9e72' },
  marketing:{ label: 'Marketing',   color: '#b79782' },
  analysis: { label: 'Analysis',    color: '#5a87b4' },
  refresh:  { label: 'Refresh',     color: '#c99a2e' },
  relaunch: { label: 'Relaunch',    color: '#6a9e72' },
}

const STATUS_OPTIONS = ['active', 'pending', 'closed', 'expired', 'relaunching']
const TYPE_OPTIONS   = ['new', 'expired']

const CASH_OFFER_STATUSES = [
  { value: 'none',      label: 'None' },
  { value: 'requested', label: 'Requested' },
  { value: 'received',  label: 'Received' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'accepted',  label: 'Accepted' },
  { value: 'declined',  label: 'Declined' },
]
const SHOWING_ACCESS = [
  { value: 'lockbox',             label: 'Lockbox' },
  { value: 'appointment_only',    label: 'Appointment Only' },
  { value: 'occupied_flexible',   label: 'Occupied — Flexible' },
  { value: 'occupied_restricted', label: 'Occupied — Restricted' },
  { value: 'vacant',              label: 'Vacant' },
]
const STAGING_OPTIONS = [
  { value: 'none',    label: 'None' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'partial', label: 'Partial' },
  { value: 'full',    label: 'Full' },
]
const PHOTO_STATUSES = [
  { value: 'not_scheduled', label: 'Not Scheduled' },
  { value: 'scheduled',     label: 'Scheduled' },
  { value: 'completed',     label: 'Completed' },
]
const MOTIVATION_OPTIONS = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]
const CONCESSION_OPTIONS = [
  { value: 'none',          label: 'None' },
  { value: 'closing_costs', label: 'Closing Costs' },
  { value: 'rate_buydown',  label: 'Rate Buydown' },
  { value: 'home_warranty', label: 'Home Warranty' },
  { value: 'repairs',       label: 'Repairs' },
  { value: 'multiple',      label: 'Multiple' },
]
const CONDITION_OPTIONS = [
  { value: 'move_in_ready',     label: 'Move-In Ready' },
  { value: 'minor_updates',     label: 'Minor Updates' },
  { value: 'needs_work',        label: 'Needs Work' },
  { value: 'major_renovation',  label: 'Major Renovation' },
]

const statusVariant = {
  active: 'success', relaunching: 'warning', expired: 'danger', pending: 'info', closed: 'default',
}

const cashOfferVariant = {
  none: 'default', requested: 'warning', received: 'info', reviewing: 'info', accepted: 'success', declined: 'danger',
}

// ─── Map Supabase listing row → local shape ───────────────────────────────────
function mapListing(row) {
  return {
    id:           row.id,
    address:      row.property?.address ?? '',
    city:         row.property?.city    ?? '',
    zip:          row.property?.zip     ?? '',
    listPrice:    row.list_price ? `$${Number(row.list_price).toLocaleString()}` : '—',
    listPriceRaw: row.list_price ?? '',
    listDate:     row.list_date  ?? '',
    status:       row.status     ?? 'active',
    type:         row.type       ?? 'new',
    dom:          row.dom        ?? 0,
    offers:       row.offers_count ?? 0,
    notes:        row.notes      ?? '',
    contact_name: row.contact?.name  ?? '',
    contact_email:row.contact?.email ?? '',
    contact_phone:row.contact?.phone ?? '',
    property_id:  row.property_id,
    contact_id:   row.contact_id,
    created_at:   row.created_at,
    // Seller tracking fields
    cash_offer_requested:     row.cash_offer_requested ?? false,
    cash_offer_status:        row.cash_offer_status ?? 'none',
    showing_access:           row.showing_access ?? 'lockbox',
    staging:                  row.staging ?? 'none',
    photography_status:       row.photography_status ?? 'not_scheduled',
    seller_motivation:        row.seller_motivation ?? 'medium',
    concessions:              row.concessions ?? 'none',
    property_condition:       row.property_condition ?? 'move_in_ready',
    commission_rate:          row.commission_rate ?? '',
    listing_agreement_signed: row.listing_agreement_signed ?? false,
    pre_inspection_done:      row.pre_inspection_done ?? false,
    home_warranty_offered:    row.home_warranty_offered ?? false,
  }
}


// ─── Seller / Listing Form ────────────────────────────────────────────────────
function ListingForm({ listing, onSave, onDelete, onClose, saving, deleting }) {
  const isNew = !listing?.id || typeof listing.id === 'number'
  const [draft, setDraft] = useState({
    address:      listing?.address       ?? '',
    city:         listing?.city          ?? '',
    zip:          listing?.zip           ?? '',
    listPrice:    listing?.listPriceRaw  ?? '',
    listDate:     listing?.listDate      ?? '',
    type:         listing?.type          ?? 'new',
    status:       listing?.status        ?? 'active',
    dom:          listing?.dom           ?? '',
    offers:       listing?.offers        ?? '',
    seller_name:  listing?.contact_name  ?? '',
    seller_email: listing?.contact_email ?? '',
    seller_phone: listing?.contact_phone ?? '',
    notes:        listing?.notes         ?? '',
    // Seller tracking
    cash_offer_requested:     listing?.cash_offer_requested ?? false,
    cash_offer_status:        listing?.cash_offer_status ?? 'none',
    showing_access:           listing?.showing_access ?? 'lockbox',
    staging:                  listing?.staging ?? 'none',
    photography_status:       listing?.photography_status ?? 'not_scheduled',
    seller_motivation:        listing?.seller_motivation ?? 'medium',
    concessions:              listing?.concessions ?? 'none',
    property_condition:       listing?.property_condition ?? 'move_in_ready',
    commission_rate:          listing?.commission_rate ?? '',
    listing_agreement_signed: listing?.listing_agreement_signed ?? false,
    pre_inspection_done:      listing?.pre_inspection_done ?? false,
    home_warranty_offered:    listing?.home_warranty_offered ?? false,
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const handleSave = () => onSave(draft)

  return (
    <>
      <div className="panel-section">
        <p className="panel-section-label">Property</p>
        <Input label="Address *" value={draft.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
        <div className="panel-row">
          <Input label="City" value={draft.city} onChange={e => set('city', e.target.value)} placeholder="Gilbert" />
          <Input label="Zip" value={draft.zip} onChange={e => set('zip', e.target.value)} placeholder="85296" />
        </div>
        <div className="panel-row">
          <Input label="List Price ($)" type="number" value={draft.listPrice} onChange={e => set('listPrice', e.target.value)} placeholder="529000" />
          <Input label="List Date" type="date" value={draft.listDate} onChange={e => set('listDate', e.target.value)} />
        </div>
        <div className="panel-row">
          <Select label="Type" value={draft.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'new' ? 'New Listing' : 'Expired'}</option>)}
          </Select>
          <Select label="Status" value={draft.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Input label="DOM" type="number" min="0" value={draft.dom} onChange={e => set('dom', e.target.value)} placeholder="0" />
          <Input label="Offers Received" type="number" min="0" value={draft.offers} onChange={e => set('offers', e.target.value)} placeholder="0" />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Seller Contact</p>
        <Input label="Seller Name" value={draft.seller_name} onChange={e => set('seller_name', e.target.value)} placeholder="First & Last Name" />
        <div className="panel-row">
          <Input label="Phone" value={draft.seller_phone} onChange={e => set('seller_phone', e.target.value)} placeholder="(480) 555-0000" />
          <Input label="Email" value={draft.seller_email} onChange={e => set('seller_email', e.target.value)} placeholder="email@example.com" />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Seller Tracking</p>
        <div className="panel-row">
          <Select label="Cash Offer Status" value={draft.cash_offer_status} onChange={e => set('cash_offer_status', e.target.value)}>
            {CASH_OFFER_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Showing Access" value={draft.showing_access} onChange={e => set('showing_access', e.target.value)}>
            {SHOWING_ACCESS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Select label="Staging" value={draft.staging} onChange={e => set('staging', e.target.value)}>
            {STAGING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Photography" value={draft.photography_status} onChange={e => set('photography_status', e.target.value)}>
            {PHOTO_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Select label="Seller Motivation" value={draft.seller_motivation} onChange={e => set('seller_motivation', e.target.value)}>
            {MOTIVATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Property Condition" value={draft.property_condition} onChange={e => set('property_condition', e.target.value)}>
            {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Select label="Concessions Offered" value={draft.concessions} onChange={e => set('concessions', e.target.value)}>
            {CONCESSION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="Commission (%)" type="number" step="0.1" min="0" max="10" value={draft.commission_rate} onChange={e => set('commission_rate', e.target.value)} placeholder="3.0" />
        </div>
        <div className="seller-checkboxes">
          <label className="buyer-checkbox-label">
            <input type="checkbox" checked={draft.listing_agreement_signed} onChange={e => set('listing_agreement_signed', e.target.checked)} />
            Listing Agreement Signed
          </label>
          <label className="buyer-checkbox-label">
            <input type="checkbox" checked={draft.pre_inspection_done} onChange={e => set('pre_inspection_done', e.target.checked)} />
            Pre-Listing Inspection Done
          </label>
          <label className="buyer-checkbox-label">
            <input type="checkbox" checked={draft.home_warranty_offered} onChange={e => set('home_warranty_offered', e.target.checked)} />
            Home Warranty Offered
          </label>
        </div>
      </div>

      <hr className="panel-divider" />
      <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Key notes, seller goals, timeline…" />

      {listing?.created_at && (
        <p className="panel-timestamp">Added {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      )}

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !draft.address.trim()}>
          {saving ? 'Saving…' : isNew ? 'Add Listing' : 'Save Changes'}
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

// ─── Plan View (real tasks from DB when available) ────────────────────────────
function PlanView({ listing, onBack, onEdit }) {
  const isNew   = listing.type === 'new'
  const plan    = isNew ? launchChecklist : relaunchChecklist
  const isDbRow = typeof listing.id === 'string'

  // Try to load real checklist tasks when it's a DB listing
  const { data: dbTasks, refetch: refetchTasks } = useTasksForListing(isDbRow ? listing.id : null)
  const hasTasks = dbTasks && dbTasks.length > 0

  // Fallback to listing.checklist for mock data
  const [localChecks, setLocalChecks] = useState(listing.checklist ?? {})

  const getChecked = (i) => {
    if (hasTasks) return dbTasks[i]?.completed ?? false
    return !!localChecks[i]
  }

  const getCompletedAt = (i) => {
    if (hasTasks) return dbTasks[i]?.completed_at ?? null
    return null
  }

  const toggle = async (i) => {
    if (hasTasks && dbTasks[i]) {
      const task = dbTasks[i]
      const nowCompleted = !task.completed
      try {
        await DB.updateTask(task.id, {
          completed:    nowCompleted,
          completed_at: nowCompleted ? new Date().toISOString() : null,
        })
        await DB.logActivity('task_completed', `${nowCompleted ? 'Completed' : 'Unchecked'}: ${task.label}`)
        refetchTasks()
      } catch (e) { /* silent */ }
    } else {
      const updated = { ...localChecks, [i]: !localChecks[i] }
      setLocalChecks(updated)
    }
  }

  const checks = hasTasks
    ? Object.fromEntries(dbTasks.map((t, i) => [i, t.completed]))
    : localChecks

  const completed = Object.values(checks).filter(Boolean).length
  const pct = Math.round((completed / plan.length) * 100)
  const phases = [...new Set(plan.map(s => s.phase))]

  return (
    <div className="sellers-plan">
      <div className="sellers-plan__nav">
        <button className="oh-detail__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Sellers
        </button>
        <Button variant="ghost" size="sm" onClick={onEdit}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        >Edit Listing</Button>
      </div>

      <div className="sellers-plan__header">
        <div>
          <div className="sellers-plan__type-badge">
            <Badge variant={isNew ? 'success' : 'warning'}>{isNew ? 'Launch Plan' : 'Relaunch Plan'}</Badge>
          </div>
          <h2 className="sellers-plan__address"><AddressLink address={listing.address} city={listing.city}>{listing.address}</AddressLink></h2>
          <p className="sellers-plan__meta">{listing.city}, AZ {listing.zip} &bull; {listing.listPrice} &bull; {listing.dom} DOM</p>
          {listing.created_at && (
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Added {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="sellers-plan__progress-ring-wrap">
          <div className="sellers-plan__progress-ring">
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-border-light)" strokeWidth="5" />
              <circle cx="32" cy="32" r="28" fill="none"
                stroke={isNew ? 'var(--color-success)' : 'var(--color-warning)'}
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </svg>
            <span className="sellers-plan__progress-pct">{pct}%</span>
          </div>
          <p className="sellers-plan__progress-label">{completed}/{plan.length} steps</p>
        </div>
      </div>

      <div className="sellers-plan__phases">
        {phases.map(phase => {
          const phaseItems = plan.map((step, i) => ({ ...step, i })).filter(s => s.phase === phase)
          const phaseCompleted = phaseItems.filter(s => !!checks[s.i]).length
          const meta = phaseLabels[phase]
          return (
            <Card key={phase} className="sellers-plan__phase-card">
              <div className="sellers-plan__phase-header">
                <div className="sellers-plan__phase-dot" style={{ background: meta.color }} />
                <h3 className="sellers-plan__phase-name">{meta.label}</h3>
                <span className="sellers-plan__phase-count">{phaseCompleted}/{phaseItems.length}</span>
              </div>
              {phaseItems.map(step => {
                const completedAt = getCompletedAt(step.i)
                return (
                  <CheckItem
                    key={step.i}
                    label={step.label}
                    checked={!!checks[step.i]}
                    onChange={() => toggle(step.i)}
                    note={completedAt ? new Date(completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                  />
                )
              })}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Sellers Page ────────────────────────────────────────────────────────
export default function Sellers() {
  const { data: dbData, loading, refetch } = useListings()
  const listings = useMemo(() => (dbData ?? []).map(mapListing), [dbData])

  const [filter, setFilter]               = useState('all')
  const [selectedListing, setSelectedListing] = useState(null)
  const [panelOpen, setPanelOpen]         = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [error, setError]                 = useState(null)

  const openCreate = () => { setEditingListing(null); setPanelOpen(true) }
  const openEdit   = (l) => { setEditingListing(l); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditingListing(null); setError(null) }

  const handleSave = async (draft) => {
    setSaving(true)
    setError(null)
    try {
      const property_id = await DB.ensureProperty({ address: draft.address, city: draft.city, zip: draft.zip })

      // Find or create seller contact
      let contact_id = editingListing?.contact_id ?? null
      if (draft.seller_name.trim() && !contact_id) {
        const contact = await DB.createContact({
          name: draft.seller_name.trim(),
          phone: draft.seller_phone.trim() || null,
          email: draft.seller_email.trim() || null,
          type: 'seller',
        })
        contact_id = contact.id
      }

      const dbRow = {
        property_id,
        contact_id,
        type:        draft.type,
        status:      draft.status,
        list_price:  draft.listPrice ? Number(draft.listPrice) : null,
        list_date:   draft.listDate || null,
        dom:         draft.dom ? Number(draft.dom) : null,
        offers_count: draft.offers ? Number(draft.offers) : 0,
        notes:       draft.notes.trim() || null,
        // Seller tracking
        cash_offer_requested:     draft.cash_offer_status !== 'none',
        cash_offer_status:        draft.cash_offer_status,
        showing_access:           draft.showing_access,
        staging:                  draft.staging,
        photography_status:       draft.photography_status,
        seller_motivation:        draft.seller_motivation,
        concessions:              draft.concessions,
        property_condition:       draft.property_condition,
        commission_rate:          draft.commission_rate ? Number(draft.commission_rate) : null,
        listing_agreement_signed: draft.listing_agreement_signed,
        pre_inspection_done:      draft.pre_inspection_done,
        home_warranty_offered:    draft.home_warranty_offered,
      }

      if (editingListing && typeof editingListing.id === 'string') {
        await DB.updateListing(editingListing.id, dbRow)
        await DB.logActivity('listing_updated', `Updated listing: ${draft.address}`, { propertyId: property_id })
      } else {
        const newListing = await DB.createListing(dbRow)
        // Auto-create checklist tasks
        const plan = draft.type === 'new' ? launchChecklist : relaunchChecklist
        const taskRows = plan.map((step, i) => ({
          listing_id: newListing.id,
          phase:      step.phase,
          label:      step.label,
          sort_order: i,
          completed:  false,
        }))
        await DB.bulkCreateTasks(taskRows)
        await DB.logActivity('listing_created', `New listing added: ${draft.address}`, { propertyId: property_id })
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
    if (!editingListing || typeof editingListing.id !== 'string') return
    if (!confirm(`Remove listing at ${editingListing.address}?`)) return
    setDeleting(true)
    try {
      await DB.logActivity('listing_deleted', `Removed listing: ${editingListing.address}`)
      await DB.deleteListing(editingListing.id)
      await refetch()
      closePanel()
      if (selectedListing?.id === editingListing.id) setSelectedListing(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading && !listings.length) return <div className="page-loading">Loading listings…</div>

  if (selectedListing) {
    const listing = listings.find(l => l.id === selectedListing.id) ?? selectedListing
    return (
      <>
        <PlanView
          listing={listing}
          onBack={() => setSelectedListing(null)}
          onEdit={() => openEdit(listing)}
        />
        <SlidePanel open={panelOpen} onClose={closePanel} title={editingListing ? 'Edit Listing' : 'Add Listing'} subtitle={editingListing?.address} width={460}>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
          <ListingForm listing={editingListing} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
        </SlidePanel>
      </>
    )
  }

  const filtered = listings.filter(l => filter === 'all' || l.type === filter || l.status === filter)
  const counts = {
    all:     listings.length,
    new:     listings.filter(l => l.type === 'new').length,
    expired: listings.filter(l => l.type === 'expired').length,
  }

  const columns = [
    {
      key: 'address', label: 'Property',
      render: (v, row) => (
        <div>
          <AddressLink address={v} city={row.city} className="lead-address">{v}</AddressLink>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.city}, AZ {row.zip}</p>
        </div>
      ),
    },
    { key: 'listPrice', label: 'List Price' },
    { key: 'type', label: 'Type', render: v => <Badge variant={v === 'new' ? 'success' : 'warning'} size="sm">{v === 'new' ? 'New' : 'Expired'}</Badge> },
    { key: 'dom', label: 'DOM', render: v => `${v}d` },
    { key: 'offers', label: 'Offers', render: v => v > 0 ? <Badge variant="success" size="sm">{v}</Badge> : '—' },
    { key: 'status', label: 'Status', render: v => <Badge variant={statusVariant[v]}>{v}</Badge> },
    {
      key: 'cash_offer_status', label: 'Cash Offer',
      render: v => v && v !== 'none'
        ? <Badge variant={cashOfferVariant[v]} size="sm">{CASH_OFFER_STATUSES.find(o => o.value === v)?.label ?? v}</Badge>
        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>,
    },
    {
      key: 'checklist', label: 'Plan Progress',
      render: (v, row) => {
        const plan = row.type === 'new' ? launchChecklist : relaunchChecklist
        const checks = v ?? {}
        const done = Object.values(checks).filter(Boolean).length
        const pct = Math.round((done / plan.length) * 100)
        return (
          <div className="sellers-progress-cell">
            <div className="sellers-progress-bar">
              <div className="sellers-progress-bar__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="sellers-progress-cell__pct">{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedListing(row) }}>
            {row.type === 'new' ? 'Launch Plan' : 'Relaunch Plan'}
          </Button>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row) }}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
          >Edit</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="sellers">
      <SectionHeader
        title="Sellers"
        subtitle="New listings and expired property workflow tracking"
        actions={
          <Button variant="primary" size="md" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          >Add Listing</Button>
        }
      />

      <TabBar
        tabs={[
          { label: 'All Listings', value: 'all', count: counts.all },
          { label: 'New', value: 'new', count: counts.new },
          { label: 'Expired', value: 'expired', count: counts.expired },
        ]}
        active={filter}
        onChange={setFilter}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={setSelectedListing} />

      <SlidePanel open={panelOpen} onClose={closePanel} title={editingListing ? 'Edit Listing' : 'Add Listing'} subtitle={editingListing?.address} width={460}>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
        <ListingForm listing={editingListing} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
      </SlidePanel>
    </div>
  )
}
