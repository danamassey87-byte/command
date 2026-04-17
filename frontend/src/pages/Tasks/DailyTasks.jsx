import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Card, SlidePanel, Input, Select, Textarea, TabBar, EmptyState } from '../../components/ui/index.jsx'
import { useDailyTasks, useAllDailyTasks, useDailyStreaks, useVendors, useVendorAssignments, useTransactions, useContacts, useShowingSessions, useOpenHouses, useListingAppointments } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './DailyTasks.css'

// ─── Constants ──────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10)
const YESTERDAY = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })()
const WEEK_END = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })()

const CATEGORIES = [
  { value: 'general',     label: 'General',     color: 'var(--brown-mid)',       icon: '/' },
  { value: 'email',       label: 'Email',       color: 'var(--color-info)',      icon: '\u2709' },
  { value: 'sms',         label: 'SMS',         color: 'var(--brown-warm)',      icon: '\u{1F4AC}' },
  { value: 'transaction', label: 'Transaction', color: 'var(--color-success)',   icon: '\u{1F3E0}' },
  { value: 'prospecting', label: 'Prospecting', color: 'var(--color-warning)',   icon: '\u{1F4DE}' },
  { value: 'admin',       label: 'Admin',       color: '#8b8b8b',               icon: '\u{1F4CB}' },
  { value: 'marketing',   label: 'Marketing',   color: '#8b7ec8',               icon: '\u{1F4E3}' },
  { value: 'personal',    label: 'Personal',    color: 'var(--color-danger)',    icon: '\u{2764}' },
  { value: 'vendor',      label: 'Vendor',      color: '#b07d62',               icon: '\u{1F527}' },
  { value: 'showing',     label: 'Showing',     color: '#6a9e72',               icon: '\u{1F441}' },
  { value: 'follow_up',   label: 'Follow-Up',   color: '#c9962e',               icon: '\u{1F504}' },
]

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: '#c0392b', icon: '\u{1F534}' },
  { value: 'high',   label: 'High',   color: 'var(--color-danger)', icon: '\u{1F7E0}' },
  { value: 'normal', label: 'Normal', color: 'var(--color-warning)', icon: '\u{1F7E1}' },
  { value: 'low',    label: 'Low',    color: 'var(--color-success)', icon: '\u{1F7E2}' },
]

