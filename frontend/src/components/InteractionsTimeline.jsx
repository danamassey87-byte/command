import { useState, useMemo } from 'react'
import { Button, Badge, Input, Select, Textarea } from './ui/index.jsx'
import { useInteractionsForContact, useCommsForContact } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

// ─── Kind → display config ──────────────────────────────────────────────────
const KIND_META = {
  call:              { icon: '📞', label: 'Phone Call',      color: 'var(--brown-mid)' },
  text:              { icon: '💬', label: 'Text Message',    color: 'var(--brown-mid)' },
  'email-sent':      { icon: '📧', label: 'Email Sent',     color: 'var(--brown-mid)' },
  'email-open':      { icon: '👁', label: 'Email Opened',    color: 'var(--sage-green, #8B9A7B)' },
  'email-click':     { icon: '🔗', label: 'Email Click',    color: 'var(--sage-green, #8B9A7B)' },
  showing:           { icon: '🏠', label: 'Showing',        color: 'var(--brown-dark)' },
  'oh-signin':       { icon: '📋', label: 'OH Sign-In',     color: 'var(--brown-dark)' },
  'form-fill':       { icon: '📝', label: 'Form Submitted', color: 'var(--sage-green, #8B9A7B)' },
  note:              { icon: '📌', label: 'Note',           color: 'var(--brown-warm, #5A4136)' },
  'slack-post':      { icon: '💼', label: 'Slack',          color: 'var(--brown-warm, #5A4136)' },
  'transact-milestone': { icon: '✓', label: 'Transact',    color: 'var(--sage-green, #8B9A7B)' },
  'campaign-enrollment': { icon: '📨', label: 'Campaign',    color: 'var(--brown-mid)' },
  meeting:           { icon: '🤝', label: 'Meeting',        color: 'var(--brown-dark)' },
  other:             { icon: '•',  label: 'Other',          color: 'var(--brown-mid)' },
}

const CHANNEL_LABELS = {
  gmail: 'Gmail', resend: 'Resend', imessage: 'iMessage', lofty: 'Lofty',
  command: 'Command', slack: 'Slack', transact: 'Transact',
  'bio-link': 'Bio Link', 'oh-kiosk': 'OH Kiosk',
}

const MANUAL_KINDS = [
  { value: 'call',    label: 'Phone Call',   icon: '📞' },
  { value: 'text',    label: 'Text Message', icon: '💬' },
  { value: 'email-sent', label: 'Email', icon: '📧' },
  { value: 'meeting', label: 'Meeting',      icon: '🤝' },
  { value: 'note',    label: 'Note',         icon: '📌' },
  { value: 'other',   label: 'Other',        icon: '•' },
]

// Map old communication_log entries to interactions shape
function mapCommToInteraction(comm) {
  const kindMap = {
    phone_call: 'call', text_message: 'text', external_email: 'email-sent',
    meeting: 'meeting', note: 'note', other: 'other',
  }
  return {
    id: `comm-${comm.id}`,
    _legacy: true,
    kind: kindMap[comm.type] || 'other',
    channel: 'command',
    body: [comm.subject, comm.summary].filter(Boolean).join(' — '),
    at: comm.logged_at,
    metadata: { direction: comm.direction },
  }
}

