import { useState, useEffect, useMemo } from 'react'
import { Button, Badge, SectionHeader, Input, Select, Textarea } from '../../components/ui/index.jsx'
import supabase from '../../lib/supabase.js'

const ORDER_KINDS = [
  { value: 'postcard',           label: 'Postcard',         icon: '🏞' },
  { value: 'letter',             label: 'Letter',           icon: '✉️' },
  { value: 'handwritten-note',   label: 'Handwritten Note', icon: '✍️' },
  { value: 'popby-tag',          label: 'Pop-By Tag',       icon: '🎁' },
]

const PROVIDERS = [
  { value: 'thanks-io',   label: 'Thanks.io' },
  { value: 'handwrytten', label: 'Handwrytten' },
  { value: 'sendoso',     label: 'Sendoso' },
  { value: 'manual',      label: 'Manual / In-House' },
]

const STATUS_VARIANT = {
  draft: 'default', submitted: 'info', printing: 'warning',
  mailed: 'accent', delivered: 'success', failed: 'danger',
}

export default function PrintDelivery() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState([])
  const [draft, setDraft] = useState({
    kind: 'postcard', provider: 'manual', template_ref: '', merge_data: '',
    recipient_ids: [], cost_cents: '',
  })
  const [recipientSearch, setRecipientSearch] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: o } = await supabase.from('print_orders').select('*').order('created_at', { ascending: false })
      setOrders(o ?? [])
      const { data: c } = await supabase.from('contacts').select('id, name, email').is('deleted_at', null).order('name')
      setContacts(c ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!draft.kind || draft.recipient_ids.length === 0) return
    setSaving(true)
    try {
      const { data: order } = await supabase.from('print_orders').insert({
        kind: draft.kind,
        provider: draft.provider,
        template_ref: draft.template_ref.trim() || null,
        merge_data: draft.merge_data.trim() ? JSON.parse(draft.merge_data) : {},
        recipient_contact_ids: draft.recipient_ids,
        cost_cents: draft.cost_cents ? Number(draft.cost_cents) : null,
        status: 'draft',
      }).select().single()

      // Create delivery batch rows
      if (order) {
        const batches = draft.recipient_ids.map(cid => ({
          print_order_id: order.id,
          contact_id: cid,
        }))
        await supabase.from('delivery_batches').insert(batches)
      }

      setShowAdd(false)
      setDraft({ kind: 'postcard', provider: 'manual', template_ref: '', merge_data: '', recipient_ids: [], cost_cents: '' })
      await loadAll()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    await supabase.from('print_orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId)
    await loadAll()
  }

  const toggleRecipient = (contactId) => {
    setDraft(d => ({
      ...d,
      recipient_ids: d.recipient_ids.includes(contactId)
        ? d.recipient_ids.filter(id => id !== contactId)
        : [...d.recipient_ids, contactId],
    }))
  }

  const filteredContacts = useMemo(() => {
    if (!recipientSearch) return contacts.slice(0, 10)
    const q = recipientSearch.toLowerCase()
    return contacts.filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)).slice(0, 10)
  }, [contacts, recipientSearch])

  // Stats
  const stats = useMemo(() => {
    const byStatus = {}
    let totalCost = 0
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1
      if (o.cost_cents) totalCost += o.cost_cents
    }
    return { total: orders.length, byStatus, totalCost: totalCost / 100 }
  }, [orders])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <SectionHeader title="Print & Delivery" subtitle="Postcards, handwritten notes, and pop-by tags" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{stats.total}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Orders</div>
        </div>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{stats.byStatus.delivered || 0}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Delivered</div>
        </div>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{(stats.byStatus.draft || 0) + (stats.byStatus.submitted || 0)}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Pending</div>
        </div>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>${stats.totalCost.toFixed(0)}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Spend</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Button onClick={() => setShowAdd(!showAdd)}>+ New Order</Button>
      </div>

      {showAdd && (
        <div style={{
          padding: 14, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)',
          marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select label="Type" value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))} style={{ flex: 1 }}>
              {ORDER_KINDS.map(k => <option key={k.value} value={k.value}>{k.icon} {k.label}</option>)}
            </Select>
            <Select label="Provider" value={draft.provider} onChange={e => setDraft(d => ({ ...d, provider: e.target.value }))} style={{ flex: 1 }}>
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <Input label="Cost (cents)" type="number" value={draft.cost_cents} onChange={e => setDraft(d => ({ ...d, cost_cents: e.target.value }))} placeholder="150" style={{ width: 100 }} />
          </div>
          <Input label="Template reference" value={draft.template_ref} onChange={e => setDraft(d => ({ ...d, template_ref: e.target.value }))} placeholder="Canva URL or template name..." />

          {/* Recipient picker */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--brown-warm)', display: 'block', marginBottom: 3 }}>
              Recipients ({draft.recipient_ids.length} selected)
            </label>
            <input
              type="text" value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)}
              placeholder="Search contacts..."
              style={{ width: '100%', padding: '6px 10px', fontSize: '0.82rem', border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'inherit', marginBottom: 4 }}
            />
            <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredContacts.map(c => (
                <label key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', fontSize: '0.78rem',
                  cursor: 'pointer', borderRadius: 4,
                  background: draft.recipient_ids.includes(c.id) ? 'rgba(139,154,123,.1)' : 'transparent',
                }}>
                  <input type="checkbox" checked={draft.recipient_ids.includes(c.id)} onChange={() => toggleRecipient(c.id)} />
                  <span>{c.name}</span>
                  {c.email && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{c.email}</span>}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleCreate} disabled={saving || draft.recipient_ids.length === 0}>
              {saving ? 'Creating...' : `Create Order (${draft.recipient_ids.length} recipients)`}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Orders list */}
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <p>No print orders yet. Send postcards, handwritten notes, and pop-by gifts to clients.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {orders.map(order => {
            const kindMeta = ORDER_KINDS.find(k => k.value === order.kind) || ORDER_KINDS[0]
            const recipientCount = (order.recipient_contact_ids ?? []).length
            return (
              <div key={order.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--color-bg-subtle)', borderRadius: 8,
              }}>
                <span style={{ fontSize: '1.3rem' }}>{kindMeta.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{kindMeta.label}</span>
                    <Badge variant={STATUS_VARIANT[order.status]} size="sm">{order.status}</Badge>
                    {order.provider && order.provider !== 'manual' && (
                      <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 999, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        {PROVIDERS.find(p => p.value === order.provider)?.label || order.provider}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {recipientCount} recipient{recipientCount !== 1 ? 's' : ''} · {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {order.cost_cents ? ` · $${(order.cost_cents / 100).toFixed(2)}` : ''}
                  </div>
                </div>
                <select
                  value={order.status}
                  onChange={e => handleStatusChange(order.id, e.target.value)}
                  style={{ fontSize: '0.72rem', padding: '3px 6px', borderRadius: 4, border: '1px solid var(--color-border)', background: '#fff' }}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="printing">Printing</option>
                  <option value="mailed">Mailed</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
