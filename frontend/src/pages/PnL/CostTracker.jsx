import { useState, useMemo, useCallback } from 'react'
import { SectionHeader, Card, TabBar, Button, SlidePanel, Input, Select, Badge } from '../../components/ui/index.jsx'
import { useListings, useOpenHouses, useContacts, useTransactions, useLeads } from '../../lib/hooks.js'
import './PnL.css'

const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtShort = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`

// ─── LocalStorage Keys ──────────────────────────────────────────────────────
const CATALOG_KEY   = 'cost_tracker_catalog'
const ITEMS_KEY     = 'cost_tracker_items'
const CHECKLIST_KEY = 'cost_tracker_checklists'

// ─── Default Service Catalog ─────────────────────────────────────────────────
const DEFAULT_CATALOG = [
  // Listing Marketing
  { id: 'photography',       name: 'Photography',           category: 'listing', defaultCost: 250,  reusable: false },
  { id: 'videography',       name: 'Videography',           category: 'listing', defaultCost: 400,  reusable: false },
  { id: 'drone_photo',       name: 'Drone Photos',          category: 'listing', defaultCost: 150,  reusable: false },
  { id: 'drone_video',       name: 'Drone Video',           category: 'listing', defaultCost: 200,  reusable: false },
  { id: 'community_drone_photo', name: 'Community Drone Photos', category: 'listing', defaultCost: 150, reusable: false },
  { id: 'community_drone_video', name: 'Community Drone Video',  category: 'listing', defaultCost: 200, reusable: false },
  { id: 'twilight',          name: 'Twilight Photos',       category: 'listing', defaultCost: 200,  reusable: false },
  { id: 'staging',           name: 'Staging',               category: 'listing', defaultCost: 2500, reusable: false },
  { id: 'virtual_staging',   name: 'Virtual Staging',       category: 'listing', defaultCost: 50,   reusable: false },
  { id: 'sign_purchase',     name: 'Sign Purchase',         category: 'listing', defaultCost: 75,   reusable: true },
  { id: 'sign_install',      name: 'Sign Installation',     category: 'listing', defaultCost: 50,   reusable: false },
  { id: 'lockbox_purchase',  name: 'Lockbox Purchase',      category: 'listing', defaultCost: 35,   reusable: true },
  { id: 'flyer_printing',    name: 'Flyer Printing',        category: 'listing', defaultCost: 40,   reusable: false },
  { id: 'mls_photos',        name: 'MLS Photo Editing',     category: 'listing', defaultCost: 50,   reusable: false },
  { id: 'floor_plan',        name: 'Floor Plan',            category: 'listing', defaultCost: 150,  reusable: false },
  { id: '3d_tour',           name: '3D Tour / Matterport',  category: 'listing', defaultCost: 250,  reusable: false },

  // Transaction
  { id: 'tc_fee',            name: 'TC Fee',                category: 'transaction', defaultCost: 450, reusable: false },
  { id: 'home_warranty',     name: 'Home Warranty',         category: 'transaction', defaultCost: 500, reusable: false },
  { id: 'closing_gift',      name: 'Closing Gift',          category: 'transaction', defaultCost: 100, reusable: false },
  { id: 'appraisal_gap',     name: 'Appraisal Gap Coverage',category: 'transaction', defaultCost: 0,   reusable: false },

  // Open House
  { id: 'oh_flyers',         name: 'OH Flyer Printing',     category: 'open_house', defaultCost: 25, reusable: false },
  { id: 'oh_signs',          name: 'OH Directional Signs',  category: 'open_house', defaultCost: 30, reusable: true },
  { id: 'oh_refreshments',   name: 'Refreshments',          category: 'open_house', defaultCost: 30, reusable: false },
  { id: 'oh_door_hanger',    name: 'Door Hangers',          category: 'open_house', defaultCost: 20, reusable: false },
  { id: 'oh_boosted_ad',     name: 'Boosted Social Ad',     category: 'open_house', defaultCost: 25, reusable: false },

  // Lead Gen / Mailing
  { id: 'letter_printing',   name: 'Letter Printing',       category: 'lead_gen', defaultCost: 0.85, reusable: false },
  { id: 'letter_postage',    name: 'Letter Postage',        category: 'lead_gen', defaultCost: 0.68, reusable: false },
  { id: 'cb_printing',       name: 'Cannonball Printing',   category: 'lead_gen', defaultCost: 1.50, reusable: false },
  { id: 'cb_postage',        name: 'Cannonball Postage',    category: 'lead_gen', defaultCost: 0.68, reusable: false },
  { id: 'cb_envelope',       name: 'Cannonball Envelope',   category: 'lead_gen', defaultCost: 0.25, reusable: false },
  { id: 'door_knock_flyer',  name: 'Door Knock Flyer',     category: 'lead_gen', defaultCost: 0.15, reusable: false },
]

// ─── Persistence ─────────────────────────────────────────────────────────────
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback }
  catch { return fallback }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

// ─── Entity Type Config ──────────────────────────────────────────────────────
const ENTITY_TYPES = [
  { value: 'listing',     label: 'Listing',    icon: 'home' },
  { value: 'open_house',  label: 'Open House', icon: 'eye' },
  { value: 'buyer',       label: 'Buyer',      icon: 'user' },
  { value: 'seller',      label: 'Seller',     icon: 'user' },
  { value: 'transaction', label: 'Transaction', icon: 'layers' },
  { value: 'lead_gen',    label: 'Lead Gen',   icon: 'target' },
]

const CATEGORY_COLORS = {
  listing: '#7c6350',
  transaction: '#4a8c52',
  open_house: '#3b7cb5',
  lead_gen: '#b5703b',
  buyer: '#6a3b8c',
  seller: '#8c3b5a',
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function CostTracker() {
  const [tab, setTab]         = useState('by-entity')
  const [entityFilter, setEntityFilter] = useState('')
  const [panel, setPanel]     = useState(null) // null | 'add' | 'catalog' | 'checklist' | cost item
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')

  // Data from Supabase
  const listings     = useListings()
  const openHouses   = useOpenHouses()
  const contacts     = useContacts()
  const transactions = useTransactions()
  const leads        = useLeads()

  // LocalStorage state
  const [catalog, setCatalog]     = useState(() => loadJSON(CATALOG_KEY, DEFAULT_CATALOG))
  const [costItems, setCostItems] = useState(() => loadJSON(ITEMS_KEY, []))
  const [checklists, setChecklists] = useState(() => loadJSON(CHECKLIST_KEY, {}))

  // ─── Draft for add/edit ─────────────────────────────────────────────────
  const EMPTY_DRAFT = {
    entity_type: '',
    entity_id: '',
    entity_label: '',
    service_id: '',
    description: '',
    amount: '',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  }
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  // ─── Catalog draft ──────────────────────────────────────────────────────
  const [catalogDraft, setCatalogDraft] = useState({ id: '', name: '', category: 'listing', defaultCost: '', reusable: false })

  // ─── Build entity options ───────────────────────────────────────────────
  const entityOptions = useMemo(() => {
    const opts = []
    ;(listings.data ?? []).forEach(l => opts.push({
      type: 'listing', id: l.id,
      label: `${l.property?.address ?? l.contact?.name ?? 'Listing'} — ${l.contact?.name ?? ''}`.trim(),
    }))
    ;(openHouses.data ?? []).forEach(oh => opts.push({
      type: 'open_house', id: oh.id,
      label: `OH ${oh.date ? new Date(oh.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} — ${oh.property?.address ?? oh.listing?.property?.address ?? 'Open House'}`,
    }))
    const buyers = (contacts.data ?? []).filter(c => c.type === 'buyer' || c.type === 'both')
    const sellers = (contacts.data ?? []).filter(c => c.type === 'seller' || c.type === 'both')
    buyers.forEach(c => opts.push({ type: 'buyer', id: c.id, label: c.name ?? 'Buyer' }))
    sellers.forEach(c => opts.push({ type: 'seller', id: c.id, label: c.name ?? 'Seller' }))
    ;(transactions.data ?? []).forEach(t => opts.push({
      type: 'transaction', id: t.id,
      label: `${t.contact?.name ?? '—'} — ${t.property?.address ?? 'Transaction'}`,
    }))
    ;(leads.data ?? []).forEach(l => opts.push({
      type: 'lead_gen', id: l.id,
      label: l.property?.address ?? 'Lead',
    }))
    return opts
  }, [listings.data, openHouses.data, contacts.data, transactions.data, leads.data])

  const filteredEntityOptions = useMemo(() => {
    if (!draft.entity_type) return entityOptions
    return entityOptions.filter(o => o.type === draft.entity_type)
  }, [entityOptions, draft.entity_type])

  // ─── Aggregate cost data ────────────────────────────────────────────────
  const totalCosts = useMemo(() => costItems.reduce((s, i) => s + (Number(i.amount) || 0) * (Number(i.quantity) || 1), 0), [costItems])

  const costsByEntity = useMemo(() => {
    const map = {}
    costItems.forEach(item => {
      const key = `${item.entity_type}:${item.entity_id}`
      if (!map[key]) map[key] = {
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        entity_label: item.entity_label,
        total: 0,
        count: 0,
        items: [],
      }
      const lineTotal = (Number(item.amount) || 0) * (Number(item.quantity) || 1)
      map[key].total += lineTotal
      map[key].count++
      map[key].items.push(item)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [costItems])

  const costsByCategory = useMemo(() => {
    const map = {}
    ENTITY_TYPES.forEach(t => { map[t.value] = { label: t.label, total: 0, count: 0 } })
    costItems.forEach(item => {
      const lineTotal = (Number(item.amount) || 0) * (Number(item.quantity) || 1)
      if (map[item.entity_type]) {
        map[item.entity_type].total += lineTotal
        map[item.entity_type].count++
      }
    })
    return Object.entries(map).filter(([, v]) => v.count > 0).sort((a, b) => b[1].total - a[1].total)
  }, [costItems])

  const costsByService = useMemo(() => {
    const map = {}
    costItems.forEach(item => {
      const svc = catalog.find(c => c.id === item.service_id)
      const name = svc?.name || item.description || 'Other'
      if (!map[name]) map[name] = { total: 0, count: 0, avgCost: 0 }
      const lineTotal = (Number(item.amount) || 0) * (Number(item.quantity) || 1)
      map[name].total += lineTotal
      map[name].count++
    })
    Object.values(map).forEach(v => { v.avgCost = v.count > 0 ? v.total / v.count : 0 })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [costItems, catalog])

  // Filtered items for search
  const filteredItems = useMemo(() => {
    let items = costItems
    if (entityFilter) items = items.filter(i => i.entity_type === entityFilter)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        (i.entity_label ?? '').toLowerCase().includes(q) ||
        (i.description ?? '').toLowerCase().includes(q) ||
        (catalog.find(c => c.id === i.service_id)?.name ?? '').toLowerCase().includes(q)
      )
    }
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [costItems, entityFilter, search, catalog])

  // ─── CRUD ───────────────────────────────────────────────────────────────
  function saveCostItem(item) {
    let updated
    if (item.id) {
      updated = costItems.map(i => i.id === item.id ? item : i)
    } else {
      updated = [...costItems, { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() }]
    }
    setCostItems(updated)
    saveJSON(ITEMS_KEY, updated)
  }

  function deleteCostItem(id) {
    const updated = costItems.filter(i => i.id !== id)
    setCostItems(updated)
    saveJSON(ITEMS_KEY, updated)
  }

  function saveCatalogItem(item) {
    let updated
    const existing = catalog.find(c => c.id === item.id)
    if (existing) {
      updated = catalog.map(c => c.id === item.id ? item : c)
    } else {
      updated = [...catalog, item]
    }
    setCatalog(updated)
    saveJSON(CATALOG_KEY, updated)
  }

  function deleteCatalogItem(id) {
    const updated = catalog.filter(c => c.id !== id)
    setCatalog(updated)
    saveJSON(CATALOG_KEY, updated)
  }

  // ─── Checklist helpers ──────────────────────────────────────────────────
  function toggleChecklistItem(entityKey, serviceId) {
    const current = checklists[entityKey] ?? {}
    const next = { ...checklists, [entityKey]: { ...current, [serviceId]: !current[serviceId] } }
    setChecklists(next)
    saveJSON(CHECKLIST_KEY, next)
  }

  function getChecklistForEntity(entityType, entityId) {
    const key = `${entityType}:${entityId}`
    return checklists[key] ?? {}
  }

  // ─── Handlers ───────────────────────────────────────────────────────────
  function openAdd() {
    setDraft(EMPTY_DRAFT)
    setPanel('add')
  }

  function openEdit(item) {
    setDraft({ ...item })
    setPanel(item)
  }

  function handleSave() {
    const svc = catalog.find(c => c.id === draft.service_id)
    saveCostItem({
      ...draft,
      id: panel === 'add' ? undefined : draft.id,
      description: draft.description || svc?.name || '',
    })
    setPanel(null)
  }

  function handleDelete() {
    if (!confirm('Delete this cost item?')) return
    deleteCostItem(panel.id)
    setPanel(null)
  }

  // When service is selected, auto-fill amount
  function onServiceChange(serviceId) {
    const svc = catalog.find(c => c.id === serviceId)
    setDraft(d => ({
      ...d,
      service_id: serviceId,
      amount: svc ? String(svc.defaultCost) : d.amount,
      description: svc ? svc.name : d.description,
    }))
  }

  // When entity is selected from dropdown
  function onEntitySelect(optionKey) {
    const opt = entityOptions.find(o => `${o.type}:${o.id}` === optionKey)
    if (opt) {
      setDraft(d => ({
        ...d,
        entity_type: opt.type,
        entity_id: opt.id,
        entity_label: opt.label,
      }))
    }
  }

  // ─── Checklist panel content ────────────────────────────────────────────
  const [checklistEntity, setChecklistEntity] = useState(null)

  function openChecklist(entityType, entityId, entityLabel) {
    setChecklistEntity({ type: entityType, id: entityId, label: entityLabel })
    setPanel('checklist')
  }

  const checklistServices = useMemo(() => {
    if (!checklistEntity) return []
    return catalog.filter(c => c.category === checklistEntity.type || c.category === 'listing')
  }, [checklistEntity, catalog])

  const checklistState = checklistEntity ? getChecklistForEntity(checklistEntity.type, checklistEntity.id) : {}

  // Quick-add from checklist: create cost items for all checked services
  function addCostsFromChecklist() {
    if (!checklistEntity) return
    const key = `${checklistEntity.type}:${checklistEntity.id}`
    const state = checklists[key] ?? {}
    const existing = costItems.filter(i => i.entity_type === checklistEntity.type && i.entity_id === checklistEntity.id)
    const existingServiceIds = new Set(existing.map(i => i.service_id))

    const newItems = Object.entries(state)
      .filter(([svcId, checked]) => checked && !existingServiceIds.has(svcId))
      .map(([svcId]) => {
        const svc = catalog.find(c => c.id === svcId)
        return {
          id: crypto.randomUUID(),
          entity_type: checklistEntity.type,
          entity_id: checklistEntity.id,
          entity_label: checklistEntity.label,
          service_id: svcId,
          description: svc?.name || svcId,
          amount: svc?.defaultCost ?? 0,
          quantity: 1,
          date: new Date().toISOString().split('T')[0],
          notes: '',
          created_at: new Date().toISOString(),
        }
      })

    if (newItems.length > 0) {
      const updated = [...costItems, ...newItems]
      setCostItems(updated)
      saveJSON(ITEMS_KEY, updated)
    }
    setPanel(null)
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <SectionHeader
        title="Cost Tracker"
        subtitle={`${costItems.length} items · ${fmt(totalCosts)} total`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setPanel('catalog')}>Service Catalog</Button>
            <Button onClick={openAdd}>+ Add Cost</Button>
          </div>
        }
      />

      {/* ─── KPIs ─── */}
      <div className="pnl-kpis">
        {costsByCategory.slice(0, 4).map(([key, val]) => (
          <Card key={key} className="pnl-kpi">
            <p className="pnl-kpi__label">{val.label} Costs</p>
            <p className="pnl-kpi__value" style={{ color: CATEGORY_COLORS[key] }}>{fmt(val.total)}</p>
            <p className="pnl-kpi__sub">{val.count} item{val.count !== 1 ? 's' : ''}</p>
          </Card>
        ))}
        {costsByCategory.length === 0 && (
          <>
            <Card className="pnl-kpi">
              <p className="pnl-kpi__label">Listing Costs</p>
              <p className="pnl-kpi__value">$0.00</p>
              <p className="pnl-kpi__sub">No items yet</p>
            </Card>
            <Card className="pnl-kpi">
              <p className="pnl-kpi__label">Open House Costs</p>
              <p className="pnl-kpi__value">$0.00</p>
              <p className="pnl-kpi__sub">No items yet</p>
            </Card>
            <Card className="pnl-kpi">
              <p className="pnl-kpi__label">Transaction Costs</p>
              <p className="pnl-kpi__value">$0.00</p>
              <p className="pnl-kpi__sub">No items yet</p>
            </Card>
            <Card className="pnl-kpi">
              <p className="pnl-kpi__label">Lead Gen Costs</p>
              <p className="pnl-kpi__value">$0.00</p>
              <p className="pnl-kpi__sub">No items yet</p>
            </Card>
          </>
        )}
      </div>

      {/* ─── Filters ─── */}
      <div className="pnl-filters" style={{ marginBottom: 16 }}>
        <Input
          className="pnl-search"
          placeholder="Search costs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
          <option value="">All Types</option>
          {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </div>

      {/* ─── Tabs ─── */}
      <TabBar
        tabs={[
          { value: 'by-entity', label: 'By Entity' },
          { value: 'by-service', label: 'By Service' },
          { value: 'all', label: `All Items (${filteredItems.length})` },
          { value: 'checklists', label: 'Checklists' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ═══ By Entity View ═══ */}
      {tab === 'by-entity' && (
        costsByEntity.length === 0 ? (
          <Card>
            <div className="pnl-empty">
              <div className="pnl-empty__icon">$</div>
              <p className="pnl-empty__title">No costs tracked yet</p>
              <p className="pnl-empty__sub">Add your first cost to start tracking what you spend on listings, open houses, lead gen, and more.</p>
              <Button onClick={openAdd}>+ Add Cost</Button>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(entityFilter ? costsByEntity.filter(e => e.entity_type === entityFilter) : costsByEntity).map(entity => (
              <Card key={`${entity.entity_type}:${entity.entity_id}`} padding>
                <div className="cost-entity-header">
                  <div className="cost-entity-header__left">
                    <Badge size="sm" style={{ background: CATEGORY_COLORS[entity.entity_type], color: '#fff' }}>
                      {ENTITY_TYPES.find(t => t.value === entity.entity_type)?.label}
                    </Badge>
                    <span className="cost-entity-header__name">{entity.entity_label}</span>
                  </div>
                  <div className="cost-entity-header__right">
                    <span className="cost-entity-header__total">{fmt(entity.total)}</span>
                    <Button variant="ghost" size="sm" onClick={() => openChecklist(entity.entity_type, entity.entity_id, entity.entity_label)}>
                      Checklist
                    </Button>
                  </div>
                </div>
                <div className="cost-entity-items">
                  {entity.items.sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(item => {
                    const svc = catalog.find(c => c.id === item.service_id)
                    const lineTotal = (Number(item.amount) || 0) * (Number(item.quantity) || 1)
                    return (
                      <div key={item.id} className="cost-entity-item" onClick={() => openEdit(item)}>
                        <div className="cost-entity-item__left">
                          <span className="cost-entity-item__name">{svc?.name || item.description}</span>
                          {item.notes && <span className="cost-entity-item__note">{item.notes}</span>}
                        </div>
                        <div className="cost-entity-item__right">
                          {Number(item.quantity) > 1 && (
                            <span className="cost-entity-item__qty">{item.quantity} × {fmt(Number(item.amount))}</span>
                          )}
                          <span className="cost-entity-item__amount">{fmt(lineTotal)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ═══ By Service View ═══ */}
      {tab === 'by-service' && (
        <Card padding>
          {costsByService.length === 0 ? (
            <p style={{ padding: 30, textAlign: 'center', color: 'var(--brown-light)' }}>No cost data</p>
          ) : costsByService.map(([name, data]) => (
            <div key={name} className="pnl-cat-row">
              <div className="pnl-cat-row__left">
                <span className="pnl-cat-row__name">{name}</span>
                <span className="pnl-cat-row__count">{data.count} time{data.count !== 1 ? 's' : ''} · avg {fmt(data.avgCost)}</span>
                <div className="pnl-cat-bar">
                  <div className="pnl-cat-bar__fill" style={{ width: `${totalCosts > 0 ? (data.total / totalCosts) * 100 : 0}%` }} />
                </div>
              </div>
              <span className="pnl-cat-row__amount">{fmt(data.total)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* ═══ All Items View ═══ */}
      {tab === 'all' && (
        <Card padding={false}>
          {filteredItems.length === 0 ? (
            <div className="pnl-empty">
              <div className="pnl-empty__icon">$</div>
              <p className="pnl-empty__title">No costs found</p>
              <p className="pnl-empty__sub">Try adjusting your filters or add a new cost.</p>
            </div>
          ) : (
            <table className="pnl-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Entity</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const svc = catalog.find(c => c.id === item.service_id)
                  const lineTotal = (Number(item.amount) || 0) * (Number(item.quantity) || 1)
                  return (
                    <tr key={item.id} onClick={() => openEdit(item)}>
                      <td>{item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                      <td>
                        <span className="pnl-table__vendor">{svc?.name || item.description}</span>
                        {Number(item.quantity) > 1 && <><br /><span style={{ fontSize: '0.73rem', color: 'var(--brown-light)' }}>{item.quantity} × {fmt(Number(item.amount))}</span></>}
                      </td>
                      <td>
                        <span className="pnl-table__cat" style={{ background: CATEGORY_COLORS[item.entity_type] + '18', color: CATEGORY_COLORS[item.entity_type] }}>
                          {ENTITY_TYPES.find(t => t.value === item.entity_type)?.label}
                        </span>
                        <br /><span style={{ fontSize: '0.72rem', color: 'var(--brown-light)' }}>{item.entity_label}</span>
                      </td>
                      <td className="pnl-table__amount">{fmt(lineTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 600 }}>
                  <td colSpan="3" style={{ textAlign: 'right', paddingRight: 12 }}>Total</td>
                  <td className="pnl-table__amount">{fmt(filteredItems.reduce((s, i) => s + (Number(i.amount) || 0) * (Number(i.quantity) || 1), 0))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </Card>
      )}

      {/* ═══ Checklists View ═══ */}
      {tab === 'checklists' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entityOptions.filter(o => o.type === 'listing' || o.type === 'open_house').length === 0 ? (
            <Card>
              <div className="pnl-empty">
                <div className="pnl-empty__icon">✓</div>
                <p className="pnl-empty__title">No listings or open houses yet</p>
                <p className="pnl-empty__sub">Checklists let you plan which services to use for each listing and open house.</p>
              </div>
            </Card>
          ) : (
            entityOptions
              .filter(o => o.type === 'listing' || o.type === 'open_house')
              .map(opt => {
                const cl = getChecklistForEntity(opt.type, opt.id)
                const checkedCount = Object.values(cl).filter(Boolean).length
                const relevantServices = catalog.filter(c => c.category === opt.type || c.category === 'listing')
                const estimatedCost = relevantServices
                  .filter(svc => cl[svc.id])
                  .reduce((s, svc) => s + (svc.defaultCost || 0), 0)

                return (
                  <Card key={`${opt.type}:${opt.id}`} padding>
                    <div className="cost-entity-header">
                      <div className="cost-entity-header__left">
                        <Badge size="sm" style={{ background: CATEGORY_COLORS[opt.type], color: '#fff' }}>
                          {opt.type === 'listing' ? 'Listing' : 'Open House'}
                        </Badge>
                        <span className="cost-entity-header__name">{opt.label}</span>
                      </div>
                      <div className="cost-entity-header__right">
                        <span style={{ fontSize: '0.75rem', color: 'var(--brown-mid)' }}>
                          {checkedCount} selected · est. {fmt(estimatedCost)}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => openChecklist(opt.type, opt.id, opt.label)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                    {checkedCount > 0 && (
                      <div className="cost-checklist-inline">
                        {relevantServices.filter(svc => cl[svc.id]).map(svc => (
                          <span key={svc.id} className="cost-checklist-tag cost-checklist-tag--checked">{svc.name}</span>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })
          )}
        </div>
      )}

      {/* ═══ Add / Edit Cost Panel ═══ */}
      <SlidePanel
        open={panel === 'add' || (panel && panel !== 'catalog' && panel !== 'checklist')}
        onClose={() => setPanel(null)}
        title={panel === 'add' ? 'Add Cost' : 'Edit Cost'}
      >
        <div className="pnl-form">
          <Select label="Entity Type" value={draft.entity_type} onChange={e => setDraft(d => ({ ...d, entity_type: e.target.value, entity_id: '', entity_label: '' }))}>
            <option value="">— Select Type —</option>
            {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>

          {draft.entity_type && (
            <Select
              label={`Select ${ENTITY_TYPES.find(t => t.value === draft.entity_type)?.label}`}
              value={`${draft.entity_type}:${draft.entity_id}`}
              onChange={e => onEntitySelect(e.target.value)}
            >
              <option value="">— Select —</option>
              {filteredEntityOptions.map(o => (
                <option key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>{o.label}</option>
              ))}
            </Select>
          )}

          <hr className="pnl-form__divider" />

          <Select label="Service" value={draft.service_id} onChange={e => onServiceChange(e.target.value)}>
            <option value="">— Select Service —</option>
            {catalog
              .filter(c => !draft.entity_type || c.category === draft.entity_type || c.category === 'listing')
              .map(c => (
                <option key={c.id} value={c.id}>{c.name} ({fmt(c.defaultCost)})</option>
              ))
            }
            <option value="custom">Custom / Other</option>
          </Select>

          {draft.service_id === 'custom' && (
            <Input label="Description" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="What was this cost for?" />
          )}

          <div className="pnl-form__row">
            <Input label="Cost ($)" type="number" step="0.01" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
            <Input label="Quantity" type="number" min="1" value={draft.quantity} onChange={e => setDraft(d => ({ ...d, quantity: e.target.value }))} />
          </div>

          <div className="pnl-form__row">
            <Input label="Date" type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
          </div>

          {Number(draft.quantity) > 1 && Number(draft.amount) > 0 && (
            <div className="pnl-form__commission-calc">
              <div className="pnl-form__calc-row">
                <span>Unit Cost</span><span>{fmt(Number(draft.amount))}</span>
              </div>
              <div className="pnl-form__calc-row">
                <span>Quantity</span><span>× {draft.quantity}</span>
              </div>
              <div className="pnl-form__calc-row pnl-form__calc-row--total">
                <span>Line Total</span><span>{fmt(Number(draft.amount) * Number(draft.quantity))}</span>
              </div>
            </div>
          )}

          <Input label="Notes" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Internal notes..." />

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={handleSave} disabled={!draft.amount || !draft.entity_id}>
              {panel === 'add' ? 'Add Cost' : 'Save Changes'}
            </Button>
            {panel !== 'add' && (
              <Button variant="danger" onClick={handleDelete}>Delete</Button>
            )}
          </div>
        </div>
      </SlidePanel>

      {/* ═══ Service Catalog Panel ═══ */}
      <SlidePanel open={panel === 'catalog'} onClose={() => setPanel(null)} title="Service Catalog">
        <div className="pnl-form">
          <p style={{ fontSize: '0.8rem', color: 'var(--brown-mid)', margin: 0 }}>
            Configure the services you offer and their default costs. These appear when adding costs.
          </p>

          {/* Add new service */}
          <div style={{ padding: 14, background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown-mid)', margin: '0 0 10px' }}>Add New Service</p>
            <Input label="Service Name" value={catalogDraft.name} onChange={e => setCatalogDraft(d => ({ ...d, name: e.target.value, id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') }))} placeholder="e.g., Drone Twilight" />
            <div className="pnl-form__row" style={{ marginTop: 8 }}>
              <Select label="Category" value={catalogDraft.category} onChange={e => setCatalogDraft(d => ({ ...d, category: e.target.value }))}>
                <option value="listing">Listing</option>
                <option value="open_house">Open House</option>
                <option value="transaction">Transaction</option>
                <option value="lead_gen">Lead Gen</option>
              </Select>
              <Input label="Default Cost ($)" type="number" step="0.01" value={catalogDraft.defaultCost} onChange={e => setCatalogDraft(d => ({ ...d, defaultCost: e.target.value }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--brown-dark)', cursor: 'pointer', marginTop: 8 }}>
              <input type="checkbox" checked={catalogDraft.reusable} onChange={e => setCatalogDraft(d => ({ ...d, reusable: e.target.checked }))} />
              Reusable (e.g., signs, lockboxes)
            </label>
            <Button
              size="sm"
              style={{ marginTop: 10 }}
              disabled={!catalogDraft.name || !catalogDraft.defaultCost}
              onClick={() => {
                saveCatalogItem({ ...catalogDraft, defaultCost: Number(catalogDraft.defaultCost) })
                setCatalogDraft({ id: '', name: '', category: 'listing', defaultCost: '', reusable: false })
              }}
            >
              + Add Service
            </Button>
          </div>

          <hr className="pnl-form__divider" />

          {/* Existing catalog */}
          {['listing', 'open_house', 'transaction', 'lead_gen'].map(cat => {
            const items = catalog.filter(c => c.category === cat)
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: CATEGORY_COLORS[cat], margin: '8px 0 6px' }}>
                  {ENTITY_TYPES.find(t => t.value === cat)?.label || cat}
                </p>
                {items.map(svc => (
                  <div key={svc.id} className="cost-catalog-item">
                    <div className="cost-catalog-item__left">
                      <span className="cost-catalog-item__name">{svc.name}</span>
                      {svc.reusable && <span className="cost-catalog-item__reuse">reusable</span>}
                    </div>
                    <div className="cost-catalog-item__right">
                      <span className="cost-catalog-item__cost">{fmt(svc.defaultCost)}</span>
                      <button className="cost-catalog-item__delete" onClick={() => deleteCatalogItem(svc.id)} title="Remove">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}

          <Button variant="ghost" onClick={() => {
            if (confirm('Reset to default catalog? Custom services will be removed.')) {
              setCatalog(DEFAULT_CATALOG)
              saveJSON(CATALOG_KEY, DEFAULT_CATALOG)
            }
          }}>
            Reset to Defaults
          </Button>
        </div>
      </SlidePanel>

      {/* ═══ Checklist Panel ═══ */}
      <SlidePanel open={panel === 'checklist'} onClose={() => setPanel(null)} title={`Service Checklist — ${checklistEntity?.label ?? ''}`}>
        {checklistEntity && (
          <div className="pnl-form">
            <p style={{ fontSize: '0.8rem', color: 'var(--brown-mid)', margin: 0 }}>
              Check the services you plan to use for this {ENTITY_TYPES.find(t => t.value === checklistEntity.type)?.label?.toLowerCase()}.
            </p>

            {['listing', checklistEntity.type].filter((v, i, a) => a.indexOf(v) === i).map(cat => {
              const services = catalog.filter(c => c.category === cat)
              if (services.length === 0) return null
              return (
                <div key={cat}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: CATEGORY_COLORS[cat], margin: '12px 0 6px' }}>
                    {ENTITY_TYPES.find(t => t.value === cat)?.label || cat}
                  </p>
                  {services.map(svc => {
                    const key = `${checklistEntity.type}:${checklistEntity.id}`
                    const checked = (checklists[key] ?? {})[svc.id] ?? false
                    return (
                      <label key={svc.id} className="cost-checklist-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChecklistItem(key, svc.id)}
                        />
                        <span className="cost-checklist-row__name">{svc.name}</span>
                        <span className="cost-checklist-row__cost">{fmt(svc.defaultCost)}</span>
                      </label>
                    )
                  })}
                </div>
              )
            })}

            {/* Estimated total */}
            {(() => {
              const key = `${checklistEntity.type}:${checklistEntity.id}`
              const state = checklists[key] ?? {}
              const checked = Object.entries(state).filter(([, v]) => v)
              const est = checked.reduce((s, [id]) => {
                const svc = catalog.find(c => c.id === id)
                return s + (svc?.defaultCost ?? 0)
              }, 0)
              return (
                <div className="pnl-form__commission-calc">
                  <div className="pnl-form__calc-row">
                    <span>Services Selected</span><span>{checked.length}</span>
                  </div>
                  <div className="pnl-form__calc-row pnl-form__calc-row--total">
                    <span>Estimated Total</span><span>{fmt(est)}</span>
                  </div>
                </div>
              )
            })()}

            <Button onClick={addCostsFromChecklist}>
              Add Checked Services as Costs
            </Button>
          </div>
        )}
      </SlidePanel>
    </>
  )
}
