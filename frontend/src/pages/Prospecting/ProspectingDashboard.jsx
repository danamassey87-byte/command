import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatCard, Badge } from '../../components/ui/index.jsx'
import { useLeads, useContacts, useOpenHouses, useAllExpenses, useResources } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
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

// ─── Resource Library ────────────────────────────────────────────────────────
const RESOURCE_CATEGORIES = [
  { value: 'guide', label: 'Guide' },
  { value: 'template', label: 'Template' },
  { value: 'script', label: 'Script' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
]
const RESOURCE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'needs_review', label: 'Needs Review', color: 'warning' },
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'archived', label: 'Archived', color: 'default' },
]
const statusBadge = Object.fromEntries(RESOURCE_STATUSES.map(s => [s.value, s]))
const catIcon = { guide: '📘', template: '📄', script: '📝', checklist: '✅', video: '🎬', other: '📌' }

function ResourceLibrary() {
  const { data: resources, refetch } = useResources()
  const items = resources ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ title: '', description: '', url: '', category: 'guide', status: 'draft' })

  const handleAdd = async () => {
    if (!draft.title.trim()) return
    setSaving(true)
    try {
      await DB.createResource(draft)
      setShowAdd(false)
      setDraft({ title: '', description: '', url: '', category: 'guide', status: 'draft' })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (id, status) => {
    try { await DB.updateResource(id, { status }); refetch() } catch (e) { alert(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this resource?')) return
    try { await DB.deleteResource(id); refetch() } catch (e) { alert(e.message) }
  }

  const active = items.filter(i => i.status === 'active').length

  return (
    <div className="mktg-prep">
      <div className="mktg-prep__header">
        <h2 className="mktg-prep__title">Resource Library</h2>
        <span className="mktg-prep__pct">{active}/{items.length} ACTIVE</span>
      </div>

      {showAdd && (
        <div style={{ padding: 12, background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Resource title..." style={{ padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
          <input value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))} placeholder="URL (optional)..." style={{ padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
          <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Description..." style={{ padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.8rem', fontFamily: 'inherit' }}>
              {RESOURCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))} style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.8rem', fontFamily: 'inherit' }}>
              {RESOURCE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAdd} disabled={saving || !draft.title.trim()} style={{ padding: '6px 14px', background: 'var(--brown-mid)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>{saving ? 'Saving...' : 'Add'}</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mktg-prep__list">
        {items.length === 0 && !showAdd && (
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '12px 0', textAlign: 'center' }}>No resources yet. Add guides, scripts, and templates.</p>
        )}
        {items.map(item => {
          const st = statusBadge[item.status] || statusBadge.draft
          return (
            <div key={item.id} className="mktg-prep__item" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
              <span style={{ fontSize: '1.1rem' }}>{catIcon[item.category] || '📌'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--brown-dark)', textDecoration: 'none' }}>{item.title}</a>
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--brown-dark)' }}>{item.title}</span>
                  )}
                  <Badge variant={st.color} size="sm">{st.label}</Badge>
                </div>
                {item.description && <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '1px 0 0' }}>{item.description}</p>}
              </div>
              <select
                value={item.status}
                onChange={e => handleStatusChange(item.id, e.target.value)}
                style={{ padding: '3px 6px', fontSize: '0.72rem', border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'inherit', background: '#fff' }}
              >
                {RESOURCE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>×</button>
            </div>
          )
        })}
      </div>
      <button className="mktg-prep__audit-btn" onClick={() => setShowAdd(true)}>
        + ADD RESOURCE
      </button>
    </div>
  )
}

// ─── Lead Source Breakdown (replaces hardcoded Outreach Engagement) ──────────
const SOURCE_META = {
  expired:       { label: 'Expired Letters',      icon: 'mail',   sub: 'Mailer Campaign' },
  open_house:    { label: 'Open House',           icon: 'home',   sub: 'In-Person' },
  circle:        { label: 'Circle Prospecting',   icon: 'target', sub: 'Door-to-Door' },
  soi:           { label: 'SOI / Personal',       icon: 'share',  sub: 'Sphere of Influence' },
  referral:      { label: 'Referral',             icon: 'share',  sub: 'Agent / Client' },
  fsbo:          { label: 'FSBO',                 icon: 'file',   sub: 'For Sale By Owner' },
  online:        { label: 'Online / Website',     icon: 'share',  sub: 'Digital' },
  other:         { label: 'Other Sources',        icon: 'file',   sub: 'Misc' },
}

