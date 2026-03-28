import { useMemo } from 'react'
import { Badge, SectionHeader, DataTable, AddressLink } from '../../components/ui/index.jsx'
import { useSellerShowings } from '../../lib/hooks.js'

export default function SellerShowings() {
  const { data: rawData, loading } = useSellerShowings()

  const showings = useMemo(() => (rawData ?? []).map(s => ({
    ...s,
    address: s.property_address ?? '—',
  })), [rawData])

  const columns = [
    { key: 'showing_date', label: 'Date', render: v => v ? new Date(v + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
    { key: 'showing_time', label: 'Time', render: v => v ?? '—' },
    { key: 'address', label: 'Property', render: (v) => <AddressLink address={v}>{v}</AddressLink> },
    { key: 'agent_name', label: 'Showing Agent', render: v => v ? <span style={{ fontWeight: 600 }}>{v}</span> : '—' },
    { key: 'agent_brokerage', label: 'Brokerage', render: v => v ?? '—' },
    { key: 'feedback', label: 'Feedback', render: v => v ? <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v}>{v}</span> : '—' },
    { key: 'interest_level', label: 'Interest', render: v => v ? <Badge variant={v === 'high' ? 'success' : v === 'medium' ? 'warning' : 'danger'} size="sm">{v}</Badge> : '—' },
    { key: 'status', label: 'Status', render: v => v ? <Badge variant={v === 'completed' ? 'success' : v === 'cancelled' ? 'danger' : 'info'} size="sm">{v}</Badge> : '—' },
  ]

  if (loading) return <div className="page-loading">Loading showings…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <SectionHeader
        title="Seller Showings"
        subtitle="Track showings scheduled by other agents on your listings"
      />

      {showings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          No showings logged yet. When other agents schedule showings on your listings, track them here.
        </div>
      ) : (
        <DataTable columns={columns} rows={showings} />
      )}
    </div>
  )
}
