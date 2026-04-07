import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listActive, unreadCount, markRead, markAllRead,
  keep, dismiss, snooze, typeMeta,
} from '../../lib/notifications'
import './NotificationsBell.css'

const POLL_MS = 60_000

function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [snoozeFor, setSnoozeFor] = useState(null)   // id of item showing snooze menu
  const panelRef = useRef(null)
  const navigate = useNavigate()

  const refreshCount = useCallback(async () => {
    try { setCount(await unreadCount()) }
    catch (e) { /* table may not exist yet — fail silently */ setCount(0) }
  }, [])

  const refreshList = useCallback(async () => {
    setLoading(true); setErr(null)
    try { setItems(await listActive()) }
    catch (e) { setErr(e.message); setItems([]) }
    finally   { setLoading(false) }
  }, [])

  // Poll unread count
  useEffect(() => {
    refreshCount()
    const t = setInterval(refreshCount, POLL_MS)
    return () => clearInterval(t)
  }, [refreshCount])

  // Open panel → load items
  useEffect(() => {
    if (open) refreshList()
  }, [open, refreshList])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const handleClick = async (n) => {
    if (n.status === 'unread') {
      await markRead(n.id).catch(() => {})
      refreshCount()
    }
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    }
  }

  const doKeep    = async (id) => { await keep(id);    refreshList(); refreshCount() }
  const doDismiss = async (id) => { await dismiss(id); refreshList(); refreshCount() }
  const doSnooze  = async (id, dur) => { await snooze(id, dur); setSnoozeFor(null); refreshList(); refreshCount() }
  const doMarkAll = async () => { await markAllRead(); refreshList(); refreshCount() }

  return (
    <div className="notif-bell" ref={panelRef}>
      <button
        className={`notif-bell__btn ${count > 0 ? 'notif-bell__btn--has-unread' : ''}`}
        onClick={() => setOpen(p => !p)}
        title="Notifications"
        aria-label={`Notifications (${count} unread)`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {count > 0 && <span className="notif-bell__badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="notif-bell__panel">
          <div className="notif-bell__header">
            <span className="notif-bell__title">Notifications</span>
            <div className="notif-bell__header-actions">
              <button className="notif-bell__link-btn" onClick={doMarkAll}>Mark all read</button>
              <button
                className="notif-bell__link-btn"
                onClick={() => { setOpen(false); navigate('/notifications') }}
              >
                View all
              </button>
            </div>
          </div>

          <div className="notif-bell__body">
            {loading && <div className="notif-bell__empty">Loading…</div>}
            {err && (
              <div className="notif-bell__empty notif-bell__empty--error">
                {err.includes('relation') || err.includes('does not exist')
                  ? 'Run migration_notifications.sql to enable notifications.'
                  : err}
              </div>
            )}
            {!loading && !err && items.length === 0 && (
              <div className="notif-bell__empty">You're all caught up.</div>
            )}
            {!loading && !err && items.map(n => {
              const meta = typeMeta(n.type)
              return (
                <div key={n.id} className={`notif-item notif-item--${n.status}`}>
                  <div className="notif-item__main" onClick={() => handleClick(n)}>
                    <div className="notif-item__icon" style={{ background: meta.color + '22', color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="notif-item__content">
                      <div className="notif-item__title">
                        {n.status === 'unread' && <span className="notif-item__dot" />}
                        {n.title}
                        {n.status === 'kept' && <span className="notif-item__pin">📌</span>}
                      </div>
                      {n.body && <div className="notif-item__body">{n.body}</div>}
                      <div className="notif-item__meta">
                        <span className="notif-item__type-chip" style={{ color: meta.color }}>{meta.label}</span>
                        <span>· {timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="notif-item__actions">
                    <button title="Snooze" onClick={() => setSnoozeFor(snoozeFor === n.id ? null : n.id)}>⏰</button>
                    <button title={n.status === 'kept' ? 'Already kept' : 'Keep'} onClick={() => doKeep(n.id)} disabled={n.status === 'kept'}>📌</button>
                    <button title="Dismiss" onClick={() => doDismiss(n.id)}>✕</button>
                  </div>
                  {snoozeFor === n.id && (
                    <div className="notif-item__snooze-menu">
                      <button onClick={() => doSnooze(n.id, '1h')}>1 hour</button>
                      <button onClick={() => doSnooze(n.id, '3h')}>3 hours</button>
                      <button onClick={() => doSnooze(n.id, 'tomorrow')}>Tomorrow 9am</button>
                      <button onClick={() => doSnooze(n.id, 'nextweek')}>Next week</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
