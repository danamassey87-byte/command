import { useMemo, useState, useCallback } from 'react'
import {
  SectionHeader, DataTable, AddressLink, Button, SlidePanel, Input, Select, Textarea, Badge, EmptyState,
} from '../../components/ui/index.jsx'
import { AddressAutocomplete } from '../../components/ui/AddressAutocomplete.jsx'
import { useProperties, useShowingSessions, useContacts } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './Properties.css'

const EMPTY_DRAFT = {
  google_place_id:   null,
  formatted_address: '',
  address:           '',
  city:              '',
  state:             'AZ',
  zip:               '',
  neighborhood:      '',
  county:            '',
  latitude:          null,
  longitude:         null,
  price:             '',
  beds:              '',
  baths:             '',
  sqft:              '',
  year_built:        '',
  lot_size:          '',
  property_type:     '',
  subdivision:       '',
  mls_id:            '',
  hoa_amount:        '',
  pool:              false,
  garage:            '',
  notes:             '',
  assigned_contact_ids: [], // local UI state — rendered via showing_sessions
}

export default function Properties() {
  const { data: propertiesData, loading, refetch } = useProperties()
  const { data: sessionsData, refetch: refetchSessions } = useShowingSessions()
  const { data: contactsData } = useContacts()

  const [panelOpen, setPanelOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)   // property being edited, or null for new
  const [draft, setDraft]           = useState(EMPTY_DRAFT)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [dupeWarning, setDupeWarning] = useState(null)  // { existingProperty } when autocomplete matches an existing place_id

  /* ─── Assemble rows with showings history rolled up ─── */
  const { rows, propertyShowings } = useMemo(() => {
    const props = propertiesData ?? []
    const sessions = sessionsData ?? []

    const showingsByProp = {}  // property_id → array of { date, contact_name, interest_level }
    sessions.forEach(s => {
      (s.showings ?? []).forEach(sh => {
        const pid = sh.property?.id
        if (!pid) return
        if (!showingsByProp[pid]) showingsByProp[pid] = []
        showingsByProp[pid].push({
          date: s.date,
          contact_name: s.contact?.name ?? '—',
          interest_level: sh.interest_level ?? null,
          status: sh.status ?? null,
        })
      })
    })

    const rows = props.map(p => {
      const showings = (showingsByProp[p.id] ?? []).sort((a, b) => new Date(b.date) - new Date(a.date))
      const uniqueClients = [...new Set(showings.map(s => s.contact_name))]
      return {
        ...p,
        showings,
        showingCount: showings.length,
        clientCount: uniqueClients.length,
        clientsSummary: uniqueClients.slice(0, 2).join(', ') + (uniqueClients.length > 2 ? ` +${uniqueClients.length - 2}` : ''),
        lastShownAt: showings[0]?.date ?? null,
      }
    }).sort((a, b) => (a.address ?? '').localeCompare(b.address ?? ''))

    return { rows, propertyShowings: showingsByProp }
  }, [propertiesData, sessionsData])

  /* ─── Open panel for new ─── */
  const openNew = () => {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    setError(null)
    setDupeWarning(null)
    setPanelOpen(true)
  }

  /* ─── Open panel for edit ─── */
  const openEdit = (row) => {
    setEditing(row)
    setDraft({
      google_place_id:   row.google_place_id ?? null,
      formatted_address: row.formatted_address ?? '',
      address:           row.address ?? '',
      city:              row.city ?? '',
      state:             row.state ?? 'AZ',
      zip:               row.zip ?? '',
      neighborhood:      row.neighborhood ?? '',
      county:            row.county ?? '',
      latitude:          row.latitude ?? null,
      longitude:         row.longitude ?? null,
      price:             row.price ?? '',
      beds:              row.beds ?? row.bedrooms ?? '',
      baths:             row.baths ?? row.bathrooms ?? '',
      sqft:              row.sqft ?? '',
      year_built:        row.year_built ?? '',
      lot_size:          row.lot_size ?? '',
      property_type:     row.property_type ?? '',
      subdivision:       row.subdivision ?? '',
      mls_id:            row.mls_id ?? '',
      hoa_amount:        row.hoa_amount ?? '',
      pool:              row.pool ?? false,
      garage:            row.garage ?? '',
      notes:             row.notes ?? '',
      assigned_contact_ids: [],
    })
    setError(null)
    setDupeWarning(null)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    setError(null)
    setDupeWarning(null)
  }

  /* ─── Address autocomplete selection ─── */
  const handleAddressSelect = useCallback(async (place) => {
    // Merge the Google result into the draft
    setDraft(prev => ({
      ...prev,
      google_place_id:   place.google_place_id,
      formatted_address: place.formatted_address,
      address:           place.address,
      city:              place.city,
      state:             place.state || 'AZ',
      zip:               place.zip,
      neighborhood:      place.neighborhood || prev.neighborhood,
      county:            place.county || prev.county,
      latitude:          place.latitude,
      longitude:         place.longitude,
      subdivision:       place.subdivision || prev.subdivision,
    }))

    // Check if this place_id already exists — warn instead of auto-redirecting
    if (place.google_place_id && !editing) {
      try {
        const existing = (propertiesData ?? []).find(p => p.google_place_id === place.google_place_id)
        if (existing) {
          setDupeWarning({ existing })
        } else {
          setDupeWarning(null)
        }
      } catch { /* noop */ }
    }
  }, [propertiesData, editing])

  /* ─── Jump to edit the existing dupe ─── */
  const handleUseExisting = () => {
    if (!dupeWarning?.existing) return
    openEdit(dupeWarning.existing)
  }

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!draft.address?.trim()) {
      setError('Address is required. Start typing to pick a suggestion.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        google_place_id:   draft.google_place_id || null,
        formatted_address: draft.formatted_address || null,
        address:           draft.address.trim(),
        city:              draft.city?.trim() || null,
        state:             draft.state || 'AZ',
        zip:               draft.zip?.trim() || null,
        neighborhood:      draft.neighborhood?.trim() || null,
        county:            draft.county?.trim() || null,
        latitude:          draft.latitude ?? null,
        longitude:         draft.longitude ?? null,
        price:             draft.price ? Number(draft.price) : null,
        beds:              draft.beds ? Number(draft.beds) : null,
        baths:             draft.baths ? Number(draft.baths) : null,
        sqft:              draft.sqft ? Number(draft.sqft) : null,
        year_built:        draft.year_built ? Number(draft.year_built) : null,
        lot_size:          draft.lot_size ? Number(draft.lot_size) : null,
        property_type:     draft.property_type || null,
        subdivision:       draft.subdivision || null,
        mls_id:            draft.mls_id || null,
        hoa_amount:        draft.hoa_amount ? Number(draft.hoa_amount) : null,
        pool:              !!draft.pool,
        garage:            draft.garage || null,
        notes:             draft.notes || null,
      }

      if (editing && editing.id) {
        await DB.updateProperty(editing.id, payload)
      } else {
        // Use ensureProperty so it dedupes if the place_id or address already exists
        await DB.ensureProperty(payload)
      }
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message || 'Failed to save property')
    } finally {
      setSaving(false)
    }
  }

  /* ─── Delete (soft) ─── */
  const handleDelete = async () => {
    if (!editing?.id) return
    if (!confirm(`Delete ${editing.address}? (Recoverable for 30 days)`)) return
    setSaving(true)
    try {
      await DB.deleteProperty(editing.id)
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  /* ─── Table columns ─── */
  const columns = [
    { key: 'address', label: 'Address', render: (v, row) => <AddressLink address={v} city={row.city}>{v}</AddressLink> },
    { key: 'city', label: 'City', render: v => v ?? '—' },
    { key: 'price', label: 'Price', render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
    { key: 'beds', label: 'Beds', render: (v, row) => v ?? row.bedrooms ?? '—' },
    { key: 'baths', label: 'Baths', render: (v, row) => v ?? row.bathrooms ?? '—' },
    { key: 'sqft', label: 'Sqft', render: v => v ? Number(v).toLocaleString() : '—' },
    {
      key: 'showingCount',
      label: 'Showings',
      render: (v, row) => v > 0
        ? <Badge variant="info" size="sm">{v} shown · {row.clientCount} client{row.clientCount > 1 ? 's' : ''}</Badge>
        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
    },
    { key: 'clientsSummary', label: 'Shown To', render: v => v || '—' },
  ]

  if (loading) return <div className="page-loading">Loading properties…</div>

  return (
    <div className="properties-page">
      <SectionHeader
        title="Properties"
        subtitle={`${rows.length} properties tracked`}
        actions={<Button onClick={openNew}>+ Add Property</Button>}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add your first property to start tracking showings, clients, and listings."
          action={<Button onClick={openNew}>+ Add Property</Button>}
        />
      ) : (
        <DataTable columns={columns} rows={rows} onRowClick={openEdit} />
      )}

      {/* ─── Edit / Add Slide Panel ─── */}
      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editing ? 'Edit Property' : 'Add Property'}
        subtitle={editing ? editing.address : 'Use Google Places to auto-fill address details'}
        width={560}
      >
        <div className="properties-panel">
          {error && (
            <div className="properties-panel__error">
              {error}
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          {dupeWarning?.existing && (
            <div className="properties-panel__dupe-warn">
              <strong>This address already exists in your database:</strong><br />
              {dupeWarning.existing.address}{dupeWarning.existing.city ? `, ${dupeWarning.existing.city}` : ''}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button size="sm" onClick={handleUseExisting}>Use Existing</Button>
                <Button size="sm" variant="ghost" onClick={() => setDupeWarning(null)}>Keep Adding New</Button>
              </div>
            </div>
          )}

          {/* Address autocomplete */}
          <AddressAutocomplete
            label="Address (start typing)"
            value={draft.formatted_address || draft.address}
            onChange={(v) => setDraft(prev => ({ ...prev, formatted_address: v, address: v }))}
            onSelect={handleAddressSelect}
            autoFocus={!editing}
          />

          {/* Auto-filled parts shown as chips */}
          {(draft.city || draft.zip) && (
            <div className="properties-panel__chips">
              {draft.city && <span className="chip">{draft.city}</span>}
              {draft.state && <span className="chip">{draft.state}</span>}
              {draft.zip && <span className="chip">{draft.zip}</span>}
              {draft.google_place_id && <span className="chip chip--good">✓ Google verified</span>}
              {draft.latitude && (
                <span className="chip chip--muted">
                  {Number(draft.latitude).toFixed(4)}, {Number(draft.longitude).toFixed(4)}
                </span>
              )}
            </div>
          )}

          {/* Property details */}
          <h4 className="properties-panel__section-title">Property Details</h4>
          <div className="properties-panel__grid">
            <Input label="Price" type="number" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="e.g. 675000" />
            <Input label="MLS #" value={draft.mls_id} onChange={e => setDraft({ ...draft, mls_id: e.target.value })} placeholder="Optional" />
            <Input label="Beds" type="number" value={draft.beds} onChange={e => setDraft({ ...draft, beds: e.target.value })} />
            <Input label="Baths" type="number" step="0.5" value={draft.baths} onChange={e => setDraft({ ...draft, baths: e.target.value })} />
            <Input label="Sqft" type="number" value={draft.sqft} onChange={e => setDraft({ ...draft, sqft: e.target.value })} />
            <Input label="Year Built" type="number" value={draft.year_built} onChange={e => setDraft({ ...draft, year_built: e.target.value })} />
            <Input label="Lot (sqft)" type="number" value={draft.lot_size} onChange={e => setDraft({ ...draft, lot_size: e.target.value })} />
            <Select label="Type" value={draft.property_type} onChange={e => setDraft({ ...draft, property_type: e.target.value })}>
              <option value="">—</option>
              <option value="single_family">Single Family</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="patio_home">Patio Home</option>
              <option value="manufactured">Manufactured</option>
              <option value="land">Land</option>
            </Select>
            <Input label="Garage" value={draft.garage} onChange={e => setDraft({ ...draft, garage: e.target.value })} placeholder="e.g. 2-car attached" />
            <Input label="HOA ($/mo)" type="number" value={draft.hoa_amount} onChange={e => setDraft({ ...draft, hoa_amount: e.target.value })} />
          </div>

          <label className="properties-panel__check">
            <input
              type="checkbox"
              checked={!!draft.pool}
              onChange={e => setDraft({ ...draft, pool: e.target.checked })}
            />
            <span>Pool</span>
          </label>

          <Input label="Subdivision" value={draft.subdivision} onChange={e => setDraft({ ...draft, subdivision: e.target.value })} />
          <Textarea label="Notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} rows={3} placeholder="Agent notes, showing instructions, lockbox code, etc." />

          {/* ─── Showings History (only when editing) ─── */}
          {editing && editing.id && (
            <>
              <h4 className="properties-panel__section-title">
                Showings History
                {editing.showingCount > 0 && (
                  <Badge variant="info" size="sm">{editing.showingCount}</Badge>
                )}
              </h4>
              {editing.showings?.length > 0 ? (
                <div className="properties-panel__showings">
                  {editing.showings.map((s, i) => (
                    <div key={i} className="properties-panel__showing">
                      <div className="properties-panel__showing-date">
                        {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="properties-panel__showing-body">
                        <div className="properties-panel__showing-client">{s.contact_name}</div>
                        {(s.interest_level || s.status) && (
                          <div className="properties-panel__showing-meta">
                            {s.status && <Badge variant="default" size="sm">{s.status}</Badge>}
                            {s.interest_level && <Badge variant="info" size="sm">{s.interest_level}</Badge>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="properties-panel__empty-note">
                  No showings logged yet. Add a showing session from the Buyer Showings page to link clients to this property.
                </p>
              )}
            </>
          )}

          {/* ─── Actions ─── */}
          <div className="properties-panel__actions">
            {editing && (
              <Button variant="ghost" onClick={handleDelete} disabled={saving} className="properties-panel__delete">
                Delete
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={closePanel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !draft.address?.trim()}>
              {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Property')}
            </Button>
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}
