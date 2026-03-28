import { useMemo } from 'react'
import { SectionHeader, DataTable, AddressLink } from '../../components/ui/index.jsx'
import { useProperties, useShowingSessions } from '../../lib/hooks.js'

export default function Properties() {
  const { data: propertiesData, loading } = useProperties()
  const { data: sessionsData } = useShowingSessions()

  const properties = useMemo(() => {
    const props = propertiesData ?? []
    const sessions = sessionsData ?? []

    // Build map of property → client names
    const propClientMap = {}
    sessions.forEach(s => {
      ;(s.showings ?? []).forEach(sh => {
        const pid = sh.property?.id
        if (pid) {
          if (!propClientMap[pid]) propClientMap[pid] = new Set()
          if (s.contact?.name) propClientMap[pid].add(s.contact.name)
        }
      })
    })

    return props.map(p => ({
      ...p,
      clients: propClientMap[p.id] ? [...propClientMap[p.id]].join(', ') : '—',
      showingCount: propClientMap[p.id]?.size ?? 0,
    })).sort((a, b) => (a.address ?? '').localeCompare(b.address ?? ''))
  }, [propertiesData, sessionsData])

  const columns = [
    { key: 'address', label: 'Address', render: (v, row) => <AddressLink address={v} city={row.city}>{v}</AddressLink> },
    { key: 'city', label: 'City', render: v => v ?? '—' },
    { key: 'price', label: 'Price', render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
    { key: 'beds', label: 'Beds', render: v => v ?? '—' },
    { key: 'baths', label: 'Baths', render: v => v ?? '—' },
    { key: 'sqft', label: 'Sqft', render: v => v ? Number(v).toLocaleString() : '—' },
    { key: 'clients', label: 'Shown To' },
  ]

  if (loading) return <div className="page-loading">Loading properties…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <SectionHeader
        title="Properties"
        subtitle={`${properties.length} properties tracked`}
      />

      <DataTable columns={columns} rows={properties} />
    </div>
  )
}
