import { useState, useMemo } from 'react'
import './KpiHeatmap.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtN(val, isCurrency) {
  const n = Number(val)
  if (val == null || val === '' || isNaN(n)) return '—'
  if (isCurrency) return `$${Math.round(n).toLocaleString()}`
  return n.toLocaleString()
}

// level 0 = no data, 1..5 = cream → darkest brown (crushed it)
function levelFor(val, weeklyGoal) {
  if (!val || val <= 0) return 0
  if (!weeklyGoal || weeklyGoal <= 0) return val > 0 ? 3 : 0
  const p = (val / weeklyGoal) * 100
  if (p < 25)  return 1
  if (p < 50)  return 2
  if (p < 75)  return 3
  if (p < 100) return 4
  return 5
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function KpiHeatmap({ stats, fields, weekNum, weeks, groups, plannedWeeks }) {
  const [activeGroup, setActiveGroup] = useState(groups[0]?.key ?? 'activity')
  const [viewMode, setViewMode] = useState('weekly') // 'weekly' | 'monthly'
  const [hovered, setHovered] = useState(null) // { field, label, val, goal, p, x, y }

  const now = new Date()
  const currentMonth = now.getMonth()

  const byWeek = useMemo(
    () => Object.fromEntries(stats.map(s => [s.week_id, s])),
    [stats]
  )

  // Aggregate weekly stats into monthly buckets (assign each week to the
  // month of its starting day — Monday).
  const byMonth = useMemo(() => {
    const result = {}
    fields.forEach(f => {
      const monthly = Array(12).fill(0)
      weeks.forEach(w => {
        const record = byWeek[w.value]
        if (!record) return
        const val = Number(record[f.key] || 0)
        if (!val) return
        const monthIdx = w.days[0].getMonth()
        monthly[monthIdx] += val
      })
      result[f.key] = monthly
    })
    return result
  }, [byWeek, fields, weeks])

  const totals = useMemo(
    () => fields.reduce((acc, f) => {
      acc[f.key] = stats.reduce((sum, w) => sum + (Number(w[f.key]) || 0), 0)
      return acc
    }, {}),
    [stats, fields]
  )

  const rows = fields.filter(f => f.group === activeGroup)

  const handleEnter = (e, field, label, sublabel, val, goal) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHovered({
      field, label, sublabel, val, goal,
      p: goal > 0 ? Math.round((val / goal) * 100) : null,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  return (
    <div className={`kpi-heatmap kpi-heatmap--${viewMode}`}>
      <div className="kpi-heatmap__header">
        <div>
          <h3 className="kpi-heatmap__title">Year at a Glance</h3>
          <p className="kpi-heatmap__sub">
            {viewMode === 'weekly'
              ? 'Each square is one week · 4 rows = 4 quarters · darker = closer to your weekly goal.'
              : 'Each square is one month · 4 rows = 4 quarters · darker = closer to your monthly goal.'}
          </p>
        </div>
        <div className="kpi-heatmap__header-right">
          <div className="kpi-heatmap__view-toggle" role="tablist" aria-label="Heatmap view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'weekly'}
              className={`kpi-heatmap__view-btn ${viewMode === 'weekly' ? 'kpi-heatmap__view-btn--active' : ''}`}
              onClick={() => setViewMode('weekly')}
            >
              Weekly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'monthly'}
              className={`kpi-heatmap__view-btn ${viewMode === 'monthly' ? 'kpi-heatmap__view-btn--active' : ''}`}
              onClick={() => setViewMode('monthly')}
            >
              Monthly
            </button>
          </div>
          <div className="kpi-heatmap__legend">
            <span className="kpi-heatmap__legend-label">Less</span>
            {[0, 1, 2, 3, 4, 5].map(l => (
              <div key={l} className={`heat-cell heat-cell--static heat-cell--l${l}`} />
            ))}
            <span className="kpi-heatmap__legend-label">Crushed it</span>
          </div>
        </div>
      </div>

      <div className="kpi-heatmap__tabs">
        {groups.map(g => (
          <button
            key={g.key}
            className={`kpi-heatmap__tab ${activeGroup === g.key ? 'kpi-heatmap__tab--active' : ''}`}
            onClick={() => setActiveGroup(g.key)}
          >
            <span className="kpi-heatmap__tab-dot" style={{ background: g.color }} />
            {g.label}
          </button>
        ))}
      </div>

      <div className="kpi-heatmap__rows">
        {rows.map(f => {
          const weeklyGoal  = plannedWeeks > 0 ? f.annualGoal / plannedWeeks : 0
          const monthlyGoal = f.annualGoal > 0 ? f.annualGoal / 12 : 0
          const total = totals[f.key] || 0
          const ytdGoal = Math.round(f.annualGoal * weekNum / 52)
          const pct = f.annualGoal > 0 ? Math.round((total / f.annualGoal) * 100) : 0
          const periodGoal = viewMode === 'weekly' ? weeklyGoal : monthlyGoal
          const periodLabel = viewMode === 'weekly' ? 'Weekly' : 'Monthly'

          return (
            <div key={f.key} className="heat-row">
              <div className="heat-row__label">
                <div className="heat-row__label-top">
                  <span className="heat-row__name">{f.label}</span>
                  <span className={`heat-row__pct ${total >= ytdGoal ? 'heat-row__pct--ahead' : 'heat-row__pct--behind'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="heat-row__label-bot">
                  <span className="heat-row__total">{fmtN(total, f.isCurrency)}</span>
                  <span className="heat-row__goal">of {fmtN(f.annualGoal, f.isCurrency)}</span>
                </div>
                <div className="heat-row__weekly-goal">
                  {periodLabel} target: {fmtN(Math.round(periodGoal), f.isCurrency)}
                </div>
              </div>

              <div className="heat-row__grid-wrap">
                {viewMode === 'weekly' && (
                  <div className="heat-row__q-labels" aria-hidden>
                    <span>Q1</span>
                    <span>Q2</span>
                    <span>Q3</span>
                    <span>Q4</span>
                  </div>
                )}
                {viewMode === 'weekly' ? (
                  <div className="heat-row__cells heat-row__cells--weekly">
                    {weeks.map(w => {
                      const record = byWeek[w.value]
                      const val = Number(record?.[f.key] || 0)
                      const level = levelFor(val, weeklyGoal)
                      const isFuture = w.weekNum > weekNum
                      const isCurrent = w.weekNum === weekNum
                      const sublabel = `Week ${w.weekNum} · ${w.days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${w.days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      return (
                        <div
                          key={w.value}
                          className={`heat-cell heat-cell--l${level} ${isFuture ? 'heat-cell--future' : ''} ${isCurrent ? 'heat-cell--current' : ''}`}
                          onMouseEnter={e => handleEnter(e, f, f.label, sublabel, val, weeklyGoal)}
                          onMouseLeave={() => setHovered(null)}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="heat-row__cells heat-row__cells--monthly">
                    {Array.from({ length: 12 }).map((_, mi) => {
                      const val = byMonth[f.key]?.[mi] || 0
                      const level = levelFor(val, monthlyGoal)
                      const isFuture = mi > currentMonth
                      const isCurrent = mi === currentMonth
                      const monthDate = new Date(now.getFullYear(), mi, 1)
                      const monthShort = monthDate.toLocaleDateString('en-US', { month: 'short' })
                      const sublabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      return (
                        <div
                          key={mi}
                          className={`heat-cell heat-cell--month heat-cell--l${level} ${isFuture ? 'heat-cell--future' : ''} ${isCurrent ? 'heat-cell--current' : ''}`}
                          onMouseEnter={e => handleEnter(e, f, f.label, sublabel, val, monthlyGoal)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          <span className="heat-cell__month-label">{monthShort}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hovered && (
        <div
          className="kpi-heatmap__tooltip"
          style={{ left: hovered.x, top: hovered.y }}
          role="tooltip"
        >
          <div className="kpi-heatmap__tooltip-title">{hovered.label}</div>
          <div className="kpi-heatmap__tooltip-week">{hovered.sublabel}</div>
          <div className="kpi-heatmap__tooltip-row">
            <span>Logged</span>
            <strong>{fmtN(hovered.val, hovered.field.isCurrency)}</strong>
          </div>
          <div className="kpi-heatmap__tooltip-row">
            <span>{viewMode === 'weekly' ? 'Weekly' : 'Monthly'} goal</span>
            <strong>{fmtN(Math.round(hovered.goal), hovered.field.isCurrency)}</strong>
          </div>
          {hovered.p != null && (
            <div className="kpi-heatmap__tooltip-bar">
              <div
                className={`kpi-heatmap__tooltip-bar-fill ${hovered.p >= 100 ? 'kpi-heatmap__tooltip-bar-fill--hit' : ''}`}
                style={{ width: `${Math.min(100, hovered.p)}%` }}
              />
              <span className="kpi-heatmap__tooltip-pct">
                {hovered.val === 0 ? 'No data' : `${hovered.p}% of goal`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
