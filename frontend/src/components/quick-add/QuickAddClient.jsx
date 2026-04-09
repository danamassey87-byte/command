import { useState, useEffect, useRef } from 'react'
import { SlidePanel, Button, Input, Textarea } from '../ui'
import { createContact, updateContact, logActivity } from '../../lib/supabase'
import { emit as emitNotification } from '../../lib/notifications'
import { findContactByPhone, findContactByEmail } from '../../lib/safeguards'
import {
  validateContactFields, validatePhone, validateEmail, newRequestId,
} from '../../lib/validators'
import NameAutocomplete from './NameAutocomplete'
import './quick-add.css'

const BLANK = { name: '', email: '', phone: '', type: 'buyer', notes: '' }

export default function QuickAddClient({ open, onClose }) {
  const [form, setForm] = useState(BLANK)
  const [existingId, setExistingId] = useState(null)
  const [forceNew, setForceNew] = useState(false)
  const [duplicateBlocked, setDuplicateBlocked] = useState(false)
  const [phoneMatch, setPhoneMatch] = useState(null)
  const [emailMatch, setEmailMatch] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(BLANK)
      setExistingId(null); setForceNew(false)
      setDuplicateBlocked(false)
      setPhoneMatch(null); setEmailMatch(null)
      setError(null)
      requestIdRef.current = newRequestId()
    }
  }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // #1 phone collision
  useEffect(() => {
    if (!open || !form.phone || existingId) { setPhoneMatch(null); return }
    const t = setTimeout(async () => {
      try { setPhoneMatch(await findContactByPhone(form.phone, { excludeId: existingId })) }
      catch (e) { console.error(e) }
    }, 400)
    return () => clearTimeout(t)
  }, [form.phone, open, existingId])

  // #1 email collision
  useEffect(() => {
    if (!open || !form.email || existingId) { setEmailMatch(null); return }
    const t = setTimeout(async () => {
      try { setEmailMatch(await findContactByEmail(form.email, { excludeId: existingId })) }
      catch (e) { console.error(e) }
    }, 400)
    return () => clearTimeout(t)
  }, [form.email, open, existingId])

  const linkExisting = (c) => {
    setExistingId(c.id)
    setForm(f => ({ ...f, name: c.name, email: c.email || f.email, phone: c.phone || f.phone }))
    setPhoneMatch(null); setEmailMatch(null)
  }

  const validate = () => {
    if (!['buyer','seller'].includes(form.type)) return 'Pick buyer or seller'
    // #6 stage strictness: clients (not leads) must be reachable
    const fieldErr = validateContactFields({
      name: form.name, email: form.email, phone: form.phone, requireReachable: true,
    })
    if (fieldErr) return fieldErr
    if (duplicateBlocked) return 'Resolve the duplicate warning first'
    if (phoneMatch && !existingId) return 'Phone matches an existing contact — link it or change it'
    if (emailMatch && !existingId) return 'Email matches an existing contact — link it or change it'
    return null
  }

  const handleSave = async () => {
    setError(null)
    const err = validate()
    if (err) { setError(err); return }

    try {
      setSaving(true)
      // If user picked an existing contact, update through audit-diff path
      if (existingId) {
        const updated = await updateContact(existingId, {
          type: form.type,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        })
        onClose?.(updated)
        return
      }

      const created = await createContact({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        type: form.type,
        notes: form.notes.trim() || null,
        client_request_id: requestIdRef.current,
      })
      await logActivity('contact_created', `New ${form.type} client: ${created.name}`, {
        contactId: created.id,
      })
      emitNotification({
        type: 'lead_created',
        title: `New ${form.type} client: ${created.name}`,
        body: [form.phone, form.email].filter(Boolean).join(' · ') || null,
        link: form.type === 'seller' ? '/crm/sellers' : '/crm/buyers',
        source_table: 'contacts',
        source_id: created.id,
        metadata: { client_type: form.type },
      }).catch(err => console.error('notification emit failed', err))
      onClose?.(created)
    } catch (e) {
      if (e.message?.includes('client_request_id') || e.message?.includes('duplicate key')) {
        onClose?.(); return
      }
      setError(e.message || 'Failed to create client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="New Client" subtitle="Buyer or seller">
      <div className="qa-form">
        <div className="qa-toggle" role="radiogroup" aria-label="Client type">
          <button
            type="button"
            className={`qa-toggle__btn ${form.type === 'buyer' ? 'qa-toggle__btn--active' : ''}`}
            onClick={() => set('type', 'buyer')}
            role="radio"
            aria-checked={form.type === 'buyer'}
          >Buyer</button>
          <button
            type="button"
            className={`qa-toggle__btn ${form.type === 'seller' ? 'qa-toggle__btn--active' : ''}`}
            onClick={() => set('type', 'seller')}
            role="radio"
            aria-checked={form.type === 'seller'}
          >Seller</button>
        </div>

        <NameAutocomplete
          label="Full name *"
          value={form.name}
          selectedId={existingId}
          forceNew={forceNew}
          onChange={(v) => { set('name', v); setExistingId(null); setForceNew(false) }}
          onSelectExisting={linkExisting}
          onForceNew={(undo) => setForceNew(undo === false ? false : true)}
          onDuplicateState={setDuplicateBlocked}
          autoFocus
        />

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="jane@example.com"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="(480) 555-0100"
        />

        {phoneMatch && (
          <div className="qa-warn qa-warn--block">
            ⚠️ Phone is already used by <strong>{phoneMatch.name}</strong> ({phoneMatch.type}).
            <button type="button" className="qa-warn-btn" onClick={() => linkExisting(phoneMatch)}>
              Link to {phoneMatch.name}
            </button>
          </div>
        )}
        {emailMatch && (
          <div className="qa-warn qa-warn--block">
            ⚠️ Email is already used by <strong>{emailMatch.name}</strong> ({emailMatch.type}).
            <button type="button" className="qa-warn-btn" onClick={() => linkExisting(emailMatch)}>
              Link to {emailMatch.name}
            </button>
          </div>
        )}

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
        />

        {error && <div className="qa-error">{error}</div>}

        <div className="qa-actions">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Create client'}
          </Button>
        </div>
      </div>
    </SlidePanel>
  )
}
