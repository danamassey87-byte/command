import { Link } from 'react-router-dom'
import { StatCard, Badge } from '../../components/ui/index.jsx'
import { useTransactions, useListings, useAllIncomeEntries } from '../../lib/hooks.js'
import './PipelineDashboard.css'

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

export default function PipelineDashboard() {
  const { data: transactions, loading } = useTransactions()
  const { data: listings } = useListings()
  const { data: income } = useAllIncomeEntries()

  const t = transactions ?? []
  const l = listings ?? []
  const now = new Date()

  const active = t.filter(x => !(x.status ?? '').toLowerCase().includes('closed'))
  const closed = t.filter(x => (x.status ?? '').toLowerCase().includes('closed'))
  const closedYTD = closed.filter(x => x.closing_date?.startsWith(String(now.getFullYear())))

  const pipelineValue = active.reduce((s, x) => s + (Number(x.property?.price) || 0), 0)
  const commissionForecast = active.reduce((s, x) => {
    const price = Number(x.property?.price) || 0
    const pct = Number(x.commission_percent) || 3
    return s + (price * pct / 100)
  }, 0)

  // Avg days in current stage
  const daysInStage = active.map(x => {
    const ref = x.contract_date || x.created_at
    return ref ? Math.round((now - new Date(ref)) / 86400000) : 0
  })
  const avgDays = daysInStage.length ? Math.round(daysInStage.reduce((a, b) => a + b, 0) / daysInStage.length) : 0

  // Stage distribution
  const stageMap = {}
  t.forEach(x => { const s = x.status || 'Unknown'; stageMap[s] = (stageMap[s] || 0) + 1 })
  const stageList = Object.entries(stageMap).sort((a, b) => b[1] - a[1])
  const maxStage = stageList[0]?.[1] || 1
  const stageColors = ['var(--brown-dark)', 'var(--color-info)', 'var(--brown-mid)', 'var(--color-warning)', 'var(--color-success)', 'var(--color-danger)', 'var(--brown-light)']

  // Deals at risk (14+ days in stage)
  const atRisk = active.filter(x => {
    const ref = x.contract_date || x.created_at
    return ref && (now - new Date(ref)) / 86400000 > 14
  }).sort((a, b) => {
    const da = new Date(a.contract_date || a.created_at)
    const db = new Date(b.contract_date || b.created_at)
    return da - db
  }).slice(0, 5)

  // Upcoming deadlines (closing in 30 days)
  const in30 = new Date(now); in30.setDate(now.getDate() + 30)
  const upcoming = active.filter(x => {
    if (!x.closing_date) return false
    const d = new Date(x.closing_date)
    return d >= now && d <= in30
  }).sort((a, b) => new Date(a.closing_date) - new Date(b.closing_date)).slice(0, 5)

  // Top deals by value
  const topDeals = [...active].sort((a, b) => (Number(b.property?.price) || 0) - (Number(a.property?.price) || 0)).slice(0, 3)

  if (loading) return <div className="section-dash"><div className="sd-loading">Loading pipeline...</div></div>

  return (
    <div className="section-dash pipeline-dash">

      <div className="section-dash__kpis">
        <StatCard label="Active Deals" value={active.length} accent />
        <StatCard label="Pipeline Value" value={fmtDollar(pipelineValue)} />
        <StatCard label="Avg Days in Stage" value={avgDays} />
        <StatCard label="Commission Forecast" value={fmtDollar(commissionForecast)} />
        <StatCard label="Closed YTD" value={closedYTD.length} />
      </div>

      <div className="sd-row sd-row--60-40">
        <DashCard title="Stage Distribution">
          <div className="pl-stages">
            {stageList.map(([stage, count], i) => (
              <div key={stage} className="pl-stage-row">
                <span className="pl-stage-row__label">{stage}</span>
                <div className="pl-stage-row__track">
                  <div className="pl-stage-row__fill" style={{ width: `${Math.round(count / maxStage * 100)}%`, background: stageColors[i % stageColors.length] }} />
                </div>
                <span className="pl-stage-row__count">{count}</span>
              </div>
            ))}
            {stageList.length === 0 && <p className="sd-empty">No deals yet</p>}
          </div>
        </DashCard>

        <DashCard title="Commission Forecast">
          <p className="pl-forecast-total">{fmtDollar(commissionForecast)}</p>
          <p className="pl-forecast-sub">from {active.length} active deal{active.length !== 1 ? 's' : ''}</p>
          <div className="pl-top-deals">
            {topDeals.map(d => (
              <div key={d.id} className="pl-deal-row">
                <span className="pl-deal-row__addr">{d.property?.address ?? '—'}</span>
                <span className="pl-deal-row__val">{fmtDollar((Number(d.property?.price) || 0) * (Number(d.commission_percent) || 3) / 100)}</span>
              </div>
            ))}
          </div>
        </DashCard>
      </div>

      <div className="sd-row sd-row--50-50">
        <DashCard title="Deals at Risk">
          {atRisk.length > 0 ? (
            <div className="pl-risk-list">
              {atRisk.map(d => {
                const days = Math.round((now - new Date(d.contract_date || d.created_at)) / 86400000)
                return (
                  <div key={d.id} className="pl-risk-row">
                    <div className="pl-risk-row__left">
                      <span className="pl-risk-row__addr">{d.property?.address ?? '—'}</span>
                      <span className="pl-risk-row__days">{days} days in stage</span>
                    </div>
                    <Badge variant="danger" size="sm">{d.status}</Badge>
                  </div>
                )
              })}
            </div>
          ) : <p className="sd-empty">No deals at risk</p>}
        </DashCard>

        <DashCard title="Upcoming Closings">
          {upcoming.length > 0 ? (
            <div className="pl-deadlines">
              {upcoming.map(d => {
                const daysUntil = Math.round((new Date(d.closing_date) - now) / 86400000)
                return (
                  <div key={d.id} className="pl-deadline-row">
                    <div className="pl-deadline-row__left">
                      <span className="pl-deadline-row__addr">{d.property?.address ?? '—'}</span>
                      <span className="pl-deadline-row__date">{fmtDate(d.closing_date)}</span>
                    </div>
                    <Badge variant={daysUntil <= 7 ? 'danger' : daysUntil <= 14 ? 'warning' : 'info'} size="sm">{daysUntil}d</Badge>
                  </div>
                )
              })}
            </div>
          ) : <p className="sd-empty">No upcoming closings</p>}
        </DashCard>
      </div>

      <div className="sd-row sd-row--50-50">
        <DashCard title="Active Listings">
          {l.length > 0 ? (
            <div className="pl-listings">
              {l.slice(0, 5).map(li => (
                <div key={li.id} className="pl-listing-row">
                  <div className="pl-listing-row__left">
                    <span className="pl-listing-row__addr">{li.property?.address ?? '—'}</span>
                    <span className="pl-listing-row__meta">{fmtDollar(li.property?.price)} · {li.property?.dom ?? '—'} DOM</span>
                  </div>
                  <Badge variant={li.agreement_expires && new Date(li.agreement_expires) < now ? 'danger' : 'success'} size="sm">
                    {li.agreement_expires && new Date(li.agreement_expires) < now ? 'Expired' : 'Active'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No active listings</p>}
        </DashCard>

        <DashCard title="Recently Closed">
          {closedYTD.length > 0 ? (
            <div className="pl-closed">
              {closedYTD.slice(0, 5).map(d => (
                <div key={d.id} className="pl-closed-row">
                  <div className="pl-closed-row__left">
                    <span className="pl-closed-row__addr">{d.property?.address ?? '—'}</span>
                    <span className="pl-closed-row__date">{fmtDate(d.closing_date)}</span>
                  </div>
                  <span className="pl-closed-row__price">{fmtDollar(d.property?.price)}</span>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No closed deals this year</p>}
        </DashCard>
      </div>

      <div className="sd-row sd-row--33-33-33">
        <Link to="/pipeline/board" className="pl-quick-link">
          <span className="pl-quick-link__icon">📋</span>
          <span>Deal Board</span>
        </Link>
        <Link to="/pipeline/escrow" className="pl-quick-link">
          <span className="pl-quick-link__icon">⏱</span>
          <span>Escrow Tracker</span>
        </Link>
        <Link to="/pipeline/closed" className="pl-quick-link">
          <span className="pl-quick-link__icon">✅</span>
          <span>Closed Deals</span>
        </Link>
      </div>
    </div>
  )
}
