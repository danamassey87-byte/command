// Lead Sources tab — manage PAC vendors + cash-offer routes.
// Each row controls: which sides this source supplies, % vs flat $ per side,
// monthly subscription cost (if applicable), dashboard URL, and the auto-
// generated buyer/seller tags. Saves go through DB.upsertLeadSource which
// handles tag creation/rename in lockstep with the source name + sides.
import { useEffect, useState } from 'react'
import { Button, Input, Select, Textarea, Badge } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase'
import supabase from '../../lib/supabase'

const COST_MODELS = [
  { v: 'pay_at_close',         l: 'Pay at Close (PAC)' },
  { v: 'monthly_subscription', l: 'Monthly Subscription' },
  { v: 'free',                 l: 'Free' },
  { v: 'cash_offer_routing',   l: 'Cash Offer Routing' },
]
const SIDES = [
  { v: 'both',   l: 'Buyer + Seller' },
  { v: 'buyer',  l: 'Buyer Only' },
  { v: 'seller', l: 'Seller Only' },
]
const ATTR_WINDOWS = [
  { v: 'per_deal',  l: 'Per deal (must close to owe)' },
  { v: 'one_year',  l: '1-year window' },
  { v: 'two_years', l: '2-year window' },
  { v: 'lifetime',  l: 'Lifetime' },
  { v: 'none',      l: 'None (subscription)' },
]
const FEE_TYPES = [{ v: 'pct', l: '% of GCI' }, { v: 'flat', l: 'Flat $' }]

const blankSource = () => ({
  id: null,
  display_name: '',
  cost_model: 'pay_at_close',
  monthly_fee_cents: null,
  sides_supplied: 'both',
  buyer_fee_type: 'pct',  buyer_pct: 30,  buyer_flat_cents: null,
  seller_fee_type: 'pct', seller_pct: 25, seller_flat_cents: null,
  attribution_window: 'per_deal',
  who_pays: 'agent',
  dashboard_url: '',
  notes: '',
  status: 'active',
})

