import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button, Badge, SectionHeader, Card, SlidePanel, Input, Textarea, InfoTip } from '../../components/ui/index.jsx'
import { useDailyActivity, useActivityTargets, useAutoStats } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './DailyTracker.css'

const METRICS = [
  { key: 'calls_made',    label: 'Calls Made',    targetKey: 'weekly_calls',  icon: '📞' },
  { key: 'texts_sent',    label: 'Texts Sent',    targetKey: 'weekly_texts',  icon: '💬' },
  { key: 'doors_knocked', label: 'Doors Knocked', targetKey: 'weekly_doors',  icon: '🚪' },
  { key: 'emails_sent',   label: 'Emails Sent',   targetKey: 'weekly_emails', icon: '✉️'  },
  { key: 'appts_set',     label: 'Appts Set',     targetKey: 'weekly_appts',  icon: '📅' },
  { key: 'offers_written',label: 'Offers Written', targetKey: null,           icon: '📝' },
]

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return {
    weekStart: mon.toISOString().slice(0,10),
    weekEnd:   sun.toISOString().slice(0,10),
  }
}

function get30DayBounds() {
  const now   = new Date()
  const from  = new Date(now); from.setDate(now.getDate() - 29)
  return {
    from: from.toISOString().slice(0,10),
    to:   now.toISOString().slice(0,10),
  }
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function pctColor(pct) {
  if (pct >= 80) return 'var(--color-success)'
  if (pct >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

// ─── Daily Tasks ──────────────────────────────────────────────────────────────
const PRIORITIES = [
  { value: 'high',   label: '🔴 High',   color: 'var(--color-danger)' },
  { value: 'normal', label: '🟡 Normal', color: 'var(--color-warning)' },
  { value: 'low',    label: '🟢 Low',    color: 'var(--color-success)' },
]
const STORAGE_KEY = 'dt_tasks'
let _taskIdSeq = Date.now()
function newId() { return String(++_taskIdSeq) }

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function sortTasks(tasks) {
  const pri = { high: 0, normal: 1, low: 2 }
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return (pri[a.priority] ?? 1) - (pri[b.priority] ?? 1)
  })
}

function DailyTasksCard() {
  const [tasks, setTasksRaw] = useState(() => loadTasks())
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('normal')
  const [sortBy, setSortBy] = useState('priority')
  const [showDone, setShowDone] = useState(true)

  const setTasks = useCallback(updater => {
    setTasksRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveTasks(next)
      return next
    })
  }, [])

  const addTask = () => {
    if (!text.trim()) return
    setTasks(prev => [...prev, { id: newId(), text: text.trim(), priority, completed: false, created: Date.now() }])
    setText('')
  }

  const toggle = id => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  const remove = id => setTasks(prev => prev.filter(t => t.id !== id))
  const clearDone = () => setTasks(prev => prev.filter(t => !t.completed))

  const displayed = useMemo(() => {
    let list = showDone ? tasks : tasks.filter(t => !t.completed)
    if (sortBy === 'priority') list = sortTasks(list)
    else list = [...list].sort((a, b) => b.created - a.created)
    return list
  }, [tasks, sortBy, showDone])

  const doneCount = tasks.filter(t => t.completed).length

  return (
    <Card className="dt-tasks-card">
      <div className="dt-tasks-header">
        <h4 className="dt-tasks-title">Today's Tasks <InfoTip text="Your personal to-do list for today. Add tasks with a priority level, check them off as you go, and sort by priority or newest. Saved locally on this device." /></h4>
        <div className="dt-tasks-controls">
          <button
            className={`dt-tasks-ctrl-btn${sortBy === 'priority' ? ' dt-tasks-ctrl-btn--active' : ''}`}
            onClick={() => setSortBy(s => s === 'priority' ? 'newest' : 'priority')}
          >
            {sortBy === 'priority' ? 'Sort: Priority' : 'Sort: Newest'}
          </button>
          <button
            className={`dt-tasks-ctrl-btn${showDone ? '' : ' dt-tasks-ctrl-btn--muted'}`}
            onClick={() => setShowDone(s => !s)}
          >
            {showDone ? `Hide Done (${doneCount})` : `Show Done (${doneCount})`}
          </button>
          {doneCount > 0 && (
            <button className="dt-tasks-ctrl-btn dt-tasks-ctrl-btn--danger" onClick={clearDone}>
              Clear Done
            </button>
          )}
        </div>
      </div>

      <div className="dt-tasks-add">
        <div className="dt-tasks-priority-btns">
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              className={`dt-pri-btn${priority === p.value ? ' dt-pri-btn--active' : ''}`}
              style={priority === p.value ? { borderColor: p.color, color: p.color } : {}}
              onClick={() => setPriority(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="dt-tasks-input-row">
          <input
            className="dt-task-input"
            type="text"
            placeholder="Add a task…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <button className="dt-task-add-btn" onClick={addTask}>Add</button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <p className="dt-tasks-empty">No tasks yet — add one above.</p>
      ) : (
        <ul className="dt-tasks-list">
          {displayed.map(t => {
            const priColor = PRIORITIES.find(p => p.value === t.priority)?.color ?? 'var(--color-text-muted)'
            return (
              <li key={t.id} className={`dt-task-item${t.completed ? ' dt-task-item--done' : ''}`}>
                <button className="dt-task-check" onClick={() => toggle(t.id)}>
                  {t.completed ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                </button>
                <span className="dt-task-pri-dot" style={{ background: priColor }} />
                <span className="dt-task-text">{t.text}</span>
                <button className="dt-task-del" onClick={() => remove(t.id)}>✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export default function DailyTracker() {
  const today = new Date().toISOString().slice(0,10)
  const { weekStart, weekEnd } = useMemo(getWeekBounds, [])
  const { from: histFrom, to: histTo } = useMemo(get30DayBounds, [])

  const { data: weekRows,    refetch: refetchWeek }    = useDailyActivity(weekStart, weekEnd)
  const { data: historyRows, refetch: refetchHistory } = useDailyActivity(histFrom, histTo)
  const { data: targetsRow,  refetch: refetchTargets } = useActivityTargets()
  const { data: autoStats }                            = useAutoStats(today)

  const targets = targetsRow ?? { weekly_calls:50, weekly_texts:30, weekly_doors:20, weekly_emails:20, weekly_appts:5 }

  // Today's record from week data
  const todayRecord = useMemo(() =>
    (weekRows ?? []).find(r => r.date === today) ?? null
  , [weekRows, today])

  const [draft, setDraft] = useState({
    calls_made: 0, texts_sent: 0, doors_knocked: 0,
    emails_sent: 0, appts_set: 0, offers_written: 0, notes: '',
  })
  // Sync draft when todayRecord loads
  const [synced, setSynced] = useState(false)
  if (todayRecord && !synced) {
    setDraft({
      calls_made:    todayRecord.calls_made    ?? 0,
      texts_sent:    todayRecord.texts_sent    ?? 0,
      doors_knocked: todayRecord.doors_knocked ?? 0,
      emails_sent:   todayRecord.emails_sent   ?? 0,
      appts_set:     todayRecord.appts_set     ?? 0,
      offers_written:todayRecord.offers_written?? 0,
      notes:         todayRecord.notes         ?? '',
    })
    setSynced(true)
  }

  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await DB.upsertDailyActivity(today, {
        calls_made:    Number(draft.calls_made)    || 0,
        texts_sent:    Number(draft.texts_sent)    || 0,
        doors_knocked: Number(draft.doors_knocked) || 0,
        emails_sent:   Number(draft.emails_sent)   || 0,
        appts_set:     Number(draft.appts_set)     || 0,
        offers_written:Number(draft.offers_written)|| 0,
        notes:         draft.notes.trim() || null,
      })
      setSynced(false)
      await refetchWeek()
      await refetchHistory()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  // Week totals
  const weekTotals = useMemo(() => {
    const rows = weekRows ?? []
    return METRICS.reduce((acc, m) => {
      acc[m.key] = rows.reduce((s, r) => s + (r[m.key] ?? 0), 0)
      return acc
    }, {})
  }, [weekRows])

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [targetDraft, setTargetDraft]   = useState({})
  const [savingTargets, setSavingTargets] = useState(false)
  const openSettings = () => {
    setTargetDraft({
      weekly_calls:  targets.weekly_calls,
      weekly_texts:  targets.weekly_texts,
      weekly_doors:  targets.weekly_doors,
      weekly_emails: targets.weekly_emails,
      weekly_appts:  targets.weekly_appts,
    })
    setSettingsOpen(true)
  }
  const saveTargets = async () => {
    if (!targetsRow?.id) return
    setSavingTargets(true)
    try {
      await DB.updateActivityTargets(targetsRow.id, {
        weekly_calls:  Number(targetDraft.weekly_calls)  || 0,
        weekly_texts:  Number(targetDraft.weekly_texts)  || 0,
        weekly_doors:  Number(targetDraft.weekly_doors)  || 0,
        weekly_emails: Number(targetDraft.weekly_emails) || 0,
        weekly_appts:  Number(targetDraft.weekly_appts)  || 0,
      })
      await refetchTargets()
      setSettingsOpen(false)
    } catch { /* silent */ } finally { setSavingTargets(false) }
  }

  const history = useMemo(() =>
    [...(historyRows ?? [])].sort((a,b) => b.date.localeCompare(a.date))
  , [historyRows])

  const weekLabel = useMemo(() => {
    const s = new Date(weekStart + 'T12:00:00')
    const e = new Date(weekEnd   + 'T12:00:00')
    const mo = (d) => d.toLocaleDateString('en-US',{month:'short',day:'numeric'})
    return `Week of ${mo(s)} – ${mo(e)}`
  }, [weekStart, weekEnd])

  return (
    <div className="daily-tracker">
      {/* ── Today's Activity (compact) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--brown-dark)' }}>{fmtDate(today)}</h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Today'}
          </Button>
          <Button variant="ghost" size="sm" onClick={openSettings}>Targets</Button>
        </div>
      </div>
      <div className="dt-inputs-grid" style={{ marginBottom: 10 }}>
        {METRICS.map(m => (
          <div key={m.key} className="dt-metric-input">
            <label className="dt-metric-label">{m.icon} {m.label}</label>
            <input
              type="number"
              min="0"
              className="dt-number-input"
              value={draft[m.key]}
              onChange={e => set(m.key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <textarea
          rows={1}
          value={draft.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Notes — what happened today?"
          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>

      {/* ── Tasks ── */}
      <DailyTasksCard />

      {/* ── Auto-Tracked Today ── */}
      <Card className="dt-auto-card">
        <div className="dt-auto-header">
          <h4 className="dt-auto-title">Auto-Tracked Today <InfoTip text="These numbers are automatically counted from your existing records — letters from LeadGen (letter_sent_at = today) and outreach method from Open House contacts. No manual entry needed." /></h4>
          <span className="dt-auto-hint">Pulled from your Leads & OH Outreach records</span>
        </div>
        <div className="dt-auto-grid">
          <div className="dt-auto-stat">
            <span className="dt-auto-num">{autoStats?.letters_sent ?? '—'}</span>
            <span className="dt-auto-label">📨 Letters Sent</span>
            <span className="dt-auto-src">from LeadGen</span>
          </div>
          <div className="dt-auto-stat">
            <span className="dt-auto-num">{autoStats?.oh_emails ?? '—'}</span>
            <span className="dt-auto-label">✉️ OH Outreach Emails</span>
            <span className="dt-auto-src">from OH Outreach</span>
          </div>
          <div className="dt-auto-stat">
            <span className="dt-auto-num">{autoStats?.oh_texts ?? '—'}</span>
            <span className="dt-auto-label">💬 OH Outreach Texts</span>
            <span className="dt-auto-src">from OH Outreach</span>
          </div>
        </div>
      </Card>

      {/* ── This Week ── */}
      <Card className="dt-week-card">
        <h3 className="dt-section-title">{weekLabel} <InfoTip text="Progress bars comparing your week-to-date totals against your weekly targets. Green = 80%+, yellow = 50–79%, red = below 50%. Set your targets using the Set Targets button." /></h3>
        <div className="dt-week-bars">
          {METRICS.filter(m => m.targetKey).map(m => {
            const actual = weekTotals[m.key] ?? 0
            const target = targets[m.targetKey] ?? 1
            const pct    = Math.min(100, Math.round((actual / target) * 100))
            return (
              <div key={m.key} className="dt-bar-row">
                <span className="dt-bar-label">{m.icon} {m.label}</span>
                <div className="dt-bar-track">
                  <div className="dt-bar-fill" style={{ width: `${pct}%`, background: pctColor(pct) }} />
                </div>
                <span className="dt-bar-stat" style={{ color: pctColor(pct) }}>
                  {actual}<span className="dt-bar-target">/{target}</span>
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── 30-Day History ── */}
      <Card className="dt-history-card">
        <h3 className="dt-section-title">Last 30 Days <InfoTip text="A full log of every day you've saved activity data. Click Save Today above to add today's entry. Each row shows all activity counts for that date." position="left" /></h3>
        {history.length === 0 ? (
          <p className="dt-empty">No activity logged yet. Start by saving today's numbers above.</p>
        ) : (
          <div className="dt-history-table-wrap">
            <table className="dt-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {METRICS.map(m => <th key={m.key}>{m.icon}</th>)}
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => {
                  const isToday = row.date === today
                  return (
                    <tr key={row.id} className={isToday ? 'dt-history-row--today' : ''}>
                      <td className="dt-history-date">{fmtDate(row.date)}{isToday ? ' ·  Today' : ''}</td>
                      {METRICS.map(m => (
                        <td key={m.key} className="dt-history-num">
                          {row[m.key] > 0 ? <span className="dt-history-val">{row[m.key]}</span> : <span className="dt-history-zero">—</span>}
                        </td>
                      ))}
                      <td className="dt-history-note">{row.notes || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Targets Panel ── */}
      <SlidePanel open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Weekly Targets" width={400}>
        <p style={{ fontSize:'0.82rem', color:'var(--color-text-muted)', marginBottom:16 }}>
          Set your weekly goals for each activity type. These are used to calculate your progress bars.
        </p>
        <div className="panel-section">
          {METRICS.filter(m => m.targetKey).map(m => (
            <Input
              key={m.key}
              label={`${m.icon} ${m.label} (weekly)`}
              type="number"
              min="0"
              value={targetDraft[m.targetKey] ?? ''}
              onChange={e => setTargetDraft(p => ({ ...p, [m.targetKey]: e.target.value }))}
            />
          ))}
        </div>
        <div className="panel-footer">
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={saveTargets} disabled={savingTargets}>
            {savingTargets ? 'Saving…' : 'Save Targets'}
          </Button>
        </div>
      </SlidePanel>
    </div>
  )
}
