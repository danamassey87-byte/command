import { Link } from 'react-router-dom'
import { StatCard, Badge } from '../../components/ui/index.jsx'
import { useContacts, useContactsWithTags, useTags, useInvestors } from '../../lib/hooks.js'
import './CrmDashboard.css'

function DashCard({ title, children, className = '' }) {
  return (
    <div className={`sd-card ${className}`}>
      <h3 className="sd-card__title">{title}</h3>
      {children}
    </div>
  )
}

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CrmDashboard() {
  const { data: contacts, loading } = useContacts()
  const { data: withTags } = useContactsWithTags()
  const { data: tags } = useTags()
  const { data: investors } = useInvestors()

  const c = contacts ?? []
  const iv = investors ?? []
  const buyers = c.filter(x => x.type === 'buyer' || x.type === 'both')
  const sellers = c.filter(x => x.type === 'seller' || x.type === 'both')
  const bbaRate = buyers.length ? Math.round(buyers.filter(x => x.bba_signed).length / buyers.length * 100) : 0

  // Stage counts
  const stages = ['lead', 'active', 'under_contract', 'closed', 'inactive']
  const stageCounts = stages.map(s => ({ stage: s, count: c.filter(x => (x.stage ?? 'lead').toLowerCase().replace(/\s/g, '_') === s).length }))
  const maxStage = Math.max(...stageCounts.map(s => s.count), 1)

  // Type breakdown
  const types = [
    { label: 'Buyer', count: c.filter(x => x.type === 'buyer').length, color: 'var(--color-info)' },
    { label: 'Seller', count: c.filter(x => x.type === 'seller').length, color: 'var(--color-warning)' },
    { label: 'Both', count: c.filter(x => x.type === 'both').length, color: 'var(--color-success)' },
    { label: 'Investor', count: c.filter(x => x.type === 'investor').length, color: 'var(--brown-mid)' },
    { label: 'Lead', count: c.filter(x => !x.type || x.type === 'lead').length, color: 'var(--brown-light)' },
  ].filter(t => t.count > 0)
  const maxType = Math.max(...types.map(t => t.count), 1)

  // Recent contacts
  const recent = [...c].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 5)

  // Stale contacts (30+ days, no recent stage change)
  const now = new Date()
  const stale = c.filter(x => {
    const d = new Date(x.updated_at ?? x.created_at)
    return (now - d) / 86400000 > 30 && x.stage !== 'closed' && x.stage !== 'inactive'
  }).slice(0, 5)

  // Tag cloud
  const tagMap = {}
  ;(withTags ?? []).forEach(ct => {
    (ct.contact_tags ?? []).forEach(ct2 => {
      const t = ct2.tag
      if (t) tagMap[t.name] = (tagMap[t.name] || { ...t, count: 0 })
      if (t) tagMap[t.name].count++
    })
  })
  const topTags = Object.values(tagMap).sort((a, b) => b.count - a.count).slice(0, 12)

  // Source breakdown
  const sourceMap = {}
  c.forEach(x => { const s = x.source || 'Unknown'; sourceMap[s] = (sourceMap[s] || 0) + 1 })
  const sources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxSource = sources[0]?.[1] || 1

  if (loading) return <div className="section-dash"><div className="sd-loading">Loading CRM data...</div></div>

  return (
    <div className="section-dash crm-dash">

      <div className="section-dash__kpis">
        <StatCard label="Total Contacts" value={c.length} accent />
        <StatCard label="Buyers" value={buyers.length} />
        <StatCard label="Sellers" value={sellers.length} />
        <StatCard label="Investors" value={iv.length} />
        <StatCard label="BBA Rate" value={`${bbaRate}%`} />
      </div>

      <div className="sd-row sd-row--60-40">
        <DashCard title="Contact Type Breakdown">
          <div className="crm-bars">
            {types.map(t => (
              <div key={t.label} className="crm-bar-row">
                <span className="crm-bar-row__label">{t.label}</span>
                <div className="crm-bar-row__track">
                  <div className="crm-bar-row__fill" style={{ width: `${Math.round(t.count / maxType * 100)}%`, background: t.color }} />
                </div>
                <span className="crm-bar-row__count">{t.count}</span>
              </div>
            ))}
          </div>
        </DashCard>

        <DashCard title="Recently Added">
          {recent.length > 0 ? (
            <div className="crm-recent">
              {recent.map(r => (
                <div key={r.id} className="crm-recent__row">
                  <span className="crm-recent__name">{r.name}</span>
                  <Badge variant={r.type === 'buyer' ? 'info' : r.type === 'seller' ? 'warning' : 'accent'} size="sm">{r.type || 'lead'}</Badge>
                  <span className="crm-recent__date">{fmtDate(r.created_at)}</span>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No contacts yet</p>}
        </DashCard>
      </div>

      <div className="sd-row sd-row--50-50">
        <DashCard title="Stage Pipeline">
          <div className="crm-stages">
            {stageCounts.map(s => (
              <div key={s.stage} className="crm-stage-row">
                <span className="crm-stage-row__label">{s.stage.replace(/_/g, ' ')}</span>
                <div className="crm-stage-row__track">
                  <div className="crm-stage-row__fill" style={{ width: `${Math.round(s.count / maxStage * 100)}%` }} />
                </div>
                <span className="crm-stage-row__count">{s.count}</span>
              </div>
            ))}
          </div>
        </DashCard>

        <DashCard title="Needs Attention">
          {stale.length > 0 ? (
            <div className="crm-stale">
              {stale.map(s => {
                const days = Math.round((now - new Date(s.updated_at ?? s.created_at)) / 86400000)
                return (
                  <div key={s.id} className="crm-stale__row">
                    <span className="crm-stale__name">{s.name}</span>
                    <Badge variant="danger" size="sm">{days}d inactive</Badge>
                  </div>
                )
              })}
            </div>
          ) : <p className="sd-empty">All contacts are active</p>}
        </DashCard>
      </div>

      <div className="sd-row sd-row--33-33-33">
        <DashCard title="Sellers">
          <div className="crm-actions">
            <Link to="/listing-appts" className="crm-action-btn">Listing Appts</Link>
            <Link to="/sellers" className="crm-action-btn">Listings</Link>
            <Link to="/seller-showings" className="crm-action-btn">Listing Showings</Link>
            <Link to="/listing-plan" className="crm-action-btn">Listing Plan</Link>
          </div>
        </DashCard>
        <DashCard title="Buyers">
          <div className="crm-actions">
            <Link to="/buyers" className="crm-action-btn">Clients</Link>
            <Link to="/buyer-showings" className="crm-action-btn">Showings</Link>
            <Link to="/properties" className="crm-action-btn">Properties</Link>
          </div>
        </DashCard>
        <DashCard title="Overall">
          <div className="crm-actions">
            <Link to="/database" className="crm-action-btn">Contact Database</Link>
            <Link to="/on-hold" className="crm-action-btn">On Hold</Link>
            <Link to="/vendors" className="crm-action-btn">Vendors</Link>
            <Link to="/investors" className="crm-action-btn">Investors</Link>
            <Link to="/settings/intake-forms" className="crm-action-btn">Intake Forms</Link>
          </div>
        </DashCard>

        <DashCard title="Top Tags">
          {topTags.length > 0 ? (
            <div className="crm-tags">
              {topTags.map(t => (
                <span key={t.id} className="crm-tag" style={{ borderColor: t.color || 'var(--brown-mid)' }}>
                  <span className="crm-tag__dot" style={{ background: t.color || 'var(--brown-mid)' }} />
                  {t.name}
                  <span className="crm-tag__count">{t.count}</span>
                </span>
              ))}
            </div>
          ) : <p className="sd-empty">No tags yet</p>}
        </DashCard>

        <DashCard title="Lead Sources">
          <div className="crm-sources">
            {sources.map(([src, count]) => (
              <div key={src} className="crm-source-row">
                <span className="crm-source-row__label">{src}</span>
                <div className="crm-source-row__track">
                  <div className="crm-source-row__fill" style={{ width: `${Math.round(count / maxSource * 100)}%` }} />
                </div>
                <span className="crm-source-row__count">{count}</span>
              </div>
            ))}
            {sources.length === 0 && <p className="sd-empty">No source data</p>}
          </div>
        </DashCard>
      </div>
    </div>
  )
}
