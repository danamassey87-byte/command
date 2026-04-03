import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatCard, Badge } from '../../components/ui/index.jsx'
import { useLeads, useContacts, useOpenHouses } from '../../lib/hooks.js'
import './ProspectingDashboard.css'

// ─── Helpers ────────────────────────────────────────────────────────────────────
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

// ─── Marketing Prep Checklist ────────────────────────────────────────────────────
const MARKETING_PREP_ITEMS = [
  { id: 'photo',   label: 'Photography & Drone',      desc: 'High-definition dusk aerials archived.' },
  { id: 'signage', label: 'Estate Signage',           desc: 'Smart-integrated pillars deployed.' },
  { id: 'flyers',  label: 'Bespoke Lookbooks',        desc: 'Flyers designed in Canva.' },
  { id: 'render',  label: 'Spatial 3D Rendering',     desc: 'Virtual tour / Matterport setup.' },
  { id: 'social',  label: 'Social Campaign',          desc: 'IG posts & stories scheduled.' },
  { id: 'mls',     label: 'MLS & Syndication',        desc: 'Listing live on all portals.' },
  { id: 'circle',  label: 'Circle Prospecting',       desc: 'Neighborhood outreach complete.' },
  { id: 'email',   label: 'Email Blast',              desc: 'Broker & buyer agent email sent.' },
]

function MarketingPrep() {
  const [checks, setChecks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mktg_prep_checks') || '{}')
    } catch { return {} }
  })

  const toggle = (id) => {
    const next = { ...checks, [id]: !checks[id] }
    setChecks(next)
    localStorage.setItem('mktg_prep_checks', JSON.stringify(next))
  }

  const done = Object.values(checks).filter(Boolean).length
  const total = MARKETING_PREP_ITEMS.length
  const pct = total ? Math.round(done / total * 100) : 0

  return (
    <div className="mktg-prep">
      <div className="mktg-prep__header">
        <h2 className="mktg-prep__title">Marketing Prep</h2>
        <span className="mktg-prep__pct">{pct}% AUDITED</span>
      </div>
      <div className="mktg-prep__list">
        {MARKETING_PREP_ITEMS.map(item => (
          <button
            key={item.id}
            className={`mktg-prep__item ${checks[item.id] ? 'mktg-prep__item--done' : ''}`}
            onClick={() => toggle(item.id)}
          >
            <span className="mktg-prep__check">
              {checks[item.id] ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" fill="var(--brown-mid)" stroke="var(--brown-mid)" opacity="0.15" />
                  <polyline points="9 12 11.5 14.5 15.5 9.5" stroke="var(--brown-dark)" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" stroke="var(--brown-light)" />
                </svg>
              )}
            </span>
            <div className="mktg-prep__text">
              <span className="mktg-prep__label">{item.label}</span>
              <span className="mktg-prep__desc">{item.desc}</span>
            </div>
          </button>
        ))}
      </div>
      <button className="mktg-prep__audit-btn" onClick={() => setChecks({})}>
        AUDIT CHECKLIST
      </button>
    </div>
  )
}

// ─── Outreach Engagement Table ──────────────────────────────────────────────────
const OUTREACH_MEDIUMS = [
  {
    icon: 'mail',
    name: 'Brokerage Blast',
    sub: 'Email Campaign',
    status: 'delivered',
    engagement: '42% Penetration',
    allocation: '$150',
    efficiency: 72,
  },
  {
    icon: 'share',
    name: 'Digital Exhibition',
    sub: 'Social Campaign',
    status: 'active',
    engagement: '2,410 Interactions',
    allocation: '$1,200',
    efficiency: 85,
  },
  {
    icon: 'file',
    name: 'Elite Periodicals',
    sub: 'Print & Digital',
    status: 'slated',
    engagement: 'Pending Publication',
    allocation: '$2,900',
    efficiency: 0,
  },
  {
    icon: 'target',
    name: 'Circle Outreach',
    sub: 'Door Knocking',
    status: 'active',
    engagement: '86 Conversations',
    allocation: '$0',
    efficiency: 94,
  },
  {
    icon: 'home',
    name: 'Open House Events',
    sub: 'In-Person',
    status: 'delivered',
    engagement: '128 Sign-Ins',
    allocation: '$350',
    efficiency: 88,
  },
]

const STATUS_STYLE = {
  delivered: { label: 'DELIVERED', className: 'outreach-status--delivered' },
  active:    { label: 'ACTIVE',    className: 'outreach-status--active' },
  slated:    { label: 'SLATED',    className: 'outreach-status--slated' },
}

const OUTREACH_ICONS = {
  mail:   <><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></>,
  share:  <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  file:   <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  home:   <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
}