const CALENDAR_HOURS = Array.from({ length: 14 }, (_, i) => i + 6) // 6am to 7pm

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = Number(h)
  const ampm = hr >= 12 ? 'PM' : 'AM'
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${ampm}`
}
function fmtDateLong(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function isOverdue(task) {
  if (task.status === 'completed' || task.status === 'skipped') return false
  if (!task.due_date) return false
  return task.due_date < TODAY
}
function priSort(p) {
  return { urgent: 0, high: 1, normal: 2, low: 3 }[p] ?? 2
}
function catInfo(cat) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[0]
}
function priInfo(pri) {
  return PRIORITIES.find(p => p.value === pri) || PRIORITIES[2]
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DailyTasks() {
  const navigate = useNavigate()

  // Data
  const { data: allTasks, loading: loadingTasks, refetch: refetchTasks } = useAllDailyTasks()
  const { data: streaks, refetch: refetchStreaks } = useDailyStreaks()
  const { data: vendors } = useVendors()
  const { data: assignments } = useVendorAssignments()
  const { data: transactions } = useTransactions()
  const { data: contacts } = useContacts()
  const { data: showingSessions } = useShowingSessions()
  const { data: openHouses } = useOpenHouses()
  const { data: listingAppts } = useListingAppointments()

  // UI State
  const [view, setView] = useState('today')         // today | this_week | upcoming | past | completed | recurring | vendors
  const [panelOpen, setPanelOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [draggedTask, setDraggedTask] = useState(null)
  const [rolledOver, setRolledOver] = useState(false)

  // Task form
  const [fTitle, setFTitle] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fCategory, setFCategory] = useState('general')
  const [fPriority, setFPriority] = useState('normal')
  const [fDueDate, setFDueDate] = useState(TODAY)
  const [fDueTime, setFDueTime] = useState('')
  const [fSourceLink, setFSourceLink] = useState('')
  const [fIsRecurring, setFIsRecurring] = useState(false)
  const [fRecurDay, setFRecurDay] = useState(1)
  const [fVendorIds, setFVendorIds] = useState([])
  const [fDealId, setFDealId] = useState('')
  const [fContactId, setFContactId] = useState('')

  const tasks = allTasks ?? []
  const vList = vendors ?? []
  const aList = assignments ?? []
  const tList = transactions ?? []
  const cList = contacts ?? []

  // ─── Roll over yesterday's incomplete tasks ─────────────────────────────────
  useEffect(() => {
    if (rolledOver || !allTasks) return
    setRolledOver(true)
    DB.rollOverTasks(YESTERDAY, TODAY).then(rolled => {
      if (rolled.length > 0) refetchTasks()
    }).catch(() => {})
  }, [allTasks, rolledOver, refetchTasks])

  // ─── Aggregate external events into "today" view ─────────────────────────────
  const externalEvents = useMemo(() => {
    const events = []
    // Showings today
    ;(showingSessions ?? []).forEach(s => {
      if (s.date === TODAY) {
        events.push({
          id: `show_${s.id}`, title: `Showing: ${s.contact?.name ?? 'Client'}`,
          category: 'showing', due_time: s.start_time || null,
          source_link: '/crm/showings', source_type: 'showing',
          external: true,
        })
      }
    })
    // Listing appointments today
    ;(listingAppts ?? []).forEach(a => {
      const d = a.scheduled_at?.slice(0, 10)
      if (d === TODAY) {
        events.push({
          id: `appt_${a.id}`, title: `Listing Appt: ${a.contact?.name ?? 'Client'}`,
          category: 'transaction', due_time: a.scheduled_at?.slice(11, 16) || null,
          source_link: '/dashboard/appts', source_type: 'calendar',
          external: true,
        })
      }
    })
    // Open houses today
    ;(openHouses ?? []).forEach(oh => {
      if (oh.date === TODAY) {
        events.push({
          id: `oh_${oh.id}`, title: `Open House: ${oh.property?.address ?? 'Property'}`,
          category: 'marketing', due_time: oh.start_time || null,
          source_link: '/open-houses', source_type: 'open_house',
          external: true,
        })
      }
    })
    // Vendor assignments today
    aList.forEach(va => {
      if (va.scheduled_date === TODAY) {
        events.push({
          id: `va_${va.id}`, title: `${va.service_type}: ${va.vendor?.name ?? 'Vendor'} @ ${va.property_address || 'TBD'}`,
          category: 'vendor', due_time: va.scheduled_time || null,
          source_link: null, source_type: 'vendor',
          external: true,
        })
      }
    })
    return events
  }, [showingSessions, listingAppts, openHouses, aList])

  // ─── Filtered task lists ────────────────────────────────────────────────────
  const todayTasks = useMemo(() => {
    const t = tasks.filter(t => {
      if (t.is_recurring) {
        const dow = new Date().getDay()
        return t.recur_day === dow && t.status !== 'completed'
      }
      return t.due_date === TODAY || (!t.due_date && t.status !== 'completed')
    })
    // Merge external events
    const merged = [...t, ...externalEvents]
    merged.sort((a, b) => {
      // Overdue first
      const aOver = isOverdue(a) ? 0 : 1
      const bOver = isOverdue(b) ? 0 : 1
      if (aOver !== bOver) return aOver - bOver
      // Priority
      const aPri = priSort(a.priority)
      const bPri = priSort(b.priority)
      if (aPri !== bPri) return aPri - bPri
      // Time
      if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time)
      if (a.due_time) return -1
      if (b.due_time) return 1
      return 0
    })
    return merged
  }, [tasks, externalEvents])

  const completedTasks = useMemo(() =>
    tasks.filter(t => t.status === 'completed')
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
  , [tasks])

  // This week (Mon-Sun of current week)
  const thisWeekTasks = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mon = new Date(now); mon.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); mon.setHours(0,0,0,0)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    const monStr = mon.toISOString().slice(0, 10)
    const sunStr = sun.toISOString().slice(0, 10)
    return tasks.filter(t => {
      if (t.is_recurring) return true // always show recurring in week view
      if (!t.due_date) return false
      return t.due_date >= monStr && t.due_date <= sunStr
    }).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || priSort(a.priority) - priSort(b.priority))
  }, [tasks])

  const upcomingTasks = useMemo(() =>
    tasks.filter(t => !t.is_recurring && t.due_date > TODAY && t.status !== 'completed')
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || priSort(a.priority) - priSort(b.priority))
  , [tasks])

  const pastTasks = useMemo(() =>
    tasks.filter(t => !t.is_recurring && t.due_date && t.due_date < TODAY)
      .sort((a, b) => (b.due_date ?? '').localeCompare(a.due_date ?? ''))
  , [tasks])

  const recurringTasks = useMemo(() =>
    tasks.filter(t => t.is_recurring)
  , [tasks])

  const overdueTasks = useMemo(() =>
    tasks.filter(t => isOverdue(t))
  , [tasks])

  // ─── Streak calculation ────────────────────────────────────────────────────
  const streak = useMemo(() => {
    if (!streaks?.length) return 0
    let count = 0
    const sorted = [...streaks].sort((a, b) => b.date.localeCompare(a.date))
    for (const s of sorted) {
      if (s.all_completed) count++
      else break
    }
    return count
  }, [streaks])

  // ─── Today stats ──────────────────────────────────────────────────────────
  const todayStats = useMemo(() => {
    const real = tasks.filter(t => {
      if (t.is_recurring) return t.recur_day === new Date().getDay()
      return t.due_date === TODAY
    })
    const total = real.length
    const done = real.filter(t => t.status === 'completed').length
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [tasks])

  // ─── Calendar time slots for sidebar ─────────────────────────────────────
  const calendarSlots = useMemo(() => {
    const slots = {}
    CALENDAR_HOURS.forEach(h => { slots[h] = [] })
    todayTasks.forEach(t => {
      if (t.due_time) {
        const h = parseInt(t.due_time.split(':')[0], 10)
        if (slots[h]) slots[h].push(t)
      }
    })
    return slots
  }, [todayTasks])

  const unscheduledForCal = useMemo(() =>
    todayTasks.filter(t => !t.due_time && t.status !== 'completed')
  , [todayTasks])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openNewTask = () => {
    setEditItem(null)
    setFTitle(''); setFDesc(''); setFNotes(''); setFCategory('general'); setFPriority('normal')
    setFDueDate(TODAY); setFDueTime(''); setFSourceLink(''); setFIsRecurring(false); setFRecurDay(1)
    setFVendorIds([]); setFDealId(''); setFContactId('')
    setPanelOpen(true)
  }

  const openEditTask = (task) => {
    if (task.external) {
      if (task.source_link) navigate(task.source_link)
      return
    }
    setEditItem(task)
    setFTitle(task.title); setFDesc(task.description || ''); setFNotes(task.notes || '')
    setFCategory(task.category || 'general'); setFPriority(task.priority || 'normal')
    setFDueDate(task.due_date || ''); setFDueTime(task.due_time || '')
    setFSourceLink(task.source_link || ''); setFIsRecurring(task.is_recurring || false)
    setFRecurDay(task.recur_day ?? 1)
    // Support legacy single vendor_id + new vendor_ids[] column
    const ids = Array.isArray(task.vendor_ids) ? task.vendor_ids
      : (task.vendor_id ? [task.vendor_id] : [])
    setFVendorIds(ids)
    setFDealId(task.deal_id || ''); setFContactId(task.contact_id || '')
    setPanelOpen(true)
  }

  const toggleVendorId = (id) => {
    setFVendorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const saveTask = async () => {
    if (!fTitle.trim()) return
    const data = {
      title: fTitle.trim(),
      description: fDesc.trim() || null,
      notes: fNotes.trim() || null,
      category: fCategory,
      priority: fPriority,
      due_date: fIsRecurring ? null : (fDueDate || null),
      due_time: fDueTime || null,
      source_link: fSourceLink.trim() || null,
      is_recurring: fIsRecurring,
      recur_day: fIsRecurring ? Number(fRecurDay) : null,
      vendor_ids: fVendorIds,
      deal_id: fDealId || null,
      contact_id: fContactId || null,
    }
    try {
      if (editItem) {
        await DB.updateDailyTask(editItem.id, data)
      } else {
        await DB.createDailyTask(data)
      }
      refetchTasks()
      setPanelOpen(false)
    } catch (e) { console.error(e) }
  }

  const toggleTask = async (task) => {
    if (task.external) return
    try {
      if (task.status === 'completed') {
        await DB.uncompleteDailyTask(task.id)
      } else {
        await DB.completeDailyTask(task.id)
      }
      refetchTasks()
      // Update streak
      const real = tasks.filter(t => t.due_date === TODAY && !t.is_recurring)
      const nowDone = real.filter(t => t.id === task.id ? task.status !== 'completed' : t.status === 'completed').length
      await DB.upsertDailyStreak({
        date: TODAY,
        tasks_total: real.length,
        tasks_done: nowDone,
        all_completed: nowDone >= real.length,
      })
      refetchStreaks()
    } catch (e) { console.error(e) }
  }

  const deleteTask = async (id) => {
    try {
      await DB.deleteDailyTask(id)
      refetchTasks()
      setPanelOpen(false)
    } catch (e) { console.error(e) }
  }

  const updateTaskDueDate = async (taskId, newDate) => {
    try {
      await DB.updateDailyTask(taskId, { due_date: newDate })
      refetchTasks()
    } catch (e) { console.error(e) }
  }

  // ─── Calendar drag & drop ─────────────────────────────────────────────────
  const handleDragStart = (e, task) => {
    if (task.external) return
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  const handleDrop = async (e, hour) => {
    e.preventDefault()
    if (!draggedTask || draggedTask.external) return
    const timeStr = `${String(hour).padStart(2, '0')}:00`
    try {
      await DB.updateDailyTask(draggedTask.id, { due_time: timeStr, due_date: TODAY })
      refetchTasks()
    } catch (err) { console.error(err) }
    setDraggedTask(null)
  }

  // ─── Render helpers ───────────────────────────────────────────────────────
  const TaskRow = ({ task, showDate = false }) => {
    const cat = catInfo(task.category)
    const pri = priInfo(task.priority)
    const overdue = isOverdue(task)
    const done = task.status === 'completed'

    return (
      <div
        className={`dt-task ${done ? 'dt-task--done' : ''} ${overdue ? 'dt-task--overdue' : ''} ${task.external ? 'dt-task--external' : ''}`}
        draggable={!task.external}
        onDragStart={e => handleDragStart(e, task)}
      >
        {!task.external && (
          <button className="dt-task__check" onClick={() => toggleTask(task)}
            aria-label={done ? 'Uncomplete' : 'Complete'}>
            {done ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <span className={`dt-task__circle dt-task__circle--${task.priority || 'normal'}`} />
            )}
          </button>
        )}
        {task.external && (
          <span className="dt-task__ext-dot" style={{ background: cat.color }} />
        )}
        <button className="dt-task__body" onClick={() => openEditTask(task)}>
          <div className="dt-task__top">
            <span className="dt-task__title">{task.title}</span>
            {task.priority === 'urgent' && <span className="dt-task__flag dt-task__flag--urgent">URGENT</span>}
            {task.priority === 'high' && <span className="dt-task__flag dt-task__flag--high">HIGH</span>}
          </div>
          <div className="dt-task__meta">
            <span className="dt-task__cat" style={{ background: cat.color }}>{cat.label}</span>
            {task.due_time && <span className="dt-task__time">{fmtTime(task.due_time)}</span>}
            {showDate && task.due_date && <span className="dt-task__date">{fmtDate(task.due_date)}</span>}
            {task.rolled_from && <span className="dt-task__rolled" title={`Rolled from ${fmtDate(task.rolled_from)}`}>Rolled over</span>}
            {task.source_link && <span className="dt-task__link-icon" title="Click to go to source">&#x2197;</span>}
            {task.notes && <span className="dt-task__has-notes" title="Has notes">{'\u{1F4DD}'}</span>}
          </div>
        </button>
        {!task.external && (
          <div className="dt-task__actions">
            {task.source_link && (
              <button className="dt-task__action" onClick={e => { e.stopPropagation(); navigate(task.source_link) }} title="Go to source">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── View: Vendors — tasks linked to one or more vendors, grouped ─────────
  const vendorMap = useMemo(
    () => Object.fromEntries(vList.map(v => [v.id, v])),
    [vList]
  )

  // Pull vendor_ids off a task, tolerating legacy single vendor_id rows.
  const taskVendorIds = (t) => {
    if (Array.isArray(t.vendor_ids) && t.vendor_ids.length) return t.vendor_ids
    if (t.vendor_id) return [t.vendor_id]
    return []
  }

  const tasksByVendor = useMemo(() => {
    const buckets = {}     // vendorId -> [tasks]
    const unlinked = []    // tasks whose vendor no longer exists
    tasks.forEach(t => {
      const ids = taskVendorIds(t)
      if (!ids.length) return
      ids.forEach(id => {
        if (!vendorMap[id]) { unlinked.push(t); return }
        if (!buckets[id]) buckets[id] = []
        buckets[id].push(t)
      })
    })
    // Sort: pending first, then by due_date asc, priority
    const sortTasks = arr => arr.sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0
      const bDone = b.status === 'completed' ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      const dd = (a.due_date ?? '').localeCompare(b.due_date ?? '')
      if (dd) return dd
      return priSort(a.priority) - priSort(b.priority)
    })
    Object.values(buckets).forEach(sortTasks)
    // Sort vendors alphabetically
    const entries = Object.entries(buckets).sort(
      ([a], [b]) => (vendorMap[a]?.name ?? '').localeCompare(vendorMap[b]?.name ?? '')
    )
    return { entries, unlinked }
  }, [tasks, vendorMap])

  if (loadingTasks) return <div className="dt-loading">Loading tasks...</div>

  return (
    <div className={`daily-tasks ${calendarOpen ? 'daily-tasks--cal-open' : ''}`}>
      {/* ─── Main Panel ─── */}
      <div className="dt-main">
        {/* ─── Header ─── */}
        <div className="dt-header">
          <div className="dt-header__left">
            <h1 className="dt-header__title">Daily Tasks</h1>
            <p className="dt-header__date">{fmtDateLong(TODAY)}</p>
          </div>
          <div className="dt-header__right">
            {/* Streak */}
            <div className="dt-streak" title={`${streak} day streak`}>
              <span className="dt-streak__fire">{streak > 0 ? '\u{1F525}' : '\u26AA'}</span>
              <span className="dt-streak__count">{streak}</span>
              <span className="dt-streak__label">day streak</span>
            </div>
            {/* Progress ring */}
            <div className="dt-progress">
              <svg viewBox="0 0 36 36" className="dt-progress__svg">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-border-light)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={todayStats.pct >= 100 ? 'var(--color-success)' : 'var(--brown-mid)'} strokeWidth="3" strokeDasharray={`${todayStats.pct} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
              </svg>
              <span className="dt-progress__text">{todayStats.done}/{todayStats.total}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCalendarOpen(!calendarOpen)}>
              {calendarOpen ? 'Hide Calendar' : "Today's Calendar"}
            </Button>
            <Button variant="primary" size="sm" icon="+" onClick={openNewTask}>New Task</Button>
          </div>
        </div>

        {/* ─── Overdue Banner ─── */}
        {overdueTasks.length > 0 && view !== 'completed' && (
          <div className="dt-overdue-banner">
            <span className="dt-overdue-banner__icon">{'\u26A0'}</span>
            <span>{overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} — they've been rolled to today</span>
          </div>
        )}

        {/* ─── Tabs ─── */}
        <TabBar
          tabs={[
            { value: 'today',     label: 'Today',     count: todayTasks.filter(t => t.status !== 'completed').length },
            { value: 'this_week', label: 'This Week', count: thisWeekTasks.length },
            { value: 'upcoming',  label: 'Upcoming',  count: upcomingTasks.length },
            { value: 'past',      label: 'Past',      count: pastTasks.length },
            { value: 'recurring', label: 'Recurring', count: recurringTasks.length },
            { value: 'completed', label: 'Completed', count: completedTasks.length },
          ]}
          active={view}
          onChange={setView}
        />

        {/* ─── Today View ─── */}
        {view === 'today' && (
          <div className="dt-list">
            {todayTasks.length === 0 ? (
              <EmptyState title="All clear!" description="No tasks for today. Add a task or enjoy the free time." action={<Button variant="primary" size="sm" onClick={openNewTask}>Add Task</Button>} />
            ) : (
              <>
                {/* Pending */}
                {todayTasks.filter(t => t.status !== 'completed').length > 0 && (
                  <div className="dt-section">
                    <h3 className="dt-section__title">To Do</h3>
                    {todayTasks.filter(t => t.status !== 'completed').map(t => <TaskRow key={t.id} task={t} />)}
                  </div>
                )}
                {/* Done */}
                {todayTasks.filter(t => t.status === 'completed').length > 0 && (
                  <div className="dt-section">
                    <h3 className="dt-section__title">Done</h3>
                    {todayTasks.filter(t => t.status === 'completed').map(t => <TaskRow key={t.id} task={t} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Upcoming View ─── */}
        {view === 'upcoming' && (
          <div className="dt-list">
            {upcomingTasks.length === 0 ? (
              <EmptyState title="Nothing upcoming" description="No tasks scheduled for the next 7 days." />
            ) : (
              (() => {
                const grouped = {}
                upcomingTasks.forEach(t => {
                  const d = t.due_date || 'No date'
                  if (!grouped[d]) grouped[d] = []
                  grouped[d].push(t)
                })
                return Object.entries(grouped).map(([date, tasks]) => (
                  <div key={date} className="dt-section">
                    <h3 className="dt-section__title">{date === 'No date' ? 'No Date' : fmtDateLong(date)}</h3>
                    {tasks.map(t => <TaskRow key={t.id} task={t} />)}
                  </div>
                ))
              })()
            )}
          </div>
        )}

        {/* ─── Completed View ─── */}
        {view === 'completed' && (
          <div className="dt-list">
            {completedTasks.length === 0 ? (
              <EmptyState title="No completed tasks" description="Complete some tasks to see them here." />
            ) : (
              (() => {
                const grouped = {}
                completedTasks.forEach(t => {
                  const d = t.completed_at ? t.completed_at.slice(0, 10) : 'Unknown'
                  if (!grouped[d]) grouped[d] = []
                  grouped[d].push(t)
                })
                return Object.entries(grouped).slice(0, 7).map(([date, tasks]) => (
                  <div key={date} className="dt-section">
                    <h3 className="dt-section__title">{date === 'Unknown' ? 'Unknown' : fmtDate(date)}</h3>
                    {tasks.map(t => <TaskRow key={t.id} task={t} showDate />)}
                  </div>
                ))
              })()
            )}
          </div>
        )}

        {/* ─── This Week View ─── */}
        {view === 'this_week' && (
          <div className="dt-list">
            {thisWeekTasks.length === 0 ? (
              <EmptyState title="Nothing this week" description="No tasks for this week." />
            ) : (
              (() => {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                const grouped = {}
                thisWeekTasks.forEach(t => {
                  if (t.is_recurring) {
                    const day = dayNames[t.recur_day] || 'Recurring'
                    if (!grouped[day]) grouped[day] = []
                    grouped[day].push(t)
                  } else {
                    const d = t.due_date || 'No date'
                    const label = d === TODAY ? `Today — ${fmtDate(d)}` : fmtDateLong(d)
                    if (!grouped[label]) grouped[label] = []
                    grouped[label].push(t)
                  }
                })
                return Object.entries(grouped).map(([label, tasks]) => (
                  <div key={label} className="dt-section">
                    <h3 className="dt-section__title">{label}</h3>
                    {tasks.map(t => <TaskRow key={t.id} task={t} showDate />)}
                  </div>
                ))
              })()
            )}
          </div>
        )}

        {/* ─── Past View ─── */}
        {view === 'past' && (
          <div className="dt-list">
            {pastTasks.length === 0 ? (
              <EmptyState title="No past tasks" description="Past tasks will appear here." />
            ) : (
              (() => {
                const grouped = {}
                pastTasks.forEach(t => {
                  const d = t.due_date || 'No date'
                  if (!grouped[d]) grouped[d] = []
                  grouped[d].push(t)
                })
                return Object.entries(grouped).slice(0, 14).map(([date, tasks]) => (
                  <div key={date} className="dt-section">
                    <h3 className="dt-section__title">{fmtDateLong(date)}</h3>
                    {tasks.map(t => <TaskRow key={t.id} task={t} showDate />)}
                  </div>
                ))
              })()
            )}
          </div>
        )}

        {/* ─── Recurring View ─── */}
        {view === 'recurring' && (
          <div className="dt-list">
            {recurringTasks.length === 0 ? (
              <EmptyState title="No recurring tasks" description="Create a recurring task to see it here." />
            ) : (
              <div className="dt-section">
                <h3 className="dt-section__title">Recurring Tasks</h3>
                {recurringTasks.map(t => {
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <TaskRow task={t} />
                      <Badge variant="info" size="sm">Every {dayNames[t.recur_day]}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Vendors View — tasks associated with vendors ─── */}
        {view === 'vendors' && (
          <div className="dt-list">
            <div className="dt-vendors__actions">
              <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>Manage Vendors</Button>
              <Button variant="primary" size="sm" icon="+" onClick={openNewTask}>New Task</Button>
            </div>

            {tasksByVendor.entries.length === 0 ? (
              <EmptyState
                title="No vendor tasks"
                description="Tasks linked to a vendor (e.g. “Follow up with inspector”) will appear here. Create a task and link one or more vendors to it."
                action={<Button variant="primary" size="sm" onClick={openNewTask}>New Task</Button>}
              />
            ) : (
              tasksByVendor.entries.map(([vendorId, vTasks]) => {
                const v = vendorMap[vendorId]
                return (
                  <div key={vendorId} className="dt-section">
                    <h3 className="dt-section__title">
                      {v?.name ?? 'Vendor'}
                      {v?.role && <span className="heat-row__goal"> &middot; {v.role}</span>}
                      <span className="heat-row__goal"> &middot; {vTasks.filter(t => t.status !== 'completed').length} open</span>
                    </h3>
                    {vTasks.map(t => <TaskRow key={`${vendorId}_${t.id}`} task={t} showDate />)}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ─── Calendar Sidebar ─── */}
      {calendarOpen && (
        <div className="dt-calendar">
          <div className="dt-calendar__header">
            <h3 className="dt-calendar__title">Today's Calendar</h3>
            <button className="dt-calendar__close" onClick={() => setCalendarOpen(false)}>&times;</button>
          </div>
          <p className="dt-calendar__hint">Drag tasks here to schedule them</p>

          <div className="dt-calendar__slots">
            {CALENDAR_HOURS.map(hour => (
              <div
                key={hour}
                className={`dt-cal-slot ${calendarSlots[hour]?.length ? 'dt-cal-slot--has-items' : ''}`}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, hour)}
              >
                <span className="dt-cal-slot__time">{hour > 12 ? hour - 12 : hour || 12}{hour >= 12 ? 'p' : 'a'}</span>
                <div className="dt-cal-slot__items">
                  {(calendarSlots[hour] || []).map(t => (
                    <div
                      key={t.id}
                      className="dt-cal-item"
                      style={{ borderLeftColor: catInfo(t.category).color }}
                      onClick={() => openEditTask(t)}
                    >
                      <span className="dt-cal-item__title">{t.title}</span>
                      <span className="dt-cal-item__cat">{catInfo(t.category).label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Unscheduled tasks below calendar */}
          {unscheduledForCal.length > 0 && (
            <div className="dt-calendar__unscheduled">
              <h4 className="dt-calendar__unsched-title">Unscheduled ({unscheduledForCal.length})</h4>
              {unscheduledForCal.map(t => (
                <div
                  key={t.id}
                  className="dt-cal-unsched-item"
                  draggable={!t.external}
                  onDragStart={e => handleDragStart(e, t)}
                  style={{ borderLeftColor: catInfo(t.category).color }}
                >
                  <span>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Task Panel ─── */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editItem ? 'Edit Task' : 'New Task'}
        subtitle={editItem?.rolled_from ? `Rolled over from ${fmtDate(editItem.rolled_from)}` : null}
        width={480}
      >
        <div className="dt-form">
          <Input label="Task" id="dt-title" value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="e.g. Send follow-up email to John" />
          <Textarea label="Description" id="dt-desc" value={fDesc} onChange={e => setFDesc(e.target.value)} rows={2} placeholder="What needs to be done?" />
          <Textarea label="Notes" id="dt-notes" value={fNotes} onChange={e => setFNotes(e.target.value)} rows={2} placeholder="Add notes, updates, details..." />

          <div className="dt-form__row">
            <Select label="Category" id="dt-cat" value={fCategory} onChange={e => setFCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Select label="Priority" id="dt-pri" value={fPriority} onChange={e => setFPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </div>

          <div className="dt-form__toggle">
            <label className="dt-form__check">
              <input type="checkbox" checked={fIsRecurring} onChange={e => setFIsRecurring(e.target.checked)} />
              <span>Recurring weekly</span>
            </label>
          </div>

          {fIsRecurring ? (
            <Select label="Day of Week" id="dt-dow" value={fRecurDay} onChange={e => setFRecurDay(Number(e.target.value))}>
              {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => <option key={i} value={i}>{d}</option>)}
            </Select>
          ) : (
            <div className="dt-form__row">
              <Input label="Due Date" id="dt-date" type="date" value={fDueDate} onChange={e => setFDueDate(e.target.value)} />
              <Input label="Time" id="dt-time" type="time" value={fDueTime} onChange={e => setFDueTime(e.target.value)} />
            </div>
          )}

          <Input label="Source Link (route)" id="dt-link" value={fSourceLink} onChange={e => setFSourceLink(e.target.value)} placeholder="e.g. /pipeline/board" />

          <div className="dt-form__row">
            <Select label="Link to Deal" id="dt-deal" value={fDealId} onChange={e => setFDealId(e.target.value)}>
              <option value="">— None —</option>
              {tList.map(t => <option key={t.id} value={t.id}>{t.contact?.name ?? 'Deal'} — {t.property?.address ?? 'Property'}</option>)}
            </Select>
            <Select label="Link to Contact" id="dt-contact" value={fContactId} onChange={e => setFContactId(e.target.value)}>
              <option value="">— None —</option>
              {cList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>

          {/* Link to Vendors (multi-select) */}
          <div className="dt-form__field">
            <label className="dt-form__label">Link to Vendors</label>
            {vList.length === 0 ? (
              <p className="dt-form__hint">
                No vendors yet. <a href="/vendors" onClick={e => { e.preventDefault(); navigate('/vendors') }}>Add some on the Vendors page</a>.
              </p>
            ) : (
              <div className="dt-vendor-picker">
                {vList.map(v => {
                  const checked = fVendorIds.includes(v.id)
                  return (
                    <label key={v.id} className={`dt-vendor-chip ${checked ? 'dt-vendor-chip--on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleVendorId(v.id)}
                      />
                      <span className="dt-vendor-chip__name">{v.name}</span>
                      {v.role && <span className="dt-vendor-chip__role">{v.role}</span>}
                    </label>
                  )
                })}
              </div>
            )}
            {fVendorIds.length > 0 && (
              <p className="dt-form__hint">{fVendorIds.length} vendor{fVendorIds.length > 1 ? 's' : ''} linked</p>
            )}
          </div>

          <div className="dt-form__actions">
            <Button variant="primary" onClick={saveTask}>{editItem ? 'Update Task' : 'Add Task'}</Button>
            {editItem && <Button variant="danger" onClick={() => deleteTask(editItem.id)}>Delete</Button>}
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}
