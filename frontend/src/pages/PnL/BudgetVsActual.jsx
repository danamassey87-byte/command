import { useState, useMemo } from 'react'
import { SectionHeader, Card, Button, SlidePanel, Input, Select } from '../../components/ui/index.jsx'
import { useAllExpenses, useExpenseCategories } from '../../lib/hooks.js'
import './PnL.css'

const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function getBudgets() {
  try { return JSON.parse(localStorage.getItem('pnl_budgets') || '{}') }
  catch { return {} }
}
function saveBudgets(b) { localStorage.setItem('pnl_budgets', JSON.stringify(b)) }

export default function BudgetVsActual() {
  const [budgets, setBudgets] = useState(getBudgets)
  const [editCat, setEditCat] = useState(null)
  const [budgetAmt, setBudgetAmt] = useState('')

  const categories = useExpenseCategories('expense')
  const expenses   = useAllExpenses()

  const cats = categories.data ?? []
  const year = new Date().getFullYear()
  const monthsElapsed = new Date().getMonth() + 1

  // Group actual spend by category for current year
  const actualByCategory = useMemo(() => {
    const map = {}
    ;(expenses.data ?? []).filter(e => e.date?.startsWith(String(year))).forEach(e => {
      const cid = e.category_id || 'uncategorized'
      map[cid] = (map[cid] || 0) + Number(e.amount || 0)
    })
    return map
  }, [expenses.data, year])

  const totalBudget = Object.values(budgets).reduce((s, v) => s + (Number(v) || 0), 0)
  const totalActual = Object.values(actualByCategory).reduce((s, v) => s + v, 0)

  // Rows with budget and actual
  const rows = useMemo(() => {
    return cats.map(c => {
      const annual = Number(budgets[c.id]) || 0
      const monthly = annual / 12
      const ytdBudget = monthly * monthsElapsed
      const actual = actualByCategory[c.id] || 0
      const variance = ytdBudget - actual
      const pct = ytdBudget > 0 ? (actual / ytdBudget * 100) : (actual > 0 ? 100 : 0)
      return { id: c.id, name: c.name, annual, monthly, ytdBudget, actual, variance, pct }
    }).filter(r => r.annual > 0 || r.actual > 0)
      .sort((a, b) => b.actual - a.actual)
  }, [cats, budgets, actualByCategory, monthsElapsed])

  function openBudgetEdit(cat) {
    setEditCat(cat)
    setBudgetAmt(budgets[cat.id] || '')
  }

  function saveBudget() {
    const next = { ...budgets }
    if (budgetAmt) next[editCat.id] = Number(budgetAmt)
    else delete next[editCat.id]
    saveBudgets(next)
    setBudgets(next)
    setEditCat(null)
  }

  return (
    <>
      <SectionHeader
        title="Budget vs Actual"
        subtitle={`${year} · ${monthsElapsed} months elapsed`}
      />

      <div className="pnl-kpis">
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Annual Budget</p>
          <p className="pnl-kpi__value">{fmt(totalBudget)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">YTD Budget</p>
          <p className="pnl-kpi__value">{fmt(totalBudget / 12 * monthsElapsed)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">YTD Actual</p>
          <p className={`pnl-kpi__value ${totalActual > (totalBudget / 12 * monthsElapsed) ? 'pnl-kpi__value--red' : 'pnl-kpi__value--green'}`}>{fmt(totalActual)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Variance</p>
          <p className={`pnl-kpi__value ${(totalBudget / 12 * monthsElapsed - totalActual) >= 0 ? 'pnl-kpi__value--green' : 'pnl-kpi__value--red'}`}>
            {fmt(totalBudget / 12 * monthsElapsed - totalActual)}
          </p>
          <p className="pnl-kpi__sub">{(totalBudget / 12 * monthsElapsed - totalActual) >= 0 ? 'under budget' : 'over budget'}</p>
        </Card>
      </div>

      <Card padding={false}>
        <table className="pnl-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Annual Budget</th>
              <th>YTD Budget</th>
              <th>YTD Actual</th>
              <th>Variance</th>
              <th style={{ width: 120 }}>% Used</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} onClick={() => openBudgetEdit(cats.find(c => c.id === r.id))} style={{ cursor: 'pointer' }}>
                <td className="pnl-table__vendor">{r.name}</td>
                <td className="pnl-table__amount">{r.annual > 0 ? fmt(r.annual) : <span style={{ color: 'var(--brown-light)' }}>—</span>}</td>
                <td className="pnl-table__amount">{r.ytdBudget > 0 ? fmt(r.ytdBudget) : '—'}</td>
                <td className="pnl-table__amount">{fmt(r.actual)}</td>
                <td className="pnl-table__amount" style={{ color: r.variance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {r.ytdBudget > 0 ? fmt(r.variance) : '—'}
                </td>
                <td>
                  {r.ytdBudget > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="pnl-cat-bar" style={{ flex: 1 }}>
                        <div className="pnl-cat-bar__fill" style={{
                          width: `${Math.min(r.pct, 100)}%`,
                          background: r.pct > 100 ? 'var(--color-danger)' : r.pct > 80 ? 'var(--color-warning)' : 'var(--color-success)'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: r.pct > 100 ? 'var(--color-danger)' : 'var(--brown-mid)', minWidth: 32, textAlign: 'right' }}>
                        {r.pct.toFixed(0)}%
                      </span>
                    </div>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--brown-light)' }}>
                  Click any category below to set an annual budget, or add expenses first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Category list for setting budgets */}
      {rows.length === 0 && (
        <Card padding>
          <p className="pnl-bar-chart__title">Set Annual Budgets</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {cats.map(c => (
              <button key={c.id} onClick={() => openBudgetEdit(c)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px',
                background: 'transparent', border: '1px solid var(--cream)', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: '0.8rem', color: 'var(--brown-dark)', fontFamily: 'var(--font-body)',
              }}>
                <span>{c.name}</span>
                <span style={{ color: 'var(--brown-light)' }}>{budgets[c.id] ? fmt(budgets[c.id]) : 'Set'}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <SlidePanel open={!!editCat} onClose={() => setEditCat(null)} title={`Budget — ${editCat?.name || ''}`}>
        <div className="pnl-form">
          <Input label="Annual Budget ($)" type="number" step="1" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} placeholder="e.g., 6000" />
          {budgetAmt && (
            <div className="pnl-form__commission-calc">
              <div className="pnl-form__calc-row">
                <span>Monthly</span><span>{fmt(Number(budgetAmt) / 12)}</span>
              </div>
              <div className="pnl-form__calc-row">
                <span>Quarterly</span><span>{fmt(Number(budgetAmt) / 4)}</span>
              </div>
              <div className="pnl-form__calc-row pnl-form__calc-row--total">
                <span>Annual</span><span>{fmt(Number(budgetAmt))}</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={saveBudget}>{budgetAmt ? 'Save Budget' : 'Clear Budget'}</Button>
          </div>
        </div>
      </SlidePanel>
    </>
  )
}
