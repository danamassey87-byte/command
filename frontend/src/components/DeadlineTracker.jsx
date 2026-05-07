import { useState, useMemo } from 'react'
import { Button, Badge, Input, Select } from './ui/index.jsx'
import { useTransactionDeadlines } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

const STATUS_OPTIONS = ['Pending', 'Met', 'Missed', 'Waived']

function urgency(d) {
  if (d.status === 'Met')    return { tone: 'green',  label: 'Met' }
  if (d.status === 'Missed') return { tone: 'red',    label: 'Missed' }
  if (d.status === 'Waived') return { tone: 'gray',   label: 'Waived' }
  if (!d.calendar_date)      return { tone: 'gray',   label: 'No date' }
  const today = new Date(); today.setHours(0,0,0,0)
  const dl = new Date(d.calendar_date + 'T00:00:00')
  const days = Math.round((dl - today) / 86400000)
  if (days < 0)  return { tone: 'red',    label: `${Math.abs(days)}d overdue` }
  if (days === 0) return { tone: 'red',   label: 'TODAY' }
  if (days <= 3) return { tone: 'red',    label: `${days}d` }
  if (days <= 7) return { tone: 'amber',  label: `${days}d` }
  return { tone: 'gray', label: `${days}d` }
}

const TONE_STYLES = {
  red:   { bg: 'rgba(192,96,74,.12)',   color: '#c0604a', border: '#c0604a' },
  amber: { bg: 'rgba(184,153,90,.18)',  color: '#7d5f23', border: '#b8995a' },
  green: { bg: 'rgba(139,154,123,.15)', color: '#566b4a', border: '#8B9A7B' },
  gray:  { bg: 'rgba(180,180,180,.12)', color: '#666',    border: '#C8C3B9' },
}

function DeadlineRow({ deadline, onChange, onDelete }) {
  const u = urgency(deadline)
  const tone = TONE_STYLES[u.tone]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...deadline })

  const save = async () => {
    await onChange(deadline.id, {
      calendar_date: draft.calendar_date || null,
      status: draft.status,
      notes: draft.notes || null,
      completed_at: draft.status === 'Met' ? new Date().toISOString() : null,
    })
    setEditing(false)
  }

  return (
    <div style={{
      padding: '8px 12px', background: 'var(--cream-3, #F6F4EE)',
      borderLeft: `3px solid ${tone.border}`, borderRadius: 'var(--radius-md, 6px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.6rem', padding: '1px 6px', borderRadius: 999, minWidth: 56, textAlign: 'center',
          background: tone.bg, color: tone.color,
          fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.06em',
        }}>{u.label}</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--brown-dark)', fontWeight: 500, flex: 1 }}>{deadline.description}</span>
        {deadline.responsible_party && (
          <span style={{
            fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3,
            background: deadline.responsible_party === 'TC' ? 'rgba(184,153,90,.18)' : 'rgba(139,154,123,.18)',
            color: deadline.responsible_party === 'TC' ? '#7d5f23' : '#566b4a',
            fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.06em',
          }}>{deadline.responsible_party}</span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setEditing(e => !e)}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', marginTop: 4 }}>
        {deadline.calendar_date && (
          <span style={{ fontWeight: 500, color: 'var(--brown-dark)' }}>
            {new Date(deadline.calendar_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        )}
        {deadline.contract_day_offset != null && <span>Day {deadline.contract_day_offset}</span>}
        {deadline.status !== 'Pending' && <Badge variant={deadline.status === 'Met' ? 'success' : deadline.status === 'Missed' ? 'danger' : 'default'} size="sm">{deadline.status}</Badge>}
      </div>
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, marginTop: 6, background: '#fff', borderRadius: 4 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input type="date" value={draft.calendar_date ?? ''} onChange={e => setDraft({ ...draft, calendar_date: e.target.value })} style={{ flex: 1 }} />
            <Select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} style={{ flex: 1 }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Input placeholder="Notes" value={draft.notes ?? ''} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => onDelete(deadline.id)} style={{ color: '#c0604a', marginRight: 'auto' }}>Delete</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </div>
      )}
      {!editing && deadline.notes && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 4 }}>{deadline.notes}</div>
      )}
    </div>
  )
}

/**
 * Deadline tracker — every contractual deadline from the M1–M10 workflow.
 * Seed with a contract-acceptance date and the calendar dates auto-compute
 * from each template's offset. Color-coded urgency: red ≤3d/overdue,
 * amber ≤7d, gray ≥7d.
 */
