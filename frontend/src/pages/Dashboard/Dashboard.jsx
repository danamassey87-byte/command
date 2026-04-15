import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, SlidePanel } from '../../components/ui/index.jsx'
import { useDashboardData, useAllDailyTasks, useDailyStreaks, useProperties } from '../../lib/hooks.js'
import { useNotesContext } from '../../lib/NotesContext'
import * as DB from '../../lib/supabase.js'
import StaleRecordsWidget from '../../components/StaleRecordsWidget'
import ClosedDealsMap from '../../components/ClosedDealsMap'
import PropertyMap from '../../components/PropertyMap'
import DayBriefingCard from '../../components/DayBriefingCard'
import * as campaignsApi from '../../lib/campaigns'
import './Dashboard.css'

const PLANNED_WEEKS = 43

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
function fmtTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const TABS = [
  { id: 'today',       label: 'Today',       emoji: '\u2600\uFE0F' },
  { id: 'pipeline',    label: 'Pipeline',    emoji: '\u{1F3E0}' },
  { id: 'performance', label: 'Performance', emoji: '\u{1F4CA}' },
  { id: 'activity',    label: 'Activity',    emoji: '\u26A1' },
]

// ─── Default widget keys per tab ──────────────────────────────────────────────
const DEFAULT_WIDGET_ORDER = {
  today:       ['briefing', 'tasks', 'goals', 'week', 'campaigns', 'stale'],
  pipeline:    ['pipeline', 'funnel', 'clients', 'oh', 'leads', 'closedMap', 'propertyMap'],
  performance: ['production', 'roi', 'goals', 'week'],
  activity:    ['activityOverview', 'feed', 'investors', 'showings'],
}

function getStoredOrder(tabId) {
  try {
    const raw = localStorage.getItem(`dashboard_widget_order_${tabId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      const defaults = DEFAULT_WIDGET_ORDER[tabId]
      // Validate: must contain same keys (handles added/removed widgets)
      if (Array.isArray(parsed) && parsed.length === defaults.length && defaults.every(k => parsed.includes(k))) {
        return parsed
      }
    }
  } catch {}
  return DEFAULT_WIDGET_ORDER[tabId]
}

function saveOrder(tabId, order) {
  localStorage.setItem(`dashboard_widget_order_${tabId}`, JSON.stringify(order))
}

// ─── Drag handle icon (6-dot grip) ────────────────────────────────────────────
function DragHandle() {
  return (
    <div className="drag-handle" title="Drag to reorder">
      <svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor">
        <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
        <circle cx="3" cy="6" r="1.2"/><circle cx="7" cy="6" r="1.2"/>
        <circle cx="3" cy="10" r="1.2"/><circle cx="7" cy="10" r="1.2"/>
        <circle cx="3" cy="14" r="1.2"/><circle cx="7" cy="14" r="1.2"/>
      </svg>
    </div>
  )
}

// ─── Draggable widget wrapper ─────────────────────────────────────────────────
function DraggableWidget({ widgetKey, dragState, onDragStart, onDragOver, onDrop, onDragEnd, children }) {
  const isDragging = dragState.dragging === widgetKey
  const isOver = dragState.over === widgetKey

  return (
    <div
      className={`drag-wrapper ${isDragging ? 'drag-wrapper--dragging' : ''} ${isOver ? 'drag-wrapper--over' : ''}`}
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', widgetKey)
        // Slight delay so the browser captures the element before we set dragging style
        requestAnimationFrame(() => onDragStart(widgetKey))
      }}
      onDragOver={e => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver(widgetKey)
      }}
      onDrop={e => {
        e.preventDefault()
        onDrop(widgetKey)
      }}
      onDragEnd={onDragEnd}
    >
      <DragHandle />
      {children}
    </div>
  )
}

// ─── useDragReorder hook ──────────────────────────────────────────────────────
function useDragReorder(tabId) {
  const [order, setOrder] = useState(() => getStoredOrder(tabId))
  const [dragState, setDragState] = useState({ dragging: null, over: null })
  const dragRef = useRef({ dragging: null })

  // Sync order when tab changes
  useEffect(() => {
    setOrder(getStoredOrder(tabId))
    setDragState({ dragging: null, over: null })
  }, [tabId])

  const onDragStart = useCallback((key) => {
    dragRef.current.dragging = key
    setDragState(s => ({ ...s, dragging: key }))
  }, [])

  const onDragOver = useCallback((key) => {
    setDragState(s => s.over === key ? s : ({ ...s, over: key }))
  }, [])

  const onDrop = useCallback((targetKey) => {
    const sourceKey = dragRef.current.dragging
    if (!sourceKey || sourceKey === targetKey) {
      setDragState({ dragging: null, over: null })
      return
    }
    setOrder(prev => {
      const next = [...prev]
      const fromIdx = next.indexOf(sourceKey)
      const toIdx = next.indexOf(targetKey)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, sourceKey)
      saveOrder(tabId, next)
      return next
    })
    setDragState({ dragging: null, over: null })
  }, [tabId])

  const onDragEnd = useCallback(() => {
    dragRef.current.dragging = null
    setDragState({ dragging: null, over: null })
  }, [])

  const resetOrder = useCallback(() => {
    const defaults = DEFAULT_WIDGET_ORDER[tabId]
    setOrder(defaults)
    saveOrder(tabId, defaults)
  }, [tabId])

  const isCustom = useMemo(() => {
    const defaults = DEFAULT_WIDGET_ORDER[tabId]
    return JSON.stringify(order) !== JSON.stringify(defaults)
  }, [order, tabId])

  return { order, dragState, onDragStart, onDragOver, onDrop, onDragEnd, resetOrder, isCustom }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART COMPONENTS (pure SVG — no dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

function BarChart({ items, height = 120 }) {
  // items = [{ label, value, goal, color }]
  const max = Math.max(...items.map(it => Math.max(it.value, it.goal || 0)), 1)

  return (
    <div className="bar-chart" style={{ height }}>
      {items.map((it, i) => {
        const pct = Math.min(100, Math.round((it.value / max) * 100))
        const goalPct = it.goal ? Math.min(100, Math.round((it.goal / max) * 100)) : 0
        const hit = it.value >= (it.goal || 0)
        return (
          <div key={i} className="bar-chart__col" style={{ animationDelay: `${i * 0.06}s` }}>
            <span className="bar-chart__val">{it.value}</span>
            <div className="bar-chart__track">
              <div className={`bar-chart__fill ${hit ? 'bar-chart__fill--hit' : ''}`}
                style={{ height: `${pct}%`, background: it.color || 'var(--color-success)' }} />
              {goalPct > 0 && <div className="bar-chart__goal-line" style={{ bottom: `${goalPct}%` }} />}
            </div>
            <span className="bar-chart__label">{it.label}</span>
            {hit && <span className="bar-chart__check">{'\u2705'}</span>}
          </div>
        )
      })}
    </div>
  )
}

function AreaSparkline({ data, color = 'var(--color-success)', height = 48, width = 140 }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - 4 - ((v - min) / range) * (height - 8)
    return { x, y }
  })
  const line = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="chart-spark">
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${color.replace(/[^a-z]/gi,'')})`} className="chart-spark__area" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chart-spark__line" />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3.5" fill={color} className="chart-spark__dot" />
    </svg>
  )
}

function DonutChart({ segments, size = 90, thickness = 10, center }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="chart-donut">
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * circumference
        const currentOffset = offset
        offset += dash
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
            className="chart-donut__seg" style={{ animationDelay: `${i * 0.15}s` }} />
        )
      })}
      {center && (
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          fontSize="14" fontWeight="700" fill="var(--brown-dark)" fontFamily="var(--font-display)">{center}</text>
      )}
    </svg>
  )
}

