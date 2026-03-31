import { useState } from 'react'
import { Button, SlidePanel, Input, Select, Textarea, StatCard, Badge } from '../../components/ui/index.jsx'
import { useProperties } from '../../lib/hooks'
import './Ads.css'

/* ─── Local storage for ads ─── */
const ADS_KEY = 'ads_manager_v1'
function loadAds() { try { return JSON.parse(localStorage.getItem(ADS_KEY)) || [] } catch { return [] } }
function saveAds(data) { localStorage.setItem(ADS_KEY, JSON.stringify(data)) }

const AD_PLATFORMS = ['Facebook/Meta', 'Instagram', 'Google Ads', 'YouTube', 'TikTok', 'LinkedIn', 'Zillow', 'Realtor.com', 'Nextdoor', 'Waze', 'Other']
const AD_TYPES = ['Listing Ad', 'Open House', 'Just Sold', 'Brand Awareness', 'Lead Gen', 'Market Update', 'Retargeting', 'Video View', 'Traffic', 'Other']
const AD_STATUSES = ['Draft', 'Active', 'Paused', 'Completed', 'Cancelled']

export default function AdsManager() {
  const { data: properties } = useProperties()
  const propertyList = properties ?? []

  const [ads, setAds] = useState(loadAds)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all') // all | active | completed
  const [draft, setDraft] = useState({})

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  function openNew() {
    setEditing(null)
    setDraft({
      name: '', platform: '', adType: '', status: 'Draft',
      property_id: '', client_name: '',
      budget: '', spent: '', startDate: '', endDate: '',
      impressions: '', clicks: '', leads: '', cpl: '',
      reach: '', ctr: '', conversions: '',
      targetAudience: '', adCopy: '', link: '', notes: '',
      createdAt: new Date().toISOString(),
    })
    setPanelOpen(true)
  }

  function openEdit(ad) {
    setEditing(ad)
    setDraft({ ...ad })
    setPanelOpen(true)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!draft.name.trim()) return
    let updated
    if (editing) {
      updated = ads.map(a => a.id === editing.id ? { ...draft, updatedAt: new Date().toISOString() } : a)
    } else {
      updated = [...ads, { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]
    }
    setAds(updated)
    saveAds(updated)
    setPanelOpen(false)
  }

  function handleDelete() {
    if (!editing || !confirm('Delete this ad?')) return
    const updated = ads.filter(a => a.id !== editing.id)
    setAds(updated)
    saveAds(updated)
    setPanelOpen(false)
  }

  // Stats
  const activeAds = ads.filter(a => a.status === 'Active')
  const totalBudget = ads.reduce((s, a) => s + (Number(a.budget) || 0), 0)
  const totalSpent = ads.reduce((s, a) => s + (Number(a.spent) || 0), 0)
  const totalLeads = ads.reduce((s, a) => s + (Number(a.leads) || 0), 0)
  const totalImpressions = ads.reduce((s, a) => s + (Number(a.impressions) || 0), 0)

  // Filter
  const filtered = filter === 'all' ? ads
    : filter === 'active' ? ads.filter(a => a.status === 'Active')
    : ads.filter(a => a.status === 'Completed')

  // Property lookup
  const propMap = {}
  propertyList.forEach(p => { propMap[p.id] = p })

  return (
    <div className="section-dash ads-dash">
      <div className="section-dash__kpis">
        <StatCard label="Active Ads" value={activeAds.length} accent />
        <StatCard label="Total Budget" value={`$${totalBudget.toLocaleString()}`} />
        <StatCard label="Total Spent" value={`$${totalSpent.toLocaleString()}`} />
        <StatCard label="Total Leads" value={totalLeads} />
        <StatCard label="Impressions" value={totalImpressions.toLocaleString()} />
      </div>

      {/* Toolbar */}
      <div className="ads-toolbar">
        <div className="ads-filters">
          {['all', 'active', 'completed'].map(f => (
            <button key={f} className={`ads-filter-btn${filter === f ? ' ads-filter-btn--active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Completed'} ({f === 'all' ? ads.length : f === 'active' ? activeAds.length : ads.filter(a => a.status === 'Completed').length})
            </button>
          ))}
        </div>
        <Button onClick={openNew}>+ New Ad</Button>
      </div>

      {/* Ads Table */}
      {filtered.length > 0 ? (
        <div className="ads-table">
          <div className="ads-table__header">
            <span>Ad Name</span>
            <span>Platform</span>
            <span>Property</span>
            <span>Status</span>
            <span>Budget</span>
            <span>Spent</span>
            <span>Leads</span>
            <span>CPL</span>
          </div>
          {filtered.map(ad => {
            const prop = propMap[ad.property_id]
            const cpl = ad.leads > 0 && ad.spent > 0 ? (Number(ad.spent) / Number(ad.leads)).toFixed(2) : ad.cpl || '--'
            return (
              <div key={ad.id} className="ads-table__row" onClick={() => openEdit(ad)}>
                <span className="ads-table__name">
                  <strong>{ad.name}</strong>
                  {ad.adType && <span className="ads-table__type">{ad.adType}</span>}
                </span>
                <span>{ad.platform || '--'}</span>
                <span className="ads-table__prop">
                  {prop ? prop.address : ad.client_name || '--'}
                  {prop?.city && <span className="ads-table__city">{prop.city}</span>}
                </span>
                <span>
                  <Badge variant={ad.status === 'Active' ? 'success' : ad.status === 'Paused' ? 'warning' : ad.status === 'Completed' ? 'info' : 'accent'} size="sm">
                    {ad.status}
                  </Badge>
                </span>
                <span>${Number(ad.budget || 0).toLocaleString()}</span>
                <span>${Number(ad.spent || 0).toLocaleString()}</span>
                <span>{ad.leads || '0'}</span>
                <span>{cpl !== '--' ? `$${cpl}` : '--'}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="ads-empty">
          <p>No ads {filter !== 'all' ? `with status "${filter}"` : 'created yet'}.</p>
          <Button onClick={openNew}>Create Your First Ad</Button>
        </div>
      )}

      {/* Ad Edit Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? 'Edit Ad' : 'New Ad'}
        width={520}
      >
        <form className="ads-form" onSubmit={handleSave}>
          <div className="ads-form__field">
            <label className="ads-form__label">Ad Name *</label>
            <Input value={draft.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="e.g. 123 Main St — Just Listed (FB)" required />
          </div>

          <div className="ads-form__row">
            <div className="ads-form__field">
              <label className="ads-form__label">Platform</label>
              <Select value={draft.platform ?? ''} onChange={e => set('platform', e.target.value)}>
                <option value="">--</option>
                {AD_PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </Select>
            </div>
            <div className="ads-form__field">
              <label className="ads-form__label">Ad Type</label>
              <Select value={draft.adType ?? ''} onChange={e => set('adType', e.target.value)}>
                <option value="">--</option>
                {AD_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </div>
          </div>

          <div className="ads-form__row">
            <div className="ads-form__field">
              <label className="ads-form__label">Status</label>
              <Select value={draft.status ?? 'Draft'} onChange={e => set('status', e.target.value)}>
                {AD_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div className="ads-form__field">
              <label className="ads-form__label">Client Name</label>
              <Input value={draft.client_name ?? ''} onChange={e => set('client_name', e.target.value)} placeholder="e.g. John & Jane Smith" />
            </div>
          </div>

          {/* Property Linking */}
          <div className="ads-form__field">
            <label className="ads-form__label">Linked Property</label>
            <Select value={draft.property_id ?? ''} onChange={e => set('property_id', e.target.value)}>
              <option value="">-- No Property --</option>
              {propertyList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.address}{p.city ? `, ${p.city}` : ''}{p.price ? ` — $${Number(p.price).toLocaleString()}` : ''}
                </option>
              ))}
            </Select>
            <p className="ads-form__hint">Link to a property to track ad stats in client reports.</p>
          </div>

          <div className="ads-form__divider">Budget & Schedule</div>

          <div className="ads-form__row">
            <div className="ads-form__field">
              <label className="ads-form__label">Budget ($)</label>
              <Input type="number" value={draft.budget ?? ''} onChange={e => set('budget', e.target.value)} placeholder="500" />
            </div>
            <div className="ads-form__field">
              <label className="ads-form__label">Spent ($)</label>
              <Input type="number" value={draft.spent ?? ''} onChange={e => set('spent', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="ads-form__row">
            <div className="ads-form__field">
              <label className="ads-form__label">Start Date</label>
              <Input type="date" value={draft.startDate ?? ''} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div className="ads-form__field">
              <label className="ads-form__label">End Date</label>
              <Input type="date" value={draft.endDate ?? ''} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>

          <div className="ads-form__divider">Performance Metrics</div>

          <div className="ads-form__row">
            <div className="ads-form__field">
              <label className="ads-form__label">Impressions</label>
              <Input type="number" value={draft.impressions ?? ''} onChange={e => set('impressions', e.target.value)} placeholder="0" />
            </div>
            <div className="ads-form__field">
              <label className="ads-form__label">Reach</label>
              <Input type="number" value={draft.reach ?? ''} onChange={e => set('reach', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="ads-form__row">
            <div className="ads-form__field">
              <label className="ads-form__label">Clicks</label>
              <Input type="number" value={draft.clicks ?? ''} onChange={e => set('clicks', e.target.value)} placeholder="0" />
            </div>
            <div className="ads-form__field">
              <label className="ads-form__label">CTR (%)</label>
              <Input type="number" step="0.01" value={draft.ctr ?? ''} onChange={e => set('ctr', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="ads-form__row">
            <div className="ads-form__field">
              <label className="ads-form__label">Leads Generated</label>
              <Input type="number" value={draft.leads ?? ''} onChange={e => set('leads', e.target.value)} placeholder="0" />
            </div>
            <div className="ads-form__field">
              <label className="ads-form__label">Conversions</label>
              <Input type="number" value={draft.conversions ?? ''} onChange={e => set('conversions', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="ads-form__divider">Creative</div>

          <div className="ads-form__field">
            <label className="ads-form__label">Target Audience</label>
            <Input value={draft.targetAudience ?? ''} onChange={e => set('targetAudience', e.target.value)} placeholder="e.g. 30-55, homeowners, Gilbert AZ, 10mi radius" />
          </div>

          <div className="ads-form__field">
            <label className="ads-form__label">Ad Copy</label>
            <Textarea value={draft.adCopy ?? ''} onChange={e => set('adCopy', e.target.value)} placeholder="The ad caption / copy text..." rows={3} />
          </div>

          <div className="ads-form__field">
            <label className="ads-form__label">Ad Link</label>
            <Input value={draft.link ?? ''} onChange={e => set('link', e.target.value)} placeholder="https://..." />
          </div>

          <div className="ads-form__field">
            <label className="ads-form__label">Notes</label>
            <Textarea value={draft.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." rows={2} />
          </div>

          <div className="ads-form__actions">
            {editing && (
              <button type="button" className="ads-form__del" onClick={handleDelete}>Delete</button>
            )}
            <Button type="submit">{editing ? 'Update Ad' : 'Create Ad'}</Button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
