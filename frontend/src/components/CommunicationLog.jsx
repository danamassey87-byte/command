import { useState } from 'react'
import { Button, Badge, Input, Select, Textarea } from './ui/index.jsx'
import { useCommsForContact } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

const COMM_TYPES = [
  { value: 'phone_call',     label: 'Phone Call',   icon: '📞' },
  { value: 'text_message',   label: 'Text Message', icon: '💬' },
  { value: 'external_email', label: 'Email (External)', icon: '📧' },
  { value: 'meeting',        label: 'Meeting',      icon: '🤝' },
  { value: 'note',           label: 'General Note', icon: '📝' },
  { value: 'other',          label: 'Other',        icon: '📌' },
]

const DIRECTIONS = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound',  label: 'Inbound' },
]

const typeLabel = Object.fromEntries(COMM_TYPES.map(t => [t.value, t]))
const dirVariant = { inbound: 'info', outbound: 'default' }

export default function CommunicationLog({ contactId }) {
  const { data: comms, refetch } = useCommsForContact(contactId)
  const entries = comms ?? []

  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    type: 'phone_call',
    direction: 'outbound',
    subject: '',
    summary: '',
    logged_at: new Date().toISOString().slice(0, 16),
  })

  const handleAdd = async () => {
    if (!draft.summary?.trim() && !draft.subject?.trim()) return
    setSaving(true)
    try {
      await DB.createCommEntry({
        contact_id: contactId,
        type: draft.type,
        direction: draft.direction,
        subject: draft.subject?.trim() || null,
        summary: draft.summary?.trim() || null,
        logged_at: draft.logged_at ? new Date(draft.logged_at).toISOString() : new Date().toISOString(),
      })
      setShowAdd(false)
      setDraft({ type: 'phone_call', direction: 'outbound', subject: '', summary: '', logged_at: new Date().toISOString().slice(0, 16) })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this log entry?')) return
    try { await DB.deleteCommEntry(id); refetch() } catch (e) { alert(e.message) }
  }

  return (
    <div className="buyer-detail__showings-section">
      <div className="buyer-detail__showings-header">
        <h3>Communication Log ({entries.length})</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {COMM_TYPES.slice(0, 4).map(t => (
            <button
              key={t.value}
              onClick={() => { setDraft(d => ({ ...d, type: t.value })); setShowAdd(true) }}
              title={`Log ${t.label}`}
              style={{
                padding: '4px 8px', fontSize: '0.72rem', borderRadius: 8,
                border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle, #faf8f5)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div style={{ padding: 12, background: 'var(--cream)', borderRadius: 'var(--radius-md)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select label="Type" value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))} style={{ flex: 1 }}>
              {COMM_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </Select>
            <Select label="Direction" value={draft.direction} onChange={e => setDraft(d => ({ ...d, direction: e.target.value }))} style={{ flex: 1 }}>
              {DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </div>
          <Input label="Date/Time" type="datetime-local" value={draft.logged_at} onChange={e => setDraft(d => ({ ...d, logged_at: e.target.value }))} />
          <Input label="Subject" value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} placeholder="Quick subject line..." />
          <Textarea label="Summary / Notes" rows={2} value={draft.summary} onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))} placeholder="What was discussed..." />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || (!draft.summary?.trim() && !draft.subject?.trim())}>
              {saving ? 'Saving...' : 'Log Entry'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 && !showAdd ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>
          No communication logged yet. Use the buttons above to log calls, texts, or emails.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.map(e => {
            const meta = typeLabel[e.type] || typeLabel.other
            const dt = new Date(e.logged_at)
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${e.direction === 'inbound' ? 'var(--color-info, #5b9bd5)' : 'var(--brown-mid)'}`,
              }}>
                <span style={{ fontSize: '1.1rem', lineHeight: 1, marginTop: 2 }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--brown-dark)' }}>{meta.label}</span>
                    <Badge variant={dirVariant[e.direction]} size="sm">{e.direction}</Badge>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  {e.subject && <p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--brown-dark)', margin: '2px 0 0' }}>{e.subject}</p>}
                  {e.summary && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{e.summary}</p>}
                </div>
                <button onClick={() => handleDelete(e.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: '2px 4px' }}>×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