export default function DeadlineTracker({ parentKind, parentId, appliesTo, defaultCollapsed = false }) {
  const { data: deadlines, refetch } = useTransactionDeadlines(parentKind, parentId)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [seeding, setSeeding] = useState(false)
  const [acceptanceDate, setAcceptanceDate] = useState(new Date().toISOString().slice(0, 10))
  const [adding, setAdding] = useState(false)
  const [newD, setNewD] = useState({ description: '', calendar_date: '', responsible_party: 'Agent' })

  const counts = useMemo(() => {
    const list = deadlines ?? []
    const today = new Date(); today.setHours(0,0,0,0)
    let pending = 0, met = 0, overdue = 0, due7 = 0
    for (const d of list) {
      if (d.status === 'Met') met++
      else if (d.status === 'Pending') {
        pending++
        if (d.calendar_date) {
          const dl = new Date(d.calendar_date + 'T00:00:00')
          const days = Math.round((dl - today) / 86400000)
          if (days < 0) overdue++
          else if (days <= 7) due7++
        }
      }
    }
    return { total: list.length, pending, met, overdue, due7 }
  }, [deadlines])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const result = await DB.seedTransactionDeadlines(parentKind, parentId, appliesTo, acceptanceDate)
      const added = result?.data?.length ?? 0
      if (added === 0) alert('Deadlines already seeded for this record.')
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSeeding(false) }
  }

  const handleUpdate = async (id, patch) => {
    await DB.updateTransactionDeadline(id, patch)
    refetch()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this deadline?')) return
    await DB.deleteTransactionDeadline(id)
    refetch()
  }

  const handleAdd = async () => {
    if (!newD.description) return
    await DB.createTransactionDeadline({
      parent_kind: parentKind, parent_id: parentId,
      description: newD.description,
      calendar_date: newD.calendar_date || null,
      responsible_party: newD.responsible_party,
      status: 'Pending', sort_order: 9999,
    })
    setNewD({ description: '', calendar_date: '', responsible_party: 'Agent' })
    setAdding(false)
    refetch()
  }

  return (
    <div style={{
      background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8,
      border: '1px solid var(--color-border, #C8C3B9)', overflow: 'hidden',
    }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border, #C8C3B9)', cursor: 'pointer',
        }}
      >
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontWeight: 500, fontSize: '1.1rem', margin: 0,
          }}>
            Contract Deadlines
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
              {collapsed ? '▸' : '▾'}
            </span>
          </h3>
          {counts.total > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              {counts.met}/{counts.total} met
              {counts.overdue > 0 && <span style={{ color: '#c0604a', fontWeight: 600 }}> · {counts.overdue} overdue</span>}
              {counts.due7 > 0 && <span style={{ color: '#7d5f23' }}> · {counts.due7} this week</span>}
            </span>
          )}
        </div>
        {counts.overdue > 0 && <Badge variant="danger" size="sm">{counts.overdue} OVERDUE</Badge>}
      </div>

      {!collapsed && (
        <div style={{ padding: '8px 12px' }}>
          {(deadlines?.length ?? 0) === 0 ? (
            <div style={{ padding: '12px 4px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Set the contract acceptance date to auto-populate every deadline:
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                <Input
                  type="date"
                  value={acceptanceDate}
                  onChange={e => setAcceptanceDate(e.target.value)}
                  style={{ maxWidth: 180 }}
                />
                <Button size="sm" onClick={handleSeed} disabled={seeding}>
                  {seeding ? 'Seeding…' : `Seed ${appliesTo === 'buyer' ? '20' : '16'} deadlines`}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(deadlines ?? []).map(d => (
                <DeadlineRow key={d.id} deadline={d} onChange={handleUpdate} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* Add custom deadline */}
          <div style={{ marginTop: 8, padding: '8px 4px', borderTop: '1px solid var(--color-border-light, #f0ece6)' }}>
            {adding ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Input placeholder="Deadline description" value={newD.description} onChange={e => setNewD({ ...newD, description: e.target.value })} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input type="date" value={newD.calendar_date} onChange={e => setNewD({ ...newD, calendar_date: e.target.value })} style={{ flex: 1 }} />
                  <Select value={newD.responsible_party} onChange={e => setNewD({ ...newD, responsible_party: e.target.value })}>
                    <option value="Agent">Agent</option>
                    <option value="TC">TC</option>
                  </Select>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAdd} disabled={!newD.description}>Add</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>+ Add custom deadline</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
