import { useState, useMemo } from 'react'
import { Button, Badge, Card, Input, Select, Textarea } from '../ui/index.jsx'
import { usePartiesForListing, useVendors } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import { ROLE_GROUPS, ROLES, roleLabel, roleGroupFor } from '../../lib/vendorRoles.js'
import './PartiesSection.css'

// ─────────────────────────────────────────────────────────────────────────────
// Parties & Vendors section — shown on the Sellers listing detail page.
// Lets Dana attach people from her vendor rolodex OR add one-off contacts,
// grouped by Contract / Representation / Vendor / Other.
// ─────────────────────────────────────────────────────────────────────────────
export default function PartiesSection({ listingId }) {
  const { data: parties, refetch } = usePartiesForListing(listingId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const grouped = useMemo(() => {
    const out = {}
    for (const p of parties ?? []) {
      const g = p.role_group || roleGroupFor(p.role) || 'other'
      if (!out[g]) out[g] = []
      out[g].push(p)
    }
    return out
  }, [parties])

  const totalCount = (parties ?? []).length

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (party) => {
    setEditing(party)
    setModalOpen(true)
  }
  const close = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = async (party) => {
    if (!confirm(`Remove ${party.name || party.vendor?.name || 'this party'} from the listing?`)) return
    try {
      await DB.deleteListingParty(party.id)
      refetch()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="parties-section">
      <div className="parties-section__header">
        <div>
          <h3 className="parties-section__title">Parties &amp; Vendors</h3>
          <p className="parties-section__subtitle">
            {totalCount === 0
              ? 'No one attached yet. Add co-signers, agents, TC, escrow, inspectors, and vendors.'
              : `${totalCount} ${totalCount === 1 ? 'person' : 'people'} attached to this listing.`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={openCreate}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >
          Add Party
        </Button>
      </div>

      {totalCount === 0 ? null : (
        <div className="parties-section__groups">
          {ROLE_GROUPS.map(rg => {
            const list = grouped[rg.key]
            if (!list || list.length === 0) return null
            return (
              <div key={rg.key} className="parties-group">
                <div className="parties-group__header">
                  <span className="parties-group__label">{rg.label}</span>
                  <span className="parties-group__count">{list.length}</span>
                </div>
                <div className="parties-group__items">
                  {list.map(p => (
                    <PartyRow key={p.id} party={p} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <PartyModal
          listingId={listingId}
          party={editing}
          onClose={close}
          onSaved={() => { close(); refetch() }}
        />
      )}
    </div>
  )
}

// ─── Single party row ───────────────────────────────────────────────────────
function PartyRow({ party, onEdit, onDelete }) {
  // Parties can be backed by a vendor (party.vendor) or be freeform.
  const v = party.vendor
  const name = v?.name || party.name || '—'
  const company = v?.company || party.company || ''
  const email = v?.email || party.email || ''
  const phone = v?.phone || party.phone || ''
  const role = roleLabel(party.role)

  return (
    <div className="party-row">
      <div className="party-row__main">
        <div className="party-row__name-row">
          <span className="party-row__name">{name}</span>
          <Badge variant="default" size="sm">{role}</Badge>
          {v && <Badge variant="info" size="sm">Rolodex</Badge>}
          {v?.preferred && <span className="party-row__star" title="Preferred vendor">★</span>}
        </div>
        {company && <p className="party-row__company">{company}</p>}
        <div className="party-row__contact">
          {phone && <a href={`tel:${phone}`}>{phone}</a>}
          {email && <a href={`mailto:${email}`}>{email}</a>}
        </div>
        {party.notes && <p className="party-row__notes">{party.notes}</p>}
      </div>
      <div className="party-row__actions">
        <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>Remove</Button>
      </div>
    </div>
  )
}

// ─── Add / Edit Party modal ─────────────────────────────────────────────────
// Two modes:
//   1. "Pick from rolodex" — search your vendors and attach one
//   2. "Add new" — type a fresh name/email/phone (optionally save to rolodex)
function PartyModal({ listingId, party, onClose, onSaved }) {
  const isEditing = !!party
  const [mode, setMode] = useState(
    party?.vendor_id ? 'rolodex' : 'fresh'
  )

  // Shared
  const [role, setRole] = useState(party?.role || 'co_seller')
  const [notes, setNotes] = useState(party?.notes || '')
  const [saving, setSaving] = useState(false)

  // Fresh mode fields
  const [name, setName] = useState(party?.name || '')
  const [company, setCompany] = useState(party?.company || '')
  const [email, setEmail] = useState(party?.email || '')
  const [phone, setPhone] = useState(party?.phone || '')
  const [saveToRolodex, setSaveToRolodex] = useState(false)

  // Rolodex mode fields
  const [vendorId, setVendorId] = useState(party?.vendor_id || null)
  const [search, setSearch] = useState('')
  const { data: vendors } = useVendors({ search })
  const selectedVendor = (vendors ?? []).find(v => v.id === vendorId)

  const roleGroup = roleGroupFor(role) || 'other'
  const rolesForGroup = useMemo(() => ROLES.filter(r => r.group === roleGroup), [roleGroup])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (mode === 'rolodex') {
        if (!vendorId) { alert('Pick a vendor first.'); setSaving(false); return }
        const payload = {
          listing_id: listingId,
          vendor_id: vendorId,
          role,
          role_group: roleGroup,
          name: null,
          company: null,
          email: null,
          phone: null,
          notes: notes.trim() || null,
        }
        if (isEditing) await DB.updateListingParty(party.id, payload)
        else await DB.createListingParty(payload)
      } else {
        if (!name.trim()) { alert('Name is required.'); setSaving(false); return }
        // Optionally save to global rolodex first, then attach.
        let newVendorId = null
        if (saveToRolodex) {
          try {
            const v = await DB.createVendor({
              role,
              role_group: roleGroup,
              name: name.trim(),
              company: company.trim() || null,
              email: email.trim() || null,
              phone: phone.trim() || null,
            })
            newVendorId = v?.id || null
          } catch (e) {
            console.error('Failed to save to rolodex:', e)
          }
        }
        const payload = {
          listing_id: listingId,
          vendor_id: newVendorId,
          role,
          role_group: roleGroup,
          name: name.trim(),
          company: company.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        }
        if (isEditing) await DB.updateListingParty(party.id, payload)
        else await DB.createListingParty(payload)
      }
      onSaved()
    } catch (e) {
      console.error('Save party failed:', e)
      alert('Failed to save: ' + (e.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="party-modal__overlay" onClick={onClose}>
      <div className="party-modal" onClick={e => e.stopPropagation()}>
        <div className="party-modal__header">
          <h3>{isEditing ? 'Edit Party' : 'Add Party'}</h3>
          <button className="party-modal__close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="party-modal__body">
          {/* Mode toggle */}
          {!isEditing && (
            <div className="party-modal__mode">
              <button
                className={`party-modal__mode-btn${mode === 'rolodex' ? ' party-modal__mode-btn--active' : ''}`}
                onClick={() => setMode('rolodex')}
              >
                Pick from Rolodex
              </button>
              <button
                className={`party-modal__mode-btn${mode === 'fresh' ? ' party-modal__mode-btn--active' : ''}`}
                onClick={() => setMode('fresh')}
              >
                Add New Person
              </button>
            </div>
          )}

          {/* Role picker (always visible) */}
          <div className="panel-row">
            <Select label="Group" value={roleGroup} onChange={e => {
              const g = e.target.value
              const firstInGroup = ROLES.find(r => r.group === g)
              if (firstInGroup) setRole(firstInGroup.key)
            }}>
              {ROLE_GROUPS.map(rg => <option key={rg.key} value={rg.key}>{rg.label}</option>)}
            </Select>
            <Select label="Role" value={role} onChange={e => setRole(e.target.value)}>
              {rolesForGroup.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
          </div>

          {/* Rolodex picker */}
          {mode === 'rolodex' && (
            <div className="panel-section">
              <Input
                label="Search your rolodex"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, company, phone…"
              />
              <div className="party-modal__rolodex-list">
                {(vendors ?? []).length === 0 && (
                  <p className="party-modal__empty">No vendors match. Switch to "Add New Person" to create one.</p>
                )}
                {(vendors ?? []).slice(0, 40).map(v => (
                  <label key={v.id} className={`party-modal__rolodex-item${vendorId === v.id ? ' party-modal__rolodex-item--active' : ''}`}>
                    <input
                      type="radio"
                      name="vendor-pick"
                      checked={vendorId === v.id}
                      onChange={() => setVendorId(v.id)}
                    />
                    <div className="party-modal__rolodex-text">
                      <div className="party-modal__rolodex-name">
                        {v.name}
                        {v.preferred && <span style={{ color: '#c9962e', marginLeft: 4 }}>★</span>}
                      </div>
                      <div className="party-modal__rolodex-meta">
                        {[roleLabel(v.role), v.company, v.phone, v.email].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedVendor && (
                <p className="party-modal__selected">Selected: <strong>{selectedVendor.name}</strong></p>
              )}
            </div>
          )}

          {/* Fresh contact form */}
          {mode === 'fresh' && (
            <div className="panel-section">
              <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
              <Input label="Company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Inspections" />
              <div className="panel-row">
                <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(480) 555-1234" />
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
              {!isEditing && (
                <label className="party-modal__save-to-rolodex">
                  <input type="checkbox" checked={saveToRolodex} onChange={e => setSaveToRolodex(e.target.checked)} />
                  <span>Also save to my vendor rolodex for reuse on other listings</span>
                </label>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="panel-section">
            <Textarea
              label="Notes for this listing (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. 'Handles termite side', 'spouse on title', 'arrives at 2pm'…"
            />
          </div>
        </div>

        <div className="party-modal__footer">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Party'}
          </Button>
        </div>
      </div>
    </div>
  )
}
