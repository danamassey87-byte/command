import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStaleRecords, syncStaleNotifications } from '../lib/safeguards'
import './StaleRecordsWidget.css'

const KIND_LABELS = {
  stale_lead:           { icon: '🥶', label: 'Cold lead' },
  overdue_appointment:  { icon: '⏰', label: 'Overdue appointment' },
  overdue_closing:      { icon: '📅', label: 'Closing overdue' },
}

/** Drop into a dashboard. Surfaces stale records and lets the user
 *  push them all into the notifications inbox in one click. */
export default function StaleRecordsWidget() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true); setError(null)
    try { setItems(await getStaleRecords()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const n = await syncStaleNotifications()
      alert(`${n} new notification${n === 1 ? '' : 's'} created.`)
    } catch (e) { setError(e.message) }
    finally { setSyncing(false) }
  }

  if (loading) return <div className="stale-w stale-w--loading">Checking for stale records…</div>
  if (!items.length) return null

  return (
    <div className="stale-w">
      <div className="stale-w__header">
        <div>
          <div className="stale-w__title">⚠️ {items.length} record{items.length === 1 ? '' : 's'} need attention</div>
          <div className="stale-w__sub">Leads gone cold, overdue appointments, escrow past close.</div>
        </div>
        <button className="stale-w__sync" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Push to inbox'}
        </button>
      </div>
      {error && <div className="stale-w__error">{error}</div>}
      <ul className="stale-w__list">
        {items.slice(0, 8).map(it => {
          const meta = KIND_LABELS[it.kind] ?? { icon: '•', label: it.kind }
          return (
            <li key={`${it.table_name}-${it.record_id}`} className="stale-w__item">
              <span className="stale-w__icon">{meta.icon}</span>
              <div className="stale-w__body">
                <div className="stale-w__label">{it.label}</div>
                <div className="stale-w__meta">
                  {meta.label} · {it.days_stale} day{it.days_stale === 1 ? '' : 's'}
                </div>
              </div>
              <button
                className="stale-w__open"
                onClick={() => navigate(
                  it.table_name === 'contacts' ? `/crm/contacts/${it.record_id}` :
                  it.table_name === 'listing_appointments' ? '/calendar' :
                  it.table_name === 'transactions' ? '/pipeline' : '/'
                )}
              >Open</button>
            </li>
          )
        })}
      </ul>
      {items.length > 8 && (
        <div className="stale-w__more">+ {items.length - 8} more</div>
      )}
    </div>
  )
}