function ProgressRing({ value, max, color = 'var(--color-success)', size = 52, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="progress-ring">
      <svg viewBox="0 0 44 44" width={size} height={size}>
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-border-light)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 22 22)"
          className="progress-ring__fill" />
        <text x="22" y="23" textAnchor="middle" dominantBaseline="central"
          fontSize="10" fontWeight="700" fill="var(--brown-dark)" fontFamily="var(--font-display)">{pct}%</text>
      </svg>
      {label && <span className="progress-ring__label">{label}</span>}
    </div>
  )
}

function HorizBar({ label, value, max, color = 'var(--brown-mid)' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="hbar">
      <div className="hbar__head">
        <span className="hbar__label">{label}</span>
        <span className="hbar__val">{value}</span>
      </div>
      <div className="hbar__track">
        <div className="hbar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIDGET COMPONENTS (compact, chart-first)
// ═══════════════════════════════════════════════════════════════════════════════

function Widget({ children, className = '', color = '', span = '', onClick, onExpand }) {
  return (
    <div className={`widget ${color ? `widget--${color}` : ''} ${span ? `widget--${span}` : ''} ${className}`}
      onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {children}
      {onExpand && (
        <button className="widget__expand" onClick={e => { e.stopPropagation(); onExpand() }} title="Drill down">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}
    </div>
  )
}

function WidgetHeader({ title, emoji, sub, action }) {
  return (
    <div className="widget__header">
      <div className="widget__title-row">
        {emoji && <span className="widget__emoji">{emoji}</span>}
        <h3 className="widget__title">{title}</h3>
      </div>
      {sub && <span className="widget__sub">{sub}</span>}
      {action}
    </div>
  )
}

// ─── Universal Widget Drill Panel ────────────────────────────────────────────
function WidgetDrill({ open, onClose, config }) {
  const navigate = useNavigate()
  if (!config) return <SlidePanel open={false} onClose={onClose} title="" />
  return (
    <SlidePanel open={open} onClose={onClose} title={config.title} subtitle={config.subtitle}>
      <div className="drill-list">
        {(config.items || []).map((item, i) => (
          <div key={i} className={`drill-item ${item.link ? '' : 'drill-item--static'}`}
            onClick={item.link ? () => { onClose(); navigate(item.link) } : undefined}>
            {item.emoji && <span className="drill-item__emoji">{item.emoji}</span>}
            <div className="drill-item__body">
              <span className="drill-item__label">{item.label}</span>
              {item.sub && <span className="drill-item__sub">{item.sub}</span>}
            </div>
            {item.value !== undefined && <span className="drill-item__value">{item.value}</span>}
            {item.badge && <Badge variant={item.badge.variant || 'info'} size="sm">{item.badge.text}</Badge>}
            {item.link && <svg viewBox="0 0 24 24" fill="none" stroke="var(--brown-mid)" strokeWidth="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>}
          </div>
        ))}
        {(config.items || []).length === 0 && <p className="widget__empty" style={{ padding: 16 }}>No data yet</p>}
      </div>
    </SlidePanel>
  )
}

function BigStat({ value, label, sub, color }) {
  return (
    <div className="big-stat">
      <p className="big-stat__value" style={color ? { color } : undefined}>{value}</p>
      <p className="big-stat__label">{label}</p>
      {sub && <p className="big-stat__sub">{sub}</p>}
    </div>
  )
}

// ─── Hero KPI Cards (compact, with sparklines) ──────────────────────────────
function HeroKPIs({ kpis, loading, pipelineValue, listingValue, onDrill }) {
  const portfolioValue = (pipelineValue || 0) + (listingValue || 0)
  // Mock sparkline data (in production these would come from weekly snapshots)
  const sparkData = {
    portfolio: [40, 55, 48, 62, 58, 70, portfolioValue ? 80 : 0],
    listings: [2, 3, 2, 4, 3, 5, kpis?.activeListings || 0],
    contracts: [1, 2, 1, 3, 2, 4, kpis?.openTransactions || 0],
    income: [10, 25, 20, 35, 30, 45, kpis?.ytdNetProfit ? 60 : 0],
  }

  const cards = [
    { key: 'portfolio', emoji: '\u{1F4BC}', label: 'Portfolio', value: loading ? '...' : fmtDollar(portfolioValue), color: 'warm', sparkColor: 'var(--brown-mid)', spark: sparkData.portfolio },
    { key: 'listings', emoji: '\u{1F3E0}', label: 'Listings', value: loading ? '...' : String(kpis?.activeListings ?? 0), color: 'sage', sparkColor: 'var(--color-success)', spark: sparkData.listings },
    { key: 'contracts', emoji: '\u{1F4DD}', label: 'Under Contract', value: loading ? '...' : String(kpis?.openTransactions ?? 0), color: 'warm', sparkColor: 'var(--color-info)', spark: sparkData.contracts },
    { key: 'income', emoji: '\u{1F4B0}', label: 'Net Profit', value: loading ? '...' : fmtDollar(kpis?.ytdNetProfit), color: 'lavender', sparkColor: '#8b7ec8', spark: sparkData.income },
  ]

  return (
    <div className="hero-row">
      {cards.map((c, i) => (
        <div key={c.key} className={`hero-card hero-card--${c.color}`} style={{ animationDelay: `${i * 0.08}s` }} onClick={() => onDrill(c.key)}>
          <div className="hero-card__info">
            <span className="hero-card__emoji">{c.emoji}</span>
            <span className="hero-card__label">{c.label}</span>
            <span className="hero-card__value">{c.value}</span>
          </div>
          <div className="hero-card__chart">
            <AreaSparkline data={c.spark} color={c.sparkColor} height={40} width={100} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Weekly Activity Bar Chart ──────────────────────────────────────────────
function WeeklyActivityWidget({ latestWeek, onExpand }) {
  const metrics = [
    { key: 'productivity_days', label: 'PRO', goal: Math.round(215 / PLANNED_WEEKS), color: 'var(--color-success)' },
    { key: 'hours_prospected',  label: 'Prospect', goal: Math.round(430 / PLANNED_WEEKS), color: 'var(--brown-mid)' },
    { key: 'live_contacts',     label: 'Contacts', goal: Math.round(5000 / PLANNED_WEEKS), color: 'var(--color-info)' },
    { key: 'new_leads',         label: 'Leads', goal: Math.round(600 / PLANNED_WEEKS), color: 'var(--color-warning)' },
    { key: 'listing_appts_set', label: 'Appts', goal: Math.round(100 / PLANNED_WEEKS), color: '#8b7ec8' },
    { key: 'sales_closed',      label: 'Sales', goal: Math.round(20 / PLANNED_WEEKS), color: 'var(--color-success)' },
  ]

  const items = metrics.map(m => ({
    label: m.label,
    value: Number(latestWeek?.[m.key]) || 0,
    goal: m.goal,
    color: m.color,
  }))

  return (
    <Widget color="sage" span="wide" onExpand={onExpand}>
      <WidgetHeader title="This Week" emoji={'\u{1F4CA}'} sub={latestWeek?.week_id || 'No data yet'} />
      {latestWeek ? (
        <BarChart items={items} height={130} />
      ) : (
        <p className="widget__empty">Log your first week in Goals</p>
      )}
    </Widget>
  )
}

// ─── Funnel Donut ────────────────────────────────────────────────────────────
function FunnelDonutWidget({ funnel, onExpand }) {
  const segments = funnel.map((f, i) => ({
    value: f.count,
    color: ['var(--brown-dark)', 'var(--brown-mid)', 'var(--color-info)', 'var(--color-success)'][i] || 'var(--color-muted)',
  }))
  const total = funnel.reduce((s, f) => s + f.count, 0)

  return (
    <Widget color="blue" onExpand={onExpand}>
      <WidgetHeader title="Funnel" emoji={'\u{1F3AF}'} />
      <div className="funnel-widget">
        <DonutChart segments={segments} center={String(total)} size={90} thickness={10} />
        <div className="funnel-widget__legend">
          {funnel.map((f, i) => (
            <div key={f.label} className="funnel-legend-row">
              <span className="funnel-legend-dot" style={{ background: segments[i].color }} />
              <span className="funnel-legend-label">{f.label}</span>
              <span className="funnel-legend-count">{f.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Widget>
  )
}

// ─── Pipeline Mini ──────────────────────────────────────────────────────────
function PipelineMiniWidget({ transactions, listings, pipelineValue, listingValue, avgDOM, onExpand }) {
  const items = [
    ...transactions.slice(0, 3).map(t => ({ name: t.contact?.name ?? '\u2014', price: fmtDollar(t.property?.price), status: t.status ?? 'Active', type: 'tx' })),
    ...listings.slice(0, 2).map(l => ({ name: l.contact?.name ?? '\u2014', price: fmtDollar(l.property?.price), status: 'Listing', type: 'list' })),
  ]

  return (
    <Widget color="warm" span="wide" onExpand={onExpand}>
      <WidgetHeader title="Pipeline" emoji={'\u{1F3D7}\uFE0F'} />
      <div className="pipeline-mini-stats">
        <BigStat value={fmtDollar(pipelineValue)} label="Under Contract" />
        <BigStat value={fmtDollar(listingValue)} label="Listing Value" />
        <BigStat value={`${avgDOM || 0}d`} label="Avg DOM" />
      </div>
      <div className="pipeline-mini-list">
        {items.map((it, i) => (
          <div key={i} className="pipeline-mini-row">
            <span className="pipeline-mini-row__name">{it.name}</span>
            <span className="pipeline-mini-row__price">{it.price}</span>
            <Badge variant={it.type === 'list' ? 'warning' : 'info'} size="sm">{it.status}</Badge>
          </div>
        ))}
        {items.length === 0 && <p className="widget__empty">No deals yet</p>}
      </div>
    </Widget>
  )
}

// ─── Tasks Compact ──────────────────────────────────────────────────────────
function TasksWidget() {
  const navigate = useNavigate()
  const { data: allTasks, refetch } = useAllDailyTasks()
  const { data: streaks } = useDailyStreaks()
  const today = new Date().toISOString().slice(0, 10)
  const tasks = allTasks ?? []
  const todayTasks = tasks.filter(t => t.is_recurring ? t.recur_day === new Date().getDay() : t.due_date === today)
  const pending = todayTasks.filter(t => t.status !== 'completed')
  const done = todayTasks.filter(t => t.status === 'completed')
  const pct = todayTasks.length > 0 ? Math.round((done.length / todayTasks.length) * 100) : 0
  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completed' && !t.is_recurring)

  const streak = useMemo(() => {
    if (!streaks?.length) return 0
    let count = 0
    const sorted = [...streaks].sort((a, b) => b.date.localeCompare(a.date))
    for (const s of sorted) { if (s.all_completed) count++; else break }
    return count
  }, [streaks])

  const toggleTask = async (task) => {
    try {
      if (task.status === 'completed') await DB.uncompleteDailyTask(task.id)
      else await DB.completeDailyTask(task.id)
      refetch()
    } catch (e) { console.error(e) }
  }

  const catColors = {
    email: 'var(--color-info)', sms: 'var(--brown-warm)', transaction: 'var(--color-success)',
    prospecting: 'var(--color-warning)', admin: '#8b8b8b', marketing: '#8b7ec8',
    vendor: '#b07d62', showing: '#6a9e72', follow_up: '#c9962e',
    general: 'var(--brown-mid)', personal: 'var(--color-danger)',
  }

  return (
    <Widget color="sage">
      <WidgetHeader title="Tasks" emoji={'\u2705'}
        sub={streak > 0 ? `\u{1F525} ${streak}d streak` : undefined}
        action={overdue.length > 0 ? <span className="widget__badge widget__badge--danger">{overdue.length} overdue</span> : undefined} />
      <div className="tasks-compact__top">
        <ProgressRing value={done.length} max={todayTasks.length} color={pct >= 100 ? 'var(--color-success)' : 'var(--brown-mid)'} />
        <div className="tasks-compact__stats">
          <span className="tasks-compact__done">{done.length}/{todayTasks.length}</span>
          <span className="tasks-compact__label">completed</span>
        </div>
      </div>
      <div className="tasks-compact__list">
        {pending.slice(0, 4).map(t => (
          <div key={t.id} className="task-row">
            <button className="task-row__check" onClick={e => { e.stopPropagation(); toggleTask(t) }}>
              <span className="task-row__circle" style={{ borderColor: catColors[t.category] || 'var(--brown-mid)' }} />
            </button>
            <span className="task-row__title">{t.title}</span>
            {t.priority === 'urgent' && <span className="task-row__flag">!</span>}
          </div>
        ))}
        {done.slice(0, 1).map(t => (
          <div key={t.id} className="task-row task-row--done">
            <button className="task-row__check" onClick={e => { e.stopPropagation(); toggleTask(t) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <span className="task-row__title">{t.title}</span>
          </div>
        ))}
      </div>
      <button className="widget__cta" onClick={() => navigate('/tasks')}>All tasks &rarr;</button>
    </Widget>
  )
}

// ─── Goals Rings ─────────────────────────────────────────────────────────────
function GoalsWidget({ kpis, loading, onExpand }) {
  if (loading) return <Widget><div className="skeleton" style={{ height: 160 }} /></Widget>
  const now = new Date()
  const monthPct = Math.round(((now.getMonth() + 1) / 12) * 100)
  const goals = [
    { label: 'Sales', value: kpis.ytdSalesClosed || 0, target: 20, color: 'var(--color-success)' },
    { label: 'Listings', value: kpis.ytdListingsTaken || 0, target: 15, color: 'var(--brown-mid)' },
    { label: 'Buyers', value: kpis.ytdBuyerRepsSigned || 0, target: 15, color: 'var(--color-info)' },
    { label: 'OH', value: kpis.ytdOHEvents || 0, target: 48, color: 'var(--color-warning)' },
  ]

  return (
    <Widget color="lavender" onExpand={onExpand}>
      <WidgetHeader title="Annual Goals" emoji={'\u{1F3C6}'} sub={`${monthPct}% through year`} />
      <div className="goals-rings">
        {goals.map(g => (
          <ProgressRing key={g.label} value={g.value} max={g.target} color={g.color} label={`${g.label} ${g.value}/${g.target}`} size={56} />
        ))}
      </div>
    </Widget>
  )
}

// ─── Clients ─────────────────────────────────────────────────────────────────
function ClientsWidget({ contacts, onExpand }) {
  const buyers = contacts.filter(c => c.type === 'buyer')
  const sellers = contacts.filter(c => c.type === 'seller')
  const signed = buyers.filter(c => c.bba_signed)
  const bbaRate = buyers.length ? Math.round((signed.length / buyers.length) * 100) : 0
  const segments = [
    { value: signed.length, color: 'var(--color-success)' },
    { value: buyers.length - signed.length, color: 'var(--color-warning)' },
    { value: sellers.length, color: 'var(--color-info)' },
  ]

  return (
    <Widget color="sage" onExpand={onExpand}>
      <WidgetHeader title="Clients" emoji={'\u{1F465}'} />
      <div className="clients-widget">
        <DonutChart segments={segments} center={String(buyers.length + sellers.length)} size={80} thickness={9} />
        <div className="clients-widget__stats">
          <div className="mini-stat"><span className="mini-stat__val">{buyers.length}</span><span className="mini-stat__label">Buyers</span></div>
          <div className="mini-stat"><span className="mini-stat__val">{sellers.length}</span><span className="mini-stat__label">Sellers</span></div>
          <div className="mini-stat"><span className="mini-stat__val" style={{ color: 'var(--color-success)' }}>{signed.length}</span><span className="mini-stat__label">BBA</span></div>
          <div className="mini-stat"><span className="mini-stat__val">{bbaRate}%</span><span className="mini-stat__label">Rate</span></div>
        </div>
      </div>
    </Widget>
  )
}

// ─── Production Grid ─────────────────────────────────────────────────────────
function ProductionWidget({ kpis, loading, onExpand }) {
  if (loading) return <Widget span="wide"><div className="skeleton" style={{ height: 120 }} /></Widget>
  const items = [
    { emoji: '\u{1F4C5}', label: 'Appts Set', value: kpis.ytdListingApptsSet || 0 },
    { emoji: '\u{1F91D}', label: 'Appts Held', value: kpis.ytdListingApptsHeld || 0 },
    { emoji: '\u{1F3C6}', label: 'Won', value: kpis.ytdListingsTaken || 0 },
    { emoji: '\u{1F614}', label: 'Lost', value: kpis.ytdListingApptsLost || 0, neg: true },
    { emoji: '\u{1F4CA}', label: 'Win Rate', value: kpis.ytdListingWinRate > 0 ? `${kpis.ytdListingWinRate.toFixed(0)}%` : '\u2014', raw: true },
    { emoji: '\u2705', label: 'Sold', value: kpis.ytdListingsSold || 0 },
  ]

  return (
    <Widget color="blue" span="wide" onExpand={onExpand}>
      <WidgetHeader title="Production" emoji={'\u2699\uFE0F'} sub="auto-calculated" />
      <div className="prod-grid">
        {items.map(m => (
          <div key={m.label} className={`prod-cell ${m.neg ? 'prod-cell--neg' : ''}`}>
            <span className="prod-cell__emoji">{m.emoji}</span>
            <span className="prod-cell__val">{m.raw ? m.value : m.value}</span>
            <span className="prod-cell__label">{m.label}</span>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── ROI Mini ────────────────────────────────────────────────────────────────
function ROIWidget({ kpis, loading, onExpand }) {
  if (loading) return <Widget><div className="skeleton" style={{ height: 120 }} /></Widget>
  return (
    <Widget color="warm" onExpand={onExpand}>
      <WidgetHeader title="ROI" emoji={'\u{1F4B5}'} />
      <div className="roi-mini">
        <div className="roi-mini__item">
          <span className="roi-mini__emoji">{'\u{1F4B8}'}</span>
          <span className="roi-mini__val" style={{ color: 'var(--color-danger)' }}>{fmtDollar(kpis.totalCostTrackerSpend || 0)}</span>
          <span className="roi-mini__label">Spend</span>
        </div>
        <div className="roi-mini__item">
          <span className="roi-mini__emoji">{'\u{1F91D}'}</span>
          <span className="roi-mini__val" style={{ color: 'var(--color-success)' }}>{(kpis.ohConversionRate || 0).toFixed(1)}%</span>
          <span className="roi-mini__label">OH Conv.</span>
        </div>
        <div className="roi-mini__item">
          <span className="roi-mini__emoji">{'\u2709\uFE0F'}</span>
          <span className="roi-mini__val" style={{ color: '#b5703b' }}>{(kpis.letterConversionRate || 0).toFixed(1)}%</span>
          <span className="roi-mini__label">Letters</span>
        </div>
        <div className="roi-mini__item">
          <span className="roi-mini__emoji">{'\u{1F3E0}'}</span>
          <span className="roi-mini__val">{fmtDollar(kpis.avgCostPerListing || 0)}</span>
          <span className="roi-mini__label">$/Listing</span>
        </div>
      </div>
    </Widget>
  )
}

// ─── Open Houses Mini ────────────────────────────────────────────────────────
function OHWidget({ openHouses, openHousesThisMonth, onExpand }) {
  const now = new Date()
  const upcoming = openHouses.filter(oh => oh.date && new Date(oh.date) >= now).slice(0, 2)

  return (
    <Widget color="warm" onExpand={onExpand}>
      <WidgetHeader title="Open Houses" emoji={'\u{1F6AA}'} />
      <div className="oh-mini">
        <div className="oh-mini__stat">
          <span className="oh-mini__num">{openHousesThisMonth}</span>
          <span className="oh-mini__label">This month</span>
        </div>
        <div className="oh-mini__stat">
          <span className="oh-mini__num">{openHouses.length}</span>
          <span className="oh-mini__label">Total</span>
        </div>
      </div>
      {upcoming.length > 0 && (
        <div className="oh-mini__upcoming">
          {upcoming.map(oh => (
            <div key={oh.id} className="oh-mini__row">
              <span className="oh-mini__addr">{oh.property?.address ?? '\u2014'}</span>
              <span className="oh-mini__date">{fmtDate(oh.date)}</span>
            </div>
          ))}
        </div>
      )}
    </Widget>
  )
}

// ─── Leads Mini ──────────────────────────────────────────────────────────────
function LeadsWidget({ leads, expiringLeads, onExpand }) {
  return (
    <Widget color="rose" onExpand={onExpand}>
      <WidgetHeader title="Leads" emoji={'\u{1F4E8}'} />
      <div className="leads-mini">
        <BigStat value={leads.length} label="Total" />
        <BigStat value={expiringLeads} label="Expiring 30d" color={expiringLeads > 0 ? 'var(--color-danger)' : undefined} />
      </div>
    </Widget>
  )
}

// ─── Showing Interest ────────────────────────────────────────────────────────
function ShowingWidget({ showingSessions, interestLevels, onExpand }) {
  const total = interestLevels.high + interestLevels.medium + interestLevels.low
  return (
    <Widget color="lavender" onExpand={onExpand}>
      <WidgetHeader title="Showings" emoji={'\u{1F3E1}'} sub={`${showingSessions.length} sessions`} />
      {total > 0 ? (
        <div className="showing-mini">
          <HorizBar label="High" value={interestLevels.high} max={total} color="var(--color-success)" />
          <HorizBar label="Medium" value={interestLevels.medium} max={total} color="var(--brown-mid)" />
          <HorizBar label="Low" value={interestLevels.low} max={total} color="var(--color-text-muted)" />
        </div>
      ) : <p className="widget__empty">No showings yet</p>}
    </Widget>
  )
}

// ─── Activity Bars ───────────────────────────────────────────────────────────
function ActivityWidget({ activityByType, topClients, onExpand }) {
  const typeRows = Object.entries(activityByType).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCount = typeRows[0]?.[1] || 1

  return (
    <Widget color="blue" span="wide" onExpand={onExpand}>
      <WidgetHeader title="Activity" emoji={'\u{1F4CB}'} />
      {typeRows.length > 0 ? (
        <div className="activity-mini">
          {typeRows.map(([type, count]) => (
            <HorizBar key={type} label={type} value={count} max={maxCount} color="var(--color-info)" />
          ))}
        </div>
      ) : <p className="widget__empty">No activity yet</p>}
      {topClients.length > 0 && (
        <div className="activity-mini__clients">
          {topClients.slice(0, 3).map(c => (
            <span key={c.name} className="activity-mini__client">{c.name} <em>{c.count}</em></span>
          ))}
        </div>
      )}
    </Widget>
  )
}

// ─── Activity Feed Compact ───────────────────────────────────────────────────
function FeedWidget({ activity, onExpand }) {
  const variant = type => {
    const t = (type ?? '').toLowerCase()
    if (t.includes('creat') || t.includes('add')) return 'success'
    if (t.includes('updat') || t.includes('edit')) return 'info'
    if (t.includes('delet') || t.includes('remov')) return 'danger'
    return 'accent'
  }
  return (
    <Widget color="lavender" onExpand={onExpand}>
      <WidgetHeader title="Feed" emoji={'\u{1F4AC}'} />
      <div className="feed-mini">
        {activity.length === 0 ? <p className="widget__empty">No activity</p> : activity.slice(0, 6).map(item => (
          <div key={item.id} className="feed-row">
            <Badge variant={variant(item.type)} size="sm">{item.type ?? 'event'}</Badge>
            <span className="feed-row__name">{item.contact?.name ?? item.description}</span>
            <span className="feed-row__time">{fmtDate(item.created_at)}</span>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── Investor Mini ───────────────────────────────────────────────────────────
function InvestorWidget({ investors, investorFeedback, onExpand }) {
  const segments = [
    { value: investorFeedback.interested, color: 'var(--color-success)' },
    { value: investorFeedback.maybe, color: 'var(--color-warning)' },
    { value: investorFeedback.pass, color: 'var(--color-danger)' },
  ]
  const total = investorFeedback.interested + investorFeedback.maybe + investorFeedback.pass

  return (
    <Widget color="warm" onExpand={onExpand}>
      <WidgetHeader title="Investors" emoji={'\u{1F4B0}'} sub={`${investors.length} active`} />
      {total > 0 ? (
        <div className="investor-mini">
          <DonutChart segments={segments} center={String(total)} size={70} thickness={8} />
          <div className="investor-mini__legend">
            <span className="inv-pill inv-pill--yes">{investorFeedback.interested} interested</span>
            <span className="inv-pill inv-pill--maybe">{investorFeedback.maybe} maybe</span>
            <span className="inv-pill inv-pill--no">{investorFeedback.pass} pass</span>
          </div>
        </div>
      ) : <p className="widget__empty">No feedback yet</p>}
    </Widget>
  )
}

// ─── Smart Campaigns Widget ──────────────────────────────────────────────────
function CampaignsWidget() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    campaignsApi.listCampaigns()
      .then(data => setCampaigns(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const active = campaigns.filter(c => c.status === 'active')
  const paused = campaigns.filter(c => c.status === 'paused')
  const draft = campaigns.filter(c => c.status === 'draft')

  // Count total enrollments across active campaigns
  const [enrollCount, setEnrollCount] = useState(0)
  useEffect(() => {
    if (!active.length) return
    const ids = active.map(c => c.id)
    import('../../lib/supabase.js').then(async ({ default: supabase }) => {
      try {
        const { count } = await supabase
          .from('campaign_enrollments')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', ids)
          .eq('status', 'active')
        setEnrollCount(count || 0)
      } catch {}
    })
  }, [campaigns])

  if (loading) return <Widget><div className="skeleton" style={{ height: 140 }} /></Widget>

  return (
    <Widget color="blue" onClick={() => navigate('/email/campaigns')}>
      <WidgetHeader title="Smart Campaigns" emoji={'\u{1F4E7}'} sub={`${campaigns.length} total`} />
      <div className="campaigns-mini">
        <div className="campaigns-mini__stats">
          <div className="mini-stat">
            <span className="mini-stat__val" style={{ color: 'var(--color-success)' }}>{active.length}</span>
            <span className="mini-stat__label">Active</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat__val" style={{ color: 'var(--color-warning)' }}>{paused.length}</span>
            <span className="mini-stat__label">Paused</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat__val">{draft.length}</span>
            <span className="mini-stat__label">Draft</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat__val" style={{ color: 'var(--color-info)' }}>{enrollCount}</span>
            <span className="mini-stat__label">Enrolled</span>
          </div>
        </div>
        {active.length > 0 ? (
          <div className="campaigns-mini__list">
            {active.slice(0, 3).map(c => (
              <div key={c.id} className="campaigns-mini__row">
                <span className="campaigns-mini__name">{c.name}</span>
                <Badge variant="success" size="sm">{c.steps?.length || 0} steps</Badge>
              </div>
            ))}
            {active.length > 3 && <span className="campaigns-mini__more">+{active.length - 3} more</span>}
          </div>
        ) : (
          <p className="widget__empty">No active campaigns</p>
        )}
      </div>
      <button className="widget__cta" onClick={e => { e.stopPropagation(); navigate('/email/campaigns') }}>Manage campaigns &rarr;</button>
    </Widget>
  )
}

// ─── Widget lookup by key ─────────────────────────────────────────────────────
function getWidgetByKey(key, ctx) {
  const { kpis, loading, latestWeek, openDrill, transactions, listings,
    listingValue, avgDOM, conversionFunnel, contacts, openHouses,
    leads, expiringLeads, activityByType, topClients, activity,
    investors, investorFeedback, showingSessions, interestLevels,
    properties } = ctx

  switch (key) {
    case 'briefing':
      return <div className="widget widget--full"><DayBriefingCard showings={showingSessions} openHouses={openHouses} /></div>
    case 'tasks':
      return <TasksWidget />
    case 'goals':
      return <GoalsWidget kpis={kpis} loading={loading} onExpand={() => openDrill('goals')} />
    case 'week':
      return <WeeklyActivityWidget latestWeek={latestWeek} onExpand={() => openDrill('week')} />
    case 'campaigns':
      return <CampaignsWidget />
    case 'stale':
      return <StaleRecordsWidget />
    case 'pipeline':
      return <PipelineMiniWidget transactions={transactions} listings={listings} pipelineValue={kpis.pipelineValue} listingValue={listingValue} avgDOM={avgDOM} onExpand={() => openDrill('pipeline')} />
    case 'funnel':
      return <FunnelDonutWidget funnel={conversionFunnel} onExpand={() => openDrill('funnel')} />
    case 'clients':
      return <ClientsWidget contacts={contacts} onExpand={() => openDrill('clients')} />
    case 'oh':
      return <OHWidget openHouses={openHouses} openHousesThisMonth={kpis.openHousesThisMonth} onExpand={() => openDrill('oh')} />
    case 'leads':
      return <LeadsWidget leads={leads} expiringLeads={expiringLeads} onExpand={() => openDrill('leads')} />
    case 'closedMap':
      return !loading ? <div className="widget widget--full"><ClosedDealsMap transactions={transactions} /></div> : null
    case 'propertyMap':
      return !loading ? <div className="widget widget--full"><PropertyMap properties={(properties || []).map(p => ({ ...p, lat: p.latitude, lng: p.longitude }))} title="Active Properties" height="320px" /></div> : null
    case 'production':
      return <ProductionWidget kpis={kpis} loading={loading} onExpand={() => openDrill('production')} />
    case 'roi':
      return <ROIWidget kpis={kpis} loading={loading} onExpand={() => openDrill('roi')} />
    case 'activityOverview':
      return <ActivityWidget activityByType={activityByType} topClients={topClients} onExpand={() => openDrill('activityOverview')} />
    case 'feed':
      return <FeedWidget activity={activity} onExpand={() => openDrill('feed')} />
    case 'investors':
      return <InvestorWidget investors={investors} investorFeedback={investorFeedback} onExpand={() => openDrill('investors')} />
    case 'showings':
      return <ShowingWidget showingSessions={showingSessions} interestLevels={interestLevels} onExpand={() => openDrill('showings')} />
    default:
      return null
  }
}

// ─── End of Day Overlay ──────────────────────────────────────────────────────
function EndOfDayOverlay({ open, onClose, todayTasks }) {
  const done = todayTasks.filter(t => t.status === 'completed')
  const pending = todayTasks.filter(t => t.status !== 'completed')
  const pct = todayTasks.length > 0 ? Math.round((done.length / todayTasks.length) * 100) : 0
  const msg = pct >= 100 ? 'Crushed it!' : pct >= 80 ? 'Great day!' : pct >= 50 ? 'Solid effort' : 'Tomorrow is a new day'
  const emoji = pct >= 80 ? '\u{1F389}' : pct >= 50 ? '\u{1F4AA}' : '\u{1F319}'

  if (!open) return null

  return (
    <div className="eod-overlay" onClick={onClose}>
      <div className="eod-overlay__card" onClick={e => e.stopPropagation()}>
        <button className="eod-overlay__close" onClick={onClose}>&times;</button>

        <div className="eod-overlay__hero">
          <span className="eod-overlay__emoji">{emoji}</span>
          <h2 className="eod-overlay__msg">{msg}</h2>
          <p className="eod-overlay__sub">{pct}% completion rate</p>
        </div>

        <div className="eod-overlay__ring">
          <ProgressRing value={done.length} max={todayTasks.length}
            color={pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'}
            size={80} label={`${done.length} of ${todayTasks.length} tasks`} />
        </div>

        <div className="eod-overlay__sections">
          {done.length > 0 && (
            <div className="eod-section">
              <h4 className="eod-section__title">{'\u2705'} Completed</h4>
              {done.slice(0, 5).map(t => (
                <p key={t.id} className="eod-section__item eod-section__item--done">{t.title}</p>
              ))}
              {done.length > 5 && <p className="eod-section__more">+{done.length - 5} more</p>}
            </div>
          )}

          {pending.length > 0 && (
            <div className="eod-section">
              <h4 className="eod-section__title">{'\u27A1\uFE0F'} Rolling to tomorrow</h4>
              {pending.slice(0, 4).map(t => (
                <p key={t.id} className="eod-section__item">{t.title}</p>
              ))}
              {pending.length > 4 && <p className="eod-section__more">+{pending.length - 4} more</p>}
            </div>
          )}

          {todayTasks.length === 0 && (
            <p className="eod-section__empty">No tasks were scheduled today. Rest up!</p>
          )}
        </div>

        <button className="eod-overlay__dismiss" onClick={onClose}>
          {'\u{1F44B}'} See you tomorrow
        </button>
      </div>
    </div>
  )
}

// ─── Floating Buttons ────────────────────────────────────────────────────────
function FloatingButtons({ onToggleTasks, tasksOpen, onToggleFocus, focusMode }) {
  const { createAndOpen } = useNotesContext()
  return (
    <div className="floating-buttons">
      <button className="fab fab--notes" onClick={() => createAndOpen({})} title="Quick Note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </button>
      <button className={`fab fab--tasks ${tasksOpen ? 'fab--active' : ''}`} onClick={onToggleTasks} title="Tasks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      </button>
      <button className={`fab fab--focus ${focusMode ? 'fab--active' : ''}`} onClick={onToggleFocus} title="Focus Mode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      </button>
    </div>
  )
}

// ─── Tasks Overlay ───────────────────────────────────────────────────────────
function TasksOverlay({ open, onClose }) {
  const navigate = useNavigate()
  const { data: allTasks, refetch } = useAllDailyTasks()
  const today = new Date().toISOString().slice(0, 10)
  const tasks = allTasks ?? []
  const todayTasks = tasks.filter(t => t.is_recurring ? t.recur_day === new Date().getDay() : t.due_date === today)
  const pending = todayTasks.filter(t => t.status !== 'completed')
  const done = todayTasks.filter(t => t.status === 'completed')
  const toggleTask = async (task) => {
    try {
      if (task.status === 'completed') await DB.uncompleteDailyTask(task.id)
      else await DB.completeDailyTask(task.id)
      refetch()
    } catch (e) { console.error(e) }
  }
  const catColors = { email: 'var(--color-info)', transaction: 'var(--color-success)', prospecting: 'var(--color-warning)', general: 'var(--brown-mid)' }
  if (!open) return null
  return (
    <div className="tasks-overlay" onClick={onClose}>
      <div className="tasks-overlay__panel" onClick={e => e.stopPropagation()}>
        <div className="tasks-overlay__header">
          <h3>{'\u2705'} Today's Tasks</h3>
          <span className="tasks-overlay__count">{done.length}/{todayTasks.length}</span>
          <button className="tasks-overlay__close" onClick={onClose}>&times;</button>
        </div>
        <div className="tasks-overlay__list">
          {pending.map(t => (
            <div key={t.id} className="task-row">
              <button className="task-row__check" onClick={() => toggleTask(t)}>
                <span className="task-row__circle" style={{ borderColor: catColors[t.category] || 'var(--brown-mid)' }} />
              </button>
              <span className="task-row__title">{t.title}</span>
            </div>
          ))}
          {done.map(t => (
            <div key={t.id} className="task-row task-row--done">
              <button className="task-row__check" onClick={() => toggleTask(t)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <span className="task-row__title">{t.title}</span>
            </div>
          ))}
        </div>
        <button className="widget__cta" onClick={() => { onClose(); navigate('/tasks') }}>Open Full Tasks &rarr;</button>
      </div>
    </div>
  )
}

// ─── KPI Drill Panel ─────────────────────────────────────────────────────────
function KPIDrillPanel({ open, onClose, kpiKey, kpis, transactions, listings, pipelineValue, listingValue }) {
  const navigate = useNavigate()
  const configs = {
    portfolio: { title: 'Portfolio Value', subtitle: fmtDollar((pipelineValue||0)+(listingValue||0)), items: [
      { label: 'Under Contract', value: fmtDollar(pipelineValue), link: '/pipeline' },
      { label: 'Listing Value', value: fmtDollar(listingValue), link: '/pipeline' },
      { label: 'Active Listings', value: kpis?.activeListings ?? 0, link: '/crm/sellers' },
    ]},
    listings: { title: 'Listings', subtitle: `${kpis?.activeListings ?? 0}`, items: listings.slice(0,6).map(l => ({ label: l.property?.address || 'No address', value: fmtDollar(l.property?.price), link: '/crm/sellers' }))},
    contracts: { title: 'Under Contract', subtitle: `${kpis?.openTransactions ?? 0}`, items: transactions.slice(0,6).map(t => ({ label: `${t.contact?.name ?? 'Unknown'}`, value: fmtDollar(t.property?.price), link: '/pipeline' }))},
    income: { title: 'Income', subtitle: fmtDollar(kpis?.ytdIncome), items: [
      { label: 'Gross', value: fmtDollar(kpis?.ytdIncome), link: '/pnl/income' },
      { label: 'Expenses', value: fmtDollar(kpis?.ytdExpenses), link: '/pnl/expenses' },
      { label: 'Net', value: fmtDollar(kpis?.ytdNetProfit), link: '/pnl' },
    ]},
  }
  const config = configs[kpiKey] || configs.portfolio
  return (
    <SlidePanel open={open} onClose={onClose} title={config.title} subtitle={config.subtitle}>
      <div className="drill-list">
        {config.items.map((item, i) => (
          <div key={i} className="drill-item" onClick={() => { onClose(); navigate(item.link) }}>
            <span className="drill-item__label">{item.label}</span>
            <span className="drill-item__value">{item.value}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--brown-mid)" strokeWidth="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        ))}
      </div>
    </SlidePanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const {
    loading, error, contacts, transactions, listings, showingSessions,
    openHouses, leads, investors, activity,
    kpis, conversionFunnel, interestLevels, topProperties,
    activityByType, topClients, expiringLeads, investorFeedback,
    latestWeek, listingValue, avgDOM,
  } = useDashboardData()

  const { data: properties } = useProperties()

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('dashboard_tab') || 'today')
  const [drillKey, setDrillKey] = useState(null)
  const [widgetDrill, setWidgetDrill] = useState(null)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [eodOpen, setEodOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  const { order, dragState, onDragStart, onDragOver, onDrop, onDragEnd, resetOrder, isCustom } = useDragReorder(activeTab)

  const { data: allTasksForEod } = useAllDailyTasks()
  const todayStr = now.toISOString().slice(0, 10)
  const todayTasksForEod = (allTasksForEod ?? []).filter(t =>
    t.is_recurring ? t.recur_day === now.getDay() : t.due_date === todayStr
  )

  useEffect(() => { localStorage.setItem('dashboard_tab', activeTab) }, [activeTab])
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])

  // ─── Drill configs for every widget ────────────────────────────────────────
  const drills = useMemo(() => {
    const buyers = (contacts ?? []).filter(c => c.type === 'buyer')
    const sellers = (contacts ?? []).filter(c => c.type === 'seller')
    const now_ = new Date()

    return {
      tasks: {
        title: '\u2705 Tasks Drill-Down',
        subtitle: `${todayTasksForEod.length} today`,
        items: [
          { label: 'View all tasks', emoji: '\u{1F4CB}', link: '/tasks' },
          { label: 'Daily Tracker', emoji: '\u{1F4CA}', link: '/dashboard/daily' },
          { label: 'Calendar', emoji: '\u{1F4C5}', link: '/calendar' },
          ...todayTasksForEod.slice(0, 5).map(t => ({
            label: t.title,
            sub: t.category || 'general',
            badge: t.status === 'completed' ? { text: 'Done', variant: 'success' } : t.priority === 'urgent' ? { text: '!', variant: 'danger' } : undefined,
            link: '/tasks',
          })),
        ],
      },
      goals: {
        title: '\u{1F3C6} Annual Goals',
        subtitle: `${Math.round(((now_.getMonth()+1)/12)*100)}% through year`,
        items: [
          { label: 'Sales Closed', value: `${kpis.ytdSalesClosed || 0} / 20`, emoji: '\u{1F3E0}', link: '/goals' },
          { label: 'Listings Taken', value: `${kpis.ytdListingsTaken || 0} / 15`, emoji: '\u{1F4DD}', link: '/goals' },
          { label: 'Buyer Reps Signed', value: `${kpis.ytdBuyerRepsSigned || 0} / 15`, emoji: '\u{1F465}', link: '/goals' },
          { label: 'Open House Events', value: `${kpis.ytdOHEvents || 0} / 48`, emoji: '\u{1F6AA}', link: '/goals' },
          { label: 'Listing Appts Set', value: `${kpis.ytdListingApptsSet || 0}`, emoji: '\u{1F4C5}', link: '/dashboard/appts' },
          { label: 'View full Goals page', emoji: '\u27A1\uFE0F', link: '/goals' },
        ],
      },
      week: {
        title: '\u{1F4CA} This Week',
        subtitle: latestWeek?.week_id || 'No data',
        items: [
          { label: 'PRO Days', value: `${Number(latestWeek?.productivity_days) || 0} / ${Math.round(215/PLANNED_WEEKS)}`, link: '/goals' },
          { label: 'Hrs Prospected', value: `${Number(latestWeek?.hours_prospected) || 0} / ${Math.round(430/PLANNED_WEEKS)}`, link: '/goals' },
          { label: 'Live Contacts', value: `${Number(latestWeek?.live_contacts) || 0} / ${Math.round(5000/PLANNED_WEEKS)}`, link: '/goals' },
          { label: 'New Leads', value: `${Number(latestWeek?.new_leads) || 0} / ${Math.round(600/PLANNED_WEEKS)}`, link: '/prospecting' },
          { label: 'Appts Set', value: `${Number(latestWeek?.listing_appts_set) || 0} / ${Math.round(100/PLANNED_WEEKS)}`, link: '/dashboard/appts' },
          { label: 'Sales Closed', value: `${Number(latestWeek?.sales_closed) || 0} / ${Math.round(20/PLANNED_WEEKS)}`, link: '/pipeline/closed' },
          { label: 'Edit in Goals', emoji: '\u27A1\uFE0F', link: '/goals' },
        ],
      },
      pipeline: {
        title: '\u{1F3D7}\uFE0F Pipeline',
        subtitle: `${fmtDollar((kpis.pipelineValue||0)+(listingValue||0))} total`,
        items: [
          { label: 'Pipeline Overview', emoji: '\u{1F4CA}', link: '/pipeline' },
          { label: 'Deal Board', emoji: '\u{1F5C2}\uFE0F', link: '/pipeline/board' },
          { label: 'Escrow Tracker', emoji: '\u{1F4C4}', link: '/pipeline/escrow' },
          ...(transactions ?? []).slice(0, 6).map(t => ({
            label: t.contact?.name ?? 'Unknown',
            sub: t.property?.address,
            value: fmtDollar(t.property?.price),
            badge: { text: t.status ?? 'Active', variant: (t.status ?? '').toLowerCase().includes('clos') ? 'success' : 'info' },
            link: '/pipeline',
          })),
          ...(listings ?? []).slice(0, 4).map(l => ({
            label: l.contact?.name ?? 'Unknown',
            sub: l.property?.address,
            value: fmtDollar(l.property?.price),
            badge: { text: 'Listing', variant: 'warning' },
            link: '/crm/sellers',
          })),
        ],
      },
      funnel: {
        title: '\u{1F3AF} Conversion Funnel',
        subtitle: `${(conversionFunnel ?? []).reduce((s,f) => s+f.count, 0)} total`,
        items: [
          ...(conversionFunnel ?? []).map(f => ({
            label: f.label, value: f.count, link: '/prospecting',
          })),
          { label: 'View Prospecting', emoji: '\u27A1\uFE0F', link: '/prospecting' },
          { label: 'Contact Database', emoji: '\u{1F4C7}', link: '/crm/database' },
        ],
      },
      clients: {
        title: '\u{1F465} Clients',
        subtitle: `${buyers.length + sellers.length} total`,
        items: [
          { label: 'Buyers', value: buyers.length, emoji: '\u{1F6D2}', link: '/crm/buyers' },
          { label: 'Sellers', value: sellers.length, emoji: '\u{1F3E0}', link: '/crm/sellers' },
          { label: 'BBA Signed', value: buyers.filter(c => c.bba_signed).length, emoji: '\u2705', link: '/crm/buyers' },
          { label: 'Investors', value: (investors ?? []).length, emoji: '\u{1F4B0}', link: '/crm/investors' },
          ...buyers.slice(0, 4).map(b => ({
            label: b.name, badge: b.bba_signed ? { text: 'BBA', variant: 'success' } : { text: 'No BBA', variant: 'warning' },
            link: '/crm/buyers',
          })),
          ...sellers.slice(0, 3).map(s => ({
            label: s.name, badge: { text: 'Seller', variant: 'info' }, link: '/crm/sellers',
          })),
        ],
      },
      oh: {
        title: '\u{1F6AA} Open Houses',
        subtitle: `${kpis.openHousesThisMonth || 0} this month`,
        items: [
          { label: 'All Open Houses', emoji: '\u{1F4CB}', link: '/open-houses' },
          ...(openHouses ?? []).slice(0, 6).map(oh => ({
            label: oh.property?.address ?? 'No address',
            sub: fmtDate(oh.date),
            badge: oh.date && new Date(oh.date) >= now_ ? { text: 'Upcoming', variant: 'success' } : { text: 'Past', variant: 'info' },
            link: '/open-houses',
          })),
        ],
      },
      leads: {
        title: '\u{1F4E8} Leads',
        subtitle: `${(leads ?? []).length} total`,
        items: [
          { label: 'All Prospecting', emoji: '\u{1F50D}', link: '/prospecting' },
          { label: 'Expired / Cannonball', emoji: '\u{1F4A3}', link: '/prospecting/expired' },
          { label: 'FSBO Leads', emoji: '\u{1F3E1}', link: '/prospecting/fsbo' },
          { label: 'OH Leads', emoji: '\u{1F6AA}', link: '/prospecting/oh-leads' },
          ...(leads ?? []).slice(0, 5).map(l => ({
            label: l.property?.address ?? 'Unknown',
            value: fmtDollar(l.property?.price),
            link: '/prospecting/expired',
          })),
        ],
      },
      production: {
        title: '\u2699\uFE0F Production',
        subtitle: 'auto-calculated YTD',
        items: [
          { label: 'Listing Appts Set', value: kpis.ytdListingApptsSet || 0, emoji: '\u{1F4C5}', link: '/dashboard/appts' },
          { label: 'Listing Appts Held', value: kpis.ytdListingApptsHeld || 0, emoji: '\u{1F91D}', link: '/dashboard/appts' },
          { label: 'Listings Won', value: kpis.ytdListingsTaken || 0, emoji: '\u{1F3C6}', link: '/crm/sellers' },
          { label: 'Listings Lost', value: kpis.ytdListingApptsLost || 0, emoji: '\u{1F614}', link: '/dashboard/appts' },
          { label: 'Win Rate', value: kpis.ytdListingWinRate > 0 ? `${kpis.ytdListingWinRate.toFixed(0)}%` : '\u2014', emoji: '\u{1F4CA}', link: '/goals' },
          { label: 'Listings Sold', value: kpis.ytdListingsSold || 0, emoji: '\u2705', link: '/pipeline/closed' },
          { label: 'Buyer Reps Signed', value: kpis.ytdBuyerRepsSigned || 0, emoji: '\u{1F4DD}', link: '/crm/buyers' },
          { label: 'Buyer Sales', value: kpis.ytdBuyerSales || 0, emoji: '\u{1F3E1}', link: '/pipeline/closed' },
        ],
      },
      roi: {
        title: '\u{1F4B5} ROI',
        subtitle: 'cost tracker metrics',
        items: [
          { label: 'Marketing Spend', value: fmtDollar(kpis.totalCostTrackerSpend || 0), emoji: '\u{1F4B8}', link: '/pnl/expenses' },
          { label: 'Avg Cost / Listing', value: fmtDollar(kpis.avgCostPerListing || 0), emoji: '\u{1F3E0}', link: '/pnl' },
          { label: 'OH Conversion Rate', value: `${(kpis.ohConversionRate || 0).toFixed(1)}%`, emoji: '\u{1F91D}', link: '/pnl' },
          { label: 'Letter Conversion', value: `${(kpis.letterConversionRate || 0).toFixed(1)}%`, emoji: '\u2709\uFE0F', link: '/pnl' },
          { label: 'View P&L', emoji: '\u27A1\uFE0F', link: '/pnl' },
          { label: 'Cost Tracker', emoji: '\u{1F4CA}', link: '/pnl' },
        ],
      },
      activityOverview: {
        title: '\u{1F4CB} Activity',
        subtitle: 'breakdown by type',
        items: [
          ...Object.entries(activityByType ?? {}).sort((a,b) => b[1]-a[1]).slice(0,8).map(([type, count]) => ({
            label: type, value: count, link: '/crm/database',
          })),
          ...(topClients ?? []).slice(0, 4).map(c => ({
            label: c.name, sub: `${c.count} actions`, emoji: '\u{1F464}', link: '/crm/database',
          })),
        ],
      },
      feed: {
        title: '\u{1F4AC} Activity Feed',
        subtitle: `${(activity ?? []).length} entries`,
        items: (activity ?? []).slice(0, 15).map(item => ({
          label: item.contact?.name ?? item.description ?? 'Event',
          sub: item.property?.address,
          badge: { text: item.type ?? 'event', variant: (item.type ?? '').toLowerCase().includes('creat') ? 'success' : 'info' },
          link: '/crm/database',
        })),
      },
      investors: {
        title: '\u{1F4B0} Investors',
        subtitle: `${(investors ?? []).length} active`,
        items: [
          { label: 'All Investors', emoji: '\u{1F4CB}', link: '/crm/investors' },
          ...(investors ?? []).slice(0, 6).map(inv => ({
            label: inv.contact?.name ?? 'Unknown',
            sub: `${(inv.investor_feedback ?? []).length} properties reviewed`,
            link: '/crm/investors',
          })),
        ],
      },
      showings: {
        title: '\u{1F3E1} Showings',
        subtitle: `${(showingSessions ?? []).length} sessions`,
        items: [
          { label: 'Buyer Showings', emoji: '\u{1F50D}', link: '/crm/showings' },
          { label: 'Listing Showings', emoji: '\u{1F3E0}', link: '/crm/seller-showings' },
          { label: `High Interest: ${interestLevels?.high || 0}`, emoji: '\u{1F7E2}', link: '/crm/showings' },
          { label: `Medium Interest: ${interestLevels?.medium || 0}`, emoji: '\u{1F7E1}', link: '/crm/showings' },
          { label: `Low Interest: ${interestLevels?.low || 0}`, emoji: '\u{1F534}', link: '/crm/showings' },
          ...(showingSessions ?? []).slice(0, 5).map(s => ({
            label: s.contact?.name ?? 'Unknown',
            sub: `${(s.showings ?? []).length} properties \u2022 ${fmtDate(s.date)}`,
            link: '/crm/showings',
          })),
        ],
      },
    }
  }, [contacts, transactions, listings, showingSessions, openHouses, leads, investors, activity, kpis, conversionFunnel, interestLevels, activityByType, topClients, investorFeedback, latestWeek, listingValue, todayTasksForEod])

  const openDrill = (key) => setWidgetDrill(drills[key] || null)

  return (
    <div className={`dashboard ${focusMode ? 'dashboard--focus' : ''}`}>

      {/* ─── Greeting Bar ─── */}
      <div className="greeting-bar">
        <div className="greeting-bar__left">
          <h1 className="greeting-bar__hello">{getGreeting()}, Dana</h1>
          <p className="greeting-bar__date">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="greeting-bar__right">
          <span className="greeting-bar__time">{fmtTime(now)}</span>
          <button className="eod-btn" onClick={() => setEodOpen(true)}>
            {'\u{1F44D}'} Done for today
          </button>
        </div>
      </div>

      {/* ─── Hero KPIs ─── */}
      <HeroKPIs kpis={kpis} loading={loading} pipelineValue={kpis.pipelineValue} listingValue={listingValue} onDrill={setDrillKey} />

      {error && <div className="dashboard__error"><strong>Error:</strong> {error}</div>}

      {/* ─── Focus Mode ─── */}
      {focusMode ? (
        <div className="focus-zone">
          <TasksWidget />
          <StaleRecordsWidget />
        </div>
      ) : (
        <>
          {/* ─── Tabs ─── */}
          <div className="dash-tabs-bar">
            <div className="dash-tabs">
              {TABS.map(tab => (
                <button key={tab.id} className={`dash-tab ${activeTab === tab.id ? 'dash-tab--active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                  <span className="dash-tab__emoji">{tab.emoji}</span>
                  <span className="dash-tab__label">{tab.label}</span>
                </button>
              ))}
            </div>
            {isCustom && (
              <button className="reset-layout-btn" onClick={resetOrder} title="Reset widget order to default">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>
                Reset layout
              </button>
            )}
          </div>

          {/* ─── Tab Grid ─── */}
          <div className="widget-grid" key={activeTab}>
            {order.map(widgetKey => {
              const widget = getWidgetByKey(widgetKey, {
                kpis, loading, latestWeek, openDrill, transactions, listings,
                listingValue, avgDOM, conversionFunnel, contacts, openHouses,
                leads, expiringLeads, activityByType, topClients, activity,
                investors, investorFeedback, showingSessions, interestLevels,
                properties: properties ?? [],
              })
              if (!widget) return null
              return (
                <DraggableWidget
                  key={widgetKey}
                  widgetKey={widgetKey}
                  dragState={dragState}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                >
                  {widget}
                </DraggableWidget>
              )
            })}
          </div>
        </>
      )}

      {/* ─── Floating ─── */}
      <FloatingButtons onToggleTasks={() => setTasksOpen(o => !o)} tasksOpen={tasksOpen} onToggleFocus={() => setFocusMode(f => !f)} focusMode={focusMode} />
      <TasksOverlay open={tasksOpen} onClose={() => setTasksOpen(false)} />
      <KPIDrillPanel open={!!drillKey} onClose={() => setDrillKey(null)} kpiKey={drillKey} kpis={kpis}
        transactions={transactions ?? []} listings={listings ?? []} pipelineValue={kpis.pipelineValue} listingValue={listingValue} />
      <WidgetDrill open={!!widgetDrill} onClose={() => setWidgetDrill(null)} config={widgetDrill} />
      <EndOfDayOverlay open={eodOpen} onClose={() => setEodOpen(false)} todayTasks={todayTasksForEod} />
    </div>
  )
}
