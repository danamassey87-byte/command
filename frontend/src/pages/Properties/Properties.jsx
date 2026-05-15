import { useMemo, useState, useCallback } from 'react'
import {
  SectionHeader, DataTable, AddressLink, Button, SlidePanel, Input, Select, Textarea, Badge, EmptyState, TabBar, Card,
} from '../../components/ui/index.jsx'
import { AddressAutocomplete } from '../../components/ui/AddressAutocomplete.jsx'
import { useProperties, useShowingSessions, useContacts } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './Properties.css'

// All keys match real `properties` columns so updateWithAudit writes go through unmapped.
const EMPTY_DRAFT = {
  // Location
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
  subdivision:       '',
  // Basics
  status:            '',
  role_for_dana:     '',
  property_type:     '',
  price:             '',
  mls_id:            '',
  bedrooms:          '',
  bathrooms:         '',
  sqft:              '',
  year_built:        '',
  stories:           '',
  lot_sqft:          '',
  lot_acres:         '',
  garage_spaces:     '',
  parking:           '',
  hoa_monthly:       '',
  pool:              false,
  spa:               false,
  // Dates
  list_date:         '',
  expired_date:      '',
  dom:               '',
  // Schools
  school_district:   '',
  elementary_school: '',
  middle_school:     '',
  high_school:       '',
  // Features / construction (features stored as text[] — split on commas)
  features:          '',
  construction:      '',
  roof_type:         '',
  cooling:           '',
  heating:           '',
  flooring:          '',
  exterior:          '',
  landscaping:       '',
  // Tax & ID
  tax_amount:        '',
  tax_year:          '',
  apn:               '',
  // Media (image_urls is text[] — comma-separated input)
  image_url:         '',
  image_urls:        '',
  listing_url:       '',
  virtual_tour_url:  '',
  floorplan_url:     '',
  // Notes
  description:       '',
  marketing_remarks: '',
  agent_notes:       '',
}

