import { useState } from 'react'
import { Button, Badge, Input, Select } from './ui/index.jsx'
import { useFamilyLinks } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

const LINK_KINDS = [
  { value: 'spouse',   label: 'Spouse',    icon: '💍' },
  { value: 'partner',  label: 'Partner',   icon: '❤️' },
  { value: 'kid',      label: 'Child',     icon: '👶' },
  { value: 'parent',   label: 'Parent',    icon: '👨‍👩‍👦' },
  { value: 'sibling',  label: 'Sibling',   icon: '👫' },
  { value: 'pet',      label: 'Pet',       icon: '🐾' },
  { value: 'co-buyer', label: 'Co-Buyer',  icon: '🤝' },
  { value: 'extended', label: 'Extended',  icon: '👥' },
]

const kindMap = Object.fromEntries(LINK_KINDS.map(k => [k.value, k]))

export default function FamilyLinksPanel({ contactId, contacts = [] }) {
  const { data: links, refetch } = useFamilyLinks(contactId)
  const entries = links ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState({ kind: 'spouse', to_contact_id: '', name: '', since: '' })

  // Filter contacts for picker (exclude self and already-linked)
  const linkedIds = new Set(entries.map(e => e.to_contact_id))
  const filteredContacts = (contacts || []).filter(c => {
    if (c.id === contactId || linkedIds.has(c.id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (c.name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
  }).slice(0, 8)

  const handleAdd = async () => {
    setSaving(true)
    try {
      let toId = draft.to_contact_id
      // If no existing contact selected, create a stub
      if (!toId && draft.name?.trim()) {
        const parts = draft.name.trim().split(' ')
        const newContact = await DB.createContact({
          name: draft.name.trim(),
          first_name: parts[0],
          last_name: parts.slice(1).join(' ') || null,
          type: 'buyer', // default
          stage: 'New Lead',
        })
        toId = newContact.id
      }
      if (!toId) return

      await DB.createFamilyLink({
        from_contact_id: contactId,
        to_contact_id: toId,
        kind: draft.kind,
        since: draft.since || null,
      })
      setShowAdd(false)
      setDraft({ kind: 'spouse', to_contact_id: '', name: '', since: '' })
      setSearch('')
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this link?')) return
    try { await DB.deleteFamilyLink(id); refetch() } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h4 style={{
          fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
          fontWeight: 500, fontSize: '1rem', margin: 0,
        }}>Family & Relationships ({entries.length})</h4>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.75rem', color: 'var(--brown-mid)', textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >+ Link</button>
      </div>

      {showAdd && (
        <div style={{
          padding: 10, background: 'var(--cream, #EFEDE8)', borderRadius: 8,
          border: '1px solid var(--color-border)', marginBottom: 8,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <Select label="Relationship" value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))}>
            {LINK_KINDS.map(k => <option key={k.value} value={k.value}>{k.icon} {k.label}</option>)}
          </Select>

          {/* Contact search/select */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--brown-warm)', display: 'block', marginBottom: 3 }}>
              Link to contact
            </label>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setDraft(d => ({ ...d, to_contact_id: '', name: e.target.value })) }}
              placeholder="Search contacts or type new name..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'inherit',
              }}
            />
            {search && filteredContacts.length > 0 && !draft.to_contact_id && (
              <div style={{
                border: '1px solid var(--color-border)', borderRadius: 4, marginTop: 2,
                maxHeight: 150, overflowY: 'auto', background: '#fff',
              }}>
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setDraft(d => ({ ...d, to_contact_id: c.id, name: c.name })); setSearch(c.name) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px',
                      border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.email && <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>{c.email}</span>}
                  </button>
                ))}
              </div>
            )}
            {search && !draft.to_contact_id && filteredContacts.length === 0 && (
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                No match — will create "{search}" as a new contact
              </p>
            )}
          </div>

          {(draft.kind === 'spouse' || draft.kind === 'partner') && (
            <Input label="Since (date)" type="date" value={draft.since} onChange={e => setDraft(d => ({ ...d, since: e.target.value }))} />
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || (!draft.to_contact_id && !draft.name?.trim())}>
              {saving ? 'Saving...' : 'Link'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setSearch('') }}>Cancel</Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showAdd ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          No family or relationships linked. Add spouse, kids, pets, or co-buyers.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {entries.map(link => {
            const meta = kindMap[link.kind] || kindMap.extended
            const person = link.to_contact
            return (
              <div key={link.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6,
              }}>
                <span style={{ fontSize: '0.9rem', width: 20, textAlign: 'center' }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                      {person?.name || person?.first_name || '—'}
                    </span>
                    <span style={{
                      fontSize: '0.62rem', padding: '1px 6px', borderRadius: 999,
                      border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
                    }}>
                      {meta.label}
                    </span>
                  </div>
                  {(person?.phone || person?.email) && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {person.phone}{person.phone && person.email ? ' · ' : ''}{person.email}
                    </div>
                  )}
                  {link.since && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                      Since {new Date(link.since + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(link.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: '2px 4px', opacity: 0.5 }}
                >×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
