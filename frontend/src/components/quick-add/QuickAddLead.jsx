import { useState, useEffect, useRef } from 'react'
import { SlidePanel, Button, Input, Textarea } from '../ui'
import {
  createContact, updateContact, createListingAppointment, logActivity, ensureProperty,
} from '../../lib/supabase'
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
  name: '', email: '', phone: '',
  lead_intent: 'buyer',
  source: '',
  notes: '',
  scheduleAppointment: false,
  apptWhen: '',
  propertyAddress: '',
  propertyCity: '',
  propertyZip: '',
}

export default function QuickAddLead({ open, onClose }) {
  const [form, setForm] = useState(BLANK)
  const [existingContactId, setExistingContactId] = useState(null)
  const [existingPropertyId, setExistingPropertyId] = useState(null)
  const [forceNewContact, setForceNewContact] = useState(false)
  const [contactDupBlocked, setContactDupBlocked] = useState(false)
  const [phoneMatch, setPhoneMatch] = useState(null)
  const [emailMatch, setEmailMatch] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [activeAppts, setActiveAppts] = useState([])
  const [pastDateConfirmed, setPastDateConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(null)

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

  // #1 phone collision
  useEffect(() => {
    if (!open || !form.phone || existingContactId) { setPhoneMatch(null); return }
    const t = setTimeout(async () => {
      try { setPhoneMatch(await findContactByPhone(form.phone, { excludeId: existingContactId })) }
      catch (e) { console.error(e) }
    }, 400)
    return () => clearTimeout(t)
  }, [form.phone, open, existingContactId])

  // #1 email collision
  useEffect(() => {
    if (!open || !form.email || existingContactId) { setEmailMatch(null); return }
    const t = setTimeout(async () => {
      try { setEmailMatch(await findContactByEmail(form.email, { excludeId: existingContactId })) }
      catch (e) { console.error(e) }
    }, 400)
    return () => clearTimeout(t)
  }, [form.email, open, existingContactId])

  // #4 conflicts (only when scheduling appt)
  useEffect(() => {
    if (!open || !form.scheduleAppointment || !form.apptWhen) { setConflicts([]); return }
    const t = setTimeout(async () => {
      try { setConflicts(await findScheduleConflicts(form.apptWhen, { windowMinutes: 30 })) }
      catch (e) { console.error(e) }
    }, 300)
    return () => clearTimeout(t)
  }, [form.apptWhen, form.scheduleAppointment, open])

  // #5 active appts for linked contact
  useEffect(() => {
    if (!existingContactId) { setActiveAppts([]); return }
    findActiveAppointmentsForContact(existingContactId)
      .then(setActiveAppts).catch(console.error)
  }, [existingContactId])

  const linkExistingContact = (c) => {
    setExistingContactId(c.id)
    setForm(f => ({ ...f, name: c.name, email: c.email || f.email, phone: c.phone || f.phone }))
    setPhoneMatch(null); setEmailMatch(null)
  }

  const validate = () => {
    if (!form.name.trim()) return 'Name is required'
    if (!['buyer','seller'].includes(form.lead_intent)) return 'Pick buyer or seller'
    const eErr = validateEmail(form.email); if (eErr) return eErr
    const pErr = validatePhone(form.phone); if (pErr) return pErr
    if (form.scheduleAppointment) {
      if (!form.apptWhen) return 'Pick an appointment date & time'
      if (!form.propertyAddress.trim()) return 'Property address is required for an appointment'
      const zErr = validateZip(form.propertyZip); if (zErr) return zErr
      const dateErr = checkFutureDate(form.apptWhen)
      if (dateErr && !pastDateConfirmed) return dateErr + ' Tick the box below to confirm.'
    }
    if (contactDupBlocked) return 'Resolve the contact duplicate warning first'
    if (phoneMatch && !existingContactId) return 'Phone matches an existing contact — link it or change it'
    if (emailMatch && !existingContactId) return 'Email matches an existing contact — link it or change it'
    return null
  }

  const handleSave = async () => {
    setError(null)
    const err = validate()
    if (err) { setError(err); return }
    try {
      setSaving(true)

      // 1. Contact: reuse if existing (just stamp lead_intent without changing type),
      //    otherwise create a brand-new lead row.
      let contactId = existingContactId
      if (contactId) {
        await updateContact(contactId, { lead_intent: form.lead_intent })
        await logActivity('lead_intent_added',
          `Tagged existing contact as ${form.lead_intent} lead: ${form.name}`,
          { contactId }
        )
      } else {
        const created = await createContact({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          type: 'lead',
          lead_intent: form.lead_intent,
          source: form.source.trim() || null,
          notes: form.notes.trim() || null,
          client_request_id: requestIdRef.current + ':contact',
        })
        contactId = created.id
        await logActivity('lead_created',
          `New ${form.lead_intent} lead: ${created.name}`,
          { contactId }
        )
      }

      // 2. Optional: convert immediately to a listing appointment
      if (form.scheduleAppointment) {
        let propertyId = existingPropertyId
        if (!propertyId) {
          propertyId = await ensureProperty({
            address: form.propertyAddress.trim(),
            city: form.propertyCity.trim() || null,
            zip: form.propertyZip.trim() || null,
          })
        }
        const appt = await createListingAppointment({
          contact_id: contactId,
          property_id: propertyId,
          scheduled_at: new Date(form.apptWhen).toISOString(),
          source: form.source.trim() || null,
          notes: form.notes.trim() || null,
          client_request_id: requestIdRef.current,
        })
        await logActivity('listing_appointment_created',
          `Listing appt from lead: ${form.name} @ ${form.propertyAddress}`,
          { contactId, propertyId, metadata: { appointment_id: appt.id } }
        )
      }

      onClose?.()
    } catch (e) {
      if (e.message?.includes('client_request_id') || e.message?.includes('duplicate key')) {
        onClose?.(); return
      }
      setError(e.message || 'Failed to create lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="New Lead"
      subtitle="Capture a buyer or seller lead"
      width={520}
    >
      <div className="qa-form">
        <div className="qa-toggle" role="radiogroup" aria-label="Lead intent">
          <button
            type="button"
            className={`qa-toggle__btn ${form.lead_intent === 'buyer' ? 'qa-toggle__btn--active' : ''}`}
            onClick={() => set('lead_intent', 'buyer')}
            role="radio"
            aria-checked={form.lead_intent === 'buyer'}
          >Buyer Lead</button>
          <button
            type="button"
            className={`qa-toggle__btn ${form.lead_intent === 'seller' ? 'qa-toggle__btn--active' : ''}`}
            onClick={() => set('lead_intent', 'seller')}
            role="radio"
            aria-checked={form.lead_intent === 'seller'}
          >Seller Lead</button>
        </div>

        <NameAutocomplete
          label="Full name *"
          value={form.name}
          selectedId={existingContactId}
          forceNew={forceNewContact}
          onChange={(v) => {
            set('name', v); setExistingContactId(null); setForceNewContact(false)
          }}
          onSelectExisting={linkExistingContact}
          onForceNew={(undo) => setForceNewContact(undo === false ? false : true)}
          onDuplicateState={setContactDupBlocked}
          autoFocus
        />

        {existingContactId && (
          <div className="qa-pill qa-pill--info">
            Lead intent will be added to this existing contact's record.
          </div>
        )}

        {activeAppts.length > 0 && (
          <div className="qa-warn">
            ⚠️ This contact already has {activeAppts.length} scheduled appointment{activeAppts.length > 1 ? 's' : ''}.
          </div>
        )}

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
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
        <ComboBox
          label="Source"
          listKey="lead_sources"
          value={form.source}
          onChange={(v) => set('source', v)}
          placeholder="Pick a source…"
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
        />

        {/* ─── Convert-to-listing-appointment toggle ─── */}
        <label className="qa-checkbox">
          <input
            type="checkbox"
            checked={form.scheduleAppointment}
            onChange={e => set('scheduleAppointment', e.target.checked)}
          />
          <span>Also schedule a listing appointment now</span>
        </label>

        {form.scheduleAppointment && (
          <div className="qa-subsection">
            <AddressAutocomplete
              label="Property address *"
              value={form.propertyAddress}
              city={form.propertyCity}
              state="AZ"
              zip={form.propertyZip}
              selectedId={existingPropertyId}
              onChange={(v) => { set('propertyAddress', v); setExistingPropertyId(null) }}
              onSelectExisting={(p) => {
                setExistingPropertyId(p.id)
                setForm(f => ({
                  ...f,
                  propertyAddress: p.address,
                  propertyCity: p.city || f.propertyCity,
                  propertyZip: p.zip || f.propertyZip,
                }))
              }}
              onUspsAccepted={(addr) => setForm(f => ({
                ...f,
                propertyAddress: addr.address,
                propertyCity: addr.city || f.propertyCity,
                propertyZip: addr.zip || f.propertyZip,
              }))}
            />
            <div className="qa-row">
              <Input label="City" value={form.propertyCity} onChange={e => set('propertyCity', e.target.value)} />
              <Input label="ZIP" value={form.propertyZip} onChange={e => set('propertyZip', e.target.value)} />
            </div>
            <Input
              label="Appointment date & time *"
              type="datetime-local"
              value={form.apptWhen}
              onChange={e => { set('apptWhen', e.target.value); setPastDateConfirmed(false) }}
            />
            {checkFutureDate(form.apptWhen) && (
              <label className="qa-checkbox qa-checkbox--warn">
                <input
                  type="checkbox"
                  checked={pastDateConfirmed}
                  onChange={e => setPastDateConfirmed(e.target.checked)}
                />
                <span>{checkFutureDate(form.apptWhen)}</span>
              </label>
            )}
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
          </div>
        )}

        {error && <div className="qa-error">{error}</div>}

        <div className="qa-actions">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : form.scheduleAppointment ? 'Create lead + appointment' : 'Create lead'}
          </Button>
        </div>
      </div>
    </SlidePanel>
  )
}