// ─── Fuzzy duplicate detection ──────────────────────────────────────────────
function normalizeForMatch(address) {
  if (!address) return ''
  return address
    .toLowerCase()
    .replace(/\b(street|st|avenue|ave|boulevard|blvd|drive|dr|lane|ln|road|rd|court|ct|circle|cir|place|pl|way|wy|terrace|ter|trail|trl)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function extractHouseNumber(address) {
  if (!address) return ''
  const match = address.match(/^(\d+)/)
  return match ? match[1] : ''
}

function findDuplicateGroups(properties) {
  const groups = {}

  for (const p of properties) {
    const num = extractHouseNumber(p.address)
    const norm = normalizeForMatch(p.address)
    if (!num || !norm) continue

    // Group key: house number + first significant word after number
    const words = norm.replace(num, '').trim()
    const key = `${num}_${words}`

    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }

  // Only return groups with 2+ properties (actual duplicates)
  return Object.values(groups).filter(g => g.length > 1)
}

// ─── Merge Review Component ─────────────────────────────────────────────────
function MergeReview({ groups, onMerge, onDismiss, merging }) {
  const [selectedPrimary, setSelectedPrimary] = useState({})

  if (groups.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--brown-dark)' }}>No duplicates found</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
          All properties have unique addresses. Properties are matched by house number + street name.
        </p>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '12px 16px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--brown-dark)', margin: 0 }}>
          <strong>{groups.length} potential duplicate group{groups.length > 1 ? 's' : ''} found.</strong> For each group, select which property to keep as the primary. All showings, listings, expenses, and other data will be merged into the primary. Duplicates will be soft-deleted (recoverable for 30 days).
        </p>
      </div>

      {groups.map((group, gi) => {
        const primary = selectedPrimary[gi] ?? group[0].id
        return (
          <Card key={gi} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brown-dark)' }}>
                Group {gi + 1} — {group.length} properties
              </h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(gi)}
                >
                  Not Duplicates
                </Button>
                <Button
                  size="sm"
                  disabled={merging}
                  onClick={() => {
                    const dupeIds = group.map(p => p.id).filter(id => id !== primary)
                    onMerge(primary, dupeIds, gi)
                  }}
                >
                  {merging ? 'Merging...' : 'Merge'}
                </Button>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', width: 40 }}>Keep</th>
                  <th style={{ padding: '6px 8px' }}>Address</th>
                  <th style={{ padding: '6px 8px' }}>City</th>
                  <th style={{ padding: '6px 8px' }}>Price</th>
                  <th style={{ padding: '6px 8px' }}>MLS #</th>
                  <th style={{ padding: '6px 8px' }}>Showings</th>
                  <th style={{ padding: '6px 8px' }}>Google ID</th>
                </tr>
              </thead>
              <tbody>
                {group.map(p => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-light, #f0ece6)',
                      background: primary === p.id ? 'var(--color-bg-success, #e8f5e9)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '8px' }}>
                      <input
                        type="radio"
                        name={`merge-group-${gi}`}
                        checked={primary === p.id}
                        onChange={() => setSelectedPrimary(prev => ({ ...prev, [gi]: p.id }))}
                      />
                    </td>
                    <td style={{ padding: '8px', fontWeight: primary === p.id ? 600 : 400 }}>
                      {p.address || '(no address)'}
                    </td>
                    <td style={{ padding: '8px' }}>{p.city || '—'}</td>
                    <td style={{ padding: '8px' }}>{p.price ? `$${Number(p.price).toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '8px' }}>{p.mls_id || '—'}</td>
                    <td style={{ padding: '8px' }}>
                      {p.showingCount > 0
                        ? <Badge variant="info" size="sm">{p.showingCount}</Badge>
                        : '—'
                      }
                    </td>
                    <td style={{ padding: '8px' }}>
                      {p.google_place_id
                        ? <Badge variant="success" size="sm">Yes</Badge>
                        : <span style={{ color: 'var(--color-text-muted)' }}>No</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {primary && (
              <p style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)', marginTop: 8, marginBottom: 0 }}>
                Keeping: <strong>{group.find(p => p.id === primary)?.address}</strong> — {group.length - 1} duplicate{group.length > 2 ? 's' : ''} will be merged in and soft-deleted.
              </p>
            )}
          </Card>
        )
      })}
    </div>
  )
}

export default function Properties() {
  const { data: propertiesData, loading, refetch } = useProperties()
  const { data: sessionsData, refetch: refetchSessions } = useShowingSessions()
  const { data: contactsData } = useContacts()

  const [view, setView]               = useState('list')
  const [panelOpen, setPanelOpen]     = useState(false)
  const [editing, setEditing]         = useState(null)
  const [draft, setDraft]             = useState(EMPTY_DRAFT)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [dupeWarning, setDupeWarning] = useState(null)
  const [merging, setMerging]         = useState(false)

  /* ─── Assemble rows with showings history rolled up ─── */
  const { rows, propertyShowings } = useMemo(() => {
    const props = propertiesData ?? []
    const sessions = sessionsData ?? []

    const showingsByProp = {}
    sessions.forEach(s => {
      (s.showings ?? []).forEach(sh => {
        const pid = sh.property?.id
        if (!pid) return
        if (!showingsByProp[pid]) showingsByProp[pid] = []
        showingsByProp[pid].push({
          date: s.date,
          contact_name: s.contact?.name ?? '—',
          contact_id: s.contact?.id ?? null,
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

  /* ─── Duplicate groups ─── */
  const [dismissedGroups, setDismissedGroups] = useState(new Set())
  const dupeGroups = useMemo(() => {
    const groups = findDuplicateGroups(rows)
    return groups.filter((_, i) => !dismissedGroups.has(i))
  }, [rows, dismissedGroups])

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
      // Location
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
      subdivision:       row.subdivision ?? '',
      // Basics
      status:            row.status ?? '',
      role_for_dana:     row.role_for_dana ?? '',
      property_type:     row.property_type ?? '',
      price:             row.price ?? '',
      mls_id:            row.mls_id ?? '',
      bedrooms:          row.bedrooms ?? '',
      bathrooms:         row.bathrooms ?? '',
      sqft:              row.sqft ?? '',
      year_built:        row.year_built ?? '',
      stories:           row.stories ?? '',
      lot_sqft:          row.lot_sqft ?? '',
      lot_acres:         row.lot_acres ?? '',
      garage_spaces:     row.garage_spaces ?? '',
      parking:           row.parking ?? '',
      hoa_monthly:       row.hoa_monthly ?? '',
      pool:              row.pool ?? false,
      spa:               row.spa ?? false,
      // Dates
      list_date:         row.list_date ?? '',
      expired_date:      row.expired_date ?? '',
      dom:               row.dom ?? '',
      // Schools
      school_district:   row.school_district ?? '',
      elementary_school: row.elementary_school ?? '',
      middle_school:     row.middle_school ?? '',
      high_school:       row.high_school ?? '',
      // Features / construction (array → comma string)
      features:          Array.isArray(row.features) ? row.features.join(', ') : (row.features ?? ''),
      construction:      row.construction ?? '',
      roof_type:         row.roof_type ?? '',
      cooling:           row.cooling ?? '',
      heating:           row.heating ?? '',
      flooring:          row.flooring ?? '',
      exterior:          row.exterior ?? '',
      landscaping:       row.landscaping ?? '',
      // Tax & ID
      tax_amount:        row.tax_amount ?? '',
      tax_year:          row.tax_year ?? '',
      apn:               row.apn ?? '',
      // Media
      image_url:         row.image_url ?? '',
      image_urls:        Array.isArray(row.image_urls) ? row.image_urls.join(', ') : (row.image_urls ?? ''),
      listing_url:       row.listing_url ?? '',
      virtual_tour_url:  row.virtual_tour_url ?? '',
      floorplan_url:     row.floorplan_url ?? '',
      // Notes
      description:       row.description ?? '',
      marketing_remarks: row.marketing_remarks ?? '',
      agent_notes:       row.agent_notes ?? '',
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
      const txt = v => (typeof v === 'string' ? v.trim() : v) || null
      const num = v => (v === '' || v === null || v === undefined ? null : Number(v))
      const arr = v => {
        if (!v) return null
        if (Array.isArray(v)) return v.length ? v : null
        const parts = String(v).split(',').map(s => s.trim()).filter(Boolean)
        return parts.length ? parts : null
      }
      const payload = {
        // Location
        google_place_id:   draft.google_place_id || null,
        formatted_address: txt(draft.formatted_address),
        address:           draft.address.trim(),
        city:              txt(draft.city),
        state:             draft.state || 'AZ',
        zip:               txt(draft.zip),
        neighborhood:      txt(draft.neighborhood),
        county:            txt(draft.county),
        latitude:          draft.latitude ?? null,
        longitude:         draft.longitude ?? null,
        subdivision:       txt(draft.subdivision),
        // Basics
        status:            txt(draft.status),
        role_for_dana:     txt(draft.role_for_dana),
        property_type:     txt(draft.property_type),
        price:             num(draft.price),
        mls_id:            txt(draft.mls_id),
        bedrooms:          num(draft.bedrooms),
        bathrooms:         num(draft.bathrooms),
        sqft:              num(draft.sqft),
        year_built:        num(draft.year_built),
        stories:           num(draft.stories),
        lot_sqft:          num(draft.lot_sqft),
        lot_acres:         num(draft.lot_acres),
        garage_spaces:     num(draft.garage_spaces),
        parking:           txt(draft.parking),
        hoa_monthly:       num(draft.hoa_monthly),
        pool:              !!draft.pool,
        spa:               !!draft.spa,
        // Dates
        list_date:         draft.list_date || null,
        expired_date:      draft.expired_date || null,
        dom:               num(draft.dom),
        // Schools
        school_district:   txt(draft.school_district),
        elementary_school: txt(draft.elementary_school),
        middle_school:     txt(draft.middle_school),
        high_school:       txt(draft.high_school),
        // Features / construction
        features:          arr(draft.features),
        construction:      txt(draft.construction),
        roof_type:         txt(draft.roof_type),
        cooling:           txt(draft.cooling),
        heating:           txt(draft.heating),
        flooring:          txt(draft.flooring),
        exterior:          txt(draft.exterior),
        landscaping:       txt(draft.landscaping),
        // Tax & ID
        tax_amount:        num(draft.tax_amount),
        tax_year:          num(draft.tax_year),
        apn:               txt(draft.apn),
        // Media
        image_url:         txt(draft.image_url),
        image_urls:        arr(draft.image_urls),
        listing_url:       txt(draft.listing_url),
        virtual_tour_url:  txt(draft.virtual_tour_url),
        floorplan_url:     txt(draft.floorplan_url),
        // Notes
        description:       txt(draft.description),
        marketing_remarks: txt(draft.marketing_remarks),
        agent_notes:       txt(draft.agent_notes),
      }

      if (editing && editing.id) {
        await DB.updateProperty(editing.id, payload)
      } else {
        // ensureProperty dedupes by place_id/MLS/normalized-address, returns id.
        // Then updateProperty so the full payload (basics, schools, media, etc.) lands too.
        const id = await DB.ensureProperty(payload)
        if (id) await DB.updateProperty(id, payload)
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

  /* ─── Merge handler ─── */
  const handleMerge = async (keepId, dupeIds, groupIndex) => {
    setMerging(true)
    try {
      await DB.mergeProperties(keepId, dupeIds)
      await refetch()
      // The group will disappear from dupeGroups since dupes are now soft-deleted
    } catch (e) {
      alert('Merge failed: ' + (e.message || e))
    } finally {
      setMerging(false)
    }
  }

  const handleDismissGroup = (groupIndex) => {
    setDismissedGroups(prev => new Set([...prev, groupIndex]))
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
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={openNew}>+ Add Property</Button>
          </div>
        }
      />

      <TabBar
        tabs={[
          { label: `All Properties (${rows.length})`, value: 'list' },
          { label: `Find Duplicates${dupeGroups.length > 0 ? ` (${dupeGroups.length})` : ''}`, value: 'merge' },
        ]}
        active={view}
        onChange={setView}
      />

      {view === 'list' && (
        <>
          {rows.length === 0 ? (
            <EmptyState
              title="No properties yet"
              description="Add your first property to start tracking showings, clients, and listings."
              action={<Button onClick={openNew}>+ Add Property</Button>}
            />
          ) : (
            <DataTable columns={columns} rows={rows} onRowClick={openEdit} />
          )}
        </>
      )}

      {view === 'merge' && (
        <MergeReview
          groups={dupeGroups}
          onMerge={handleMerge}
          onDismiss={handleDismissGroup}
          merging={merging}
        />
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

          {/* Location — editable (autocomplete pre-fills, but you can hand-edit any field) */}
          <h4 className="properties-panel__section-title">Location</h4>
          <div className="properties-panel__grid">
            <Input label="City" value={draft.city} onChange={e => setDraft({ ...draft, city: e.target.value })} placeholder="e.g. Mesa" />
            <Input label="State" value={draft.state} onChange={e => setDraft({ ...draft, state: e.target.value })} placeholder="AZ" />
            <Input label="Zip" value={draft.zip} onChange={e => setDraft({ ...draft, zip: e.target.value })} placeholder="e.g. 85212" />
            <Input label="Neighborhood" value={draft.neighborhood} onChange={e => setDraft({ ...draft, neighborhood: e.target.value })} placeholder="Optional" />
            <Input label="County" value={draft.county} onChange={e => setDraft({ ...draft, county: e.target.value })} placeholder="e.g. Maricopa" />
          </div>
          {(draft.google_place_id || draft.latitude) && (
            <div className="properties-panel__chips">
              {draft.google_place_id && <span className="chip chip--good">Google verified</span>}
              {draft.latitude && (
                <span className="chip chip--muted">
                  {Number(draft.latitude).toFixed(4)}, {Number(draft.longitude).toFixed(4)}
                </span>
              )}
            </div>
          )}

          {/* Basics */}
          <h4 className="properties-panel__section-title">Basics</h4>
          <div className="properties-panel__grid">
            <Select label="Status" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
              <option value="">—</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
              <option value="expired">Expired</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="off_market">Off Market</option>
            </Select>
            <Select label="Role for Dana" value={draft.role_for_dana} onChange={e => setDraft({ ...draft, role_for_dana: e.target.value })}>
              <option value="">—</option>
              <option value="buyer-interest">Buyer Interest</option>
              <option value="open-house-hosted">Open House Hosted</option>
              <option value="listing">My Listing</option>
              <option value="comp">Comp</option>
              <option value="other">Other</option>
            </Select>
            <Select label="Type" value={draft.property_type} onChange={e => setDraft({ ...draft, property_type: e.target.value })}>
              <option value="">—</option>
              <option value="single_family">Single Family</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="patio_home">Patio Home</option>
              <option value="manufactured">Manufactured</option>
              <option value="land">Land</option>
            </Select>
            <Input label="Price" type="number" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="e.g. 675000" />
            <Input label="MLS #" value={draft.mls_id} onChange={e => setDraft({ ...draft, mls_id: e.target.value })} placeholder="Optional" />
            <Input label="Bedrooms" type="number" value={draft.bedrooms} onChange={e => setDraft({ ...draft, bedrooms: e.target.value })} />
            <Input label="Bathrooms" type="number" step="0.5" value={draft.bathrooms} onChange={e => setDraft({ ...draft, bathrooms: e.target.value })} />
            <Input label="Sqft" type="number" value={draft.sqft} onChange={e => setDraft({ ...draft, sqft: e.target.value })} />
            <Input label="Year Built" type="number" value={draft.year_built} onChange={e => setDraft({ ...draft, year_built: e.target.value })} />
            <Input label="Stories" type="number" value={draft.stories} onChange={e => setDraft({ ...draft, stories: e.target.value })} />
            <Input label="Lot (sqft)" type="number" value={draft.lot_sqft} onChange={e => setDraft({ ...draft, lot_sqft: e.target.value })} />
            <Input label="Lot (acres)" type="number" step="0.01" value={draft.lot_acres} onChange={e => setDraft({ ...draft, lot_acres: e.target.value })} />
            <Input label="Garage Spaces" type="number" value={draft.garage_spaces} onChange={e => setDraft({ ...draft, garage_spaces: e.target.value })} />
            <Input label="Parking" value={draft.parking} onChange={e => setDraft({ ...draft, parking: e.target.value })} placeholder="e.g. attached, covered" />
            <Input label="HOA ($/mo)" type="number" value={draft.hoa_monthly} onChange={e => setDraft({ ...draft, hoa_monthly: e.target.value })} />
            <Input label="Subdivision" value={draft.subdivision} onChange={e => setDraft({ ...draft, subdivision: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <label className="properties-panel__check">
              <input type="checkbox" checked={!!draft.pool} onChange={e => setDraft({ ...draft, pool: e.target.checked })} />
              <span>Pool</span>
            </label>
            <label className="properties-panel__check">
              <input type="checkbox" checked={!!draft.spa} onChange={e => setDraft({ ...draft, spa: e.target.checked })} />
              <span>Spa</span>
            </label>
          </div>

          {/* Dates */}
          <h4 className="properties-panel__section-title">Listing Dates</h4>
          <div className="properties-panel__grid">
            <Input label="List Date" type="date" value={draft.list_date} onChange={e => setDraft({ ...draft, list_date: e.target.value })} />
            <Input label="Expired Date" type="date" value={draft.expired_date} onChange={e => setDraft({ ...draft, expired_date: e.target.value })} />
            <Input label="DOM" type="number" value={draft.dom} onChange={e => setDraft({ ...draft, dom: e.target.value })} placeholder="Days on market" />
          </div>

          {/* Schools */}
          <h4 className="properties-panel__section-title">Schools</h4>
          <div className="properties-panel__grid">
            <Input label="District" value={draft.school_district} onChange={e => setDraft({ ...draft, school_district: e.target.value })} />
            <Input label="Elementary" value={draft.elementary_school} onChange={e => setDraft({ ...draft, elementary_school: e.target.value })} />
            <Input label="Middle" value={draft.middle_school} onChange={e => setDraft({ ...draft, middle_school: e.target.value })} />
            <Input label="High" value={draft.high_school} onChange={e => setDraft({ ...draft, high_school: e.target.value })} />
          </div>

          {/* Features & construction */}
          <h4 className="properties-panel__section-title">Features &amp; Construction</h4>
          <Input label="Features (comma-separated)" value={draft.features} onChange={e => setDraft({ ...draft, features: e.target.value })} placeholder="e.g. updated kitchen, RV gate, paid solar" />
          <div className="properties-panel__grid">
            <Input label="Construction" value={draft.construction} onChange={e => setDraft({ ...draft, construction: e.target.value })} placeholder="e.g. block, frame" />
            <Input label="Roof" value={draft.roof_type} onChange={e => setDraft({ ...draft, roof_type: e.target.value })} placeholder="e.g. tile, shingle" />
            <Input label="Cooling" value={draft.cooling} onChange={e => setDraft({ ...draft, cooling: e.target.value })} placeholder="e.g. central, dual" />
            <Input label="Heating" value={draft.heating} onChange={e => setDraft({ ...draft, heating: e.target.value })} placeholder="e.g. gas, electric" />
            <Input label="Flooring" value={draft.flooring} onChange={e => setDraft({ ...draft, flooring: e.target.value })} placeholder="e.g. tile, LVP" />
            <Input label="Exterior" value={draft.exterior} onChange={e => setDraft({ ...draft, exterior: e.target.value })} placeholder="e.g. stucco" />
            <Input label="Landscaping" value={draft.landscaping} onChange={e => setDraft({ ...draft, landscaping: e.target.value })} placeholder="e.g. desert, grass" />
          </div>

          {/* Tax & ID */}
          <h4 className="properties-panel__section-title">Tax &amp; ID</h4>
          <div className="properties-panel__grid">
            <Input label="Tax ($/yr)" type="number" value={draft.tax_amount} onChange={e => setDraft({ ...draft, tax_amount: e.target.value })} />
            <Input label="Tax Year" type="number" value={draft.tax_year} onChange={e => setDraft({ ...draft, tax_year: e.target.value })} />
            <Input label="APN" value={draft.apn} onChange={e => setDraft({ ...draft, apn: e.target.value })} placeholder="Assessor Parcel #" />
          </div>

          {/* Media & links */}
          <h4 className="properties-panel__section-title">Media &amp; Links</h4>
          <Input label="Primary Image URL" value={draft.image_url} onChange={e => setDraft({ ...draft, image_url: e.target.value })} placeholder="https://…" />
          <Input label="Additional Image URLs (comma-separated)" value={draft.image_urls} onChange={e => setDraft({ ...draft, image_urls: e.target.value })} placeholder="https://…, https://…" />
          <div className="properties-panel__grid">
            <Input label="Listing URL" value={draft.listing_url} onChange={e => setDraft({ ...draft, listing_url: e.target.value })} placeholder="MLS or portal link" />
            <Input label="Virtual Tour" value={draft.virtual_tour_url} onChange={e => setDraft({ ...draft, virtual_tour_url: e.target.value })} placeholder="https://…" />
            <Input label="Floorplan" value={draft.floorplan_url} onChange={e => setDraft({ ...draft, floorplan_url: e.target.value })} placeholder="https://…" />
          </div>

          {/* Notes — three buckets to mirror DB */}
          <h4 className="properties-panel__section-title">Notes</h4>
          <Textarea label="Public Description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={3} placeholder="Customer-facing copy (used on property websites, listing pages)" />
          <Textarea label="Marketing Remarks" value={draft.marketing_remarks} onChange={e => setDraft({ ...draft, marketing_remarks: e.target.value })} rows={3} placeholder="MLS marketing remarks (agent-facing)" />
          <Textarea label="Agent Notes" value={draft.agent_notes} onChange={e => setDraft({ ...draft, agent_notes: e.target.value })} rows={3} placeholder="Lockbox code, showing instructions, internal notes" />

          {/* ─── Showings History (only when editing) ─── */}
          {editing && editing.id && (
            <>
              <h4 className="properties-panel__section-title">
                Showings History
                {editing.showingCount > 0 && (
                  <Badge variant="info" size="sm">{editing.showingCount}</Badge>
                )}
              </h4>

              {/* Client visit summary */}
              {editing.showings?.length > 0 && (() => {
                const clientVisits = {}
                editing.showings.forEach(s => {
                  if (!clientVisits[s.contact_name]) clientVisits[s.contact_name] = { count: 0, lastDate: null, interest: null }
                  clientVisits[s.contact_name].count++
                  if (!clientVisits[s.contact_name].lastDate || s.date > clientVisits[s.contact_name].lastDate) {
                    clientVisits[s.contact_name].lastDate = s.date
                    clientVisits[s.contact_name].interest = s.interest_level
                  }
                })
                const clients = Object.entries(clientVisits).sort((a, b) => b[1].count - a[1].count)
                return (
                  <div style={{ marginBottom: 12, padding: 12, background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', margin: '0 0 6px' }}>
                      Clients ({clients.length})
                    </p>
                    {clients.map(([name, data]) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 500, flex: 1 }}>{name}</span>
                        <Badge variant="default" size="sm">{data.count} visit{data.count > 1 ? 's' : ''}</Badge>
                        {data.interest && <Badge variant="info" size="sm">{data.interest}</Badge>}
                      </div>
                    ))}
                  </div>
                )
              })()}

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
