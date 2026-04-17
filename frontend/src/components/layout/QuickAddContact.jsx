import { useState, useEffect } from 'react'
import * as DB from '../../lib/supabase.js'

const TYPES = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'both', label: 'Buyer & Seller' },
  { value: 'investor', label: 'Investor' },
  { value: 'lead', label: 'Lead' },
]

const SOURCES = [
  { value: '', label: '— Source —' },
  { value: 'open_house', label: 'Open House' },
  { value: 'referral', label: 'Referral' },
  { value: 'expired', label: 'Expired' },
  { value: 'fsbo', label: 'FSBO' },
  { value: 'circle', label: 'Circle Prospecting' },
  { value: 'soi', label: 'SOI / Personal' },
  { value: 'online', label: 'Online / Website' },
  { value: 'other', label: 'Other' },
]

export default function QuickAddContact({ open, onClose, onCreated }) {
  const [draft, setDraft] = useState({ name: '', phone: '', email: '', type: 'buyer', source: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  // Keyboard shortcut: Cmd+N or Ctrl+N to open (handled by parent via onOpen)
  // Escape to close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleSave = async () => {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      const contact = await DB.createContact({
        name: draft.name.trim(),
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        type: draft.type,
        source: draft.source || null,
      })
      await DB.logActivity('contact_created', `Quick-added contact: ${draft.name}`, { contactId: contact.id })
      setDraft({ name: '', phone: '', email: '', type: 'buyer', source: '' })
      onCreated?.(contact)
      onClose()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', paddingTop: 100,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 420, background: '#fff', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: 24, maxHeight: 'fit-content',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)' }}>Quick Add Contact</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 3 }}>Name *</span>
            <input value={draft.name} onChange={e => set('name', e.target.value)} autoFocus placeholder="Full name..." style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'inherit' }} />
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 3 }}>Phone</span>
              <input value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="(480) 555-0000" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'inherit' }} />
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 3 }}>Email</span>
              <input value={draft.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'inherit' }} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 3 }}>Type</span>
              <select value={draft.type} onChange={e => set('type', e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'inherit' }}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 3 }}>Source</span>
              <select value={draft.source} onChange={e => set('source', e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'inherit' }}>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSave}
              disabled={saving || !draft.name.trim()}
              style={{
                flex: 1, padding: '10px 16px', background: 'var(--brown-mid)', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                opacity: (saving || !draft.name.trim()) ? 0.5 : 1,
              }}
            >
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
            <button onClick={onClose} style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
