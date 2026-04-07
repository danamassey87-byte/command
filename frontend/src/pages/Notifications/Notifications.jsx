import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listActive, listSnoozed, listDismissed,
  markRead, markAllRead, keep, dismiss, snooze, restore,
  emitSample, NOTIFICATION_TYPES, typeMeta,
} from '../../lib/notifications'
import './Notifications.css'

const TABS = [
  { id: 'inbox',     label: 'Inbox',     desc: 'Active notifications'  },
  { id: 'kept',      label: 'Kept',      desc: 'Pinned to stay'        },
  { id: 'snoozed',   label: 'Snoozed',   desc: 'Coming back later'     },
  { id: 'dismissed', label: 'Dismissed', desc: 'Recently dismissed'    },
]

const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'type',   label: 'By type'      },
]

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Notifications() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('inbox')
  const [sort, setSort] = useState('newest')
  const [filterType, setFilterType] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [snoozeFor, setSnoozeFor] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      let data = []
      if (tab === 'inbox')          data = await listActive()
      else if (tab === 'kept')      data = (await listActive()).filter(n => n.status === 'kept')
      else if (tab === 'snoozed')   data = await listSnoozed()
      else if (tab === 'dismissed') data = await listDismissed()
      // Inbox excludes kept (kept gets its own tab)
      if (tab === 'inbox') data = data.filter(n => n.status !== 'kept')
      setItems(data)
    } catch (e) {
      setErr(e.message); setItems([])
    } finally { setLoading(false) }
  }, [tab])

  useEffect(() => { load() }, [load])

  // Type filter + sort applied client-side for instant response
  const visible = useMemo(() => {
    let out = filterType === 'all' ? items : items.filter(n => n.type === filterType)
    if (sort === 'newest')      out = [...out].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    else if (sort === 'oldest') out = [...out].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    else if (sort === 'type')   out = [...out].sort((a, b) => (a.type || '').localeCompare(b.type || '') || (new Date(b.created_at) - new Date(a.created_at)))
    return out
  }, [items, filterType, sort])

  // Group by type when sorting by type
  const grouped = useMemo(() => {
    if (sort !== 'type') return null
    const groups = {}
    visible.forEach(n => {
      const k = n.type || 'other'
      if (!groups[k]) groups[k] = []
      groups[k].push(n)
    })
    return groups
  }, [sort, visible])

  // Counts for type chips (always derived from full result set, not visible)
  const typeCounts = useMemo(() => {
    const counts = { all: items.length }
    items.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1 })
    return counts
  }, [items])

  // ─── actions ───
  const handleClick = async (n) => {
    if (n.status === 'unread') { await markRead(n.id).catch(()=>{}); load() }
    if (n.link) navigate(n.link)
  }
  const doKeep    = async (id) => { await keep(id);    load() }
  const doDismiss = async (id) => { await dismiss(id); load() }
  const doRestore = async (id) => { await restore(id); load() }
  const doSnooze  = async (id, dur) => { await snooze(id, dur); setSnoozeFor(null); load() }
  const doMarkAll = async () => { await markAllRead(); load() }
  const doSample  = async () => { await emitSample(); load() }

  return (
    <div className="notifs-page">
      <div className="notifs-page__header">
        <div>
          <h1 className="notifs-page__title">Notifications</h1>
          <p className="notifs-page__subtitle">Snooze, dismiss, or pin to keep — everything in one place.</p>
        </div>
        <div className="notifs-page__header-actions">
          <button className="notifs-btn notifs-btn--ghost" onClick={doSample} title="Insert a sample notification (for testing)">+ Test notification</button>
          {tab === 'inbox' && <button className="notifs-btn" onClick={doMarkAll}>Mark all read</button>}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="notifs-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`notifs-tab ${tab === t.id ? 'notifs-tab--active' : ''}`}
            onClick={() => { setTab(t.id); setFilterType('all') }}
          >
            <span className="notifs-tab__label">{t.label}</span>
            <span className="notifs-tab__desc">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* ─── Type filter chips + sort ─── */}
      <div className="notifs-toolbar">
        <div className="notifs-chips">
          <button
            className={`notifs-chip ${filterType === 'all' ? 'notifs-chip--active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All <span className="notifs-chip__count">{typeCounts.all || 0}</span>
          </button>
          {Object.entries(NOTIFICATION_TYPES).map(([id, meta]) => {
            const c = typeCounts[id] || 0
            if (c === 0) return null
            return (
              <button
                key={id}
                className={`notifs-chip ${filterType === id ? 'notifs-chip--active' : ''}`}
                onClick={() => setFilterType(id)}
                style={filterType === id ? { borderColor: meta.color, color: meta.color } : undefined}
              >
                <span>{meta.icon}</span> {meta.label} <span className="notifs-chip__count">{c}</span>
              </button>
            )
          })}
        </div>
        <select className="notifs-sort" value={sort} onChange={e => setSort(e.target.value)}>
          {SORTS.map(s => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
        </select>
      </div>

      {/* ─── List ─── */}
      <div className="notifs-list">
        {loading && <div className="notifs-empty">Loading…</div>}
        {err && (
          <div className="notifs-empty notifs-empty--error">
            {err.includes('relation') || err.includes('does not exist')
              ? <>Run <code>frontend/scripts/migration_notifications.sql</code> in Supabase to enable notifications.</>
              : err}
          </div>
        )}
        {!loading && !err && visible.length === 0 && (
          <div className="notifs-empty">
            {tab === 'inbox'     && "You're all caught up."}
            {tab === 'kept'      && "Nothing pinned yet. Use the 📌 button to keep important items here."}
            {tab === 'snoozed'   && "Nothing snoozed."}
            {tab === 'dismissed' && "No dismissed items."}
          </div>
        )}

        {!loading && !err && sort === 'type' && grouped
          ? Object.entries(grouped).map(([type, group]) => (
              <div key={type} className="notifs-group">
                <div className="notifs-group__header">
                  <span style={{ color: typeMeta(type).color }}>{typeMeta(type).icon}</span>
                  {typeMeta(type).label}
                  <span className="notifs-group__count">{group.length}</span>
                </div>
                {group.map(n => renderRow(n))}
              </div>
            ))
          : visible.map(n => renderRow(n))}
      </div>
    </div>
  )

  function renderRow(n) {
    const meta = typeMeta(n.type)
    return (
      <div key={n.id} className={`notifs-row notifs-row--${n.status}`}>
        <div className="notifs-row__main" onClick={() => handleClick(n)}>
          <div className="notifs-row__icon" style={{ background: meta.color + '22', color: meta.color }}>
            {meta.icon}
          </div>
          <div className="notifs-row__content">
            <div className="notifs-row__title">
              {n.status === 'unread' && <span className="notifs-row__dot" />}
              {n.title}
              {n.status === 'kept'    && <span className="notifs-row__pin">📌 Kept</span>}
              {n.status === 'snoozed' && <span className="notifs-row__pin">⏰ Until {fmtDate(n.snooze_until)}</span>}
            </div>
            {n.body && <div className="notifs-row__body">{n.body}</div>}
            <div className="notifs-row__meta">
              <span className="notifs-row__type-chip" style={{ color: meta.color }}>{meta.label}</span>
              <span>· {fmtDate(n.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="notifs-row__actions">
          {tab === 'inbox' && <>
            <button title="Snooze" onClick={() => setSnoozeFor(snoozeFor === n.id ? null : n.id)}>⏰ Snooze</button>
            <button title="Keep" onClick={() => doKeep(n.id)}>📌 Keep</button>
            <button title="Dismiss" onClick={() => doDismiss(n.id)}>✕ Dismiss</button>
          </>}
          {tab === 'kept' && <>
            <button title="Unpin" onClick={() => doRestore(n.id)}>Unpin</button>
            <button title="Dismiss" onClick={() => doDismiss(n.id)}>✕ Dismiss</button>
          </>}
          {tab === 'snoozed' && <>
            <button title="Wake now" onClick={() => doRestore(n.id)}>Wake now</button>
            <button title="Dismiss" onClick={() => doDismiss(n.id)}>✕ Dismiss</button>
          </>}
          {tab === 'dismissed' && <>
            <button title="Restore" onClick={() => doRestore(n.id)}>↶ Restore</button>
          </>}
        </div>
        {snoozeFor === n.id && (
          <div className="notifs-row__snooze-menu">
            <button onClick={() => doSnooze(n.id, '1h')}>1 hour</button>
            <button onClick={() => doSnooze(n.id, '3h')}>3 hours</button>
            <button onClick={() => doSnooze(n.id, 'tomorrow')}>Tomorrow 9am</button>
            <button onClick={() => doSnooze(n.id, 'nextweek')}>Next week</button>
          </div>
        )}
      </div>
    )
  }
}
