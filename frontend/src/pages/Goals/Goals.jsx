import { useState, useMemo } from 'react'
import { SectionHeader, Card, TabBar, Button, SlidePanel, Input, InfoTip } from '../../components/ui/index.jsx'
import { useWeeklyStats, useGoalTargets } from '../../lib/hooks.js'
import { createWeeklyStats, updateWeeklyStats, updateGoalTargets } from '../../lib/supabase.js'
import './Goals.css'

// ─── Config ───────────────────────────────────────────────────────────────────
const PLANNED_WEEKS = 43 // total working weeks this year (52 - vacation/sick/holidays)

const FIELDS = [
  { key: 'productivity_days',  label: 'PRO Days',                annualGoal: 215,    group: 'activity' },
  { key: 'hours_practiced',    label: 'Hrs Practiced',           annualGoal: 215,    group: 'activity' },
  { key: 'hours_prospected',   label: 'Hrs Prospected',          annualGoal: 430,    group: 'activity' },
  { key: 'live_contacts',      label: 'Live Contacts',           annualGoal: 5000,   group: 'activity' },
  { key: 'added_to_pc',        label: 'Added to PC',             annualGoal: 250,    group: 'activity' },
  { key: 'new_leads',          label: 'New Leads',               annualGoal: 600,    group: 'production' },
  { key: 'listing_appts_set',  label: 'Listing Appts Set',       annualGoal: 100,    group: 'production' },
  { key: 'listing_appts_held', label: 'Listing Appts Held',      annualGoal: 30,     group: 'production' },
  { key: 'listings_taken',     label: 'Listings Taken',          annualGoal: 15,     group: 'production' },
  { key: 'listings_sold',      label: 'Listings Sold',           annualGoal: 10,     group: 'production' },
  { key: 'buyer_reps_signed',  label: 'Buyer Rep / 1st Showing', annualGoal: 15,     group: 'production' },
  { key: 'buyer_sales',        label: 'Buyer Sales',             annualGoal: 10,     group: 'production' },
  { key: 'open_house_events',  label: 'Open House Events',       annualGoal: 100,    group: 'production' },
  { key: 'earned_income',      label: 'Earned Income',           annualGoal: 250000, group: 'income', isCurrency: true },
  { key: 'sales_closed',       label: 'Sales Closed',            annualGoal: 20,     group: 'income' },
  { key: 'paid_income',        label: 'Paid Income',             annualGoal: 250000, group: 'income', isCurrency: true },
]

const GROUPS = [
  { key: 'activity',   label: 'Activity',   color: '#5a87b4' },
  { key: 'production', label: 'Production', color: '#b79782' },
  { key: 'income',     label: 'Income',     color: '#6a9e72' },
]

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

// Hero KPIs — the 4 most important metrics shown large at the top
const HERO_KEYS = ['earned_income', 'sales_closed', 'live_contacts', 'listings_taken']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil((Math.floor((now - start) / 86400000) + 1) / 7)
}

