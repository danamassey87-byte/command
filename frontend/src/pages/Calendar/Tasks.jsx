import { useState, useMemo, useCallback } from 'react'
import { Button, Badge, Card, SlidePanel, Input, Textarea, Select } from '../../components/ui/index.jsx'
import './Tasks.css'

// ─── Constants ───────────────────────────────────────────────────────────────
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const CATEGORIES = [
  { value: 'prospecting', label: 'Prospecting', color: 'var(--color-info)' },
  { value: 'admin',       label: 'Admin',       color: 'var(--brown-mid)' },
  { value: 'marketing',   label: 'Marketing',   color: 'var(--color-warning)' },
  { value: 'transaction', label: 'Transaction', color: 'var(--color-success)' },
  { value: 'personal',    label: 'Personal',    color: 'var(--color-danger)' },
]
const PRIORITIES = [
  { value: 'high',   label: 'High',   color: 'var(--color-danger)' },
  { value: 'normal', label: 'Normal', color: 'var(--color-warning)' },
  { value: 'low',    label: 'Low',    color: 'var(--color-success)' },
]

const STORAGE_KEY = 'cal_tasks'
let _seq = Date.now()
function newId() { return String(++_seq) }

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0,0,0,0)
  return mon
}

function fmtDateISO(d) { return d.toISOString().slice(0, 10) }

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() // 0=Sun ... 6=Sat
}

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveTasks(tasks) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)) }

