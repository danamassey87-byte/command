import React, { useState, useMemo, useRef } from 'react'
import { Button, Badge, SectionHeader, Card, Input, Select, Textarea, SlidePanel, EmptyState } from '../../components/ui/index.jsx'
import { useVendors } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import { VENDOR_ROLE_GROUPS as ROLE_GROUPS, VENDOR_ROLES as ROLES, ROLE_BY_KEY, roleLabel, roleGroupFor } from '../../lib/vendorRoles.js'
import './Vendors.css'

// ─── Helpers ────────────────────────────────────────────────────────────────
const blankDraft = () => ({
  role: 'inspector',
  role_group: 'vendor',
  name: '',
  company: '',
  title: '',
  email: '',
  phone: '',
  phone_secondary: '',
  website: '',
  address_line_1: '',
  city: '',
  state: 'AZ',
  zip: '',
  license_number: '',
  license_state: 'AZ',
  preferred: false,
  rating: 5,
  specialties: [],
  tags: [],
  notes: '',
})

const STAR = '\u2605'
const STAR_EMPTY = '\u2606'

// Format a phone like (480) 555-1234 if it's 10 digits, else return as-is.
const fmtPhone = (p) => {
  if (!p) return ''
  const d = String(p).replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return p
}

// Build a vCard 3.0 string for a vendor so it can be downloaded/shared.
const buildVCard = (v) => {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${v.name || ''}`,
    v.company && `ORG:${v.company}`,
    v.title && `TITLE:${v.title}`,
    v.phone && `TEL;TYPE=CELL:${v.phone}`,
    v.phone_secondary && `TEL;TYPE=WORK:${v.phone_secondary}`,
    v.email && `EMAIL:${v.email}`,
    v.website && `URL:${v.website}`,
    (v.address_line_1 || v.city || v.state || v.zip) &&
      `ADR;TYPE=WORK:;;${v.address_line_1 || ''};${v.city || ''};${v.state || ''};${v.zip || ''};USA`,
    v.notes && `NOTE:${String(v.notes).replace(/\n/g, '\\n')}`,
    'END:VCARD',
  ].filter(Boolean)
  return lines.join('\r\n')
}

// Plain-text contact block for the Copy button.
const buildTextContact = (v) => {
  const parts = [
    v.name,
    v.title && v.company ? `${v.title}, ${v.company}` : (v.company || v.title),
    v.phone && `📞 ${fmtPhone(v.phone)}`,
    v.phone_secondary && `   ${fmtPhone(v.phone_secondary)}`,
    v.email && `✉  ${v.email}`,
    v.website && `🔗 ${v.website}`,
    (v.address_line_1 || v.city) && `📍 ${[v.address_line_1, v.city, v.state, v.zip].filter(Boolean).join(', ')}`,
    v.license_number && `License: ${v.license_number}${v.license_state ? ` (${v.license_state})` : ''}`,
    v.notes && `\n${v.notes}`,
  ].filter(Boolean)
  return parts.join('\n')
}

// ═════════════════════════════════════════════════════════════════════════════
// Vendors page
// ═════════════════════════════════════════════════════════════════════════════
export default function Vendors() {
  const { data: vendors, refetch } = useVendors()
  const [groupFilter, setGroupFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showPreferred, setShowPreferred] = useState(false)

  // Edit panel
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(blankDraft())
  const [saving, setSaving] = useState(false)

  // Multi-select + PDF packet
  const [selected, setSelected] = useState({})
  const [exporting, setExporting] = useState(false)
  const printableRef = useRef(null)

  // Filtered list
  const filtered = useMemo(() => {
    const list = vendors ?? []
    const q = search.toLowerCase().trim()
    return list.filter(v => {
      if (showPreferred && !v.preferred) return false
      if (groupFilter !== 'all' && (v.role_group || roleGroupFor(v.role)) !== groupFilter) return false
      if (roleFilter !== 'all' && v.role !== roleFilter) return false
      if (!q) return true
      const hay = `${v.name ?? ''} ${v.company ?? ''} ${v.role ?? ''} ${v.email ?? ''} ${v.phone ?? ''} ${v.city ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [vendors, groupFilter, roleFilter, search, showPreferred])

  // Group visible results by role_group for the rendered sections.
  const grouped = useMemo(() => {
    const out = {}
    for (const v of filtered) {
      const g = v.role_group || roleGroupFor(v.role) || 'other'
      if (!out[g]) out[g] = []
      out[g].push(v)
    }
    return out
  }, [filtered])

  const counts = useMemo(() => {
    const list = vendors ?? []
    const by = { all: list.length }
    for (const rg of ROLE_GROUPS) {
      by[rg.key] = list.filter(v => (v.role_group || roleGroupFor(v.role)) === rg.key).length
    }
    by.preferred = list.filter(v => v.preferred).length
    return by
  }, [vendors])

  // Which roles to offer in the role filter dropdown (based on current group)
  const roleOptions = useMemo(() => {
    if (groupFilter === 'all') return ROLES
    return ROLES.filter(r => r.group === groupFilter)
  }, [groupFilter])

  // ─── Panel handlers ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setDraft(blankDraft())
    setPanelOpen(true)
  }
  const openEdit = (v) => {
    setEditing(v)
    setDraft({
      ...blankDraft(),
      ...v,
      role_group: v.role_group || roleGroupFor(v.role),
      specialties: v.specialties || [],
      tags: v.tags || [],
    })
    setPanelOpen(true)
  }
  const closePanel = () => { setPanelOpen(false); setEditing(null) }

  const setField = (k, v) => setDraft(prev => ({ ...prev, [k]: v }))

  const handleRoleChange = (newRole) => {
    setDraft(prev => ({
      ...prev,
      role: newRole,
      role_group: roleGroupFor(newRole) || prev.role_group,
    }))
  }

  const handleSave = async () => {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        role: draft.role || 'other',
        role_group: draft.role_group || roleGroupFor(draft.role) || 'other',
        name: draft.name.trim(),
        company: draft.company.trim() || null,
        title: draft.title.trim() || null,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        phone_secondary: draft.phone_secondary.trim() || null,
        website: draft.website.trim() || null,
        address_line_1: draft.address_line_1.trim() || null,
        city: draft.city.trim() || null,
        state: draft.state?.trim() || null,
        zip: draft.zip.trim() || null,
        license_number: draft.license_number.trim() || null,
        license_state: draft.license_state?.trim() || null,
        preferred: !!draft.preferred,
        rating: Number(draft.rating) || null,
        notes: draft.notes.trim() || null,
      }
      if (editing?.id) await DB.updateVendor(editing.id, payload)
      else await DB.createVendor(payload)
      refetch()
      closePanel()
    } catch (e) {
      console.error('Save vendor failed:', e)
      alert('Failed to save vendor: ' + (e.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editing?.id) return
    if (!confirm(`Delete "${editing.name}"? You can restore from Settings → Trash.`)) return
    try {
      await DB.deleteVendor(editing.id)
      refetch()
      closePanel()
    } catch (e) { console.error(e) }
  }

  const togglePreferred = async (v) => {
    try {
      await DB.toggleVendorPreferred(v.id, !v.preferred)
      refetch()
    } catch (e) { console.error(e) }
  }

  // ─── Single-vendor share actions ─────────────────────────────────────────
  const copyContact = async (v) => {
    try {
      await navigator.clipboard.writeText(buildTextContact(v))
    } catch (e) { console.error(e) }
  }
  const downloadVCard = (v) => {
    const blob = new Blob([buildVCard(v)], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(v.name || 'vendor').replace(/[^\w]+/g, '_')}.vcf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const emailIntro = (v) => {
    const subject = encodeURIComponent(`${roleLabel(v.role)} referral: ${v.name}`)
    const body = encodeURIComponent(
      `Hi,\n\nHere's the contact info for ${v.name}${v.company ? ` (${v.company})` : ''} — someone I recommend.\n\n${buildTextContact(v)}\n\n— Dana`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  // ─── Multi-select + PDF packet export ────────────────────────────────────
  const toggleSelect = (id) => setSelected(s => ({ ...s, [id]: !s[id] }))
  const clearSelection = () => setSelected({})
  const selectedCount = Object.values(selected).filter(Boolean).length
  const selectedVendors = useMemo(
    () => (vendors ?? []).filter(v => selected[v.id]),
    [vendors, selected]
  )

  const handleExportPacket = async () => {
    if (!printableRef.current || selectedVendors.length === 0) return
    setExporting(true)
    const node = printableRef.current
    const prev = { left: node.style.left, visibility: node.style.visibility }
    node.style.left = '0'
    node.style.visibility = 'hidden'
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const filename = `Dana_Massey_Vendor_Packet_${new Date().toISOString().slice(0, 10)}.pdf`
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 1100 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(node)
        .save()
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDF export failed. Try selecting fewer vendors or check the console.')
    } finally {
      node.style.left = prev.left
      node.style.visibility = prev.visibility
      setExporting(false)
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="vendors-page">
      <SectionHeader
        title="Vendors"
        subtitle="Your rolodex of preferred inspectors, contractors, lenders, and partners"
        actions={
          <Button variant="primary" size="md" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >Add Vendor</Button>
        }
      />

      {/* ── Filter chips ── */}
      <div className="vendors-filters">
        <button
          className={`vendors-chip${groupFilter === 'all' ? ' vendors-chip--active' : ''}`}
          onClick={() => { setGroupFilter('all'); setRoleFilter('all') }}
        >All <span className="vendors-chip__count">{counts.all || 0}</span></button>
        {ROLE_GROUPS.map(rg => (
          <button
            key={rg.key}
            className={`vendors-chip${groupFilter === rg.key ? ' vendors-chip--active' : ''}`}
            onClick={() => { setGroupFilter(rg.key); setRoleFilter('all') }}
          >
            {rg.label} <span className="vendors-chip__count">{counts[rg.key] || 0}</span>
          </button>
        ))}
        <button
          className={`vendors-chip${showPreferred ? ' vendors-chip--active' : ''}`}
          onClick={() => setShowPreferred(v => !v)}
        >
          {STAR} Preferred <span className="vendors-chip__count">{counts.preferred || 0}</span>
        </button>
      </div>

      {/* ── Search + role filter ── */}
      <div className="vendors-toolbar">
        <input
          type="text"
          className="vendors-search"
          placeholder="Search name, company, role, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="vendors-role-select"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">All roles</option>
          {roleOptions.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        {selectedCount > 0 && (
          <div className="vendors-toolbar__selection">
            <span>{selectedCount} selected</span>
            <Button size="sm" variant="primary" onClick={handleExportPacket} disabled={exporting}>
              {exporting ? 'Generating…' : 'Export PDF Packet'}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
          </div>
        )}
      </div>

      {/* ── Vendor grid grouped by role group ── */}
      {(vendors ?? []).length === 0 ? (
        <EmptyState
          title="No vendors yet"
          description="Add your preferred inspectors, appraisers, lenders, contractors, and other partners so you can quickly attach them to listings and share their contact info with clients."
          action={<Button variant="primary" size="sm" onClick={openCreate}>Add Your First Vendor</Button>}
        />
      ) : filtered.length === 0 ? (
        <p className="vendors-empty">No vendors match your filters.</p>
      ) : (
        ROLE_GROUPS.map(rg => {
          const list = grouped[rg.key]
          if (!list || list.length === 0) return null
          return (
            <div key={rg.key} className="vendors-group">
              <div className="vendors-group__header">
                <h3 className="vendors-group__title">{rg.label}</h3>
                <span className="vendors-group__count">{list.length}</span>
              </div>
              <div className="vendors-grid">
                {list.map(v => (
                  <VendorCard
                    key={v.id}
                    vendor={v}
                    selected={!!selected[v.id]}
                    onToggleSelect={() => toggleSelect(v.id)}
                    onEdit={() => openEdit(v)}
                    onTogglePreferred={() => togglePreferred(v)}
                    onCopy={() => copyContact(v)}
                    onVCard={() => downloadVCard(v)}
                    onEmail={() => emailIntro(v)}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* ── Edit / Create panel ── */}
      <SlidePanel open={panelOpen} onClose={closePanel} title={editing ? 'Edit Vendor' : 'New Vendor'}>
        <VendorForm
          draft={draft}
          setField={setField}
          onRoleChange={handleRoleChange}
          onSave={handleSave}
          onCancel={closePanel}
          onDelete={editing ? handleDelete : null}
          saving={saving}
          isEditing={!!editing}
        />
      </SlidePanel>

      {/* ── Offscreen printable packet ── */}
      <VendorPacketPrintable ref={printableRef} vendors={selectedVendors} />
    </div>
  )
}

// ─── Vendor Card ─────────────────────────────────────────────────────────────
function VendorCard({ vendor: v, selected, onToggleSelect, onEdit, onTogglePreferred, onCopy, onVCard, onEmail }) {
  const [copied, setCopied] = useState(false)
  const doCopy = () => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1600) }
  const role = roleLabel(v.role)
  return (
    <Card className={`vendor-card${selected ? ' vendor-card--selected' : ''}${v.preferred ? ' vendor-card--preferred' : ''}`}>
      <div className="vendor-card__top">
        <label className="vendor-card__check" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} />
          <span />
        </label>
        <div className="vendor-card__identity" onClick={onEdit}>
          <div className="vendor-card__name-row">
            <h4 className="vendor-card__name">{v.name}</h4>
            {v.preferred && <span className="vendor-card__star" title="Preferred">{STAR}</span>}
          </div>
          {v.company && <p className="vendor-card__company">{v.company}{v.title ? ` · ${v.title}` : ''}</p>}
          <p className="vendor-card__role">
            <Badge variant="default" size="sm">{role}</Badge>
            {typeof v.rating === 'number' && v.rating > 0 && (
              <span className="vendor-card__rating">{STAR.repeat(v.rating)}{STAR_EMPTY.repeat(5 - v.rating)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="vendor-card__pin"
          onClick={e => { e.stopPropagation(); onTogglePreferred() }}
          title={v.preferred ? 'Remove from preferred' : 'Mark preferred'}
        >
          {v.preferred ? STAR : STAR_EMPTY}
        </button>
      </div>
      <div className="vendor-card__contact">
        {v.phone && <a href={`tel:${v.phone}`} onClick={e => e.stopPropagation()}>{fmtPhone(v.phone)}</a>}
        {v.email && <a href={`mailto:${v.email}`} onClick={e => e.stopPropagation()}>{v.email}</a>}
        {v.city && <span className="vendor-card__loc">{v.city}{v.state ? `, ${v.state}` : ''}</span>}
      </div>
      <div className="vendor-card__actions">
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); doCopy() }}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onVCard() }}>vCard</Button>
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onEmail() }}>Email</Button>
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onEdit() }}>Edit</Button>
      </div>
    </Card>
  )
}

// ─── Vendor Form ─────────────────────────────────────────────────────────────
function VendorForm({ draft, setField, onRoleChange, onSave, onCancel, onDelete, saving, isEditing }) {
  return (
    <>
      <div className="panel-section">
        <p className="panel-section-label">Role & Preference</p>
        <div className="panel-row">
          <Select label="Role Group" value={draft.role_group} onChange={e => setField('role_group', e.target.value)}>
            {ROLE_GROUPS.map(rg => <option key={rg.key} value={rg.key}>{rg.label}</option>)}
          </Select>
          <Select label="Role" value={draft.role} onChange={e => onRoleChange(e.target.value)}>
            {ROLES.filter(r => r.group === draft.role_group || draft.role_group === 'other').map(r => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
            {ROLES.filter(r => r.group !== draft.role_group && draft.role_group !== 'other').length > 0 && (
              <optgroup label="Other groups">
                {ROLES.filter(r => r.group !== draft.role_group).map(r => (
                  <option key={r.key} value={r.key}>{r.label} ({r.group})</option>
                ))}
              </optgroup>
            )}
          </Select>
        </div>
        <label className="panel-row" style={{ gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={!!draft.preferred} onChange={e => setField('preferred', e.target.checked)} />
          <span style={{ fontSize: '0.82rem' }}>Preferred vendor (shows at top of lists)</span>
        </label>
        <div className="panel-row">
          <Select label="Rating" value={draft.rating} onChange={e => setField('rating', Number(e.target.value))}>
            {[5, 4, 3, 2, 1, 0].map(n => <option key={n} value={n}>{n === 0 ? 'Unrated' : `${STAR.repeat(n)} (${n})`}</option>)}
          </Select>
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Identity</p>
        <Input label="Name *" value={draft.name} onChange={e => setField('name', e.target.value)} placeholder="John Smith" />
        <div className="panel-row">
          <Input label="Company" value={draft.company} onChange={e => setField('company', e.target.value)} placeholder="Desert Home Inspections" />
          <Input label="Title" value={draft.title} onChange={e => setField('title', e.target.value)} placeholder="Lead Inspector" />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Contact</p>
        <div className="panel-row">
          <Input label="Phone" value={draft.phone} onChange={e => setField('phone', e.target.value)} placeholder="(480) 555-1234" />
          <Input label="Secondary Phone" value={draft.phone_secondary} onChange={e => setField('phone_secondary', e.target.value)} placeholder="" />
        </div>
        <Input label="Email" type="email" value={draft.email} onChange={e => setField('email', e.target.value)} placeholder="john@example.com" />
        <Input label="Website" value={draft.website} onChange={e => setField('website', e.target.value)} placeholder="https://example.com" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Address</p>
        <Input label="Street Address" value={draft.address_line_1} onChange={e => setField('address_line_1', e.target.value)} placeholder="123 Main St" />
        <div className="panel-row">
          <Input label="City" value={draft.city} onChange={e => setField('city', e.target.value)} placeholder="Gilbert" />
          <Input label="State" value={draft.state} onChange={e => setField('state', e.target.value)} placeholder="AZ" />
          <Input label="Zip" value={draft.zip} onChange={e => setField('zip', e.target.value)} placeholder="85296" />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Licensing</p>
        <div className="panel-row">
          <Input label="License #" value={draft.license_number} onChange={e => setField('license_number', e.target.value)} placeholder="" />
          <Input label="License State" value={draft.license_state} onChange={e => setField('license_state', e.target.value)} placeholder="AZ" />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Notes</p>
        <Textarea label="Notes" value={draft.notes} onChange={e => setField('notes', e.target.value)} rows={4} placeholder="What makes them great, how you met, pricing notes, etc." />
      </div>

      <div className="panel-actions">
        <Button variant="primary" size="sm" onClick={onSave} disabled={saving || !draft.name.trim()}>
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Vendor'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} style={{ marginLeft: 'auto', color: 'var(--color-danger)' }}>
            Delete
          </Button>
        )}
      </div>
    </>
  )
}

// ─── Printable Vendor Packet (offscreen) ────────────────────────────────────
// Used by Export PDF Packet. Fills a letter page with the selected vendors
// grouped by role_group. Dana's brand header at top, footer with contact info.
const VendorPacketPrintable = React.forwardRef(function VendorPacketPrintable({ vendors }, ref) {
  const grouped = {}
  for (const v of vendors || []) {
    const g = v.role_group || roleGroupFor(v.role) || 'other'
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(v)
  }
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const C = {
    cream: '#faf7f0',
    brownDk: '#2d2416',
    brownMd: '#8B7355',
    mute: '#6b5d4c',
    soft: '#e5d9c0',
  }

  return (
    <div
      ref={ref}
      className="printable-offscreen"
      style={{
        width: '8.5in',
        minHeight: '11in',
        padding: '0.6in',
        background: '#ffffff',
        color: C.brownDk,
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        fontSize: '10pt',
        lineHeight: 1.4,
        boxSizing: 'border-box',
      }}
    >
      {/* ── Header ── */}
      <div style={{ borderBottom: `2px solid ${C.brownMd}`, paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: '7pt', letterSpacing: '0.18em', color: C.brownMd, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
          Dana Massey &nbsp;·&nbsp; REAL Broker
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: '26pt', fontFamily: '"Instrument Serif", Georgia, serif', color: C.brownDk, lineHeight: 1 }}>
            Trusted Vendors
          </div>
          <div style={{ fontSize: '8pt', color: C.mute }}>Shared {dateStr}</div>
        </div>
        <p style={{ fontSize: '9pt', color: C.mute, marginTop: 8, fontStyle: 'italic' }}>
          These are people I've worked with and recommend. Mention my name for the best experience.
        </p>
      </div>

      {/* ── Sections ── */}
      {ROLE_GROUPS.map(rg => {
        const list = grouped[rg.key]
        if (!list || list.length === 0) return null
        return (
          <div key={rg.key} style={{ marginBottom: 18, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={{
              fontSize: '8pt',
              letterSpacing: '0.14em',
              color: C.brownMd,
              fontWeight: 700,
              textTransform: 'uppercase',
              borderBottom: `1px solid ${C.soft}`,
              paddingBottom: 4,
              marginBottom: 8,
            }}>
              {rg.label}
            </div>
            {list.map(v => (
              <div key={v.id} style={{
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom: `1px dashed ${C.soft}`,
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '11pt', fontWeight: 700, color: C.brownDk }}>
                    {v.name}
                    {v.company && <span style={{ fontWeight: 400, color: C.mute, fontSize: '9.5pt' }}> — {v.company}</span>}
                  </div>
                  <div style={{ fontSize: '7.5pt', color: C.brownMd, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {roleLabel(v.role)}
                  </div>
                </div>
                <div style={{ fontSize: '9pt', color: C.mute, marginTop: 3 }}>
                  {v.phone && <span style={{ marginRight: 14 }}>{fmtPhone(v.phone)}</span>}
                  {v.email && <span style={{ marginRight: 14 }}>{v.email}</span>}
                  {v.website && <span>{v.website}</span>}
                </div>
                {(v.address_line_1 || v.city) && (
                  <div style={{ fontSize: '8.5pt', color: C.mute, marginTop: 2 }}>
                    {[v.address_line_1, v.city, v.state, v.zip].filter(Boolean).join(', ')}
                  </div>
                )}
                {v.notes && (
                  <div style={{ fontSize: '9pt', color: C.brownDk, marginTop: 5, fontStyle: 'italic' }}>
                    "{v.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* ── Footer ── */}
      <div style={{
        position: 'absolute',
        left: '0.6in',
        right: '0.6in',
        bottom: '0.4in',
        borderTop: `1px solid ${C.soft}`,
        paddingTop: 8,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '7.5pt',
        color: C.mute,
      }}>
        <span>DANA MASSEY · REAL BROKER · EAST VALLEY, AZ</span>
        <span>Questions? Reach out any time.</span>
      </div>
    </div>
  )
})
