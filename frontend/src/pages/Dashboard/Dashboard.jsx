import { useState } from 'react'
import { StatCard, Card, Badge, InfoTip, AddressLink } from '../../components/ui/index.jsx'
import { useDashboardData } from '../../lib/hooks.js'
import './Dashboard.css'

const PLANNED_WEEKS = 43

const WEEK_METRICS = [
  { key: 'productivity_days',  label: 'PRO Days',       annualGoal: 215 },
  { key: 'hours_prospected',   label: 'Hrs Prospected', annualGoal: 430 },
  { key: 'live_contacts',      label: 'Live Contacts',  annualGoal: 5000 },
  { key: 'new_leads',          label: 'New Leads',      annualGoal: 600 },
  { key: 'hours_practiced',    label: 'Hrs Practiced',  annualGoal: 215 },
  { key: 'buyer_reps_signed',  label: 'Buyer Reps',     annualGoal: 15 },
  { key: 'listing_appts_set',  label: 'Appts Set',      annualGoal: 100 },
  { key: 'sales_closed',       label: 'Sales Closed',   annualGoal: 20 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDollar(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Skeleton({ height = 80, className = '' }) {
  return <div className={`skeleton ${className}`} style={{ height }} />
}

function DbCard({ title, sub, tip, children, className = '' }) {
  return (
    <Card className={`db-card ${className}`}>
      <div className="db-card__head">
        <h3 className="db-card__title">
          {title}
          {tip && <InfoTip text={tip} position="bottom" />}
        </h3>
        {sub && <span className="db-card__sub">{sub}</span>}
      </div>
      {children}
    </Card>
  )
}

function Empty({ text }) {
  return <p className="db-empty">{text}</p>
}

function SectionLabel({ children }) {
  return <p className="db-section-label">{children}</p>
}

// ─── Conversion Funnel ────────────────────────────────────────────────────────
const FUNNEL_COLORS = ['var(--brown-dark)', 'var(--brown-mid)', '#5a87b4', 'var(--color-success)']

function FunnelCard({ funnel }) {
  const [view, setView] = useState('grid')
  const max = Math.max(...funnel.map(f => f.count), 1)
  const total = funnel.reduce((s, f) => s + f.count, 0) || 1

  return (
    <DbCard title="Conversion Funnel" tip="How many leads make it through each stage. Shows drop-off % between stages so you can see where to focus your energy.">
      <div className="funnel-header">
        {['grid', 'bars', 'donut'].map(v => (
          <button key={v} className={`funnel-view-btn ${view === v ? 'funnel-view-btn--active' : ''}`} onClick={() => setView(v)}>
            {v === 'grid' ? '▦' : v === 'bars' ? '▬' : '◕'}
          </button>
        ))}
      </div>

      {view === 'bars' && (
        <div className="funnel">
          {funnel.map((stage, i) => {
            const w = Math.max(8, Math.round((stage.count / max) * 65))
            const drop = i > 0 && funnel[i - 1].count > 0
              ? Math.round((1 - stage.count / funnel[i - 1].count) * 100)
              : null
            return (
              <div key={stage.label} className="funnel__stage">
                {drop !== null && (
                  <p className="funnel__drop">{drop > 0 ? `↓ ${drop}% drop-off` : '—'}</p>
                )}
                <div className="funnel__bar-row">
                  <div className="funnel__bar" style={{ width: `${w}%` }} />
                  <div className="funnel__meta">
                    <span className="funnel__label">{stage.label}</span>
                    <span className="funnel__count">{stage.count}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'grid' && (
        <div className="funnel-grid">
          {funnel.map((stage, i) => {
            const drop = i > 0 && funnel[i - 1].count > 0
              ? Math.round((1 - stage.count / funnel[i - 1].count) * 100)
              : null
            return (
              <div key={stage.label} className="funnel-grid__item">
                <p className="funnel-grid__count">{stage.count}</p>
                <p className="funnel-grid__label">{stage.label}</p>
                {drop !== null && drop > 0 && (
                  <p className="funnel-grid__drop">↓ {drop}% drop-off</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'donut' && (
        <div className="funnel-donut">
          <svg className="funnel-donut__chart" viewBox="0 0 36 36">
            {funnel.reduce((acc, stage, i) => {
              const pct = (stage.count / total) * 100
              const offset = acc.offset
              acc.elements.push(
                <circle key={stage.label} cx="18" cy="18" r="14" fill="none"
                  stroke={FUNNEL_COLORS[i] || 'var(--color-muted)'}
                  strokeWidth="5"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              )
              acc.offset = offset + pct
              return acc
            }, { elements: [], offset: 0 }).elements}
            <text x="18" y="18.5" textAnchor="middle" dominantBaseline="central" fontSize="6" fontWeight="700" fill="var(--brown-dark)">{total}</text>
          </svg>
          <div className="funnel-donut__legend">
            {funnel.map((stage, i) => (
              <div key={stage.label} className="funnel-donut__row">
                <span className="funnel-donut__swatch" style={{ background: FUNNEL_COLORS[i] }} />
                <span className="funnel-donut__row-label">{stage.label}</span>
                <span className="funnel-donut__row-count">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DbCard>
  )
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function PipelineCard({ transactions, listings, pipelineValue, listingValue, avgDOM }) {
  const items = [
    ...transactions.slice(0, 5).map(t => ({
      id: t.id, name: t.contact?.name ?? '—', addr: t.property?.address ?? '',
      price: t.property?.price, status: t.status ?? 'Active', type: 'transaction',
    })),
    ...listings.slice(0, 3).map(l => ({
      id: l.id + '_l', name: l.contact?.name ?? '—', addr: l.property?.address ?? '',
      price: l.property?.price, status: 'Listing', type: 'listing',
    })),
  ]

  return (
    <DbCard title="Pipeline" tip="Your active transactions and listings. Under Contract value = sum of all open transaction property prices. Avg DOM = average days on market across your active listings.">
      <div className="pipeline-totals">
        <div className="pipeline-total">
          <p className="pipeline-total__val">{fmtDollar(pipelineValue)}</p>
          <p className="pipeline-total__label">Under Contract</p>
        </div>
        <div className="pipeline-total">
          <p className="pipeline-total__val">{fmtDollar(listingValue)}</p>
          <p className="pipeline-total__label">Listing Value</p>
        </div>
        <div className="pipeline-total">
          <p className="pipeline-total__val">{avgDOM || '—'}{avgDOM ? 'd' : ''}</p>
          <p className="pipeline-total__label">Avg DOM</p>
        </div>
      </div>
      <div className="pipeline-list">
        {items.length > 0 ? items.map(item => (
          <div key={item.id} className="pipeline-item">
            <div className="pipeline-item__left">
              <span className="pipeline-item__name">{item.name}</span>
              <AddressLink address={item.addr} className="pipeline-item__addr">{item.addr}</AddressLink>
            </div>
            <div className="pipeline-item__right">
              {item.price && <span className="pipeline-item__price">{fmtDollar(item.price)}</span>}
              <Badge
                variant={
                  item.type === 'listing' ? 'warning' :
                  item.status.toLowerCase().includes('clos') ? 'success' :
                  item.status.toLowerCase().includes('offer') ? 'accent' : 'info'
                }
                size="sm"
              >{item.status}</Badge>
            </div>
          </div>
        )) : <Empty text="No pipeline activity yet" />}
      </div>
    </DbCard>
  )
}

// ─── This Week ────────────────────────────────────────────────────────────────
function ThisWeekCard({ latestWeek }) {
  const weekTip = "Your most recently logged week's key metrics vs. weekly targets. Log or update your week in Goals & Performance."

  if (!latestWeek) return (
    <DbCard title="This Week" tip={weekTip}>
      <Empty text="No weeks logged yet — head to Goals to log your first week." />
    </DbCard>
  )

  return (
    <DbCard title="This Week" sub={latestWeek.week_id} tip={weekTip}>
      <div className="this-week-grid">
        {WEEK_METRICS.map(m => {
          const val  = Number(latestWeek[m.key]) || 0
          const goal = Math.round(m.annualGoal / PLANNED_WEEKS)
          const p    = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0
          const hit  = p >= 100
          return (
            <div key={m.key} className={`tw-cell ${hit ? 'tw-cell--hit' : ''}`}>
              <p className="tw-cell__val">{val || '—'}</p>
              <p className="tw-cell__label">{m.label}</p>
              <div className="tw-cell__bar">
                <div
                  className="tw-cell__fill"
                  style={{
                    width: `${p}%`,
                    background: hit ? 'var(--color-success)' : p > 60 ? 'var(--brown-mid)' : 'var(--color-danger)',
                    opacity: p === 0 ? 0.2 : 0.8,
                  }}
                />
              </div>
              <p className="tw-cell__goal">/{goal}</p>
            </div>
          )
        })}
      </div>
    </DbCard>
  )
}

// ─── Showing Activity ─────────────────────────────────────────────────────────
function ShowingsCard({ showingSessions, interestLevels, topProperties }) {
  const total   = interestLevels.high + interestLevels.medium + interestLevels.low
  const recent  = showingSessions.slice(0, 4)
  const levels  = [
    { label: 'High',   count: interestLevels.high,   cls: 'interest--high' },
    { label: 'Medium', count: interestLevels.medium, cls: 'interest--med' },
    { label: 'Low',    count: interestLevels.low,    cls: 'interest--low' },
  ]

  return (
    <DbCard title="Showing Activity" sub={`${showingSessions.length} session${showingSessions.length !== 1 ? 's' : ''}`} tip="Buyer showing sessions grouped by interest level — High, Medium, Low. Helps you prioritize follow-up with the most motivated buyers.">
      {total > 0 ? (
        <>
          <SectionLabel>Interest Levels</SectionLabel>
          <div className="interest-bars">
            {levels.map(r => (
              <div key={r.label} className="interest-row">
                <span className="interest-row__label">{r.label}</span>
                <div className="interest-row__track">
                  <div className={`interest-row__fill ${r.cls}`} style={{ width: total ? `${Math.round(r.count / total * 100)}%` : '0%' }} />
                </div>
                <span className="interest-row__count">{r.count}</span>
              </div>
            ))}
          </div>
          {topProperties.length > 0 && (
            <>
              <SectionLabel>Most Shown Properties</SectionLabel>
              {topProperties.map(p => (
                <div key={p.address} className="top-prop">
                  <AddressLink address={p.address} className="top-prop__addr">{p.address}</AddressLink>
                  <span className="top-prop__count">{p.count} showing{p.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </>
          )}
        </>
      ) : <Empty text="No showings logged yet" />}

      {recent.length > 0 && (
        <>
          <SectionLabel>Recent Sessions</SectionLabel>
          {recent.map(s => (
            <div key={s.id} className="session-row">
              <span className="session-row__name">{s.contact?.name ?? '—'}</span>
              <span className="session-row__props">{(s.showings ?? []).length} propert{(s.showings ?? []).length !== 1 ? 'ies' : 'y'}</span>
              <span className="session-row__date">{fmtDate(s.date)}</span>
            </div>
          ))}
        </>
      )}
    </DbCard>
  )
}

// ─── Buyer Pipeline ───────────────────────────────────────────────────────────
function BuyerPipelineCard({ contacts }) {
  const buyers   = contacts.filter(c => c.type === 'buyer')
  const sellers  = contacts.filter(c => c.type === 'seller')
  const signed   = buyers.filter(c => c.bba_signed)
  const bbaRate  = buyers.length ? Math.round((signed.length / buyers.length) * 100) : 0

  return (
    <DbCard title="Client Pipeline" tip="All buyer contacts and their BBA (Buyer Brokerage Agreement) status. BBA conversion rate shows what % of your active buyers have signed.">
      <div className="cp-stats">
        <div className="cp-stat">
          <p className="cp-stat__val">{buyers.length}</p>
          <p className="cp-stat__label">Buyers</p>
        </div>
        <div className="cp-stat">
          <p className="cp-stat__val">{sellers.length}</p>
          <p className="cp-stat__label">Sellers</p>
        </div>
        <div className="cp-stat cp-stat--green">
          <p className="cp-stat__val">{signed.length}</p>
          <p className="cp-stat__label">BBA Signed</p>
        </div>
        <div className="cp-stat">
          <p className="cp-stat__val">{bbaRate}%</p>
          <p className="cp-stat__label">BBA Rate</p>
        </div>
      </div>

      <div className="bba-bar-wrap">
        <div className="bba-bar">
          <div className="bba-bar__fill" style={{ width: `${bbaRate}%` }} />
        </div>
        <span className="bba-bar__label">BBA conversion</span>
      </div>

      <div className="cp-list">
        {buyers.length > 0 ? buyers.slice(0, 5).map(b => (
          <div key={b.id} className="cp-row">
            <span className="cp-row__name">{b.name}</span>
            <Badge variant={b.bba_signed ? 'success' : 'warning'} size="sm">
              {b.bba_signed ? 'BBA ✓' : 'No BBA'}
            </Badge>
          </div>
        )) : <Empty text="No buyers yet" />}
      </div>
    </DbCard>
  )
}

// ─── Open Houses ─────────────────────────────────────────────────────────────
function OpenHousesCard({ openHouses, openHousesThisMonth }) {
  const now      = new Date()
  const upcoming = openHouses.filter(oh => oh.date && new Date(oh.date) >= now).slice(0, 3)
  const past     = openHouses.filter(oh => !upcoming.includes(oh)).slice(0, 3)

  return (
    <DbCard title="Open Houses" tip="Open houses scheduled this month. Manage all OH details — outreach to listing agents, process checklists, and host reports — in the Open Houses section.">
      <div className="oh-stats">
        <div className="oh-stat">
          <p className="oh-stat__val">{openHousesThisMonth}</p>
          <p className="oh-stat__label">This Month</p>
        </div>
        <div className="oh-stat">
          <p className="oh-stat__val">{openHouses.length}</p>
          <p className="oh-stat__label">Total</p>
        </div>
      </div>

      {upcoming.length > 0 && (
        <>
          <SectionLabel>Upcoming</SectionLabel>
          {upcoming.map(oh => (
            <div key={oh.id} className="oh-row">
              <AddressLink address={oh.property?.address ?? '—'} city={oh.property?.city} className="oh-row__addr">{oh.property?.address ?? '—'}</AddressLink>
              <span className="oh-row__date">{fmtDate(oh.date)}</span>
            </div>
          ))}
        </>
      )}

      {past.length > 0 && (
        <>
          <SectionLabel>Recent</SectionLabel>
          {past.map(oh => (
            <div key={oh.id} className="oh-row oh-row--past">
              <AddressLink address={oh.property?.address ?? '—'} city={oh.property?.city} className="oh-row__addr">{oh.property?.address ?? '—'}</AddressLink>
              <span className="oh-row__date">{fmtDate(oh.date)}</span>
            </div>
          ))}
        </>
      )}

      {openHouses.length === 0 && <Empty text="No open houses yet" />}
    </DbCard>
  )
}

// ─── Leads ────────────────────────────────────────────────────────────────────
function LeadsCard({ leads, expiringLeads }) {
  const now = new Date()
  return (
    <DbCard title="Leads" tip="Expired listing cannonball leads from the Lead Gen pipeline. 'Expiring Soon' = listings expiring within the next 30 days — prime outreach targets.">
      <div className="leads-stats">
        <div className="leads-stat">
          <p className="leads-stat__val">{leads.length}</p>
          <p className="leads-stat__label">Total</p>
        </div>
        <div className={`leads-stat ${expiringLeads > 0 ? 'leads-stat--warn' : ''}`}>
          <p className="leads-stat__val">{expiringLeads}</p>
          <p className="leads-stat__label">Expiring 30d</p>
        </div>
      </div>

      <div className="leads-list">
        {leads.length > 0 ? leads.slice(0, 4).map(l => {
          const expired  = l.property?.expired_date ? new Date(l.property.expired_date) : null
          const daysLeft = expired ? Math.ceil((expired - now) / 86400000) : null
          return (
            <div key={l.id} className="lead-row">
              <AddressLink address={l.property?.address ?? '—'} city={l.property?.city} className="lead-row__addr">{l.property?.address ?? '—'}</AddressLink>
              <div className="lead-row__right">
                {l.property?.price && <span className="lead-row__price">{fmtDollar(l.property.price)}</span>}
                {daysLeft !== null && daysLeft <= 30 && (
                  <Badge variant={daysLeft <= 0 ? 'danger' : daysLeft <= 7 ? 'danger' : 'warning'} size="sm">
                    {daysLeft <= 0 ? 'Expired' : `${daysLeft}d`}
                  </Badge>
                )}
              </div>
            </div>
          )
        }) : <Empty text="No leads yet" />}
      </div>
    </DbCard>
  )
}

// ─── Investors ────────────────────────────────────────────────────────────────
function InvestorCard({ investors, investorFeedback }) {
  const total   = investorFeedback.interested + investorFeedback.maybe + investorFeedback.pass
  const fbRows  = [
    { label: 'Interested', count: investorFeedback.interested, cls: 'inv-fb--yes' },
    { label: 'Maybe',      count: investorFeedback.maybe,      cls: 'inv-fb--maybe' },
    { label: 'Pass',       count: investorFeedback.pass,       cls: 'inv-fb--no' },
  ]

  return (
    <DbCard title="Investors" tip="Your investor contacts and their feedback on properties you've presented. Breakdown shows how many are actively interested, undecided, or passed.">
      <div className="inv-stats">
        <div className="inv-stat">
          <p className="inv-stat__val">{investors.length}</p>
          <p className="inv-stat__label">Active</p>
        </div>
        <div className="inv-stat">
          <p className="inv-stat__val">{total}</p>
          <p className="inv-stat__label">Feedback Logged</p>
        </div>
      </div>

      {total > 0 && (
        <div className="inv-feedback">
          {fbRows.map(r => (
            <div key={r.label} className={`inv-fb ${r.cls}`}>
              <span className="inv-fb__label">{r.label}</span>
              <span className="inv-fb__count">{r.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="inv-list">
        {investors.length > 0 ? investors.slice(0, 4).map(i => (
          <div key={i.id} className="inv-row">
            <span className="inv-row__name">{i.contact?.name ?? '—'}</span>
            <span className="inv-row__count">{(i.investor_feedback ?? []).length} prop{(i.investor_feedback ?? []).length !== 1 ? 's' : ''}</span>
          </div>
        )) : <Empty text="No investors yet" />}
      </div>
    </DbCard>
  )
}

// ─── Activity Overview ────────────────────────────────────────────────────────
function ActivityOverviewCard({ activityByType, topClients }) {
  const typeRows  = Object.entries(activityByType).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxCount  = typeRows[0]?.[1] || 1

  return (
    <DbCard title="Activity Overview" tip="A breakdown of your logged activity types (calls, emails, showings, etc.) from the activity log. Helps you see where your time is actually going.">
      {typeRows.length > 0 ? (
        <>
          <SectionLabel>By Type</SectionLabel>
          <div className="act-types">
            {typeRows.map(([type, count]) => (
              <div key={type} className="act-type-row">
                <span className="act-type-row__label">{type}</span>
                <div className="act-type-row__track">
                  <div className="act-type-row__fill" style={{ width: `${Math.round(count / maxCount * 100)}%` }} />
                </div>
                <span className="act-type-row__count">{count}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {topClients.length > 0 && (
        <>
          <SectionLabel>Most Active Clients</SectionLabel>
          <div className="top-clients">
            {topClients.map(c => (
              <div key={c.name} className="top-client">
                <span className="top-client__name">{c.name}</span>
                <span className="top-client__count">{c.count} action{c.count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {typeRows.length === 0 && topClients.length === 0 && (
        <Empty text="No activity logged yet" />
      )}
    </DbCard>
  )
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeedCard({ activity }) {
  const variant = type => {
    const t = (type ?? '').toLowerCase()
    if (t.includes('creat') || t.includes('add'))    return 'success'
    if (t.includes('updat') || t.includes('edit'))   return 'info'
    if (t.includes('delet') || t.includes('remov'))  return 'danger'
    return 'accent'
  }

  return (
    <DbCard title="Recent Activity" tip="The last 25 activity log entries across all clients and contacts, sorted by most recent. Go to individual client records to add or view full history.">
      {activity.length === 0 ? (
        <Empty text="No activity yet" />
      ) : (
        <div className="activity-feed">
          {activity.slice(0, 12).map(item => (
            <div key={item.id} className="activity-item">
              <Badge variant={variant(item.type)} size="sm">{item.type ?? 'event'}</Badge>
              <div className="activity-item__body">
                <p className="activity-item__client">{item.contact?.name ?? item.description}</p>
                {item.property?.address && (
                  <AddressLink address={item.property.address} city={item.property?.city} className="activity-item__note">{item.property.address}</AddressLink>
                )}
              </div>
              <span className="activity-item__time">{fmtDate(item.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </DbCard>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    loading, error,
    contacts, transactions, listings, showingSessions,
    openHouses, leads, investors, activity,
    kpis, conversionFunnel, interestLevels, topProperties,
    activityByType, topClients, expiringLeads, investorFeedback,
    latestWeek, listingValue, avgDOM,
  } = useDashboardData()

  return (
    <div className="dashboard">

      {/* KPI Strip */}
      <div className="dashboard__kpi-grid">
        {loading ? (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="skeleton--card" />)
        ) : (<>
          <StatCard label="Active Clients"    value={kpis.activeClients}   accent
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
          />
          <StatCard label="BBA Signed"        value={kpis.bbaSignedCount}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          />
          <StatCard label="Open Transactions" value={kpis.openTransactions}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9M5 21h14"/></svg>}
          />
          <StatCard label="Offers Submitted"  value={kpis.offerSubmitted}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
          />
          <StatCard label="Active Listings"   value={kpis.activeListings}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>}
          />
          <StatCard label="Pipeline Value"    value={fmtDollar(kpis.pipelineValue)}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
          />
          <StatCard label="Total Investors"   value={kpis.totalInvestors}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          />
          <StatCard label="YTD Income"        value={fmtDollar(kpis.ytdIncome)}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
          />
        </>)}
      </div>

      {error && <div className="dashboard__error"><strong>Error:</strong> {error}</div>}

      {/* Pipeline + Funnel */}
      <div className="db-row db-row--60-40">
        {loading ? <><Skeleton height={260}/><Skeleton height={260}/></> : <>
          <PipelineCard transactions={transactions} listings={listings} pipelineValue={kpis.pipelineValue} listingValue={listingValue} avgDOM={avgDOM} />
          <FunnelCard funnel={conversionFunnel} />
        </>}
      </div>

      {/* This Week + Showings */}
      <div className="db-row db-row--50-50">
        {loading ? <><Skeleton height={220}/><Skeleton height={220}/></> : <>
          <ThisWeekCard latestWeek={latestWeek} />
          <ShowingsCard showingSessions={showingSessions} interestLevels={interestLevels} topProperties={topProperties} />
        </>}
      </div>

      {/* Buyer Pipeline + Open Houses stacked + Leads stacked */}
      <div className="db-row db-row--50-50">
        {loading ? <><Skeleton height={240}/><Skeleton height={240}/></> : <>
          <BuyerPipelineCard contacts={contacts} />
          <div className="db-stack">
            <OpenHousesCard openHouses={openHouses} openHousesThisMonth={kpis.openHousesThisMonth} />
            <LeadsCard leads={leads} expiringLeads={expiringLeads} />
          </div>
        </>}
      </div>

      {/* Investors + Activity Overview + Activity Feed */}
      <div className="db-row db-row--33-33-33">
        {loading ? <><Skeleton height={220}/><Skeleton height={220}/><Skeleton height={220}/></> : <>
          <InvestorCard investors={investors} investorFeedback={investorFeedback} />
          <ActivityOverviewCard activityByType={activityByType} topClients={topClients} />
          <ActivityFeedCard activity={activity} />
        </>}
      </div>

    </div>
  )
}