export default function InteractionsTimeline({ contactId, compact = false }) {
  const { data: interactions, refetch: refetchInteractions } = useInteractionsForContact(contactId)
  const { data: comms } = useCommsForContact(contactId)

  // Merge interactions + legacy communication_log entries
  const entries = useMemo(() => {
    const interactionIds = new Set((interactions ?? []).map(i => i.id))
    const legacyMapped = (comms ?? [])
      .map(mapCommToInteraction)
      .filter(c => !interactionIds.has(c.id))
    return [...(interactions ?? []), ...legacyMapped]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [interactions, comms])

  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [draft, setDraft] = useState({
    kind: 'call',
    body: '',
    at: new Date().toISOString().slice(0, 16),
  })

  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter(e => e.kind === filter)
  }, [entries, filter])

  const handleAdd = async () => {
    if (!draft.body?.trim()) return
    setSaving(true)
    try {
      await DB.createInteraction({
        contact_id: contactId,
        kind: draft.kind,
        channel: 'command',
        body: draft.body.trim(),
        at: draft.at ? new Date(draft.at).toISOString() : new Date().toISOString(),
        metadata: {},
      })
      setShowAdd(false)
      setDraft({ kind: 'call', body: '', at: new Date().toISOString().slice(0, 16) })
      refetchInteractions()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (entry) => {
    if (!confirm('Remove this interaction?')) return
    if (entry._legacy) {
      const realId = entry.id.replace('comm-', '')
      try { await DB.deleteCommEntry(realId); window.location.reload() } catch (e) { alert(e.message) }
    } else {
      try { await DB.deleteInteraction(entry.id); refetchInteractions() } catch (e) { alert(e.message) }
    }
  }

  // Unique kinds in data for filter
  const kindCounts = useMemo(() => {
    const counts = {}
    for (const e of entries) {
      counts[e.kind] = (counts[e.kind] || 0) + 1
    }
    return counts
  }, [entries])

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffH = diffMs / 3600000

    if (diffH < 1) return `${Math.round(diffMs / 60000)}m ago`
    if (diffH < 24) return `${Math.round(diffH)}h ago`
    if (diffH < 48) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="interactions-timeline">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display, "Cormorant Garamond", serif)', fontWeight: 500, fontSize: '1.15rem', margin: 0 }}>
          Activity ({entries.length})
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {MANUAL_KINDS.slice(0, 4).map(k => (
            <button
              key={k.value}
              onClick={() => { setDraft(d => ({ ...d, kind: k.value })); setShowAdd(true) }}
              title={`Log ${k.label}`}
              style={{
                padding: '3px 8px', fontSize: '0.72rem', borderRadius: 6,
                border: '1px solid var(--color-border, #C8C3B9)', background: 'var(--cream, #EFEDE8)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                color: 'var(--brown-dark, #3A2A1E)',
              }}
            >
              {k.icon} {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {!compact && entries.length > 3 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '2px 8px', fontSize: '0.7rem', borderRadius: 999,
              border: `1px solid ${filter === 'all' ? 'var(--brown-dark, #3A2A1E)' : 'var(--color-border, #C8C3B9)'}`,
              background: filter === 'all' ? 'var(--brown-dark, #3A2A1E)' : '#fff',
              color: filter === 'all' ? 'var(--cream, #EFEDE8)' : 'var(--brown-warm, #5A4136)',
              cursor: 'pointer',
            }}
          >
            All {entries.length}
          </button>
          {Object.entries(kindCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([kind, count]) => {
            const meta = KIND_META[kind] || KIND_META.other
            return (
              <button
                key={kind}
                onClick={() => setFilter(filter === kind ? 'all' : kind)}
                style={{
                  padding: '2px 8px', fontSize: '0.7rem', borderRadius: 999,
                  border: `1px solid ${filter === kind ? 'var(--brown-dark)' : 'var(--color-border, #C8C3B9)'}`,
                  background: filter === kind ? 'var(--brown-dark, #3A2A1E)' : '#fff',
                  color: filter === kind ? 'var(--cream, #EFEDE8)' : 'var(--brown-warm, #5A4136)',
                  cursor: 'pointer',
                }}
              >
                {meta.icon} {meta.label} {count}
              </button>
            )
          })}
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div style={{
          padding: 12, background: 'var(--cream, #EFEDE8)', borderRadius: 8,
          marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8,
          border: '1px solid var(--color-border, #C8C3B9)',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select label="Type" value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))} style={{ flex: 1 }}>
              {MANUAL_KINDS.map(k => <option key={k.value} value={k.value}>{k.icon} {k.label}</option>)}
            </Select>
            <Input label="When" type="datetime-local" value={draft.at} onChange={e => setDraft(d => ({ ...d, at: e.target.value }))} style={{ flex: 1 }} />
          </div>
          <Textarea label="Details" rows={2} value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} placeholder="What happened..." />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || !draft.body?.trim()}>
              {saving ? 'Saving...' : 'Log'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Timeline entries */}
      {filtered.length === 0 && !showAdd ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #B79782)', padding: '8px 0' }}>
          No activity yet. Use the buttons above to log interactions.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(entry => {
            const meta = KIND_META[entry.kind] || KIND_META.other
            const direction = entry.metadata?.direction
            const isSystem = !['call', 'text', 'email-sent', 'meeting', 'note', 'other'].includes(entry.kind)

            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '7px 12px', borderRadius: 6,
                  background: isSystem ? 'transparent' : 'var(--color-bg-subtle, #faf8f5)',
                  borderLeft: `3px solid ${meta.color}`,
                }}
              >
                <span style={{ fontSize: '0.95rem', lineHeight: 1, marginTop: 2, width: 18, textAlign: 'center', flexShrink: 0 }}>
                  {meta.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--brown-dark, #3A2A1E)' }}>
                      {meta.label}
                    </span>
                    {direction && (
                      <Badge variant={direction === 'inbound' ? 'info' : 'default'} size="sm">{direction}</Badge>
                    )}
                    {entry.channel && entry.channel !== 'command' && (
                      <span style={{
                        fontSize: '0.65rem', padding: '1px 6px', borderRadius: 999,
                        border: '1px solid var(--color-border, #C8C3B9)',
                        color: 'var(--brown-warm, #5A4136)', background: '#fff',
                      }}>
                        {CHANNEL_LABELS[entry.channel] || entry.channel}
                      </span>
                    )}
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #B79782)', marginLeft: 'auto' }}>
                      {formatDate(entry.at)}
                    </span>
                  </div>
                  {entry.body && (
                    <p style={{
                      fontSize: '0.78rem', color: 'var(--brown-warm, #5A4136)',
                      margin: '2px 0 0', lineHeight: 1.45,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: compact ? 1 : 3, WebkitBoxOrient: 'vertical',
                    }}>
                      {entry.body}
                    </p>
                  )}
                </div>
                {!isSystem && (
                  <button
                    onClick={() => handleDelete(entry)}
                    title="Remove"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-muted, #B79782)', fontSize: '0.8rem',
                      padding: '2px 4px', opacity: 0.5, flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
