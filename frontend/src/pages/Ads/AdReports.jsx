import { useState, useMemo } from 'react'
import { Button, Select, Badge, StatCard } from '../../components/ui/index.jsx'
import { useProperties } from '../../lib/hooks'
import './Ads.css'

/* ─── Load data from same localStorage as AdsManager + ContentPlanner ─── */
const ADS_KEY = 'ads_manager_v1'
const CONTENT_KEY = 'content_planner_v2'
function loadAds() { try { return JSON.parse(localStorage.getItem(ADS_KEY)) || [] } catch { return [] } }
function saveAds(data) { localStorage.setItem(ADS_KEY, JSON.stringify(data)) }
function loadContent() { try { return JSON.parse(localStorage.getItem(CONTENT_KEY)) || {} } catch { return {} } }
function saveContent(data) { localStorage.setItem(CONTENT_KEY, JSON.stringify(data)) }

const SLOT_LABELS = { story: 'Story', reel: 'Reel', carousel: 'Carousel' }

export default function AdReports() {
  const { data: properties } = useProperties()
  const propertyList = properties ?? []
  const propMap = {}
  propertyList.forEach(p => { propMap[p.id] = p })

  const [ads, setAds] = useState(loadAds)
  const [content, setContent] = useState(loadContent)
  const [filterProp, setFilterProp] = useState('')
  const [activeReport, setActiveReport] = useState('ads') // ads | content | combined

  // ─── Collect all content pieces with property links ───
  const contentPieces = useMemo(() => {
    const pieces = []
    Object.entries(content).forEach(([dateStr, day]) => {
      if (!day?.slots) return
      Object.entries(day.slots).forEach(([slotType, slot]) => {
        if (!slot.caption && !slot.topic) return
        pieces.push({
          date: dateStr,
          slotType,
          ...slot,
          _key: `${dateStr}_${slotType}`,
        })
      })
    })
    return pieces.sort((a, b) => b.date.localeCompare(a.date))
  }, [content])

  // Filter by property
  const filteredAds = filterProp ? ads.filter(a => a.property_id === filterProp) : ads
  const filteredContent = filterProp ? contentPieces.filter(c => c.property_id === filterProp) : contentPieces

  // Aggregated stats for filtered data
  const adStats = {
    total: filteredAds.length,
    spent: filteredAds.reduce((s, a) => s + (Number(a.spent) || 0), 0),
    leads: filteredAds.reduce((s, a) => s + (Number(a.leads) || 0), 0),
    impressions: filteredAds.reduce((s, a) => s + (Number(a.impressions) || 0), 0),
    clicks: filteredAds.reduce((s, a) => s + (Number(a.clicks) || 0), 0),
  }
  adStats.cpl = adStats.leads > 0 ? (adStats.spent / adStats.leads).toFixed(2) : '--'
  adStats.ctr = adStats.impressions > 0 ? ((adStats.clicks / adStats.impressions) * 100).toFixed(2) : '--'

  const contentStats = {
    total: filteredContent.length,
    withProperty: filteredContent.filter(c => c.property_id).length,
    repurposed: filteredContent.filter(c => Object.keys(c.repurpose || {}).length > 0).length,
    platforms: new Set(filteredContent.flatMap(c => Object.keys(c.repurpose || {}))).size,
  }

  // Change property link on a content piece
  function updateContentProperty(dateStr, slotType, newPropId) {
    const day = content[dateStr] || { meta: {}, slots: {} }
    const slot = { ...(day.slots?.[slotType] || {}), property_id: newPropId }
    const updated = {
      ...content,
      [dateStr]: { ...day, slots: { ...day.slots, [slotType]: slot } },
    }
    setContent(updated)
    saveContent(updated)
  }

  // Change property link on an ad
  function updateAdProperty(adId, newPropId) {
    const updated = ads.map(a => a.id === adId ? { ...a, property_id: newPropId } : a)
    setAds(updated)
    saveAds(updated)
  }

  // Properties that have any content or ads linked
  const linkedPropertyIds = useMemo(() => {
    const ids = new Set()
    ads.forEach(a => { if (a.property_id) ids.add(a.property_id) })
    contentPieces.forEach(c => { if (c.property_id) ids.add(c.property_id) })
    return ids
  }, [ads, contentPieces])

  return (
    <div className="section-dash ad-reports">
      {/* ─── Filter Bar ─── */}
      <div className="ar-toolbar">
        <div className="ar-toolbar__left">
          <h2 className="ar-title">Ad & Content Reports</h2>
          <p className="ar-subtitle">Track performance by property. Every piece of content and ad shows which property it belongs to.</p>
        </div>
        <div className="ar-toolbar__right">
          <Select value={filterProp} onChange={e => setFilterProp(e.target.value)}>
            <option value="">All Properties</option>
            {propertyList.map(p => (
              <option key={p.id} value={p.id}>
                {p.address}{p.city ? `, ${p.city}` : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* ─── KPIs ─── */}
      <div className="section-dash__kpis">
        <StatCard label="Ads" value={adStats.total} accent />
        <StatCard label="Ad Spend" value={`$${adStats.spent.toLocaleString()}`} />
        <StatCard label="Total Leads" value={adStats.leads} />
        <StatCard label="CPL" value={adStats.cpl !== '--' ? `$${adStats.cpl}` : '--'} />
        <StatCard label="Content Pieces" value={contentStats.total} />
      </div>

      {/* ─── Report Tabs ─── */}
      <div className="ar-tabs">
        {[
          { id: 'ads', label: `Ads (${filteredAds.length})` },
          { id: 'content', label: `Content (${filteredContent.length})` },
          { id: 'combined', label: 'By Property' },
        ].map(t => (
          <button key={t.id} className={`ar-tab${activeReport === t.id ? ' ar-tab--active' : ''}`} onClick={() => setActiveReport(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ADS REPORT ─── */}
      {activeReport === 'ads' && (
        <div className="ar-section">
          {filteredAds.length > 0 ? (
            <div className="ar-table">
              <div className="ar-table__header ar-table__header--ads">
                <span>Ad Name</span>
                <span>Property</span>
                <span>Platform</span>
                <span>Spent</span>
                <span>Impressions</span>
                <span>Clicks</span>
                <span>Leads</span>
                <span>CPL</span>
              </div>
              {filteredAds.map(ad => {
                const prop = propMap[ad.property_id]
                const cpl = ad.leads > 0 && ad.spent > 0 ? `$${(Number(ad.spent) / Number(ad.leads)).toFixed(2)}` : '--'
                return (
                  <div key={ad.id} className="ar-table__row ar-table__row--ads">
                    <span className="ar-table__name">
                      <strong>{ad.name}</strong>
                      <Badge variant={ad.status === 'Active' ? 'success' : 'accent'} size="sm">{ad.status}</Badge>
                    </span>
                    <span className="ar-table__prop-cell">
                      <select
                        className="ar-prop-select"
                        value={ad.property_id || ''}
                        onChange={e => updateAdProperty(ad.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">-- None --</option>
                        {propertyList.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                      </select>
                    </span>
                    <span>{ad.platform || '--'}</span>
                    <span>${Number(ad.spent || 0).toLocaleString()}</span>
                    <span>{Number(ad.impressions || 0).toLocaleString()}</span>
                    <span>{ad.clicks || '0'}</span>
                    <span>{ad.leads || '0'}</span>
                    <span>{cpl}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="ar-empty">No ads found{filterProp ? ' for this property' : ''}.</p>
          )}
        </div>
      )}

      {/* ─── CONTENT REPORT ─── */}
      {activeReport === 'content' && (
        <div className="ar-section">
          {filteredContent.length > 0 ? (
            <div className="ar-table">
              <div className="ar-table__header ar-table__header--content">
                <span>Date</span>
                <span>Type</span>
                <span>Topic / Caption</span>
                <span>Property</span>
                <span>Keyword</span>
                <span>Platforms</span>
              </div>
              {filteredContent.map(c => {
                const prop = propMap[c.property_id]
                const rpCount = Object.keys(c.repurpose || {}).length
                return (
                  <div key={c._key} className="ar-table__row ar-table__row--content">
                    <span className="ar-table__date">{new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span><Badge variant="accent" size="sm">{SLOT_LABELS[c.slotType] || c.slotType}</Badge></span>
                    <span className="ar-table__caption">{c.topic || (c.caption ? c.caption.slice(0, 60) + '...' : '--')}</span>
                    <span className="ar-table__prop-cell">
                      <select
                        className="ar-prop-select"
                        value={c.property_id || ''}
                        onChange={e => updateContentProperty(c.date, c.slotType, e.target.value)}
                      >
                        <option value="">-- None --</option>
                        {propertyList.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                      </select>
                    </span>
                    <span className="ar-table__kw">{c.manychatKeyword || '--'}</span>
                    <span>
                      {rpCount > 0 ? (
                        <Badge variant="info" size="sm">{rpCount + 1} platforms</Badge>
                      ) : (
                        <Badge variant="accent" size="sm">IG only</Badge>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="ar-empty">No content found{filterProp ? ' for this property' : ''}.</p>
          )}
        </div>
      )}

      {/* ─── BY PROPERTY REPORT ─── */}
      {activeReport === 'combined' && (
        <div className="ar-section">
          {linkedPropertyIds.size > 0 || filterProp ? (
            <div className="ar-property-cards">
              {(filterProp ? [filterProp] : [...linkedPropertyIds]).map(propId => {
                const prop = propMap[propId]
                if (!prop) return null
                const propAds = ads.filter(a => a.property_id === propId)
                const propContent = contentPieces.filter(c => c.property_id === propId)
                const propSpent = propAds.reduce((s, a) => s + (Number(a.spent) || 0), 0)
                const propLeads = propAds.reduce((s, a) => s + (Number(a.leads) || 0), 0)
                const propImpressions = propAds.reduce((s, a) => s + (Number(a.impressions) || 0), 0)

                return (
                  <div key={propId} className="ar-prop-card">
                    <div className="ar-prop-card__header">
                      <div>
                        <h3 className="ar-prop-card__address">{prop.address}</h3>
                        <p className="ar-prop-card__meta">
                          {[prop.city, prop.price && `$${Number(prop.price).toLocaleString()}`].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>

                    <div className="ar-prop-card__stats">
                      <div className="ar-prop-stat">
                        <span className="ar-prop-stat__val">{propAds.length}</span>
                        <span className="ar-prop-stat__label">Ads</span>
                      </div>
                      <div className="ar-prop-stat">
                        <span className="ar-prop-stat__val">${propSpent.toLocaleString()}</span>
                        <span className="ar-prop-stat__label">Spent</span>
                      </div>
                      <div className="ar-prop-stat">
                        <span className="ar-prop-stat__val">{propImpressions.toLocaleString()}</span>
                        <span className="ar-prop-stat__label">Impressions</span>
                      </div>
                      <div className="ar-prop-stat">
                        <span className="ar-prop-stat__val">{propLeads}</span>
                        <span className="ar-prop-stat__label">Leads</span>
                      </div>
                      <div className="ar-prop-stat">
                        <span className="ar-prop-stat__val">{propContent.length}</span>
                        <span className="ar-prop-stat__label">Content</span>
                      </div>
                    </div>

                    {propAds.length > 0 && (
                      <div className="ar-prop-card__section">
                        <h4 className="ar-prop-card__section-title">Ads</h4>
                        {propAds.map(ad => (
                          <div key={ad.id} className="ar-prop-card__item">
                            <span>{ad.name}</span>
                            <span>{ad.platform}</span>
                            <Badge variant={ad.status === 'Active' ? 'success' : 'accent'} size="sm">{ad.status}</Badge>
                            <span>${Number(ad.spent || 0).toLocaleString()}</span>
                            <span>{ad.leads || 0} leads</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {propContent.length > 0 && (
                      <div className="ar-prop-card__section">
                        <h4 className="ar-prop-card__section-title">Content ({propContent.length} pieces)</h4>
                        {propContent.slice(0, 5).map(c => (
                          <div key={c._key} className="ar-prop-card__item">
                            <span>{new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <Badge variant="accent" size="sm">{SLOT_LABELS[c.slotType]}</Badge>
                            <span className="ar-prop-card__item-topic">{c.topic || c.caption?.slice(0, 40) || '--'}</span>
                            {c.manychatKeyword && <span className="ar-prop-card__kw">{c.manychatKeyword}</span>}
                          </div>
                        ))}
                        {propContent.length > 5 && <p className="ar-prop-card__more">+ {propContent.length - 5} more pieces</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="ar-empty">
              <p>No content or ads linked to properties yet.</p>
              <p className="ar-empty-hint">Link properties to your ads and content pieces to see per-property reports here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
