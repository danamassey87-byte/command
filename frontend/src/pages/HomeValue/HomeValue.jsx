import { useState, useEffect, useMemo } from 'react'
import { Button, Badge, SectionHeader, Input, Select } from '../../components/ui/index.jsx'
import { useIsMobile } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import supabase from '../../lib/supabase.js'

const STATUS_VARIANT = {
  new: 'default', nurturing: 'info', hot: 'danger',
  'converted-to-deal': 'success', cold: 'default', unsubscribed: 'default',
}

const TIMEFRAMES = [
  { value: 'now',          label: 'Ready Now' },
  { value: '3mo',          label: '3 Months' },
  { value: '6mo',          label: '6 Months' },
  { value: '12mo',         label: '12 Months' },
  { value: 'just-curious', label: 'Just Curious' },
]

export default function HomeValue() {
  const isMobile = useIsMobile()
  const [leads, setLeads] = useState([])
  const [valuations, setValuations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [contacts, setContacts] = useState([])
  const [properties, setProperties] = useState([])

  const [draft, setDraft] = useState({
    property_id: '', contact_id: '', timeframe: 'just-curious',
  })
  const [valDraft, setValDraft] = useState({
    avm_zillow: '', avm_redfin: '', avm_realtor: '', avm_attom: '',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: sl } = await supabase.from('seller_leads')
        .select('*, contact:contacts(id, name, email, phone), property:properties(id, address, city)')
        .order('created_at', { ascending: false })
      setLeads(sl ?? [])

      const { data: v } = await supabase.from('valuations')
        .select('*, property:properties(id, address, city)')
        .order('created_at', { ascending: false })
      setValuations(v ?? [])

      const { data: c } = await supabase.from('contacts').select('id, name').is('deleted_at', null).order('name')
      setContacts(c ?? [])
      const { data: p } = await supabase.from('properties').select('id, address, city').is('deleted_at', null).order('address')
      setProperties(p ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleAddLead = async () => {
    if (!draft.property_id) return
    setSaving(true)
    try {
      await supabase.from('seller_leads').insert({
        property_id: draft.property_id,
        contact_id: draft.contact_id || null,
        timeframe: draft.timeframe,
        status: 'new',
      })
      setShowAdd(false)
      setDraft({ property_id: '', contact_id: '', timeframe: 'just-curious' })
      await loadAll()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleAddValuation = async () => {
    if (!selectedLead) return
    setSaving(true)
    try {
      const avms = {
        avm_zillow: valDraft.avm_zillow ? Number(valDraft.avm_zillow) : null,
        avm_redfin: valDraft.avm_redfin ? Number(valDraft.avm_redfin) : null,
        avm_realtor: valDraft.avm_realtor ? Number(valDraft.avm_realtor) : null,
        avm_attom: valDraft.avm_attom ? Number(valDraft.avm_attom) : null,
      }
      const values = [avms.avm_zillow, avms.avm_redfin, avms.avm_realtor, avms.avm_attom].filter(v => v != null)
      const blend_midpoint = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null
      const blend_low = values.length ? Math.min(...values) : null
      const blend_high = values.length ? Math.max(...values) : null

      await supabase.from('valuations').insert({
        property_id: selectedLead.property_id,
        seller_lead_id: selectedLead.id,
        ...avms,
        blend_midpoint, blend_low, blend_high,
      })
      setValDraft({ avm_zillow: '', avm_redfin: '', avm_realtor: '', avm_attom: '' })
      await loadAll()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (leadId, newStatus) => {
    await supabase.from('seller_leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId)
    await loadAll()
  }

  // Stats
  const byStatus = useMemo(() => {
    const counts = {}
    for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1
    return counts
  }, [leads])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 950, margin: '0 auto' }}>
      <SectionHeader title="Home Value & Seller Leads" subtitle="Track seller prospects and property valuations" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{leads.length}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Total Leads</div>
        </div>
        {['new', 'nurturing', 'hot', 'converted-to-deal'].map(s => (
          <div key={s} style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{byStatus[s] || 0}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>{s.replace(/-/g, ' ')}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Button onClick={() => setShowAdd(!showAdd)}>+ New Seller Lead</Button>
      </div>

      {showAdd && (
        <div style={{
          padding: 14, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)',
          marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
            <Select label="Property" value={draft.property_id} onChange={e => setDraft(d => ({ ...d, property_id: e.target.value }))} style={{ flex: 1 }}>
              <option value="">Select property...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}{p.city ? `, ${p.city}` : ''}</option>)}
            </Select>
            <Select label="Contact (optional)" value={draft.contact_id} onChange={e => setDraft(d => ({ ...d, contact_id: e.target.value }))} style={{ flex: 1 }}>
              <option value="">No contact yet</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Timeframe" value={draft.timeframe} onChange={e => setDraft(d => ({ ...d, timeframe: e.target.value }))} style={{ width: 150 }}>
              {TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleAddLead} disabled={saving || !draft.property_id}>{saving ? 'Saving...' : 'Add Lead'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Leads list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.map(lead => {
          const isSelected = selectedLead?.id === lead.id
          const leadVals = valuations.filter(v => v.seller_lead_id === lead.id)
          return (
            <div key={lead.id}>
              <div
                onClick={() => setSelectedLead(isSelected ? null : lead)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8, cursor: 'pointer',
                  border: isSelected ? '1px solid var(--brown-dark)' : '1px solid transparent',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                      {lead.property?.address || '—'}
                    </span>
                    <Badge variant={STATUS_VARIANT[lead.status]} size="sm">{lead.status}</Badge>
                    {lead.timeframe && (
                      <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 999, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        {TIMEFRAMES.find(t => t.value === lead.timeframe)?.label || lead.timeframe}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {lead.contact?.name || 'No contact'} · {lead.property?.city || ''} · {leadVals.length} valuation{leadVals.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {leadVals.length > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1, color: 'var(--brown-dark)' }}>
                      ${(leadVals[0].blend_midpoint || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>
                      ${(leadVals[0].blend_low || 0).toLocaleString()} – ${(leadVals[0].blend_high || 0).toLocaleString()}
                    </div>
                  </div>
                )}
                <select
                  value={lead.status}
                  onClick={e => e.stopPropagation()}
                  onChange={e => handleStatusChange(lead.id, e.target.value)}
                  style={{ fontSize: '0.72rem', padding: '3px 6px', borderRadius: 4, border: '1px solid var(--color-border)', background: '#fff' }}
                >
                  <option value="new">New</option>
                  <option value="nurturing">Nurturing</option>
                  <option value="hot">Hot</option>
                  <option value="converted-to-deal">Converted</option>
                  <option value="cold">Cold</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
              </div>

              {/* Expanded: valuations + add */}
              {isSelected && (
                <div style={{ padding: '12px 16px 16px', borderLeft: '3px solid var(--brown-mid)' }}>
                  {/* Existing valuations */}
                  {leadVals.map(val => (
                    <div key={val.id} style={{
                      display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr) 1fr', gap: 8, padding: '8px 0',
                      borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Zillow</div>
                        <div style={{ fontWeight: 600 }}>{val.avm_zillow ? `$${val.avm_zillow.toLocaleString()}` : '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Redfin</div>
                        <div style={{ fontWeight: 600 }}>{val.avm_redfin ? `$${val.avm_redfin.toLocaleString()}` : '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Realtor</div>
                        <div style={{ fontWeight: 600 }}>{val.avm_realtor ? `$${val.avm_realtor.toLocaleString()}` : '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Attom</div>
                        <div style={{ fontWeight: 600 }}>{val.avm_attom ? `$${val.avm_attom.toLocaleString()}` : '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500 }}>
                          ${(val.blend_midpoint || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>blend</div>
                      </div>
                    </div>
                  ))}

                  {/* Add valuation */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--brown-warm)', marginBottom: 6 }}>Add Valuation</div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 6 }}>
                      <Input label="Zillow" type="number" value={valDraft.avm_zillow} onChange={e => setValDraft(d => ({ ...d, avm_zillow: e.target.value }))} placeholder="450000" />
                      <Input label="Redfin" type="number" value={valDraft.avm_redfin} onChange={e => setValDraft(d => ({ ...d, avm_redfin: e.target.value }))} placeholder="460000" />
                      <Input label="Realtor" type="number" value={valDraft.avm_realtor} onChange={e => setValDraft(d => ({ ...d, avm_realtor: e.target.value }))} placeholder="455000" />
                      <Input label="Attom" type="number" value={valDraft.avm_attom} onChange={e => setValDraft(d => ({ ...d, avm_attom: e.target.value }))} placeholder="448000" />
                    </div>
                    <Button size="sm" onClick={handleAddValuation} disabled={saving} style={{ marginTop: 6 }}>
                      {saving ? 'Saving...' : 'Save Valuation'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {leads.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <p>No seller leads yet. Add leads from home valuation requests or manual entry.</p>
        </div>
      )}
    </div>
  )
}
