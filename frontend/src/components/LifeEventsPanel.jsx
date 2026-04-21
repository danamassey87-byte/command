import { useState } from 'react'
import { Button, Badge, Input, Select } from './ui/index.jsx'
import { useLifeEvents } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

const EVENT_KINDS = [
  { value: 'birthday',        label: 'Birthday',        icon: '🎂' },
  { value: 'anniversary',     label: 'Anniversary',     icon: '💍' },
  { value: 'closing-anniv',   label: 'Closing Anniv.',  icon: '🏠' },
  { value: 'kid-milestone',   label: 'Kid Milestone',   icon: '👶' },
  { value: 'job-change',      label: 'Job Change',      icon: '💼' },
  { value: 'baby',            label: 'New Baby',        icon: '🍼' },
  { value: 'move',            label: 'Move',            icon: '📦' },
  { value: 'other',           label: 'Other',           icon: '📅' },
]

const kindMap = Object.fromEntries(EVENT_KINDS.map(k => [k.value, k]))

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target - today) / 86400000)
}

export default function LifeEventsPanel({ contactId }) {
  const { data: events, refetch } = useLifeEvents(contactId)
  const entries = events ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    kind: 'birthday',
    occurs_on: '',
    recurring: true,
  })

  const handleAdd = async () => {
    if (!draft.occurs_on) return
    setSaving(true)
    try {
      await DB.createLifeEvent({
        contact_id: contactId,
        kind: draft.kind,
        occurs_on: draft.occurs_on,
        recurring: draft.recurring,
        source: 'manual',
      })
      setShowAdd(false)
      setDraft({ kind: 'birthday', occurs_on: '', recurring: true })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  // Sort: upcoming first, then past
  const sorted = [...entries].sort((a, b) => {
    const da = daysUntil(a.occurs_on)
    const db = daysUntil(b.occurs_on)
    if (da >= 0 && db >= 0) return da - db
    if (da < 0 && db < 0) return db - da
    return da >= 0 ? -1 : 1
  })

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h4 style={{
          fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
          fontWeight: 500, fontSize: '1rem', margin: 0,
        }}>Life Events ({entries.length})</h4>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.75rem', color: 'var(--brown-mid)', textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >+ Add</button>
      </div>

      {showAdd && (
        <div style={{
          padding: 10, background: 'var(--cream, #EFEDE8)', borderRadius: 8,
          border: '1px solid var(--color-border)', marginBottom: 8,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Select label="Type" value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))} style={{ flex: 1 }}>
              {EVENT_KINDS.map(k => <option key={k.value} value={k.value}>{k.icon} {k.label}</option>)}
            </Select>
            <Input label="Date" type="date" value={draft.occurs_on} onChange={e => setDraft(d => ({ ...d, occurs_on: e.target.value }))} style={{ flex: 1 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--brown-warm)', cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.recurring} onChange={e => setDraft(d => ({ ...d, recurring: e.target.checked }))} />
            Recurring annually
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || !draft.occurs_on}>
              {saving ? 'Saving...' : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !showAdd ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          No life events tracked. Add birthdays, anniversaries, and milestones.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {sorted.map(event => {
            const meta = kindMap[event.kind] || kindMap.other
            const days = daysUntil(event.occurs_on)
            const isUpcoming = days >= 0 && days <= 30
            const isPast = days < 0

            return (
              <div key={event.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
                borderRadius: 6,
                background: isUpcoming ? 'rgba(201,154,46,.06)' : 'transparent',
                borderLeft: isUpcoming ? '3px solid #c99a2e' : '3px solid transparent',
              }}>
                <span style={{ fontSize: '0.9rem', width: 20, textAlign: 'center' }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: isUpcoming ? 600 : 400,
                    color: isPast ? 'var(--color-text-muted)' : 'var(--brown-dark)',
                  }}>
                    {meta.label}
                  </span>
                  {event.recurring && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>↻</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    color: isUpcoming ? '#c99a2e' : 'var(--color-text-muted)',
                    fontWeight: isUpcoming ? 600 : 400,
                  }}>
                    {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`}
                  </span>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                    {new Date(event.occurs_on + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
