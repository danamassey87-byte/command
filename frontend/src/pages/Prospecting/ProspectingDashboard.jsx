import { Link } from 'react-router-dom'
import { StatCard, Badge } from '../../components/ui/index.jsx'
import { useLeads, useContacts, useOpenHouses } from '../../lib/hooks.js'
import './ProspectingDashboard.css'

function DashCard({ title, children, className = '' }) {
  return (
    <div className={`sd-card ${className}`}>
      <h3 className="sd-card__title">{title}</h3>
      {children}
    </div>
  )
}

function fmtDollar(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ProspectingDashboard() {
  const { data: leads, loading } = useLeads()
  const { data: contacts } = useContacts()
  const { data: openHouses } = useOpenHouses()

  const ld = leads ?? []
  const c = contacts ?? []
  const oh = openHouses ?? []
  const now = new Date()

  // Expiring leads (within 30 days)
  const in30 = new Date(now); in30.setDate(now.getDate() + 30)
  const expiring = ld.filter(x => {
    if (!x.property?.expired_date) return false
    const d = new Date(x.property.expired_date)
    return d >= now && d <= in30
  })
  const expired = ld.filter(x => {
    if (!x.property?.expired_date) return false
    return new Date(x.property.expired_date) < now
  })

  // Letters sent
  const lettersSent = ld.filter(x => x.letter_sent_at).length
  const letterRate = ld.length ? Math.round(lettersSent / ld.length * 100) : 0

  // OH leads this month
  const ohThisMonth = oh.filter(x => {
    if (!x.date) return false
    const d = new Date(x.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const ohSignIns = ohThisMonth.reduce((s, x) => s + (Number(x.sign_ins) || 0), 0)

  // Lead value (total list price)
  const totalValue = ld.reduce((s, x) => s + (Number(x.property?.price) || 0), 0)

  // Leads by status/urgency
  const hot = expiring.filter(x => {
    const d = new Date(x.property.expired_date)
    return (d - now) / 86400000 <= 7
  })
  const warm = expiring.filter(x => {
    const d = new Date(x.property.expired_date)
    const days = (d - now) / 86400000
    return days > 7 && days <= 14
  })

  // Source type breakdown (from contacts)
  const prospectContacts = c.filter(x => x.type === 'lead' || !x.type)
  const sourceMap = {}
  ld.forEach(x => {
    const s = x.source || 'Expired/MLS'
    sourceMap[s] = (sourceMap[s] || 0) + 1
  })
  const sources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])
  const maxSource = sources[0]?.[1] || 1

  // Recent leads
  const recent = [...ld].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 6)

  if (loading) return <div className="section-dash"><div className="sd-loading">Loading prospecting data...</div></div>

  return (
    <div className="section-dash prospect-dash">

      <div className="section-dash__kpis">
        <StatCard label="Total Leads" value={ld.length} accent />
        <StatCard label="Expiring 30d" value={expiring.length} />
        <StatCard label="Letters Sent" value={`${lettersSent} (${letterRate}%)`} />
        <StatCard label="OH Sign-Ins" value={ohSignIns} />
        <StatCard label="Lead Value" value={fmtDollar(totalValue)} />
      </div>

      <div className="sd-row sd-row--60-40">
        <DashCard title="Lead Pipeline">
          <div className="pr-pipeline">
            <div className="pr-pipeline__segment pr-pipeline__segment--hot">
              <span className="pr-pipeline__count">{hot.length}</span>
              <span className="pr-pipeline__label">Hot (7d)</span>
            </div>
            <div className="pr-pipeline__segment pr-pipeline__segment--warm">
              <span className="pr-pipeline__count">{warm.length}</span>
              <span className="pr-pipeline__label">Warm (14d)</span>
            </div>
            <div className="pr-pipeline__segment pr-pipeline__segment--expiring">
              <span className="pr-pipeline__count">{expiring.length}</span>
              <span className="pr-pipeline__label">Expiring 30d</span>
            </div>
            <div className="pr-pipeline__segment pr-pipeline__segment--expired">
              <span className="pr-pipeline__count">{expired.length}</span>
              <span className="pr-pipeline__label">Expired</span>
            </div>
            <div className="pr-pipeline__segment pr-pipeline__segment--sent">
              <span className="pr-pipeline__count">{lettersSent}</span>
              <span className="pr-pipeline__label">Letters Sent</span>
            </div>
          </div>
        </DashCard>

        <DashCard title="Lead Sources">
          <div className="pr-sources">
            {sources.map(([src, count]) => (
              <div key={src} className="pr-source-row">
                <span className="pr-source-row__label">{src}</span>
                <div className="pr-source-row__track">
                  <div className="pr-source-row__fill" style={{ width: `${Math.round(count / maxSource * 100)}%` }} />
                </div>
                <span className="pr-source-row__count">{count}</span>
              </div>
            ))}
            {sources.length === 0 && <p className="sd-empty">No source data</p>}
          </div>
        </DashCard>
      </div>

      <div className="sd-row sd-row--50-50">
        <DashCard title="Hot Leads — Action Required">
          {hot.length > 0 ? (
            <div className="pr-hot-list">
              {hot.slice(0, 6).map(l => {
                const daysLeft = Math.round((new Date(l.property.expired_date) - now) / 86400000)
                return (
                  <div key={l.id} className="pr-hot-row">
                    <div className="pr-hot-row__left">
                      <span className="pr-hot-row__addr">{l.property?.address ?? '—'}</span>
                      <span className="pr-hot-row__price">{fmtDollar(l.property?.price)}</span>
                    </div>
                    <Badge variant="danger" size="sm">{daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}</Badge>
                  </div>
                )
              })}
            </div>
          ) : <p className="sd-empty">No hot leads right now</p>}
        </DashCard>

        <DashCard title="Recent Leads">
          {recent.length > 0 ? (
            <div className="pr-recent">
              {recent.map(l => (
                <div key={l.id} className="pr-recent-row">
                  <span className="pr-recent-row__addr">{l.property?.address ?? '—'}</span>
                  <span className="pr-recent-row__meta">
                    {fmtDollar(l.property?.price)} · {fmtDate(l.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No leads yet</p>}
        </DashCard>
      </div>

      <div className="sd-row sd-row--33-33-33">
        <Link to="/prospecting/expired" className="pr-quick-link">
          <span className="pr-quick-link__icon">🎯</span>
          <span>Expired / Cannonball</span>
        </Link>
        <Link to="/prospecting/soi" className="pr-quick-link">
          <span className="pr-quick-link__icon">💛</span>
          <span>Personal Circle / SOI</span>
        </Link>
        <Link to="/prospecting/oh-leads" className="pr-quick-link">
          <span className="pr-quick-link__icon">🏡</span>
          <span>Open House Leads</span>
        </Link>
      </div>
    </div>
  )
}