function generateWeeks(year = 2026) {
  const jan1 = new Date(year, 0, 1)
  const dow = jan1.getDay()
  const daysToMonday = dow === 0 ? 1 : dow === 1 ? 0 : (8 - dow) % 7
  const firstMonday = new Date(year, 0, 1 + daysToMonday)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return Array.from({ length: 52 }, (_, i) => {
    const start = new Date(firstMonday)
    start.setDate(firstMonday.getDate() + i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const days = Array.from({ length: 7 }, (__, j) => {
      const d = new Date(start); d.setDate(start.getDate() + j); return d
    })
    return {
      value: `${year}-W${String(i + 1).padStart(2, '0')}`,
      label: `Week ${i + 1}  ·  ${fmt(start)} – ${fmt(end)}`,
      weekNum: i + 1,
      days,
    }
  })
}

const WEEKS = generateWeeks(2026)

function fmtN(val, isCurrency) {
  const n = Number(val)
  if (val == null || val === '' || isNaN(n)) return '—'
  if (isCurrency) return `$${Math.round(n).toLocaleString()}`
  return n.toLocaleString()
}

function fmtAvg(val, isCurrency) {
  const n = Number(val)
  if (!val && val !== 0) return '—'
  if (isNaN(n) || n === 0) return '—'
  if (isCurrency) return `$${Math.round(n).toLocaleString()}`
  return n % 1 === 0 ? n.toString() : n.toFixed(1)
}

function pct(val, goal) {
  if (!goal || !val) return 0
  return Math.min(100, Math.round((val / goal) * 100))
}

// ─── Hero KPI Cards ──────────────────────────────────────────────────────────
function HeroKPIs({ stats, weekNum, fields }) {
  const heroFields = HERO_KEYS.map(k => fields.find(f => f.key === k)).filter(Boolean)
  const totals = fields.reduce((acc, f) => {
    acc[f.key] = stats.reduce((sum, w) => sum + (Number(w[f.key]) || 0), 0)
    return acc
  }, {})

  return (
    <div className="hero-kpis">
      {heroFields.map(f => {
        const ytd = totals[f.key] || 0
        const shouldBe = Math.round(f.annualGoal * weekNum / 52)
        const p = pct(ytd, f.annualGoal)
        const isAhead = ytd >= shouldBe

        return (
          <div key={f.key} className="hero-kpi">
            <span className="hero-kpi__label">{f.label}</span>
            <span className={`hero-kpi__value ${ytd > 0 ? (isAhead ? 'hero-kpi__value--ahead' : 'hero-kpi__value--behind') : ''}`}>
              {fmtN(ytd, f.isCurrency)}
            </span>
            <div className="hero-kpi__bar">
              <div
                className={`hero-kpi__bar-fill ${p >= 100 ? 'hero-kpi__bar-fill--done' : isAhead ? 'hero-kpi__bar-fill--ahead' : 'hero-kpi__bar-fill--behind'}`}
                style={{ width: `${p}%` }}
              />
            </div>
            <div className="hero-kpi__footer">
              <span className="hero-kpi__pct">{p}% of goal</span>
              <span className="hero-kpi__goal">{fmtN(f.annualGoal, f.isCurrency)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Scoreboard (tabbed groups with expandable cards) ────────────────────────
function ScoreboardCard({ stats, weekNum, fields }) {
  const [activeGroup, setActiveGroup] = useState('activity')
  const [expandedCard, setExpandedCard] = useState(null)
  const weeksLogged = stats.length
  const weeksScheduledRemaining = Math.max(1, PLANNED_WEEKS * (52 - weekNum) / 52)

  const totals = fields.reduce((acc, f) => {
    acc[f.key] = stats.reduce((sum, w) => sum + (Number(w[f.key]) || 0), 0)
    return acc
  }, {})

  const rows = fields.filter(f => f.group === activeGroup)

  return (
    <div className="scoreboard">
      <div className="scoreboard__header">
        <div>
          <h3 className="scoreboard__title">2026 Annual Scoreboard</h3>
          <p className="scoreboard__sub">Based on {PLANNED_WEEKS} planned working weeks</p>
        </div>
        <span className="scoreboard__week-badge">
          Week {weekNum} of 52 &nbsp;·&nbsp; {weeksLogged} week{weeksLogged !== 1 ? 's' : ''} logged
        </span>
      </div>

      <div className="scoreboard__tabs">
        {GROUPS.map(g => (
          <button
            key={g.key}
            className={`scoreboard__tab ${activeGroup === g.key ? 'scoreboard__tab--active' : ''}`}
            style={{ '--tab-color': g.color }}
            onClick={() => { setActiveGroup(g.key); setExpandedCard(null) }}
          >
            <span className="scoreboard__tab-dot" style={{ background: g.color }} />
            {g.label}
          </button>
        ))}
      </div>

      <div className="scoreboard__grid">
        {rows.map(f => {
          const ytd = totals[f.key] || 0
          const shouldBe = Math.round(f.annualGoal * weekNum / 52)
          const weeklyAvg = weeksLogged > 0 ? ytd / weeksLogged : 0
          const onTrackFor = Math.round(weeklyAvg * PLANNED_WEEKS)
          const wklyReq = Math.max(0, Math.ceil((f.annualGoal - ytd) / weeksScheduledRemaining))
          const isAhead = ytd >= shouldBe
          const p = pct(ytd, f.annualGoal)
          const isExpanded = expandedCard === f.key

          return (
            <div
              key={f.key}
              className={`sc-card ${isExpanded ? 'sc-card--expanded' : ''}`}
              onClick={() => setExpandedCard(isExpanded ? null : f.key)}
            >
              <div className="sc-card__top">
                <span className="sc-card__label">{f.label}</span>
                <span className={`sc-card__ytd ${ytd > 0 ? (isAhead ? 'sc-card__ytd--ahead' : 'sc-card__ytd--behind') : ''}`}>
                  {fmtN(ytd, f.isCurrency)}
                </span>
              </div>
              <div className="sc-card__bar">
                <div
                  className={`sc-card__bar-fill ${p >= 100 ? 'sc-card__bar-fill--done' : isAhead ? 'sc-card__bar-fill--ahead' : 'sc-card__bar-fill--behind'}`}
                  style={{ width: `${p}%` }}
                />
              </div>
              <div className="sc-card__summary">
                <span className="sc-card__summary-req">
                  {fmtAvg(wklyReq, f.isCurrency)}<span className="sc-card__summary-label"> /wk needed</span>
                </span>
                <span className="sc-card__pct">{p}%</span>
              </div>
              {isExpanded && (
                <div className="sc-card__details">
                  <div className="sc-card__detail-row">
                    <span className="sc-card__detail-label">Annual Goal</span>
                    <span className="sc-card__detail-val">{fmtN(f.annualGoal, f.isCurrency)}</span>
                  </div>
                  <div className="sc-card__detail-row">
                    <span className="sc-card__detail-label">Should Be (Wk {weekNum})</span>
                    <span className="sc-card__detail-val">{fmtN(shouldBe, f.isCurrency)}</span>
                  </div>
                  <div className="sc-card__detail-row">
                    <span className="sc-card__detail-label">Weekly Avg</span>
                    <span className="sc-card__detail-val">{fmtAvg(weeklyAvg, f.isCurrency)}</span>
                  </div>
                  <div className="sc-card__detail-row">
                    <span className="sc-card__detail-label">On Track For</span>
                    <span className={`sc-card__detail-val ${weeksLogged > 0 && ytd > 0 ? (onTrackFor >= f.annualGoal ? 'sc-card__detail-val--good' : 'sc-card__detail-val--low') : ''}`}>
                      {weeksLogged > 0 ? fmtN(onTrackFor, f.isCurrency) : '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Planning Ratios ──────────────────────────────────────────────────────────
function RatiosCard({ stats, fields }) {
  const t = fields.reduce((acc, f) => {
    acc[f.key] = stats.reduce((sum, w) => sum + (Number(w[f.key]) || 0), 0)
    return acc
  }, {})

  const r = (num, den) => (den && den > 0 ? num / den : null)
  const rf = (val, currency = false) => {
    if (val == null || isNaN(val)) return '—'
    if (currency) return `$${Math.round(val).toLocaleString()}`
    return val % 1 === 0 ? val.toString() : val.toFixed(1)
  }

  const ratios = [
    { label: 'Hrs Prospected / Day',           val: rf(r(t.hours_prospected, t.productivity_days)) },
    { label: 'Contacts / Day',                 val: rf(r(t.live_contacts, t.productivity_days)) },
    { label: 'Contacts / Hour',                val: rf(r(t.live_contacts, t.hours_prospected)) },
    { label: 'Hrs Prospected / Appt',          val: rf(r(t.hours_prospected, t.listing_appts_held)) },
    { label: 'Contacts / Appt',                val: rf(r(t.live_contacts, t.listing_appts_held)) },
    { label: 'Hrs Prospected / Listing Taken', val: rf(r(t.hours_prospected, t.listings_taken)) },
    { label: 'Contacts / Listing Taken',       val: rf(r(t.live_contacts, t.listings_taken)) },
    { label: 'Listing Appts : Listing Taken',  val: rf(r(t.listing_appts_held, t.listings_taken)) },
    { label: 'Income / Contact',               val: rf(r(t.earned_income, t.live_contacts), true) },
    { label: 'Income / Hr Prospected',         val: rf(r(t.earned_income, t.hours_prospected), true) },
  ]

  return (
    <div className="ratios-card">
      <h3 className="ratios-card__title">
        Planning Ratios
        <span className="ratios-card__sub"> — YTD actuals</span>
        <InfoTip text="Efficiency ratios calculated from your YTD totals. These help you understand how productive each hour and each contact really is — great for adjusting your prospecting strategy." position="bottom" />
      </h3>
      <div className="ratios-grid">
        {ratios.map(item => (
          <div key={item.label} className="ratio-cell">
            <p className="ratio-cell__value">{item.val}</p>
            <p className="ratio-cell__label">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Log / Edit Modal ─────────────────────────────────────────────────────────
function LogWeekModal({ existing, onSave, onClose, fields }) {
  const currentWeekNum = getWeekOfYear()
  const defaultWeekValue = existing?.week_id
    ?? WEEKS[Math.min(currentWeekNum - 1, 51)]?.value

  const [weekId, setWeekId]           = useState(defaultWeekValue)
  const [mode, setMode]               = useState('weekly')
  const [activeGroup, setActiveGroup] = useState('activity')
  const [activeDay, setActiveDay]     = useState('mon')
  const [saving, setSaving]           = useState(false)

  const emptyDay = () => Object.fromEntries(fields.map(f => [f.key, '']))

  const [weeklyValues, setWeeklyValues] = useState(
    Object.fromEntries(fields.map(f => [f.key, existing?.[f.key] ?? '']))
  )
  const [dailyValues, setDailyValues] = useState(
    Object.fromEntries(DAYS.map(d => [d.key, emptyDay()]))
  )

  const dailyTotals = fields.reduce((acc, f) => {
    acc[f.key] = DAYS.reduce((sum, d) => sum + (Number(dailyValues[d.key][f.key]) || 0), 0)
    return acc
  }, {})

  const handleSave = async () => {
    if (!weekId) return
    setSaving(true)
    try {
      const source = mode === 'weekly' ? weeklyValues : dailyTotals
      const fs = { week_id: weekId }
      fields.forEach(f => {
        const v = source[f.key]
        if (v !== '' && v != null && Number(v) > 0) {
          fs[f.key] = f.isCurrency ? parseFloat(v) : parseInt(v, 10)
        }
      })
      await onSave(fs, existing?.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const groupFields = fields.filter(f => f.group === activeGroup)
  const selectedWeek = WEEKS.find(w => w.value === weekId)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{existing ? `Edit — ${existing.week_id}` : 'Log Week'}</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          <div className="log-top">
            <div className="modal__field log-week-field">
              <label className="field__label">Week</label>
              <select
                className="field__input"
                value={weekId}
                onChange={e => setWeekId(e.target.value)}
              >
                {WEEKS.map(w => (
                  <option key={w.value} value={w.value}>
                    {w.label}{w.weekNum === currentWeekNum ? '  ← current' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="log-mode-toggle">
              <button
                className={`log-mode-btn ${mode === 'weekly' ? 'log-mode-btn--active' : ''}`}
                onClick={() => setMode('weekly')}
              >
                Weekly Total
              </button>
              <button
                className={`log-mode-btn ${mode === 'daily' ? 'log-mode-btn--active' : ''}`}
                onClick={() => setMode('daily')}
              >
                By Day
              </button>
            </div>
          </div>

          <TabBar
            tabs={GROUPS.map(g => ({ label: g.label, value: g.key }))}
            active={activeGroup}
            onChange={setActiveGroup}
          />

          {mode === 'weekly' ? (
            <div className="modal__grid">
              {groupFields.map(f => {
                const wklyGoal = Math.round(f.annualGoal / PLANNED_WEEKS)
                return (
                  <div key={f.key} className="modal__field">
                    <label className="field__label">
                      {f.label}
                      {wklyGoal > 0 && (
                        <span className="modal__goal-hint">
                          {' '}/ {f.isCurrency ? `$${wklyGoal.toLocaleString()}` : wklyGoal}
                        </span>
                      )}
                    </label>
                    <input
                      className="field__input"
                      type="number" min="0"
                      value={weeklyValues[f.key]}
                      onChange={e => setWeeklyValues(v => ({ ...v, [f.key]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="daily-log">
              <div className="daily-day-tabs">
                {DAYS.map(d => {
                  const dayDate = selectedWeek?.days[DAYS.findIndex(x => x.key === d.key)]
                  const hasData = fields.some(f => dailyValues[d.key][f.key] !== '')
                  return (
                    <button
                      key={d.key}
                      className={`daily-day-btn ${activeDay === d.key ? 'daily-day-btn--active' : ''} ${hasData ? 'daily-day-btn--filled' : ''}`}
                      onClick={() => setActiveDay(d.key)}
                    >
                      <span className="daily-day-btn__name">{d.label}</span>
                      {dayDate && (
                        <span className="daily-day-btn__date">
                          {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="modal__grid">
                {groupFields.map(f => (
                  <div key={f.key} className="modal__field">
                    <label className="field__label">{f.label}</label>
                    <input
                      className="field__input"
                      type="number" min="0"
                      value={dailyValues[activeDay][f.key]}
                      onChange={e => setDailyValues(v => ({
                        ...v,
                        [activeDay]: { ...v[activeDay], [f.key]: e.target.value },
                      }))}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

              <div className="daily-totals">
                <p className="daily-totals__label">Week total so far</p>
                <div className="daily-totals__row">
                  {groupFields.map(f => {
                    const val = dailyTotals[f.key]
                    const wklyGoal = Math.round(f.annualGoal / PLANNED_WEEKS)
                    const hit = wklyGoal > 0 && val >= wklyGoal
                    return (
                      <div key={f.key} className={`daily-total-chip ${hit ? 'daily-total-chip--hit' : val > 0 ? 'daily-total-chip--partial' : ''}`}>
                        <span className="daily-total-chip__val">
                          {val > 0 ? (f.isCurrency ? `$${val.toLocaleString()}` : val) : '—'}
                        </span>
                        <span className="daily-total-chip__label">{f.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost btn--md" onClick={onClose}>Cancel</button>
          <button
            className="btn btn--primary btn--md"
            onClick={handleSave}
            disabled={saving || !weekId}
          >
            {saving ? 'Saving…' : 'Save Week'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Week Card ────────────────────────────────────────────────────────────────
function WeekCard({ week, onEdit, fields }) {
  const [expanded, setExpanded] = useState(false)

  const metGoals = fields.filter(f => {
    const wklyGoal = f.annualGoal / PLANNED_WEEKS
    return wklyGoal > 0 && week[f.key] != null && week[f.key] >= wklyGoal
  }).length
  const totalGoals = fields.filter(f => f.annualGoal / PLANNED_WEEKS > 0).length
  const overallPct = Math.round((metGoals / totalGoals) * 100)

  const addedDate = week.created_at
    ? new Date(week.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="week-card">
      <div className="week-card__header" onClick={() => setExpanded(e => !e)}>
        <div className="week-card__title-row">
          <h3 className="week-card__id">{week.week_id ?? 'Untitled Week'}</h3>
          <span className="week-card__summary">{metGoals}/{totalGoals} goals met</span>
          {addedDate && <span className="week-card__date">Logged {addedDate}</span>}
        </div>
        <div className="week-card__bar">
          <div className="week-card__bar-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="week-card__actions" onClick={e => e.stopPropagation()}>
          <button className="btn btn--ghost btn--sm" onClick={() => onEdit(week)}>Edit</button>
          <button className="week-card__chevron" onClick={() => setExpanded(e => !e)}>
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="week-card__body">
          {GROUPS.map(group => (
            <div key={group.key} className="week-card__group">
              <div className="week-card__group-label" style={{ color: group.color }}>{group.label}</div>
              <div className="week-card__metrics">
                {fields.filter(f => f.group === group.key).map(f => {
                  const val = week[f.key]
                  const wklyGoal = f.annualGoal / PLANNED_WEEKS
                  const p = wklyGoal > 0 && val != null ? Math.min(100, Math.round((val / wklyGoal) * 100)) : null
                  const hit = p != null && p >= 100
                  return (
                    <div key={f.key} className={`metric-cell ${hit ? 'metric-cell--hit' : ''}`}>
                      <p className="metric-cell__label">{f.label}</p>
                      <p className="metric-cell__value">
                        {val == null || val === '' ? '—' : f.isCurrency ? `$${Number(val).toLocaleString()}` : val}
                      </p>
                      {p != null && (
                        <div className="metric-cell__bar">
                          <div className={`metric-cell__bar-fill ${hit ? 'metric-cell__bar-fill--hit' : ''}`} style={{ width: `${p}%` }} />
                        </div>
                      )}
                      {wklyGoal > 0 && (
                        <p className="metric-cell__goal">
                          /{f.isCurrency ? `$${Math.round(wklyGoal).toLocaleString()}` : Math.round(wklyGoal)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Goals Page ───────────────────────────────────────────────────────────────
export default function Goals() {
  const { data: rawStats, loading, error, refetch } = useWeeklyStats()
  const { data: savedGoals, refetch: refetchGoals } = useGoalTargets()
  const stats = rawStats ?? []
  const weekNum = getWeekOfYear()

  // Merge saved goals with FIELDS defaults
  const effectiveFields = useMemo(() => {
    const overrides = savedGoals?.value ?? {}
    return FIELDS.map(f => ({
      ...f,
      annualGoal: overrides[f.key] != null ? Number(overrides[f.key]) : f.annualGoal,
    }))
  }, [savedGoals])

  const [showModal, setShowModal]       = useState(false)
  const [editRecord, setEditRecord]     = useState(null)
  const [goalsOpen, setGoalsOpen]       = useState(false)
  const [goalsDraft, setGoalsDraft]     = useState({})
  const [savingGoals, setSavingGoals]   = useState(false)
  const [goalsGroup, setGoalsGroup]     = useState('activity')

  const openGoalsPanel = () => {
    const draft = {}
    effectiveFields.forEach(f => { draft[f.key] = f.annualGoal })
    setGoalsDraft(draft)
    setGoalsOpen(true)
  }

  const saveGoals = async () => {
    setSavingGoals(true)
    try {
      const value = {}
      effectiveFields.forEach(f => {
        const v = goalsDraft[f.key]
        value[f.key] = v !== '' && v != null ? Number(v) : f.annualGoal
      })
      await updateGoalTargets(value)
      await refetchGoals()
      setGoalsOpen(false)
    } catch { /* silent */ } finally { setSavingGoals(false) }
  }

  const handleSave = async (fields, id) => {
    if (id) await updateWeeklyStats(id, fields)
    else    await createWeeklyStats(fields)
    await refetch()
  }

  return (
    <div className="goals-page">
      <SectionHeader
        title="Goals & Performance"
        subtitle="2026 annual scoreboard — weekly productivity tracking"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="md" onClick={openGoalsPanel}>Edit Annual Goals</Button>
            <Button variant="primary" size="md" onClick={() => { setEditRecord(null); setShowModal(true) }}>
              + Log This Week
            </Button>
          </div>
        }
      />

      {error && (
        <div className="goals-error">
          <strong>Database error:</strong> {error}
        </div>
      )}

      <HeroKPIs stats={stats} weekNum={weekNum} fields={effectiveFields} />

      <ScoreboardCard stats={stats} weekNum={weekNum} fields={effectiveFields} />

      <RatiosCard stats={stats} fields={effectiveFields} />

      {/* Weekly Log */}
      <div className="goals-weeks-section">
        <h3 className="goals-weeks-section__title">Weekly Log ({stats.length} week{stats.length !== 1 ? 's' : ''})</h3>

        {loading ? (
          <div className="goals-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />
            ))}
          </div>
        ) : stats.length === 0 ? (
          <Card className="goals-empty">
            <div className="goals-empty__inner">
              <div className="goals-empty__icon">🎯</div>
              <h3>No weeks logged yet</h3>
              <p>Hit "Log This Week" to start tracking. Every field maps directly to your annual scoreboard above.</p>
              <Button variant="primary" size="md" onClick={() => { setEditRecord(null); setShowModal(true) }}>
                Log This Week
              </Button>
            </div>
          </Card>
        ) : (
          <div className="goals-weeks">
            {stats.map(week => (
              <WeekCard
                key={week.id}
                week={week}
                fields={effectiveFields}
                onEdit={w => { setEditRecord(w); setShowModal(true) }}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <LogWeekModal
          existing={editRecord}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          fields={effectiveFields}
        />
      )}

      {/* ── Edit Annual Goals Panel ── */}
      <SlidePanel open={goalsOpen} onClose={() => setGoalsOpen(false)} title="Edit Annual Goals" width={420}>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Adjust your annual targets. The scoreboard, projections, and weekly requirements all update automatically.
        </p>
        <TabBar
          tabs={GROUPS.map(g => ({ label: g.label, value: g.key }))}
          active={goalsGroup}
          onChange={setGoalsGroup}
        />
        <div className="panel-section" style={{ marginTop: 16 }}>
          {effectiveFields.filter(f => f.group === goalsGroup).map(f => (
            <Input
              key={f.key}
              label={f.label}
              type="number"
              min="0"
              value={goalsDraft[f.key] ?? ''}
              onChange={e => setGoalsDraft(p => ({ ...p, [f.key]: e.target.value }))}
            />
          ))}
        </div>
        <div className="panel-footer">
          <Button variant="ghost" size="sm" onClick={() => setGoalsOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={saveGoals} disabled={savingGoals}>
            {savingGoals ? 'Saving…' : 'Save Goals'}
          </Button>
        </div>
      </SlidePanel>
    </div>
  )
}