function OutreachEngagement() {
  return (
    <div className="outreach-engage">
      <div className="outreach-engage__header">
        <h2 className="outreach-engage__title">Outreach Engagement</h2>
        <button className="outreach-engage__archive">ARCHIVE ANALYTICS</button>
      </div>
      <div className="outreach-engage__table-wrap">
        <table className="outreach-engage__table">
          <thead>
            <tr>
              <th>MEDIUM</th>
              <th>STATUS</th>
              <th>ENGAGEMENT</th>
              <th>ALLOCATION</th>
              <th>EFFICIENCY</th>
            </tr>
          </thead>
          <tbody>
            {OUTREACH_MEDIUMS.map((m, i) => {
              const st = STATUS_STYLE[m.status] || STATUS_STYLE.slated
              return (
                <tr key={i}>
                  <td>
                    <div className="outreach-medium">
                      <span className="outreach-medium__icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          {OUTREACH_ICONS[m.icon]}
                        </svg>
                      </span>
                      <div>
                        <span className="outreach-medium__name">{m.name}</span>
                        <span className="outreach-medium__sub">{m.sub}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`outreach-status ${st.className}`}>{st.label}</span>
                  </td>
                  <td className="outreach-td-engagement">{m.engagement}</td>
                  <td className="outreach-td-allocation">{m.allocation}</td>
                  <td>
                    {m.efficiency > 0 ? (
                      <div className="outreach-efficiency">
                        <div className="outreach-efficiency__track">
                          <div className="outreach-efficiency__fill" style={{ width: `${m.efficiency}%` }} />
                        </div>
                      </div>
                    ) : (
                      <span className="outreach-td-pending">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Luxury Bar Chart ───────────────────────────────────────────────────────────
function LuxuryBarChart({ title, subtitle, data, legend }) {
  const max = Math.max(...data.flatMap(d => d.values), 1)

  return (
    <div className="lux-chart">
      <div className="lux-chart__header">
        <div>
          <h2 className="lux-chart__title">{title}</h2>
          {subtitle && <p className="lux-chart__subtitle">{subtitle}</p>}
        </div>
        {legend && (
          <div className="lux-chart__legend">
            {legend.map((l, i) => (
              <span key={i} className="lux-chart__legend-item">
                <span className="lux-chart__legend-dot" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="lux-chart__bars">
        {data.map((d, i) => (
          <div key={i} className="lux-chart__group">
            <div className="lux-chart__bar-set">
              {d.values.map((v, vi) => (
                <div
                  key={vi}
                  className={`lux-chart__bar ${vi === 0 ? 'lux-chart__bar--primary' : 'lux-chart__bar--secondary'}`}
                  style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
                >
                  <span className="lux-chart__bar-tooltip">{v}</span>
                </div>
              ))}
            </div>
            <span className="lux-chart__label">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Market Pulse Card ──────────────────────────────────────────────────────────
function MarketPulse({ engagement, sentiment }) {
  return (
    <div className="market-pulse">
      <h2 className="market-pulse__title">Market Pulse</h2>
      <p className="market-pulse__text">
        Demand remains <em className="market-pulse__em">{sentiment || 'effervescent'}</em> in the premium sector.
      </p>
      <div className="market-pulse__ring">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
          <circle
            cx="60" cy="60" r="50" fill="none"
            stroke="rgba(200,195,185,0.6)" strokeWidth="4"
            strokeDasharray={`${(engagement / 100) * 314} 314`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="56" textAnchor="middle" fill="#fff" fontSize="28" fontFamily="var(--font-display)" fontStyle="italic" fontWeight="400">{engagement}%</text>
          <text x="60" y="74" textAnchor="middle" fill="rgba(200,195,185,0.7)" fontSize="8" fontFamily="var(--font-body)" letterSpacing="2" fontWeight="500">ENGAGEMENT</text>
        </svg>
      </div>
      <Link to="/market" className="market-pulse__btn">INSIGHTS</Link>
    </div>
  )
}

// ─── KPI Stat Cards ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, delta }) {
  return (
    <div className="kpi-card">
      <span className="kpi-card__label">{label}</span>
      <div className="kpi-card__row">
        <span className="kpi-card__value">{value}</span>
        {delta && <span className={`kpi-card__delta ${delta.startsWith('+') ? 'kpi-card__delta--up' : 'kpi-card__delta--down'}`}>{delta}</span>}
      </div>
      {sub && <span className="kpi-card__sub">{sub}</span>}
    </div>
  )
}

// ─── Timeline Events ─────────────────────────────────────────────────────────────
function Timeline({ events }) {
  return (
    <div className="lux-timeline">
      <h4 className="lux-timeline__heading">TIMELINE</h4>
      {events.map((e, i) => (
        <div key={i} className="lux-timeline__item">
          <span className={`lux-timeline__dot ${e.active ? 'lux-timeline__dot--active' : ''}`} />
          <div>
            <span className="lux-timeline__title">{e.title}</span>
            <span className="lux-timeline__sub">{e.sub}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────────
export default function ProspectingDashboard() {
  const { data: leads, loading } = useLeads()
  const { data: contacts } = useContacts()
  const { data: openHouses } = useOpenHouses()

  const ld = leads ?? []
  const oh = openHouses ?? []
  const now = new Date()

  // Computed stats
  const in30 = new Date(now); in30.setDate(now.getDate() + 30)
  const expiring = ld.filter(x => {
    if (!x.property?.expired_date) return false
    const d = new Date(x.property.expired_date)
    return d >= now && d <= in30
  })
  const lettersSent = ld.filter(x => x.letter_sent_at).length
  const letterRate = ld.length ? Math.round(lettersSent / ld.length * 100) : 0
  const ohThisMonth = oh.filter(x => {
    if (!x.date) return false
    const d = new Date(x.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const ohSignIns = ohThisMonth.reduce((s, x) => s + (Number(x.sign_ins) || 0), 0)
  const totalValue = ld.reduce((s, x) => s + (Number(x.property?.price) || 0), 0)

  // Bar chart data — leads per month (last 6 months)
  const chartData = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
      const yr = d.getFullYear()
      const mo = d.getMonth()
      const newLeads = ld.filter(x => {
        if (!x.created_at) return false
        const cd = new Date(x.created_at)
        return cd.getFullYear() === yr && cd.getMonth() === mo
      }).length
      const lettersSentMo = ld.filter(x => {
        if (!x.letter_sent_at) return false
        const cd = new Date(x.letter_sent_at)
        return cd.getFullYear() === yr && cd.getMonth() === mo
      }).length
      months.push({ label, values: [newLeads, lettersSentMo] })
    }
    return months
  }, [ld])

  // Timeline events
  const recentOH = [...oh].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 3)
  const timeline = recentOH.map((o, i) => ({
    title: o.property?.address ? `Open House` : 'Event',
    sub: `${o.property?.address ?? 'TBD'} · ${fmtDate(o.date)}`,
    active: i === 0,
  }))
  if (timeline.length === 0) {
    timeline.push({ title: 'No recent events', sub: 'Schedule an open house to get started', active: false })
  }

  if (loading) return <div className="prospect-lux"><div className="sd-loading">Loading prospecting data...</div></div>

  return (
    <div className="prospect-lux">

      {/* ─── KPI Cards ─── */}
      <div className="prospect-lux__kpis">
        <KpiCard label="TOTAL IMPRESSIONS" value={`${((ld.length * 34) / 1000).toFixed(1)}k`} delta="+12%" />
        <KpiCard label="CURATED SPEND" value={fmtDollar(4250)} sub={`of $5k allocation`} />
        <KpiCard label="COST PER INQUIRY" value={`$${(21.40).toFixed(2)}`} delta="-8%" />
      </div>

      {/* ─── Marketing Prep + Stat Cards Row ─── */}
      <div className="prospect-lux__row prospect-lux__row--prep">
        <MarketingPrep />
        <div className="prospect-lux__col">
          <LuxuryBarChart
            title="Revenue & Reach"
            subtitle="The delicate balance of expansion and operation"
            data={chartData}
            legend={[
              { label: 'NEW LEADS', color: 'var(--brown-dark)' },
              { label: 'LETTERS SENT', color: 'var(--brown-light)' },
            ]}
          />
        </div>
      </div>

      {/* ─── Outreach Engagement ─── */}
      <OutreachEngagement />

      {/* ─── Market Pulse + Timeline Row ─── */}
      <div className="prospect-lux__row prospect-lux__row--pulse">
        <div className="prospect-lux__col prospect-lux__col--links">
          <div className="prospect-lux__quick-grid">
            <Link to="/prospecting/expired" className="pr-quick-link">
              <span className="pr-quick-link__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--brown-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </span>
              <span>Expired / Cannonball</span>
            </Link>
            <Link to="/prospecting/soi" className="pr-quick-link">
              <span className="pr-quick-link__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--brown-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              </span>
              <span>Personal Circle / SOI</span>
            </Link>
            <Link to="/prospecting/oh-leads" className="pr-quick-link">
              <span className="pr-quick-link__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--brown-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </span>
              <span>Open House Leads</span>
            </Link>
          </div>
          <Timeline events={timeline} />
        </div>
        <MarketPulse engagement={78} sentiment="effervescent" />
      </div>

    </div>
  )
}
