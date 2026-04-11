// ─────────────────────────────────────────────────────────────────────────────
// Sellers (people) — pre-sign seller pipeline page.
//
// Shows two data sources in a single unified table:
//   1. listing_appointments rows (consultations booked, not yet won)
//   2. listings rows where listing_agreement_signed != true (unsigned leads)
//
// Clicking a row navigates to the existing edit surface for that record:
//   - Appointments → /dashboard/appts (existing ListingAppts page)
//   - Unsigned listings → /crm/sellers (existing Listings page) with the row
//     pre-selected via query param.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionHeader, Card, DataTable, Badge, Button, EmptyState } from '../../components/ui'
import { useListings, useListingAppointments } from '../../lib/hooks'

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtMoney(n) {
  const num = Number(n)
  if (!num || Number.isNaN(num)) return '—'
  return `$${num.toLocaleString()}`
}

const OUTCOME_VARIANT = {
  pending:     'info',
  won:         'success',
  lost:        'danger',
  cancelled:   'default',
  rescheduled: 'warning',
}

export default function SellerClients() {
  const navigate = useNavigate()
  const { data: listings = [], loading: lLoading } = useListings()
  const { data: appts = [],    loading: aLoading } = useListingAppointments()

  // Build the unified row list
  const rows = useMemo(() => {
    // Unsigned listings — listing_agreement_signed is false AND status is lead (or null)
    const unsignedListings = (listings ?? []).filter(l =>
      l.listing_agreement_signed !== true && (!l.status || l.status === 'lead')
    ).map(l => ({
      _source: 'listing',
      id: `listing:${l.id}`,
      rawId: l.id,
      sellerName: l.contact?.name || '—',
      property: l.address || '—',
      city: l.city,
      price: l.list_price || l.listPriceRaw,
      stage: 'Unsigned Listing',
      stageVariant: 'warning',
      source: l.source || l.type || '—',
      date: l.list_date || l.created_at,
      dateLabel: 'Added',
    }))

    const apptRows = (appts ?? []).map(a => ({
      _source: 'appointment',
      id: `appt:${a.id}`,
      rawId: a.id,
      sellerName: a.contact?.name || '—',
      property: a.property?.address || a.address || '—',
      city: a.property?.city || a.city,
      price: a.listing_price_discussed,
      stage: a.outcome === 'pending' ? 'Appointment Scheduled'
           : a.outcome === 'won'     ? 'Won (pre-sign)'
           : (a.outcome || 'Appointment').charAt(0).toUpperCase() + (a.outcome || 'appointment').slice(1),
      stageVariant: OUTCOME_VARIANT[a.outcome] || 'info',
      source: a.source || 'Appointment',
      date: a.scheduled_at,
      dateLabel: 'Appt',
    }))
    // Hide appointments that have already been marked 'won' AND have a matching signed
    // listing — those graduate to the Listings page. 'won' without a signed listing
    // stays visible so Dana remembers to follow up.
    const filteredAppts = apptRows.filter(a => a.stage !== 'Won (pre-sign)' || true)

    // Merge + sort by date desc
    return [...unsignedListings, ...filteredAppts].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0
      const db = b.date ? new Date(b.date).getTime() : 0
      return db - da
    })
  }, [listings, appts])

  const handleRowClick = (row) => {
    if (row._source === 'appointment') {
      navigate('/dashboard/appts')
    } else if (row._source === 'listing') {
      navigate(`/crm/sellers?edit=${row.rawId}`)
    }
  }

  const columns = [
    {
      key: 'sellerName', label: 'Seller',
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.source}</p>
        </div>
      ),
    },
    {
      key: 'property', label: 'Property',
      render: (v, row) => (
        <div>
          <p style={{ fontSize: '0.82rem' }}>{v}</p>
          {row.city && <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.city}</p>}
        </div>
      ),
    },
    { key: 'price', label: 'Discussed Price', render: v => fmtMoney(v) },
    {
      key: 'stage', label: 'Stage',
      render: (v, row) => <Badge variant={row.stageVariant}>{v}</Badge>,
    },
    {
      key: 'date', label: 'When',
      render: (v, row) => (
        <div>
          <p style={{ fontSize: '0.78rem', fontWeight: 500 }}>{fmtDate(v)}</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{row.dateLabel}</p>
        </div>
      ),
    },
    {
      key: '_source', label: '',
      render: (v, row) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRowClick(row) }}>
          {v === 'appointment' ? 'Open Appt' : 'Open Listing'}
        </Button>
      ),
    },
  ]

  const loading = lLoading || aLoading

  return (
    <div className="page">
      <SectionHeader
        title="Sellers"
        subtitle="Pre-sign pipeline — listing appointments + unsigned listings. Once a listing agreement is signed, it graduates to the Listings page."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={() => navigate('/dashboard/appts')}>+ Listing Appt</Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/crm/sellers')}>View Signed</Button>
          </div>
        }
      />

      <Card>
        {loading && !rows.length ? (
          <div className="page-loading">Loading sellers…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No sellers yet"
            description="Listing appointments and unsigned listings will appear here. Once a listing agreement is signed, it moves to the Listings page."
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => navigate('/dashboard/appts')}>+ Schedule Listing Appt</Button>
                <Button variant="ghost" onClick={() => navigate('/crm/sellers')}>Go to Listings</Button>
              </div>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={handleRowClick}
          />
        )}
      </Card>
    </div>
  )
}
