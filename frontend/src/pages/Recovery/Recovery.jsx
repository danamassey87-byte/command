import { useState, useEffect } from 'react'
import { Button } from '../../components/ui'
import {
  getTrashRecords, restore, purgeNow, archive,
} from '../../lib/safeguards'
import './Recovery.css'

const TABS = [
  { id: 'deleted',  label: 'Recently Deleted' },
  { id: 'archived', label: 'Archived' },
]

const TABLE_LABELS = {
  contacts:             'Contact',
  properties:           'Property',
  listings:             'Listing',
  listing_appointments: 'Appointment',
  transactions:         'Transaction',
}

export default function Recovery() {
  const [tab, setTab] = useState('deleted')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try { setRows(await getTrashRecords()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r =>
    tab === 'deleted' ? !!r.deleted_at : !!r.archived_at && !r.deleted_at
  )

  const daysLeft = (deletedAt) => {
    const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86_400_000)
    return Math.max(0, diff)
  }

  const handleRestore = async (row) => {
    setBusyId(row.id)
    try { await restore(row.table_name, row.id); await load() }
    catch (e) { setError(e.message) }
    finally { setBusyId(null) }
  }

  const handleArchive = async (row) => {
    setBusyId(row.id)
    try { await archive(row.table_name, row.id); await load() }
    catch (e) { setError(e.message) }
    finally { setBusyId(null) }
  }

  const handlePurge = async (row) => {
    if (!confirm(`Permanently delete this ${TABLE_LABELS[row.table_name] ?? row.table_name}? This cannot be undone.`)) return
    setBusyId(row.id)
    try { await purgeNow(row.table_name, row.id); await load() }
    catch (e) { setError(e.message) }
    finally { setBusyId(null) }
  }

  return (
    <div className="recovery">
      <div className="recovery__intro">
        Soft-deleted records are kept for 30 days before permanent purge. Archived records stay indefinitely but are hidden from normal lists.
      </div>

      <div className="recovery__tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`recovery__tab ${tab === t.id ? 'recovery__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {error && <div className="recovery__error">{error}</div>}
      {loading ? (
        <div className="recovery__empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="recovery__empty">Nothing here.</div>
      ) : (
        <table className="recovery__table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Item</th>
              <th>{tab === 'deleted' ? 'Deleted' : 'Archived'}</th>
              {tab === 'deleted' && <th>Days left</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={`${r.table_name}-${r.id}`}>
                <td>
                  <span className="recovery__pill">{TABLE_LABELS[r.table_name] ?? r.table_name}</span>
                </td>
                <td className="recovery__label">{r.label}</td>
                <td>{new Date(tab === 'deleted' ? r.deleted_at : r.archived_at).toLocaleString()}</td>
                {tab === 'deleted' && (
                  <td>
                    <span className={`recovery__days ${daysLeft(r.deleted_at) <= 7 ? 'recovery__days--warn' : ''}`}>
                      {daysLeft(r.deleted_at)} days
                    </span>
                  </td>
                )}
                <td className="recovery__actions">
                  <Button size="sm" onClick={() => handleRestore(r)} disabled={busyId === r.id}>
                    Restore
                  </Button>
                  {tab === 'deleted' && (
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(r)} disabled={busyId === r.id}>
                      Archive
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handlePurge(r)} disabled={busyId === r.id}>
                    Delete forever
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
