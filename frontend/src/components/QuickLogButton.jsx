import { useState, useEffect } from 'react'
import { Button, Input, Select, Textarea } from './ui/index.jsx'
import * as DB from '../lib/supabase.js'
import supabase from '../lib/supabase.js'

const LOG_KINDS = [
  { value: 'call',       label: 'Call',    icon: '📞' },
  { value: 'text',       label: 'Text',    icon: '💬' },
  { value: 'email-sent', label: 'Email',   icon: '📧' },
  { value: 'meeting',    label: 'Meeting', icon: '🤝' },
  { value: 'note',       label: 'Note',    icon: '📌' },
]

export default function QuickLogButton() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState({
    contact_id: '', kind: 'call', body: '',
  })

  useEffect(() => {
    if (!open) return
    supabase.from('contacts').select('id, name').is('deleted_at', null).order('name').limit(200)
      .then(({ data }) => setContacts(data ?? []))
  }, [open])

  const filtered = search
    ? contacts.filter(c => c.name?.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : contacts.slice(0, 8)

  const handleSave = async () => {
    if (!draft.contact_id || !draft.body?.trim()) return
    setSaving(true)
    try {
      await DB.createInteraction({
        contact_id: draft.contact_id,
        kind: draft.kind,
        channel: 'command',
        body: draft.body.trim(),
        at: new Date().toISOString(),
      })
      setOpen(false)
      setDraft({ contact_id: '', kind: 'call', body: '' })
      setSearch('')
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        title="Quick log interaction"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--brown-dark, #3A2A1E)', color: 'var(--cream, #EFEDE8)',
          border: 'none', cursor: 'pointer', fontSize: '1.2rem',
          boxShadow: '0 4px 16px rgba(58,42,30,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
          transform: open ? 'rotate(45deg)' : 'none',
        }}
      >
        +
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 80, right: 24, zIndex: 901,
          width: 320, background: '#fff', borderRadius: 12,
          border: '1px solid var(--color-border, #C8C3B9)',
          boxShadow: '0 8px 32px rgba(58,42,30,.12)',
          padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontSize: '1.1rem', fontWeight: 500, color: 'var(--brown-dark)',
          }}>
            Quick Log
          </div>

          {/* Contact search */}
          <div>
            <input
              type="text"
              value={draft.contact_id ? contacts.find(c => c.id === draft.contact_id)?.name || search : search}
              onChange={e => { setSearch(e.target.value); setDraft(d => ({ ...d, contact_id: '' })) }}
              placeholder="Search contact..."
              style={{
                width: '100%', padding: '7px 10px', fontSize: '0.82rem',
                border: '1px solid var(--color-border)', borderRadius: 6, fontFamily: 'inherit',
              }}
            />
            {search && !draft.contact_id && filtered.length > 0 && (
              <div style={{
                border: '1px solid var(--color-border)', borderRadius: 6, marginTop: 2,
                maxHeight: 120, overflowY: 'auto', background: '#fff',
              }}>
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setDraft(d => ({ ...d, contact_id: c.id })); setSearch(c.name) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px',
                      border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >{c.name}</button>
                ))}
              </div>
            )}
          </div>

          {/* Kind selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {LOG_KINDS.map(k => (
              <button
                key={k.value}
                onClick={() => setDraft(d => ({ ...d, kind: k.value }))}
                style={{
                  flex: 1, padding: '6px 4px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${draft.kind === k.value ? 'var(--brown-dark)' : 'var(--color-border)'}`,
                  background: draft.kind === k.value ? 'var(--brown-dark)' : 'transparent',
                  color: draft.kind === k.value ? 'var(--cream)' : 'var(--brown-warm)',
                  fontSize: '0.68rem', textAlign: 'center',
                }}
              >
                <span style={{ display: 'block', fontSize: '0.9rem' }}>{k.icon}</span>
                {k.label}
              </button>
            ))}
          </div>

          <textarea
            value={draft.body}
            onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
            placeholder="What happened..."
            rows={2}
            style={{
              width: '100%', padding: '7px 10px', fontSize: '0.82rem',
              border: '1px solid var(--color-border)', borderRadius: 6,
              fontFamily: 'inherit', resize: 'none',
            }}
          />

          <Button
            onClick={handleSave}
            disabled={saving || !draft.contact_id || !draft.body?.trim()}
            style={{ width: '100%' }}
          >
            {saving ? 'Logging...' : 'Log Interaction'}
          </Button>
        </div>
      )}
    </>
  )
}
