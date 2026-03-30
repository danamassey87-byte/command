import { useState, useMemo } from 'react'
import { SectionHeader, Card, TabBar, Button, SlidePanel, Input, Select, Badge } from '../../components/ui/index.jsx'
import { useAllIncomeEntries, useExpenseCategories } from '../../lib/hooks.js'
import { createIncomeEntry, updateIncomeEntry, deleteIncomeEntry } from '../../lib/supabase.js'
import './PnL.css'

const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ─── Cap Settings (shared with PnLOverview) ───
const CAP_STORAGE = 'brokerage_cap_settings'
function loadCapSettings() {
  try {
    return JSON.parse(localStorage.getItem(CAP_STORAGE)) || { splitPct: 15, capAmount: 12000 }
  } catch { return { splitPct: 15, capAmount: 12000 } }
}

const EMPTY = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: '',
  category_id: '',
  commission_pct: '',
  sale_price: '',
  gross_commission: '',
  broker_split_pct: '',
  broker_split_amt: '',
  net_commission: '',
  referral_fee_pct: '',
  referral_fee_amt: '',
  status: 'pending',
  received_date: '',
  notes: '',
}

export default function Income() {
  const [view, setView]     = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [panel, setPanel]   = useState(null)
  const [draft, setDraft]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const income       = useAllIncomeEntries()
  const categories   = useExpenseCategories('income')

  const cats   = categories.data ?? []
  const all    = income.data ?? []

  // Filtered
  const filtered = useMemo(() => {
    let list = all
    if (statusFilter) list = list.filter(i => i.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        (i.description ?? '').toLowerCase().includes(q) ||
        (i.category?.name ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [all, statusFilter, search])

  const grandTotal  = all.reduce((s, i) => s + Number(i.amount || 0), 0)
  const pendingTotal = all.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount || 0), 0)
  const receivedTotal = all.filter(i => i.status !== 'pending').reduce((s, i) => s + Number(i.amount || 0), 0)

  // Cap awareness
  const cap = loadCapSettings()
  const currentYear = new Date().getFullYear()
  const ytdBrokerPaid = useMemo(() => {
    return all
      .filter(i => i.date && i.date.startsWith(String(currentYear)))
      .reduce((s, i) => s + Number(i.broker_split_amt || 0), 0)
  }, [all, currentYear])
  const isCapped = ytdBrokerPaid >= cap.capAmount
  const capRemaining = Math.max(0, cap.capAmount - ytdBrokerPaid)

  // Category summary
  const catSummary = useMemo(() => {
    const map = {}
    all.forEach(i => {
      const cat = i.category?.name || 'Uncategorized'
      if (!map[cat]) map[cat] = { total: 0, count: 0 }
      map[cat].total += Number(i.amount || 0)
      map[cat].count++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [all])

  // ─── Panel helpers ─────────────────────────────────────────────
  function openAdd() {
    setDraft(EMPTY)
    setPanel('add')
  }
  function openEdit(entry) {
    setDraft({
      date: entry.date,
      description: entry.description ?? '',
      amount: entry.amount ?? '',
      category_id: entry.category_id ?? '',
      commission_pct: entry.commission_pct ?? '',
      sale_price: entry.sale_price ?? '',
      gross_commission: entry.gross_commission ?? '',
      broker_split_pct: entry.broker_split_pct ?? '',
      broker_split_amt: entry.broker_split_amt ?? '',
      net_commission: entry.net_commission ?? '',
      referral_fee_pct: entry.referral_fee_pct ?? '',
      referral_fee_amt: entry.referral_fee_amt ?? '',
      status: entry.status ?? 'pending',
      received_date: entry.received_date ?? '',
      notes: entry.notes ?? '',
    })
    setPanel(entry)
  }

  // Auto-calc commission fields
  function updateField(field, val) {
    setDraft(d => {
      const next = { ...d, [field]: val }
      const salePrice     = Number(next.sale_price) || 0
      const commPct       = Number(next.commission_pct) || 0
      const brokerPct     = Number(next.broker_split_pct) || 0
      const refPct        = Number(next.referral_fee_pct) || 0

      if (salePrice && commPct) {
        next.gross_commission = (salePrice * commPct / 100).toFixed(2)
      }
      const gross = Number(next.gross_commission) || 0
      if (gross && brokerPct) {
        next.broker_split_amt = (gross * brokerPct / 100).toFixed(2)
      }
      const brokerAmt = Number(next.broker_split_amt) || 0
      const afterBroker = gross - brokerAmt
      if (afterBroker && refPct) {
        next.referral_fee_amt = (afterBroker * refPct / 100).toFixed(2)
      }
      const refAmt = Number(next.referral_fee_amt) || 0
      next.net_commission = (afterBroker - refAmt).toFixed(2)
      // Set amount to net commission for the income entry total
      if (Number(next.net_commission) > 0) {
        next.amount = next.net_commission
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        date: draft.date,
        description: draft.description || null,
        amount: Number(draft.amount),
        category_id: draft.category_id || null,
          commission_pct: draft.commission_pct ? Number(draft.commission_pct) : null,
        sale_price: draft.sale_price ? Number(draft.sale_price) : null,
        gross_commission: draft.gross_commission ? Number(draft.gross_commission) : null,
        broker_split_pct: draft.broker_split_pct ? Number(draft.broker_split_pct) : null,
        broker_split_amt: draft.broker_split_amt ? Number(draft.broker_split_amt) : null,
        net_commission: draft.net_commission ? Number(draft.net_commission) : null,
        referral_fee_pct: draft.referral_fee_pct ? Number(draft.referral_fee_pct) : null,
        referral_fee_amt: draft.referral_fee_amt ? Number(draft.referral_fee_amt) : null,
        status: draft.status,
        received_date: draft.received_date || null,
        notes: draft.notes || null,
      }
      if (panel === 'add') {
        await createIncomeEntry(payload)
      } else {
        await updateIncomeEntry(panel.id, payload)
      }
      setPanel(null)
      income.refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Delete this income entry?')) return
    try {
      await deleteIncomeEntry(panel.id)
      setPanel(null)
      income.refetch()
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      <SectionHeader
        title="Income"
        subtitle={`${all.length} entries · ${fmt(grandTotal)} total`}
        actions={<Button onClick={openAdd}>+ Add Income</Button>}
      />

      {/* ─── KPIs ─── */}
      <div className="pnl-kpis" style={{ marginBottom: 16 }}>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Total Income</p>
          <p className="pnl-kpi__value pnl-kpi__value--green">{fmt(grandTotal)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Received</p>
          <p className="pnl-kpi__value pnl-kpi__value--green">{fmt(receivedTotal)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Pending</p>
          <p className="pnl-kpi__value">{fmt(pendingTotal)}</p>
          <p className="pnl-kpi__sub">{all.filter(i => i.status === 'pending').length} awaiting payment</p>
        </Card>
        <Card className="pnl-kpi" style={{ borderLeft: isCapped ? '3px solid var(--color-success)' : '3px solid var(--brown-mid)' }}>
          <p className="pnl-kpi__label">Brokerage Cap</p>
          <p className={`pnl-kpi__value ${isCapped ? 'pnl-kpi__value--green' : ''}`}>
            {isCapped ? 'CAPPED' : fmt(capRemaining)}
          </p>
          <p className="pnl-kpi__sub">
            {isCapped ? `${fmt(ytdBrokerPaid)} paid · keep 100%` : `${fmt(ytdBrokerPaid)} of ${fmt(cap.capAmount)}`}
          </p>
        </Card>
      </div>

      {/* ─── Filters ─── */}
      <div className="pnl-filters" style={{ marginBottom: 16 }}>
        <Input
          className="pnl-search"
          placeholder="Search description, client, property..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="deposited">Deposited</option>
        </Select>
      </div>

      <TabBar
        tabs={[
          { value: 'all', label: `All (${filtered.length})` },
          { value: 'by-category', label: 'By Type' },
        ]}
        active={view}
        onChange={setView}
      />

      {income.loading ? (
        <Card><p style={{ padding: 40, textAlign: 'center', color: 'var(--brown-light)' }}>Loading...</p></Card>
      ) : view === 'all' ? (
        <Card padding={false}>
          {filtered.length === 0 ? (
            <div className="pnl-empty">
              <div className="pnl-empty__icon">$</div>
              <p className="pnl-empty__title">No income recorded</p>
              <p className="pnl-empty__sub">Log your commissions, referral fees, and other income here.</p>
              <Button onClick={openAdd}>+ Add Income</Button>
            </div>
          ) : (
            <table className="pnl-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id} onClick={() => openEdit(entry)}>
                    <td>{new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="pnl-table__vendor">{entry.description || '—'}</td>
                    <td>{entry.category ? <span className="pnl-table__cat">{entry.category.name}</span> : '—'}</td>
                    <td>
                      <span className={`pnl-table__status pnl-table__status--${entry.status}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="pnl-table__amount">{fmt(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 600 }}>
                  <td colSpan="4" style={{ textAlign: 'right', paddingRight: 12 }}>Total</td>
                  <td className="pnl-table__amount">{fmt(filtered.reduce((s, i) => s + Number(i.amount || 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </Card>
      ) : (
        <Card padding>
          {catSummary.map(cat => (
            <div key={cat.name} className="pnl-cat-row">
              <div className="pnl-cat-row__left">
                <span className="pnl-cat-row__name">{cat.name}</span>
                <span className="pnl-cat-row__count">{cat.count} entr{cat.count !== 1 ? 'ies' : 'y'}</span>
                <div className="pnl-cat-bar">
                  <div className="pnl-cat-bar__fill" style={{ width: `${grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0}%`, background: 'var(--color-success)' }} />
                </div>
              </div>
              <span className="pnl-cat-row__amount">{fmt(cat.total)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* ─── Add / Edit Panel ─── */}
      <SlidePanel open={!!panel} onClose={() => setPanel(null)} title={panel === 'add' ? 'Add Income' : 'Edit Income'}>
        <div className="pnl-form">
          <div className="pnl-form__row">
            <Input label="Date" type="date" value={draft.date} onChange={e => updateField('date', e.target.value)} />
            <Select label="Type" value={draft.category_id} onChange={e => updateField('category_id', e.target.value)}>
              <option value="">— Select —</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>

          <Input label="Description" value={draft.description} onChange={e => updateField('description', e.target.value)} placeholder="e.g., Buyer side — 123 Main St closing" />

          <hr className="pnl-form__divider" />

          {/* ─── Commission Calculator ─── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Commission Calculator</p>
            {isCapped ? (
              <Badge variant="success" size="sm">CAPPED — 0% broker split</Badge>
            ) : (
              <span style={{ fontSize: '0.68rem', color: 'var(--brown-mid)' }}>{fmt(capRemaining)} to cap</span>
            )}
          </div>
          <div className="pnl-form__row">
            <Input label="Sale Price" type="number" step="0.01" value={draft.sale_price} onChange={e => updateField('sale_price', e.target.value)} placeholder="350,000" />
            <Input label="Commission %" type="number" step="0.001" value={draft.commission_pct} onChange={e => updateField('commission_pct', e.target.value)} placeholder="2.5" />
          </div>
          <div className="pnl-form__row">
            <Input label="Broker Split %" type="number" step="0.01" value={draft.broker_split_pct} onChange={e => updateField('broker_split_pct', e.target.value)} placeholder="20" />
            <Input label="Referral Fee %" type="number" step="0.01" value={draft.referral_fee_pct} onChange={e => updateField('referral_fee_pct', e.target.value)} placeholder="25" />
          </div>

          {(Number(draft.gross_commission) > 0) && (
            <div className="pnl-form__commission-calc">
              <div className="pnl-form__calc-row">
                <span>Gross Commission</span>
                <span>{fmt(Number(draft.gross_commission))}</span>
              </div>
              {Number(draft.broker_split_amt) > 0 && (
                <div className="pnl-form__calc-row">
                  <span>Broker Split ({draft.broker_split_pct}%)</span>
                  <span>-{fmt(Number(draft.broker_split_amt))}</span>
                </div>
              )}
              {Number(draft.referral_fee_amt) > 0 && (
                <div className="pnl-form__calc-row">
                  <span>Referral Fee ({draft.referral_fee_pct}%)</span>
                  <span>-{fmt(Number(draft.referral_fee_amt))}</span>
                </div>
              )}
              <div className="pnl-form__calc-row pnl-form__calc-row--total">
                <span>Net to You</span>
                <span style={{ color: 'var(--color-success)' }}>{fmt(Number(draft.net_commission))}</span>
              </div>
            </div>
          )}

          <hr className="pnl-form__divider" />

          <Input label="Amount (net income)" type="number" step="0.01" value={draft.amount} onChange={e => updateField('amount', e.target.value)} placeholder="Enter manually or use calculator above" />

          <div className="pnl-form__row">
            <Select label="Status" value={draft.status} onChange={e => updateField('status', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="deposited">Deposited</option>
            </Select>
            <Input label="Received Date" type="date" value={draft.received_date} onChange={e => updateField('received_date', e.target.value)} />
          </div>

          <Input label="Notes" value={draft.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Internal notes..." />

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={handleSave} disabled={saving || !draft.amount}>
              {saving ? 'Saving...' : panel === 'add' ? 'Add Income' : 'Save Changes'}
            </Button>
            {panel !== 'add' && (
              <Button variant="danger" onClick={handleDelete}>Delete</Button>
            )}
          </div>
        </div>
      </SlidePanel>
    </>
  )
}
