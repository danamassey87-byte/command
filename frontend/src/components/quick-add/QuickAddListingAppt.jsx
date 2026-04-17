import { useState, useEffect, useRef } from 'react'
import { SlidePanel, Button, Input, Textarea } from '../ui'
import {
  createContact, createListingAppointment, ensureProperty, logActivity,
} from '../../lib/supabase'
import { emit as emitNotification } from '../../lib/notifications'
import {
  findContactByPhone, findContactByEmail,
  findScheduleConflicts, findActiveAppointmentsForContact,
} from '../../lib/safeguards'
import {
  validateEmail, validatePhone, validateZip, checkFutureDate, newRequestId,
} from '../../lib/validators'
import NameAutocomplete from './NameAutocomplete'
import AddressAutocomplete from './AddressAutocomplete'
import ComboBox from '../ui/ComboBox'
import './quick-add.css'

const BLANK = {
  clientName: '', clientEmail: '', clientPhone: '',
  address: '', city: '', zip: '',
  when: '',
  location: '',
  source: '',
  notes: '',
}

export default function QuickAddListingAppt({ open, onClose }) {
  const [form, setForm] = useState(BLANK)
  const [existingContactId, setExistingContactId] = useState(null)
  const [existingPropertyId, setExistingPropertyId] = useState(null)
  const [forceNewContact, setForceNewContact] = useState(false)
  const [contactDupBlocked, setContactDupBlocked] = useState(false)

  // Safeguard state
  const [phoneMatch, setPhoneMatch] = useState(null)         // #1
  const [emailMatch, setEmailMatch] = useState(null)         // #1
  const [conflicts, setConflicts] = useState([])             // #4
  const [activeAppts, setActiveAppts] = useState([])         // #5
  const [pastDateConfirmed, setPastDateConfirmed] = useState(false) // #3

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(null)                          // #2 idempotency

  useEffect(() => {
    if (open) {
      setForm(BLANK)
      setExistingContactId(null); setExistingPropertyId(null)
      setForceNewContact(false); setContactDupBlocked(false)
      setPhoneMatch(null); setEmailMatch(null)
      setConflicts([]); setActiveAppts([])
      setPastDateConfirmed(false)
      setError(null)
      requestIdRef.current = newRequestId()
    }
  }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* ─── #1 phone collision (debounced) ─── */
  useEffect(() => {
    if (!open || !form.clientPhone || existingContactId) { setPhoneMatch(null); return }
    const t = setTimeout(async () => {
      try { setPhoneMatch(await findContactByPhone(form.clientPhone, { excludeId: existingContactId })) }
      catch (e) { console.error(e) }
    }, 400)
    return () => clearTimeout(t)
  }, [form.clientPhone, open, existingContactId])

  /* ─── #1 email collision ─── */
  useEffect(() => {
    if (!open || !form.clientEmail || existingContactId) { setEmailMatch(null); return }
    const t = setTimeout(async () => {
      try { setEmailMatch(await findContactByEmail(form.clientEmail, { excludeId: existingContactId })) }
      catch (e) { console.error(e) }
    }, 400)
    return () => clearTimeout(t)
  }, [form.clientEmail, open, existingContactId])

  /* ─── #4 schedule conflicts ─── */
  useEffect(() => {
    if (!open || !form.when) { setConflicts([]); return }
    const t = setTimeout(async () => {
      try { setConflicts(await findScheduleConflicts(form.when, { windowMinutes: 30 })) }
      catch (e) { console.error(e) }
    }, 300)
    return () => clearTimeout(t)
  }, [form.when, open])

  /* ─── #5 active appointment for this contact ─── */
  useEffect(() => {
    if (!existingContactId) { setActiveAppts([]); return }
    findActiveAppointmentsForContact(existingContactId)
      .then(setActiveAppts).catch(console.error)
  }, [existingContactId])

  const linkExistingContact = (c) => {
    setExistingContactId(c.id)
    setForm(f => ({
      ...f,
      clientName: c.name,
      clientEmail: c.email || f.clientEmail,
      clientPhone: c.phone || f.clientPhone,
    }))
    setPhoneMatch(null); setEmailMatch(null)
  }

  const validate = () => {
    if (!form.clientName.trim()) return 'Client name is required'
    if (!form.address.trim()) return 'Property address is required'
    if (!form.when) return 'Pick a date & time'
    const eErr = validateEmail(form.clientEmail); if (eErr) return eErr
    const pErr = validatePhone(form.clientPhone); if (pErr) return pErr
    const zErr = validateZip(form.zip); if (zErr) return zErr
    if (contactDupBlocked) return 'Resolve the client duplicate warning first'
    if (phoneMatch && !existingContactId) return 'Phone matches an existing contact — link it or change it'
    if (emailMatch && !existingContactId) return 'Email matches an existing contact — link it or change it'
    const dateErr = checkFutureDate(form.when)
    if (dateErr && !pastDateConfirmed) return dateErr + ' Tick the box below to confirm.'
    return null
  }

  const handleSave = async () => {
    setError(null)
    const err = validate()
    if (err) { setError(err); return }
    try {
      setSaving(true)

      // 1. Contact
      let contactId = existingContactId
      if (!contactId) {
        const c = await createContact({
          name: form.clientName.trim(),
          email: form.clientEmail.trim() || null,
          phone: form.clientPhone.trim() || null,
          type: 'seller',
          source: form.source.trim() || null,
          // client_request_id omitted — UUID column can't accept string suffix
        })
        contactId = c.id
      }

      // 2. Property — uses normalized lookup + MLS dedupe
      let propertyId = existingPropertyId
      if (!propertyId) {
        propertyId = await ensureProperty({
          address: form.address.trim(),
          city: form.city.trim() || null,
          zip: form.zip.trim() || null,
        })
      }

      // 3. Listing appointment (idempotent via client_request_id)
      const appt = await createListingAppointment({
        contact_id: contactId,
        property_id: propertyId,
        scheduled_at: new Date(form.when).toISOString(),
        location: form.location.trim() || null,
        source: form.source.trim() || null,
        notes: form.notes.trim() || null,
        client_request_id: requestIdRef.current,                // #2
      })

      await logActivity('listing_appointment_created',
        `Listing appt: ${form.clientName} @ ${form.address}`,
        { contactId, propertyId, metadata: { appointment_id: appt.id } }
      )
      emitNotification({
        type: 'appointment_booked',
        title: `Listing appt: ${form.clientName}`,
        body: `${form.address} · ${new Date(form.when).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${form.location ? ' · ' + form.location : ''}`,
        link: '/dashboard/appts',
        source_table: 'listing_appointments',
        source_id: appt.id,
        metadata: { contact_id: contactId, property_id: propertyId, location: form.location || null },
      }).catch(err => console.error('notification emit failed', err))

      onClose?.()
    } catch (e) {
      // #2 — duplicate request_id means we already saved this submission
      if (e.message?.includes('client_request_id') || e.message?.includes('duplicate key')) {
        onClose?.()
        return
      }
      setError(e.message || 'Failed to create appointment')
    } finally {
      setSaving(false)
    }
  }

  const dateWarning = checkFutureDate(form.when)

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="New Listing Appointment"
      subtitle="Schedule a seller consultation"
      width={520}
    >
      <div className="qa-form">
        <div className="qa-section-label">Client</div>
        <NameAutocomplete
          label="Client name *"
          value={form.clientName}
          selectedId={existingContactId}
          forceNew={forceNewContact}
          onChange={(v) => {
            set('clientName', v); setExistingContactId(null); setForceNewContact(false)
          }}
          onSelectExisting={linkExistingContact}
          onForceNew={(undo) => setForceNewContact(undo === false ? false : true)}
          onDuplicateState={setContactDupBlocked}
          autoFocus
        />

        {/* #5 active-appointment warning */}
        {activeAppts.length > 0 && (
          <div className="qa-warn">
            ⚠️ This contact already has {activeAppts.length} scheduled appointment{activeAppts.length > 1 ? 's' : ''}:
            <ul className="qa-warn-list">
              {activeAppts.map(a => (
                <li key={a.id}>
                  {new Date(a.scheduled_at).toLocaleString()}
                  {a.property?.address && ` — ${a.property.address}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="qa-row">
          <Input label="Email" type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} />
          <Input label="Phone" value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} />
        </div>

        {/* #1 phone/email collision warnings */}
        {phoneMatch && (
          <div className="qa-warn qa-warn--block">
            ⚠️ Phone number is already used by <strong>{phoneMatch.name}</strong> ({phoneMatch.type}).
            <button type="button" className="qa-warn-btn" onClick={() => linkExistingContact(phoneMatch)}>
              Link to {phoneMatch.name}
            </button>
          </div>
        )}
        {emailMatch && (
          <div className="qa-warn qa-warn--block">
            ⚠️ Email is already used by <strong>{emailMatch.name}</strong> ({emailMatch.type}).
            <button type="button" className="qa-warn-btn" onClick={() => linkExistingContact(emailMatch)}>
              Link to {emailMatch.name}
            </button>
          </div>
        )}

        <div className="qa-section-label">Property</div>
        <AddressAutocomplete
          label="Address *"
          value={form.address}
          city={form.city}
          state="AZ"
          zip={form.zip}
          selectedId={existingPropertyId}
          onChange={(v) => { set('address', v); setExistingPropertyId(null) }}
          onSelectExisting={(p) => {
            setExistingPropertyId(p.id)
            setForm(f => ({
              ...f,
              address: p.address,
              city: p.city || f.city,
              zip: p.zip || f.zip,
            }))
          }}
          onUspsAccepted={(addr) => setForm(f => ({
            ...f,
            address: addr.address,
            city: addr.city || f.city,
            zip: addr.zip || f.zip,
          }))}
        />
        <div className="qa-row">
          <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} />
          <Input label="ZIP" value={form.zip} onChange={e => set('zip', e.target.value)} />
        </div>

        <div className="qa-section-label">Appointment</div>
        <Input
          label="Date & time *"
          type="datetime-local"
          value={form.when}
          onChange={e => { set('when', e.target.value); setPastDateConfirmed(false) }}
        />

        {/* #3 past-date guard */}
        {dateWarning && (
          <label className="qa-checkbox qa-checkbox--warn">
            <input
              type="checkbox"
              checked={pastDateConfirmed}
              onChange={e => setPastDateConfirmed(e.target.checked)}
            />
            <span>{dateWarning}</span>
          </label>
        )}

        {/* #4 conflict warning */}
        {conflicts.length > 0 && (
          <div className="qa-warn">
            ⚠️ {conflicts.length} other thing{conflicts.length > 1 ? 's' : ''} on your calendar within 30 minutes:
            <ul className="qa-warn-list">
              {conflicts.map(c => (
                <li key={c.id}>
                  {new Date(c.when).toLocaleString()} — {c.label} <em>({c.kind.replace('_', ' ')})</em>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ComboBox
          label="Location"
          listKey="appointment_locations"
          value={form.location}
          onChange={(v) => set('location', v)}
          placeholder="Pick a location…"
        />
        <ComboBox
          label="Source"
          listKey="appointment_sources"
          value={form.source}
          onChange={(v) => set('source', v)}
          placeholder="Pick a source…"
        />
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
            {saving ? 'Saving…' : 'Schedule appointment'}
          </Button>
        </div>
      </div>
    </SlidePanel>
  )
}