// ─── Component ───────────────────────────────────────────────────────────────
export default function Tasks() {
  const [tasks, setTasksRaw] = useState(() => loadTasks())
  const [panelOpen, setPanelOpen] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('admin')
  const [priority, setPriority] = useState('normal')
  const [isRecurring, setIsRecurring] = useState(true)
  const [recurDay, setRecurDay] = useState(1) // 1=Monday
  const [taskDate, setTaskDate] = useState('')
  const [taskTime, setTaskTime] = useState('')

  const setTasks = useCallback(updater => {
    setTasksRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveTasks(next)
      return next
    })
  }, [])

  // Current week Monday
  const weekMon = useMemo(() => getWeekBounds(), [])

  // Build week dates (Mon-Fri)
  const weekDates = useMemo(() => {
    return WEEKDAYS.map((_, i) => {
      const d = new Date(weekMon)
      d.setDate(weekMon.getDate() + i)
      return d
    })
  }, [weekMon])

  // Tasks grouped by day (Mon=1 ... Fri=5)
  const tasksByDay = useMemo(() => {
    const map = { 1: [], 2: [], 3: [], 4: [], 5: [] }

    tasks.forEach(t => {
      if (t.completed && !showCompleted) return

      if (t.is_recurring) {
        const dow = t.day_of_week
        if (dow >= 1 && dow <= 5) map[dow].push(t)
      } else if (t.date) {
        const dow = getDayOfWeek(t.date)
        if (dow >= 1 && dow <= 5) {
          // Only show if it's this week
          const td = new Date(t.date + 'T12:00:00')
          const weekEnd = new Date(weekMon); weekEnd.setDate(weekMon.getDate() + 4)
          if (td >= weekMon && td <= weekEnd) map[dow].push(t)
        }
      }
    })

    // Sort: incomplete first, then by priority
    const pri = { high: 0, normal: 1, low: 2 }
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        return (pri[a.priority] ?? 1) - (pri[b.priority] ?? 1)
      })
    )
    return map
  }, [tasks, showCompleted, weekMon])

  // Stats
  const stats = useMemo(() => {
    const all = Object.values(tasksByDay).flat()
    const total = all.length
    const done = all.filter(t => t.completed).length
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [tasksByDay])

  // Handlers
  const openNew = (dow = 1) => {
    setEditTask(null)
    setTitle('')
    setDescription('')
    setCategory('admin')
    setPriority('normal')
    setIsRecurring(true)
    setRecurDay(dow)
    setTaskDate('')
    setTaskTime('')
    setPanelOpen(true)
  }

  const openEdit = (task) => {
    setEditTask(task)
    setTitle(task.title)
    setDescription(task.description || '')
    setCategory(task.category || 'admin')
    setPriority(task.priority || 'normal')
    setIsRecurring(task.is_recurring ?? true)
    setRecurDay(task.day_of_week ?? 1)
    setTaskDate(task.date || '')
    setTaskTime(task.time || '')
    setPanelOpen(true)
  }

  const saveTask = () => {
    if (!title.trim()) return
    const taskData = {
      id: editTask?.id || newId(),
      title: title.trim(),
      description: description.trim() || null,
      category,
      priority,
      is_recurring: isRecurring,
      day_of_week: isRecurring ? Number(recurDay) : null,
      date: !isRecurring ? taskDate : null,
      time: taskTime || null,
      completed: editTask?.completed ?? false,
      completed_at: editTask?.completed_at ?? null,
      created_at: editTask?.created_at ?? new Date().toISOString(),
    }
    if (editTask) {
      setTasks(prev => prev.map(t => t.id === editTask.id ? taskData : t))
    } else {
      setTasks(prev => [...prev, taskData])
    }
    setPanelOpen(false)
  }

  const toggleComplete = (id) => {
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null }
        : t
    ))
  }

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setPanelOpen(false)
  }

  // Reset recurring tasks for the week
  const resetWeek = () => {
    setTasks(prev => prev.map(t => t.is_recurring ? { ...t, completed: false, completed_at: null } : t))
  }

  const catColor = (cat) => CATEGORIES.find(c => c.value === cat)?.color ?? 'var(--brown-mid)'

  return (
    <div className="tasks">
      {/* ─── Top Bar ─── */}
      <div className="tasks__topbar">
        <div className="tasks__stats">
          <div className="tasks__progress-ring">
            <svg viewBox="0 0 36 36" className="tasks__ring-svg">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-border-light)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke="var(--color-success)" strokeWidth="3"
                strokeDasharray={`${stats.pct} 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <span className="tasks__ring-pct">{stats.pct}%</span>
          </div>
          <div className="tasks__stats-text">
            <span className="tasks__stats-done">{stats.done} of {stats.total} tasks</span>
            <span className="tasks__stats-label">completed this week</span>
          </div>
        </div>
        <div className="tasks__actions">
          <label className="tasks__toggle">
            <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />
            <span>Show completed</span>
          </label>
          <Button variant="ghost" size="sm" onClick={resetWeek}>Reset Week</Button>
          <Button variant="primary" size="sm" icon="+" onClick={() => openNew()}>Add Task</Button>
        </div>
      </div>

      {/* ─── Weekly Board ─── */}
      <div className="tasks__board">
        {[1, 2, 3, 4, 5].map(dow => {
          const dayDate = weekDates[dow - 1]
          const isToday = new Date().getDay() === dow
          const dayTasks = tasksByDay[dow] ?? []
          const doneCount = dayTasks.filter(t => t.completed).length

          return (
            <div key={dow} className={`tasks__column ${isToday ? 'tasks__column--today' : ''}`}>
              <div className="tasks__col-header">
                <div className="tasks__col-title">
                  <span className="tasks__col-day">{WEEKDAY_SHORT[dow - 1]}</span>
                  <span className="tasks__col-date">{dayDate.getDate()}</span>
                </div>
                <span className="tasks__col-count">
                  {doneCount}/{dayTasks.length}
                </span>
              </div>
              <div className="tasks__col-body">
                {dayTasks.length === 0 && (
                  <p className="tasks__col-empty">No tasks</p>
                )}
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    className={`tasks__task ${task.completed ? 'tasks__task--done' : ''}`}
                  >
                    <button
                      className="tasks__check"
                      onClick={() => toggleComplete(task.id)}
                      aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.completed ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="tasks__check-circle" />
                      )}
                    </button>
                    <button className="tasks__task-body" onClick={() => openEdit(task)}>
                      <span className="tasks__task-title">{task.title}</span>
                      <div className="tasks__task-meta">
                        <span className="tasks__task-cat" style={{ background: catColor(task.category) }}>
                          {task.category}
                        </span>
                        {task.time && <span className="tasks__task-time">{new Date(`2000-01-01T${task.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
                        {task.is_recurring && <span className="tasks__task-recur" title="Recurring">↻</span>}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
              <button className="tasks__add-btn" onClick={() => openNew(dow)}>+ Add</button>
            </div>
          )
        })}
      </div>

      {/* ─── One-time tasks without a date ─── */}
      {(() => {
        const unscheduled = tasks.filter(t => !t.is_recurring && !t.date && (!t.completed || showCompleted))
        if (unscheduled.length === 0) return null
        return (
          <div className="tasks__unscheduled">
            <h3 className="tasks__unscheduled-title">Unscheduled</h3>
            <div className="tasks__unscheduled-list">
              {unscheduled.map(task => (
                <div key={task.id} className={`tasks__task ${task.completed ? 'tasks__task--done' : ''}`}>
                  <button className="tasks__check" onClick={() => toggleComplete(task.id)} aria-label="Toggle complete">
                    {task.completed ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : <span className="tasks__check-circle" />}
                  </button>
                  <button className="tasks__task-body" onClick={() => openEdit(task)}>
                    <span className="tasks__task-title">{task.title}</span>
                    <span className="tasks__task-cat" style={{ background: catColor(task.category) }}>{task.category}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ─── Add / Edit Panel ─── */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editTask ? 'Edit Task' : 'New Task'}
        subtitle={editTask ? 'Update task details' : 'Add to your weekly board'}
      >
        <div className="tasks__form">
          <Input label="Task" id="task-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Follow up with leads" />
          <Textarea label="Notes (optional)" id="task-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} />

          <div className="tasks__form-row">
            <Select label="Category" id="task-cat" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Select label="Priority" id="task-pri" value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </div>

          <div className="tasks__form-toggle">
            <label className="tasks__toggle">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
              <span>Recurring weekly</span>
            </label>
          </div>

          {isRecurring ? (
            <Select label="Day" id="task-dow" value={recurDay} onChange={e => setRecurDay(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
            </Select>
          ) : (
            <Input label="Date" id="task-date" type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} />
          )}

          <Input label="Time (optional)" id="task-time" type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} />

          <div className="tasks__form-actions">
            <Button variant="primary" onClick={saveTask}>{editTask ? 'Update' : 'Add Task'}</Button>
            {editTask && <Button variant="danger" onClick={() => deleteTask(editTask.id)}>Delete</Button>}
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}