export default function LeadSourcesTab() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // source object being edited (null = none)

  async function refresh() {
    setLoading(true)
    try {
      const rows = await DB.listLeadSources({ includeArchived: false })
      setSources(rows || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  async function handleSave(draft) {
    try {
      // Convert UI numbers → cents / numeric / null as the DB expects.
      const payload = {
        ...draft,
        monthly_fee_cents: draft.cost_model === 'monthly_subscription'
          ? Math.round(Number(draft.monthly_fee_dollars || 0) * 100) || null
          : null,
        buyer_pct:         draft.buyer_fee_type === 'pct'  ? toNumOrNull(draft.buyer_pct)  : null,
        buyer_flat_cents:  draft.buyer_fee_type === 'flat' ? toCentsOrNull(draft.buyer_flat_dollars)  : null,
        seller_pct:        draft.seller_fee_type === 'pct' ? toNumOrNull(draft.seller_pct) : null,
        seller_flat_cents: draft.seller_fee_type === 'flat'? toCentsOrNull(draft.seller_flat_dollars) : null,
      }
      delete payload.monthly_fee_dollars
      delete payload.buyer_flat_dollars
      delete payload.seller_flat_dollars
      await DB.upsertLeadSource(payload)
      setEditing(null)
      await refresh()
    } catch (err) { alert(err.message || String(err)) }
  }

  async function handleArchive(id, name) {
    if (!confirm(`Archive "${name}"? Existing leads + referral fees stay intact; new leads can no longer be attributed to this source.`)) return
    try {
      await DB.archiveLeadSource(id)
      await refresh()
    } catch (err) { alert(err.message) }
  }

  // ─── Gmail label/filter setup (calls gmail-leads-setup edge fn) ──────────
  const [gmailSetupBusy, setGmailSetupBusy] = useState(false)
  async function handleGmailSetup(createFilters) {
    if (gmailSetupBusy) return
    if (!confirm(createFilters
      ? 'Create Gmail labels AND filters for every active email-intake source? Requires gmail.modify + gmail.settings.basic scopes — reconnect Google in Connected Accounts if you haven\'t.'
      : 'Create Gmail labels for every active email-intake source? (Filters can be added later or manually in Gmail.)'
    )) return
    setGmailSetupBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('gmail-leads-setup', {
        body: { create_filters: !!createFilters },
      })
      if (error) throw error
      if (data?.scopeError) {
        alert(`Labels created (${data.labelsCreated} new, ${data.labelsReused} reused).\n\n${data.scopeError}`)
      } else {
        const parts = [
          `${data.labelsCreated} label${data.labelsCreated === 1 ? '' : 's'} created`,
          `${data.labelsReused} reused`,
        ]
        if (createFilters) {
          parts.push(`${data.filtersCreated} filter${data.filtersCreated === 1 ? '' : 's'} created`)
          if (data.filtersSkipped > 0) parts.push(`${data.filtersSkipped} skipped (no from_filter or already exists)`)
        }
        alert(parts.join(' · ') + (data.errors?.length ? `\n\nErrors:\n${data.errors.join('\n')}` : ''))
      }
    } catch (err) {
      alert(`Setup failed: ${err.message || err}\n\nIf you see "Insufficient Permission", reconnect Google in Settings → Connected Accounts to grant the new gmail.modify + gmail.settings.basic scopes.`)
    } finally {
      setGmailSetupBusy(false)
    }
  }

  if (loading) return <div className="settings-section"><p>Loading lead sources…</p></div>

  return (
    <div className="settings-section">
      <div className="settings-section__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="settings-section__title">Lead Sources</h3>
          <p className="settings-section__desc">
            PAC vendors, monthly subscriptions, and cash-offer routes.
            Edits to %/flat fees only affect <strong>future</strong> leads — existing attributions snapshot the rate at arrival.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={() => handleGmailSetup(false)} variant="ghost" disabled={gmailSetupBusy}>
            {gmailSetupBusy ? 'Working…' : '🏷 Setup Gmail Labels'}
          </Button>
          <Button onClick={() => handleGmailSetup(true)} variant="ghost" disabled={gmailSetupBusy}>
            {gmailSetupBusy ? 'Working…' : '⚙ Setup Labels + Filters'}
          </Button>
          <Button onClick={() => setEditing(blankSource())} variant="primary">+ New Source</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {sources.map(s => (
          <SourceCard key={s.id} source={s} onEdit={() => setEditing(toDraft(s))} onArchive={() => handleArchive(s.id, s.display_name)} />
        ))}
        {sources.length === 0 && <p className="settings-field-hint">No active lead sources. Click <strong>+ New Source</strong> to add one.</p>}
      </div>

      {editing && (
        <SourceEditor
          draft={editing}
          onChange={setEditing}
          onSave={() => handleSave(editing)}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────────────────
function SourceCard({ source, onEdit, onArchive }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ fontSize: 16 }}>{source.display_name}</strong>
          <Badge variant="default">{costModelLabel(source.cost_model)}</Badge>
          <Badge variant="default">{sidesLabel(source.sides_supplied)}</Badge>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {source.dashboard_url && (
            <a href={source.dashboard_url} target="_blank" rel="noreferrer" className="btn btn--sm">↗ Dashboard</a>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={onArchive}>Archive</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 13 }}>
        {(source.sides_supplied === 'buyer' || source.sides_supplied === 'both') && (
          <div>
            <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Buyer Side</div>
            <div style={{ fontWeight: 600 }}>{formatFee(source.buyer_fee_type, source.buyer_pct, source.buyer_flat_cents)}</div>
            {source.buyer_tag?.name && <div style={{ color: '#6b7280', fontSize: 11 }}>Tag: {source.buyer_tag.name}</div>}
          </div>
        )}
        {(source.sides_supplied === 'seller' || source.sides_supplied === 'both') && (
          <div>
            <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Seller Side</div>
            <div style={{ fontWeight: 600 }}>{formatFee(source.seller_fee_type, source.seller_pct, source.seller_flat_cents)}</div>
            {source.seller_tag?.name && <div style={{ color: '#6b7280', fontSize: 11 }}>Tag: {source.seller_tag.name}</div>}
          </div>
        )}
        {source.cost_model === 'monthly_subscription' && (
          <div>
            <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Monthly</div>
            <div style={{ fontWeight: 600 }}>${((source.monthly_fee_cents || 0) / 100).toLocaleString()}/mo</div>
          </div>
        )}
        <div>
          <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Attribution</div>
          <div style={{ fontWeight: 600 }}>{ATTR_WINDOWS.find(a => a.v === source.attribution_window)?.l || source.attribution_window}</div>
        </div>
      </div>

      {source.notes && <p style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>{source.notes}</p>}
    </div>
  )
}

// ─── Editor (modal-ish inline panel) ────────────────────────────────────────
function SourceEditor({ draft, onChange, onSave, onCancel }) {
  function set(k, v) { onChange({ ...draft, [k]: v }) }
  const isNew = !draft.id
  const showBuyer  = draft.sides_supplied === 'buyer'  || draft.sides_supplied === 'both'
  const showSeller = draft.sides_supplied === 'seller' || draft.sides_supplied === 'both'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: 12, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{isNew ? 'New Lead Source' : `Edit: ${draft.display_name || 'Source'}`}</h3>

        <div className="settings-form-grid">
          <div className="settings-field settings-field--full">
            <label className="settings-label">Display Name</label>
            <Input value={draft.display_name} onChange={e => set('display_name', e.target.value)} placeholder="e.g. CertiLeads" />
            <p className="settings-field-hint">Auto-generates tags: <code>{draft.display_name || 'Name'} — Buyer</code>, <code>{draft.display_name || 'Name'} — Seller</code>.</p>
          </div>

          <div className="settings-field">
            <label className="settings-label">Cost Model</label>
            <Select value={draft.cost_model} onChange={e => set('cost_model', e.target.value)}>
              {COST_MODELS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </Select>
          </div>
          <div className="settings-field">
            <label className="settings-label">Sides Supplied</label>
            <Select value={draft.sides_supplied} onChange={e => set('sides_supplied', e.target.value)}>
              {SIDES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </Select>
            <p className="settings-field-hint">Email parser uses this to auto-tag incoming leads.</p>
          </div>

          {draft.cost_model === 'monthly_subscription' && (
            <div className="settings-field">
              <label className="settings-label">Monthly Fee ($)</label>
              <Input type="number" step="0.01" value={draft.monthly_fee_dollars ?? ''} onChange={e => set('monthly_fee_dollars', e.target.value)} placeholder="2500" />
            </div>
          )}

          {showBuyer && (
            <div className="settings-field settings-field--full">
              <label className="settings-label">Buyer-side Fee</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Select value={draft.buyer_fee_type} onChange={e => set('buyer_fee_type', e.target.value)} style={{ maxWidth: 150 }}>
                  {FEE_TYPES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </Select>
                {draft.buyer_fee_type === 'pct' ? (
                  <Input type="number" step="0.01" value={draft.buyer_pct ?? ''} onChange={e => set('buyer_pct', e.target.value)} placeholder="30" />
                ) : (
                  <Input type="number" step="0.01" value={draft.buyer_flat_dollars ?? ''} onChange={e => set('buyer_flat_dollars', e.target.value)} placeholder="500" />
                )}
                <span style={{ alignSelf: 'center', color: '#6b7280' }}>{draft.buyer_fee_type === 'pct' ? '% of GCI' : '$ flat'}</span>
              </div>
            </div>
          )}

          {showSeller && (
            <div className="settings-field settings-field--full">
              <label className="settings-label">Seller-side Fee</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Select value={draft.seller_fee_type} onChange={e => set('seller_fee_type', e.target.value)} style={{ maxWidth: 150 }}>
                  {FEE_TYPES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </Select>
                {draft.seller_fee_type === 'pct' ? (
                  <Input type="number" step="0.01" value={draft.seller_pct ?? ''} onChange={e => set('seller_pct', e.target.value)} placeholder="25" />
                ) : (
                  <Input type="number" step="0.01" value={draft.seller_flat_dollars ?? ''} onChange={e => set('seller_flat_dollars', e.target.value)} placeholder="500" />
                )}
                <span style={{ alignSelf: 'center', color: '#6b7280' }}>{draft.seller_fee_type === 'pct' ? '% of GCI' : '$ flat'}</span>
              </div>
            </div>
          )}

          <div className="settings-field">
            <label className="settings-label">Attribution Window</label>
            <Select value={draft.attribution_window} onChange={e => set('attribution_window', e.target.value)}>
              {ATTR_WINDOWS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </Select>
          </div>
          <div className="settings-field">
            <label className="settings-label">Status</label>
            <Select value={draft.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </Select>
          </div>

          <div className="settings-field settings-field--full">
            <label className="settings-label">Vendor Dashboard URL</label>
            <Input value={draft.dashboard_url || ''} onChange={e => set('dashboard_url', e.target.value)} placeholder="https://portal.realty.com/..." />
          </div>

          <div className="settings-field settings-field--full">
            <label className="settings-label">Notes</label>
            <Textarea rows={3} value={draft.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Anything to remember about this source — contact, contract terms, payment info…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onSave} disabled={!draft.display_name?.trim()}>{isNew ? 'Create Source' : 'Save Changes'}</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function toNumOrNull(v) { const n = Number(v); return Number.isFinite(n) && v !== '' && v !== null && v !== undefined ? n : null }
function toCentsOrNull(v) { const n = Number(v); return Number.isFinite(n) && v !== '' && v !== null && v !== undefined ? Math.round(n * 100) : null }
function costModelLabel(v) { return COST_MODELS.find(c => c.v === v)?.l || v }
function sidesLabel(v) { return SIDES.find(s => s.v === v)?.l || v }
function formatFee(type, pct, flatCents) {
  if (type === 'flat') return flatCents == null ? '—' : `$${(flatCents / 100).toLocaleString()} flat`
  return pct == null ? '—' : `${Number(pct).toFixed(2)}% of GCI`
}

// Convert a server row back into editor draft (split cents into dollars for input).
function toDraft(s) {
  return {
    ...s,
    monthly_fee_dollars: s.monthly_fee_cents != null ? (s.monthly_fee_cents / 100).toString() : '',
    buyer_flat_dollars:  s.buyer_flat_cents  != null ? (s.buyer_flat_cents  / 100).toString() : '',
    seller_flat_dollars: s.seller_flat_cents != null ? (s.seller_flat_cents / 100).toString() : '',
  }
}