const OUTREACH_ICONS = {
  mail:   <><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></>,
  share:  <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  file:   <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  home:   <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
}

function LeadSourceBreakdown({ leads }) {
  const sources = useMemo(() => {
    const map = {}
    for (const l of (leads ?? [])) {
      const src = l.source || 'other'
      if (!map[src]) map[src] = 0
      map[src]++
    }
    const total = leads?.length || 1
    return Object.entries(map)
      .map(([key, count]) => {
        const meta = SOURCE_META[key] || SOURCE_META.other
        return { key, ...meta, count, pct: Math.round((count / total) * 100) }
      })
      .sort((a, b) => b.count - a.count)
  }, [leads])

  return (
    <div className="outreach-engage">
      <div className="outreach-engage__header">
        <h2 className="outreach-engage__title">Lead Sources</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{leads?.length || 0} total leads</span>
      </div>
      <div className="outreach-engage__table-wrap">
        <table className="outreach-engage__table">
          <thead>
            <tr>
              <th>SOURCE</th>
              <th>LEADS</th>
              <th>% OF TOTAL</th>
              <th>DISTRIBUTION</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>No leads yet</td></tr>
            ) : sources.map((s) => (
              <tr key={s.key}>
                <td>
                  <div className="outreach-medium">
                    <span className="outreach-medium__icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        {OUTREACH_ICONS[s.icon]}
                      </svg>
                    </span>
                    <div>
                      <span className="outreach-medium__name">{s.label}</span>
                      <span className="outreach-medium__sub">{s.sub}</span>
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{s.count}</td>
                <td>{s.pct}%</td>
                <td>
                  <div className="outreach-efficiency">
                    <div className="outreach-efficiency__track">
                      <div className="outreach-efficiency__fill" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
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
      <h2 className="market-pulse__title">Conversion Rate</h2>
      <p className="market-pulse__text">
        Lead pipeline is <em className="market-pulse__em">{sentiment || 'building momentum'}</em>.
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
  const { data: expensesData } = useAllExpenses()

  const ld = leads ?? []
  const oh = openHouses ?? []
  const expenses = expensesData ?? []
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

  // Real expense totals for prospecting/marketing
  const totalSpend = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const costPerLead = ld.length > 0 ? (totalSpend / ld.length) : 0
  const converted = ld.filter(x => (x.stage ?? '').toLowerCase() === 'converted').length
  const conversionRate = ld.length > 0 ? Math.round((converted / ld.length) * 100) : 0

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
        <KpiCard label="TOTAL LEADS" value={ld.length} sub={`${expiring.length} expiring in 30d`} />
        <KpiCard label="TOTAL SPEND" value={fmtDollar(totalSpend)} sub={`across ${expenses.length} expenses`} />
        <KpiCard label="COST PER LEAD" value={costPerLead > 0 ? `$${costPerLead.toFixed(2)}` : '$0'} sub={converted > 0 ? `${converted} converted` : 'No conversions yet'} />
      </div>

      {/* ─── Marketing Prep + Stat Cards Row ─── */}
      <div className="prospect-lux__row prospect-lux__row--prep">
        <ResourceLibrary />
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

      {/* ─── Lead Source Breakdown ─── */}
      <LeadSourceBreakdown leads={ld} />

      {/* ─── Market Pulse + Timeline Row ─── */}
      <div className="prospect-lux__row prospect-lux__row--pulse">
        <div className="prospect-lux__col prospect-lux__col--links">
          <div className="prospect-lux__quick-grid">
            <Link to="/prospecting/expired" className="pr-quick-link">
              <span className="pr-quick-link__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--brown-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </span>
              <span>Expired Listings</span>
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
        <MarketPulse engagement={conversionRate} sentiment={conversionRate > 10 ? 'strong' : conversionRate > 5 ? 'steady' : ld.length === 0 ? 'awaiting data' : 'building momentum'} />
      </div>

    </div>
  )
}
