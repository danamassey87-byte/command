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
  const [hovered, setHovered] = useState(null) // { field, week, val, weeklyGoal, p, x, y }

  const byWeek = useMemo(
    () => Object.fromEntries(stats.map(s => [s.week_id, s])),
    [stats]
  )

  const totals = useMemo(
    () => fields.reduce((acc, f) => {
      acc[f.key] = stats.reduce((sum, w) => sum + (Number(w[f.key]) || 0), 0)
      return acc
    }, {}),
    [stats, fields]
  )

  const rows = fields.filter(f => f.group === activeGroup)

  const handleEnter = (e, field, week, val, weeklyGoal) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHovered({
      field, week, val, weeklyGoal,
      p: weeklyGoal > 0 ? Math.round((val / weeklyGoal) * 100) : null,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  return (
    <div className="kpi-heatmap">
      <div className="kpi-heatmap__header">
        <div>
          <h3 className="kpi-heatmap__title">Year at a Glance</h3>
          <p className="kpi-heatmap__sub">
            Each square is one week &middot; 4 rows = 4 quarters &middot; darker = closer to your weekly goal.
          </p>
        </div>
        <div className="kpi-heatmap__legend">
          <span className="kpi-heatmap__legend-label">Less</span>
          {[0, 1, 2, 3, 4, 5].map(l => (
            <div key={l} className={`heat-cell heat-cell--static heat-cell--l${l}`} />
          ))}
          <span className="kpi-heatmap__legend-label">Crushed it</span>
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
          const weeklyGoal = plannedWeeks > 0 ? f.annualGoal / plannedWeeks : 0
          const total = totals[f.key] || 0
          const ytdGoal = Math.round(f.annualGoal * weekNum / 52)
          const pct = f.annualGoal > 0 ? Math.round((total / f.annualGoal) * 100) : 0

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
                  Weekly target: {fmtN(Math.round(weeklyGoal), f.isCurrency)}
                </div>
              </div>

              <div className="heat-row__grid-wrap">
                <div className="heat-row__q-labels" aria-hidden>
                  <span>Q1</span>
                  <span>Q2</span>
                  <span>Q3</span>
                  <span>Q4</span>
                </div>
                <div className="heat-row__cells">
                  {weeks.map(w => {
                    const record = byWeek[w.value]
                    const val = Number(record?.[f.key] || 0)
                    const level = levelFor(val, weeklyGoal)
                    const isFuture = w.weekNum > weekNum
                    const isCurrent = w.weekNum === weekNum
                    return (
                      <div
                        key={w.value}
                        className={`heat-cell heat-cell--l${level} ${isFuture ? 'heat-cell--future' : ''} ${isCurrent ? 'heat-cell--current' : ''}`}
                        onMouseEnter={e => handleEnter(e, f, w, val, weeklyGoal)}
                        onMouseLeave={() => setHovered(null)}
                      />
                    )
                  })}
                </div>
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
          <div className="kpi-heatmap__tooltip-title">{hovered.field.label}</div>
          <div className="kpi-heatmap__tooltip-week">
            Week {hovered.week.weekNum} &middot;{' '}
            {hovered.week.days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {hovered.week.days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="kpi-heatmap__tooltip-row">
            <span>Logged</span>
            <strong>{fmtN(hovered.val, hovered.field.isCurrency)}</strong>
          </div>
          <div className="kpi-heatmap__tooltip-row">
            <span>Weekly goal</span>
            <strong>{fmtN(Math.round(hovered.weeklyGoal), hovered.field.isCurrency)}</strong>
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
