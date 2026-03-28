import { useState, useMemo } from 'react'
import { SectionHeader, Card, Button, SlidePanel, Input, Select, Badge } from '../../components/ui/index.jsx'
import { useExpenseCategories } from '../../lib/hooks.js'
import { createExpense } from '../../lib/supabase.js'
import './PnL.css'

const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Store recurring templates in localStorage
function getTemplates() {
  try { return JSON.parse(localStorage.getItem('pnl_recurring') || '[]') }
  catch { return [] }
}
function saveTemplates(t) { localStorage.setItem('pnl_recurring', JSON.stringify(t)) }

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'weekly', label: 'Weekly' },
]

const EMPTY = {
  vendor: '',
  description: '',
  amount: '',
  category_id: '',
  payment_method: '',
  frequency: 'monthly',
  day_of_month: '1',
  is_deductible: true,
}

const PAYMENT_METHODS = [
  { value: '', label: '— Select —' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH / Bank Transfer' },
  { value: 'other', label: 'Other' },
]

export default function RecurringExpenses() {
  const [templates, setTemplates] = useState(getTemplates)
  const [panel, setPanel]   = useState(null) // null | 'add' | index
  const [draft, setDraft]   = useState(EMPTY)
  const [generating, setGenerating] = useState(false)

  const categories = useExpenseCategories('expense')
  const cats = categories.data ?? []

  const annualTotal = useMemo(() =>
    templates.reduce((s, t) => {
      const amt = Number(t.amount) || 0
      if (t.frequency === 'monthly') return s + amt * 12
      if (t.frequency === 'quarterly') return s + amt * 4
      if (t.frequency === 'weekly') return s + amt * 52
      return s + amt
    }, 0),
    [templates])

  const monthlyTotal = useMemo(() =>
    templates.reduce((s, t) => {
      const amt = Number(t.amount) || 0
      if (t.frequency === 'monthly') return s + amt
      if (t.frequency === 'quarterly') return s + amt / 3
      if (t.frequency === 'weekly') return s + amt * 4.33
      return s + amt / 12
    }, 0),
    [templates])

  function openAdd() { setDraft(EMPTY); setPanel('add') }
  function openEdit(i) { setDraft({ ...templates[i] }); setPanel(i) }

  function handleSave() {
    const next = [...templates]
    const entry = { ...draft, id: draft.id || crypto.randomUUID() }
    if (panel === 'add') next.push(entry)
    else next[panel] = entry
    saveTemplates(next)
    setTemplates(next)
    setPanel(null)
  }

  function handleDelete() {
    if (!confirm('Remove this recurring expense?')) return
    const next = templates.filter((_, i) => i !== panel)
    saveTemplates(next)
    setTemplates(next)
    setPanel(null)
  }

  // Generate expenses for current month
  async function generateMonth() {
    if (!confirm(`This will create ${templates.filter(t => t.frequency === 'monthly' || t.frequency === 'weekly').length} expense entries for this month. Continue?`)) return
    setGenerating(true)
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    let created = 0

    try {
      for (const t of templates) {
        const dates = []
        if (t.frequency === 'monthly') {
          const day = Math.min(Number(t.day_of_month) || 1, 28)
          dates.push(new Date(y, m, day))
        } else if (t.frequency === 'weekly') {
          for (let d = 1; d <= 28; d += 7) dates.push(new Date(y, m, d))
        } else if (t.frequency === 'quarterly' && [0, 3, 6, 9].includes(m)) {
          dates.push(new Date(y, m, Number(t.day_of_month) || 1))
        } else if (t.frequency === 'annually' && m === 0) {
          dates.push(new Date(y, 0, Number(t.day_of_month) || 1))
        }

        for (const date of dates) {
          await createExpense({
            date: date.toISOString().split('T')[0],
            vendor: t.vendor || null,
            description: t.description || null,
            amount: Number(t.amount),
            category_id: t.category_id || null,
            payment_method: t.payment_method || null,
            is_deductible: t.is_deductible,
            notes: `Auto-generated from recurring: ${t.vendor}`,
          })
          created++
        }
      }
      alert(`Created ${created} expense entries for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`)
    } catch (e) { alert(e.message) }
    finally { setGenerating(false) }
  }

  const catName = (id) => cats.find(c => c.id === id)?.name || '—'

  return (
    <>
      <SectionHeader
        title="Recurring Expenses"
        subtitle={`${templates.length} templates · ${fmt(monthlyTotal)}/mo · ${fmt(annualTotal)}/yr`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={generateMonth} disabled={generating || templates.length === 0}>
              {generating ? 'Generating...' : 'Generate This Month'}
            </Button>
            <Button onClick={openAdd}>+ Add Template</Button>
          </div>
        }
      />

      <div className="pnl-kpis">
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Monthly Cost</p>
          <p className="pnl-kpi__value">{fmt(monthlyTotal)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Annual Cost</p>
          <p className="pnl-kpi__value pnl-kpi__value--red">{fmt(annualTotal)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Templates</p>
          <p className="pnl-kpi__value">{templates.length}</p>
        </Card>
      </div>

      <Card padding={false}>
        {templates.length === 0 ? (
          <div className="pnl-empty">
            <div className="pnl-empty__icon">&#128260;</div>
            <p className="pnl-empty__title">No recurring expenses</p>
            <p className="pnl-empty__sub">Set up templates for your fixed monthly costs — MLS dues, desk fees, subscriptions, phone bill — and generate them with one click.</p>
            <Button onClick={openAdd}>+ Add Template</Button>
          </div>
        ) : (
          <table className="pnl-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Category</th>
                <th>Frequency</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <tr key={t.id || i} onClick={() => openEdit(i)}>
                  <td>
                    <span className="pnl-table__vendor">{t.vendor || '—'}</span>
                    {t.description && <><br /><span style={{ fontSize: '0.73rem', color: 'var(--brown-light)' }}>{t.description}</span></>}
                  </td>
                  <td>{t.category_id ? <span className="pnl-table__cat">{catName(t.category_id)}</span> : '—'}</td>
                  <td><Badge variant="default" size="sm">{t.frequency}</Badge></td>
                  <td className="pnl-table__amount">{fmt(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <SlidePanel open={!!panel} onClose={() => setPanel(null)} title={panel === 'add' ? 'Add Recurring Expense' : 'Edit Recurring Expense'}>
        <div className="pnl-form">
          <Input label="Vendor / Payee" value={draft.vendor} onChange={e => setDraft(d => ({ ...d, vendor: e.target.value }))} placeholder="e.g., Keller Williams, kvCORE, Canva" />
          <Input label="Description" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Monthly desk fee, CRM subscription" />
          <div className="pnl-form__row">
            <Input label="Amount ($)" type="number" step="0.01" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
            <Select label="Frequency" value={draft.frequency} onChange={e => setDraft(d => ({ ...d, frequency: e.target.value }))}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </div>
          <div className="pnl-form__row">
            <Select label="Category" value={draft.category_id} onChange={e => setDraft(d => ({ ...d, category_id: e.target.value }))}>
              <option value="">— Select —</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Day of Month" type="number" min="1" max="28" value={draft.day_of_month} onChange={e => setDraft(d => ({ ...d, day_of_month: e.target.value }))} />
          </div>
          <Select label="Payment Method" value={draft.payment_method} onChange={e => setDraft(d => ({ ...d, payment_method: e.target.value }))}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--brown-dark)', cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.is_deductible} onChange={e => setDraft(d => ({ ...d, is_deductible: e.target.checked }))} />
            Tax deductible
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={handleSave} disabled={!draft.amount || !draft.vendor}>
              {panel === 'add' ? 'Add Template' : 'Save Changes'}
            </Button>
            {panel !== 'add' && <Button variant="danger" onClick={handleDelete}>Remove</Button>}
          </div>
        </div>
      </SlidePanel>
    </>
  )
}
