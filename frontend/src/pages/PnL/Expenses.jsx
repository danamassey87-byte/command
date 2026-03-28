import { useState, useMemo } from 'react'
import { SectionHeader, Card, TabBar, Button, SlidePanel, Input, Select } from '../../components/ui/index.jsx'
import { useAllExpenses, useExpenseCategories } from '../../lib/hooks.js'
import { createExpense, updateExpense, deleteExpense, createExpenseBatch } from '../../lib/supabase.js'
import supabase from '../../lib/supabase.js'
import './PnL.css'

const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const PAYMENT_METHODS = [
  { value: '', label: '— Select —' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'ach', label: 'ACH / Bank Transfer' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'other', label: 'Other' },
]

const EMPTY = {
  date: new Date().toISOString().split('T')[0],
  vendor: '',
  description: '',
  amount: '',
  category_id: '',
  property_id: '',
  payment_method: '',
  receipt_url: '',
  notes: '',
  is_deductible: true,
  is_split: false,
}

export default function Expenses() {
  const [view, setView]       = useState('all')
  const [search, setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [panel, setPanel]     = useState(null) // null | 'add' | expense object
  const [draft, setDraft]     = useState(EMPTY)
  const [splits, setSplits]   = useState([])
  const [saving, setSaving]   = useState(false)

  const expenses   = useAllExpenses()
  const categories = useExpenseCategories('expense')

  const cats  = categories.data ?? []
  const all   = expenses.data ?? []

  // Filtered list
  const filtered = useMemo(() => {
    let list = all
    if (catFilter) list = list.filter(e => e.category_id === catFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        (e.vendor ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        (e.category?.name ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [all, catFilter, search])

  // Category summary
  const catSummary = useMemo(() => {
    const map = {}
    all.forEach(e => {
      const cat = e.category?.name || 'Uncategorized'
      const cid = e.category_id || 'none'
      if (!map[cid]) map[cid] = { name: cat, total: 0, count: 0 }
      map[cid].total += Number(e.amount || 0)
      map[cid].count++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [all])

  const grandTotal = all.reduce((s, e) => s + Number(e.amount || 0), 0)

  // ─── Panel helpers ─────────────────────────────────────────────
  function openAdd() {
    setDraft(EMPTY)
    setSplits([])
    setPanel('add')
  }
  function openEdit(exp) {
    setDraft({
      date: exp.date,
      vendor: exp.vendor ?? '',
      description: exp.description ?? '',
      amount: exp.amount ?? '',
      category_id: exp.category_id ?? '',
      property_id: exp.property_id ?? '',
      payment_method: exp.payment_method ?? '',
      receipt_url: exp.receipt_url ?? '',
      notes: exp.notes ?? '',
      is_deductible: exp.is_deductible !== false,
      is_split: exp.is_split ?? false,
    })
    setSplits([])
    setPanel(exp)
  }

  function addSplit() {
    setSplits(s => [...s, { amount: '', description: '' }])
    setDraft(d => ({ ...d, is_split: true }))
  }
  function updateSplit(i, field, val) {
    setSplits(s => s.map((sp, j) => j === i ? { ...sp, [field]: val } : sp))
  }
  function removeSplit(i) {
    setSplits(s => s.filter((_, j) => j !== i))
  }

  const splitTotal = splits.reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
  const remaining  = (Number(draft.amount) || 0) - splitTotal

  async function handleSave() {
    setSaving(true)
    try {
      if (draft.is_split && splits.length > 0) {
        // Create split expenses
        const groupId = crypto.randomUUID()
        const rows = splits.map(sp => ({
          date: draft.date,
          vendor: draft.vendor,
          description: sp.description || draft.description,
          amount: Number(sp.amount),
          category_id: draft.category_id || null,
          payment_method: draft.payment_method || null,
          notes: draft.notes,
          is_deductible: draft.is_deductible,
          is_split: true,
          split_group: groupId,
        }))
        // If there's remaining amount, add an unassigned line
        if (remaining > 0.01) {
          rows.push({
            date: draft.date,
            vendor: draft.vendor,
            description: draft.description,
            amount: remaining,
            category_id: draft.category_id || null,
            payment_method: draft.payment_method || null,
            notes: draft.notes,
            is_deductible: draft.is_deductible,
            is_split: true,
            split_group: groupId,
          })
        }
        await createExpenseBatch(rows)
      } else if (panel === 'add') {
        await createExpense({
          date: draft.date,
          vendor: draft.vendor || null,
          description: draft.description || null,
          amount: Number(draft.amount),
          category_id: draft.category_id || null,
          payment_method: draft.payment_method || null,
          receipt_url: draft.receipt_url || null,
          notes: draft.notes || null,
          is_deductible: draft.is_deductible,
          is_split: false,
        })
      } else {
        await updateExpense(panel.id, {
          date: draft.date,
          vendor: draft.vendor || null,
          description: draft.description || null,
          amount: Number(draft.amount),
          category_id: draft.category_id || null,
          payment_method: draft.payment_method || null,
          receipt_url: draft.receipt_url || null,
          notes: draft.notes || null,
          is_deductible: draft.is_deductible,
        })
      }
      setPanel(null)
      expenses.refetch()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this expense?')) return
    try {
      await deleteExpense(panel.id)
      setPanel(null)
      expenses.refetch()
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      <SectionHeader
        title="Expenses"
        subtitle={`${all.length} expenses · ${fmt(grandTotal)} total`}
        actions={<Button onClick={openAdd}>+ Add Expense</Button>}
      />

      {/* ─── Filters ─── */}
      <div className="pnl-filters" style={{ marginBottom: 16 }}>
        <Input
          className="pnl-search"
          placeholder="Search vendor, description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {/* ─── View Toggle ─── */}
      <TabBar
        tabs={[
          { value: 'all', label: `All (${filtered.length})` },
          { value: 'by-category', label: 'By Category' },
        ]}
        active={view}
        onChange={setView}
      />

      {expenses.loading ? (
        <Card><p style={{ padding: 40, textAlign: 'center', color: 'var(--brown-light)' }}>Loading...</p></Card>
      ) : view === 'all' ? (
        <Card padding={false}>
          {filtered.length === 0 ? (
            <div className="pnl-empty">
              <div className="pnl-empty__icon">$</div>
              <p className="pnl-empty__title">No expenses yet</p>
              <p className="pnl-empty__sub">Add your first expense to start tracking your business spending.</p>
              <Button onClick={openAdd}>+ Add Expense</Button>
            </div>
          ) : (
            <table className="pnl-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} onClick={() => openEdit(e)}>
                    <td>{new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td>
                      <span className="pnl-table__vendor">{e.vendor || '—'}</span>
                      {e.description && <><br /><span style={{ fontSize: '0.73rem', color: 'var(--brown-light)' }}>{e.description}</span></>}
                      {e.is_split && <span className="pnl-table__split-badge">SPLIT</span>}
                      {e.receipt_url && <span className="pnl-table__split-badge" style={{ background: 'var(--color-success)' }}>RECEIPT</span>}
                    </td>
                    <td>{e.category ? <span className="pnl-table__cat">{e.category.name}</span> : '—'}</td>
                    <td className="pnl-table__amount">{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 600 }}>
                  <td colSpan="3" style={{ textAlign: 'right', paddingRight: 12 }}>Total</td>
                  <td className="pnl-table__amount">{fmt(filtered.reduce((s, e) => s + Number(e.amount || 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </Card>

      ) : view === 'by-category' ? (
        <Card padding>
          {catSummary.map(cat => (
            <div key={cat.name} className="pnl-cat-row">
              <div className="pnl-cat-row__left">
                <span className="pnl-cat-row__name">{cat.name}</span>
                <span className="pnl-cat-row__count">{cat.count} expense{cat.count !== 1 ? 's' : ''}</span>
                <div className="pnl-cat-bar">
                  <div className="pnl-cat-bar__fill" style={{ width: `${grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0}%` }} />
                </div>
              </div>
              <span className="pnl-cat-row__amount">{fmt(cat.total)}</span>
            </div>
          ))}
          {catSummary.length === 0 && (
            <p style={{ padding: 30, textAlign: 'center', color: 'var(--brown-light)' }}>No expense data</p>
          )}
        </Card>

      ) : null}

      {/* ─── Add / Edit Panel ─── */}
      <SlidePanel open={!!panel} onClose={() => setPanel(null)} title={panel === 'add' ? 'Add Expense' : 'Edit Expense'}>
        <div className="pnl-form">
          <div className="pnl-form__row">
            <Input label="Date" type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
            <Input label="Amount ($)" type="number" step="0.01" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
          </div>
          <Input label="Vendor / Payee" value={draft.vendor} onChange={e => setDraft(d => ({ ...d, vendor: e.target.value }))} placeholder="e.g., Canva, Home Depot, Keller Williams" />
          <Input label="Description" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="What was this for?" />
          <div className="pnl-form__row">
            <Select label="Category" value={draft.category_id} onChange={e => setDraft(d => ({ ...d, category_id: e.target.value }))}>
              <option value="">— Select —</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Payment Method" value={draft.payment_method} onChange={e => setDraft(d => ({ ...d, payment_method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>

          <hr className="pnl-form__divider" />

          {/* ─── Split Receipt ─── */}
          {panel === 'add' && (
            <div className="pnl-split">
              <div className="pnl-split__header">
                <h4>Split Receipt</h4>
                <Button variant="ghost" size="sm" onClick={addSplit}>+ Add Split</Button>
              </div>
              {splits.length > 0 && (
                <>
                  {splits.map((sp, i) => (
                    <div key={i} className="pnl-split__item">
                      <Input placeholder="Description" value={sp.description} onChange={e => updateSplit(i, 'description', e.target.value)} />
                      <Input type="number" step="0.01" placeholder="Amount" value={sp.amount} onChange={e => updateSplit(i, 'amount', e.target.value)} />
                      <Button variant="ghost" size="sm" onClick={() => removeSplit(i)} style={{ color: 'var(--color-danger)' }}>×</Button>
                    </div>
                  ))}
                  <p className={`pnl-split__remaining ${remaining < -0.01 ? 'pnl-split__remaining--over' : ''}`}>
                    {remaining > 0.01
                      ? `$${remaining.toFixed(2)} remaining (will be added as general)`
                      : remaining < -0.01
                        ? `Over-allocated by $${Math.abs(remaining).toFixed(2)}`
                        : 'Fully allocated'}
                  </p>
                </>
              )}
            </div>
          )}

          {/* ─── Receipt Upload ─── */}
          <div>
            <label className="field__label">Receipt Photo</label>
            <input
              type="file"
              accept="image/*,.pdf"
              style={{ fontSize: '0.8rem' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const ext = file.name.split('.').pop()
                  const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
                  const { error } = await supabase.storage.from('brand-assets').upload(path, file, { cacheControl: '3600' })
                  if (error) throw new Error(error.message)
                  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
                  setDraft(d => ({ ...d, receipt_url: publicUrl }))
                } catch (err) { alert('Upload failed: ' + err.message) }
              }}
            />
            {draft.receipt_url && (
              <div style={{ marginTop: 8 }}>
                <img src={draft.receipt_url} alt="Receipt" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 'var(--radius-sm)', border: '1px solid var(--cream)' }} />
                <button onClick={() => setDraft(d => ({ ...d, receipt_url: '' }))} style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--brown-dark)', cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.is_deductible} onChange={e => setDraft(d => ({ ...d, is_deductible: e.target.checked }))} />
            Tax deductible
          </label>

          <Input label="Notes" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Internal notes..." />

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={handleSave} disabled={saving || !draft.amount}>
              {saving ? 'Saving...' : panel === 'add' ? 'Add Expense' : 'Save Changes'}
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
