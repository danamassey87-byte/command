import { useState, useEffect, useMemo } from 'react'
import { Button, Badge, Input, Select } from './ui/index.jsx'
import supabase from '../lib/supabase.js'

const STATUS_META = {
  new:        { label: 'New',       variant: 'default' },
  contacted:  { label: 'Contacted', variant: 'info' },
  'appt-set': { label: 'Appt Set',  variant: 'success' },
  converted:  { label: 'Converted', variant: 'accent' },
  dead:       { label: 'Dead',      variant: 'danger' },
}

export default function ExpiredLeadsDb() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [draft, setDraft] = useState({ address: '', city: '', listed_price: '', days_on_market: '', data_source: 'manual' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('expired_leads')
      .select('*, property:properties(id, address, city, mls_id, list_price)')
      .order('created_at', { ascending: false })
    setLeads(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter(l => l.status === filter)
  }, [leads, filter])

  const stats = useMemo(() => {
    const byStatus = {}
    for (const l of leads) byStatus[l.status] = (byStatus[l.status] || 0) + 1
    return { total: leads.length, byStatus }
  }, [leads])

  const handleAdd = async () => {
    if (!draft.address.trim()) return
    setSaving(true)
    try {
      // Create property first
      const { data: prop } = await supabase.from('properties').insert({
        address: draft.address.trim(),
        city: draft.city.trim() || null,
        state: 'AZ',
        role_for_dana: 'comp-only',
      }).select('id').single()

      if (prop) {
        await supabase.from('expired_leads').insert({
          property_id: prop.id,
          listed_price: draft.listed_price ? Number(draft.listed_price) : null,
          days_on_market: draft.days_on_market ? Number(draft.days_on_market) : null,
          data_source: draft.data_source,
          status: 'new',
        })
      }
      setShowAdd(false)
      setDraft({ address: '', city: '', listed_price: '', days_on_market: '', data_source: 'manual' })
      await load()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (id, status) => {
    await supabase.from('expired_leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 16 }}>Loading expired leads...</p>

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilter('all')} style={{
          padding: '4px 12px', fontSize: '0.72rem', borderRadius: 999, cursor: 'pointer',
          border: `1px solid ${filter === 'all' ? 'var(--brown-dark)' : 'var(--color-border)'}`,
          background: filter === 'all' ? 'var(--brown-dark)' : 'transparent',
          color: filter === 'all' ? 'var(--cream)' : 'var(--brown-warm)',
        }}>All ({stats.total})</button>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)} style={{
            padding: '4px 12px', fontSize: '0.72rem', borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${filter === key ? 'var(--brown-dark)' : 'var(--color-border)'}`,
            background: filter === key ? 'var(--brown-dark)' : 'transparent',
            color: filter === key ? 'var(--cream)' : 'var(--brown-warm)',
          }}>{meta.label} ({stats.byStatus[key] || 0})</button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Lead</Button>
        </div>
      </div>

      {showAdd && (
        <div style={{
          padding: 12, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)',
          marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input label="Address" value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} placeholder="123 Main St" style={{ flex: 2 }} />
            <Input label="City" value={draft.city} onChange={e => setDraft(d => ({ ...d, city: e.target.value }))} placeholder="Gilbert" style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input label="List Price" type="number" value={draft.listed_price} onChange={e => setDraft(d => ({ ...d, listed_price: e.target.value }))} placeholder="450000" style={{ flex: 1 }} />
            <Input label="DOM" type="number" value={draft.days_on_market} onChange={e => setDraft(d => ({ ...d, days_on_market: e.target.value }))} placeholder="90" style={{ flex: 1 }} />
            <Select label="Source" value={draft.data_source} onChange={e => setDraft(d => ({ ...d, data_source: e.target.value }))} style={{ flex: 1 }}>
              <option value="manual">Manual</option>
              <option value="mls-expired">MLS Expired</option>
              <option value="vulcan">Vulcan7</option>
              <option value="redx">RedX</option>
              <option value="landvoice">Landvoice</option>
            </Select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || !draft.address.trim()}>{saving ? 'Saving...' : 'Add'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Leads list */}
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', padding: '16px 0' }}>
          {leads.length === 0 ? 'No expired leads in the database yet.' : 'No leads match this filter.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(lead => {
            const prop = lead.property
            return (
              <div key={lead.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: 'var(--color-bg-subtle)', borderRadius: 6,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                      {prop?.address || '—'}
                    </span>
                    {prop?.city && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{prop.city}</span>}
                    {prop?.mls_id && <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>MLS: {prop.mls_id}</span>}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {lead.listed_price ? `$${lead.listed_price.toLocaleString()}` : '—'}
                    {lead.days_on_market ? ` · ${lead.days_on_market} DOM` : ''}
                    {lead.data_source !== 'manual' ? ` · ${lead.data_source}` : ''}
                    {lead.cadence_step > 0 ? ` · Step ${lead.cadence_step}` : ''}
                  </div>
                </div>
                {lead.dnc_checked && (
                  <Badge variant={lead.dnc_result === 'clear' ? 'success' : 'danger'} size="sm">
                    DNC: {lead.dnc_result}
                  </Badge>
                )}
                <select
                  value={lead.status}
                  onClick={e => e.stopPropagation()}
                  onChange={e => handleStatusChange(lead.id, e.target.value)}
                  style={{
                    fontSize: '0.72rem', padding: '4px 8px', borderRadius: 4,
                    border: '1px solid var(--color-border)', background: '#fff',
                  }}
                >
                  {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
