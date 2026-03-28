import { useState, useMemo } from 'react'
import { SectionHeader, Card, Button, TabBar } from '../../components/ui/index.jsx'
import { useAllExpenses, useAllIncomeEntries, useMileageLog } from '../../lib/hooks.js'
import './PnL.css'

const fmt = (v) => v < 0
  ? `-$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const SE_TAX_RATE   = 0.153   // 15.3% self-employment tax
const SE_DEDUCTION  = 0.5     // deduct half of SE tax
const FEDERAL_BRACKETS_2026 = [
  { min: 0,      max: 11925,  rate: 0.10 },
  { min: 11925,  max: 48475,  rate: 0.12 },
  { min: 48475,  max: 103350, rate: 0.22 },
  { min: 103350, max: 197300, rate: 0.24 },
  { min: 197300, max: 250525, rate: 0.32 },
  { min: 250525, max: 626350, rate: 0.35 },
  { min: 626350, max: Infinity, rate: 0.37 },
]
const STANDARD_DEDUCTION = 15700 // 2026 single filer
const AZ_STATE_RATE = 0.025 // Arizona flat rate

function calcFederalTax(taxableIncome) {
  let tax = 0
  for (const bracket of FEDERAL_BRACKETS_2026) {
    if (taxableIncome <= bracket.min) break
    const inBracket = Math.min(taxableIncome, bracket.max) - bracket.min
    tax += inBracket * bracket.rate
  }
  return tax
}

export default function TaxSummary() {
  const year = new Date().getFullYear()
  const [view, setView] = useState('schedule-c')

  const expenses = useAllExpenses()
  const income   = useAllIncomeEntries()
  const mileage  = useMileageLog(`${year}-01-01`, `${year}-12-31`)

  const allExp = (expenses.data ?? []).filter(e => e.date?.startsWith(String(year)))
  const allInc = (income.data ?? []).filter(i => i.date?.startsWith(String(year)))
  const allMi  = mileage.data ?? []

  // Schedule C line groupings
  const scheduleC = useMemo(() => {
    const lines = {}
    allExp.filter(e => e.is_deductible !== false).forEach(e => {
      const line = e.category?.tax_line || 'Line 27a'
      if (!lines[line]) lines[line] = { total: 0, items: [] }
      lines[line].total += Number(e.amount || 0)
      lines[line].items.push(e)
    })

    // Add mileage as Line 9
    const mileageTotal = allMi.reduce((s, m) => s + Number(m.amount || m.miles * 0.7 || 0), 0)
    if (mileageTotal > 0) {
      if (!lines['Line 9']) lines['Line 9'] = { total: 0, items: [] }
      lines['Line 9'].total += mileageTotal
    }

    return Object.entries(lines).sort((a, b) => {
      const numA = parseInt(a[0].replace(/\D/g, '')) || 99
      const numB = parseInt(b[0].replace(/\D/g, '')) || 99
      return numA - numB
    })
  }, [allExp, allMi])

  const LINE_LABELS = {
    'Line 1':  'Gross receipts',
    'Line 8':  'Advertising',
    'Line 9':  'Car & truck expenses',
    'Line 10': 'Commissions and fees',
    'Line 11': 'Contract labor',
    'Line 13': 'Depreciation',
    'Line 15': 'Insurance',
    'Line 17': 'Legal & professional services',
    'Line 18': 'Office expense',
    'Line 22': 'Supplies',
    'Line 24a':'Travel',
    'Line 25': 'Utilities',
    'Line 27a':'Other expenses',
    'Line 30': 'Business use of home',
  }

  const totalIncome     = allInc.reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalDeductions = scheduleC.reduce((s, [, d]) => s + d.total, 0)
  const netProfit       = totalIncome - totalDeductions

  // Tax estimates
  const seTax           = Math.max(0, netProfit * 0.9235 * SE_TAX_RATE)
  const seDeduction     = seTax * SE_DEDUCTION
  const agi             = netProfit - seDeduction
  const taxableIncome   = Math.max(0, agi - STANDARD_DEDUCTION)
  const federalTax      = calcFederalTax(taxableIncome)
  const stateTax        = Math.max(0, taxableIncome * AZ_STATE_RATE)
  const totalTax        = seTax + federalTax + stateTax
  const quarterlyEst    = totalTax / 4
  const effectiveRate   = totalIncome > 0 ? ((totalTax / totalIncome) * 100).toFixed(1) : '0.0'

  const Q_DATES = ['Apr 15', 'Jun 15', 'Sep 15', 'Jan 15']

  // CSV Export
  function exportCSV(type) {
    let csv = ''
    let filename = ''

    if (type === 'expenses') {
      csv = 'Date,Vendor,Description,Category,Tax Line,Amount,Deductible\n'
      allExp.forEach(e => {
        csv += `${e.date},"${(e.vendor || '').replace(/"/g, '""')}","${(e.description || '').replace(/"/g, '""')}","${e.category?.name || ''}","${e.category?.tax_line || ''}",${e.amount},${e.is_deductible !== false ? 'Yes' : 'No'}\n`
      })
      filename = `expenses_${year}.csv`
    } else if (type === 'income') {
      csv = 'Date,Description,Category,Amount,Status,Gross Commission,Broker Split,Net Commission\n'
      allInc.forEach(i => {
        csv += `${i.date},"${(i.description || '').replace(/"/g, '""')}","${i.category?.name || ''}",${i.amount},${i.status || ''},${i.gross_commission || ''},${i.broker_split_amt || ''},${i.net_commission || ''}\n`
      })
      filename = `income_${year}.csv`
    } else if (type === 'mileage') {
      csv = 'Date,Description,Miles,Rate,Deduction\n'
      allMi.forEach(m => {
        csv += `${m.date},"${(m.description || '').replace(/"/g, '""')}",${m.miles},${m.rate_per_mile || 0.70},${m.amount || (Number(m.miles) * 0.70).toFixed(2)}\n`
      })
      filename = `mileage_${year}.csv`
    } else {
      // Full P&L
      csv = 'Section,Category,Amount\n'
      csv += `Income,Total,${totalIncome}\n`
      allInc.forEach(i => {
        csv += `Income,"${i.category?.name || 'Other'}",${i.amount}\n`
      })
      scheduleC.forEach(([line, data]) => {
        csv += `Expense,"${LINE_LABELS[line] || line}",${data.total}\n`
      })
      csv += `Net Profit,,${netProfit}\n`
      filename = `pnl_${year}.csv`
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const loading = expenses.loading || income.loading || mileage.loading

  return (
    <>
      <SectionHeader
        title="Tax Summary"
        subtitle={`${year} Tax Year · Schedule C`}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="ghost" size="sm" onClick={() => exportCSV('pnl')}>Export P&L</Button>
            <Button variant="ghost" size="sm" onClick={() => exportCSV('expenses')}>Export Expenses</Button>
            <Button variant="ghost" size="sm" onClick={() => exportCSV('income')}>Export Income</Button>
            <Button variant="ghost" size="sm" onClick={() => exportCSV('mileage')}>Export Mileage</Button>
          </div>
        }
      />

      {/* ─── KPIs ─── */}
      <div className="pnl-kpis">
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Gross Income</p>
          <p className="pnl-kpi__value pnl-kpi__value--green">{fmt(totalIncome)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Total Deductions</p>
          <p className="pnl-kpi__value pnl-kpi__value--red">{fmt(totalDeductions)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Net Profit (Sched C)</p>
          <p className={`pnl-kpi__value ${netProfit >= 0 ? 'pnl-kpi__value--green' : 'pnl-kpi__value--red'}`}>{fmt(netProfit)}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Est. Total Tax</p>
          <p className="pnl-kpi__value pnl-kpi__value--red">{fmt(totalTax)}</p>
          <p className="pnl-kpi__sub">{effectiveRate}% effective rate</p>
        </Card>
      </div>

      <TabBar
        tabs={[
          { value: 'schedule-c', label: 'Schedule C' },
          { value: 'quarterly',  label: 'Quarterly Estimates' },
          { value: 'yoy',        label: 'Year-over-Year' },
        ]}
        active={view}
        onChange={setView}
      />

      {loading ? (
        <Card><p style={{ padding: 40, textAlign: 'center', color: 'var(--brown-light)' }}>Loading tax data...</p></Card>
      ) : view === 'schedule-c' ? (
        /* ─── Schedule C ─── */
        <Card>
          <table className="pnl-statement">
            <thead>
              <tr><th>Schedule C Line</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr className="pnl-statement__section-header"><td colSpan="2">Part I — Income</td></tr>
              <tr>
                <td className="pnl-statement__indent">Line 1 — Gross receipts</td>
                <td>{fmt(totalIncome)}</td>
              </tr>
              <tr className="pnl-statement__total">
                <td>Line 7 — Gross income</td>
                <td>{fmt(totalIncome)}</td>
              </tr>

              <tr className="pnl-statement__section-header"><td colSpan="2">Part II — Expenses</td></tr>
              {scheduleC.map(([line, data]) => (
                <tr key={line}>
                  <td className="pnl-statement__indent">{line} — {LINE_LABELS[line] || 'Other'}</td>
                  <td>{fmt(data.total)}</td>
                </tr>
              ))}
              <tr className="pnl-statement__total">
                <td>Line 28 — Total expenses</td>
                <td>{fmt(totalDeductions)}</td>
              </tr>

              <tr className="pnl-statement__grand-total">
                <td>Line 31 — Net profit or (loss)</td>
                <td style={{ color: netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{fmt(netProfit)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

      ) : view === 'quarterly' ? (
        /* ─── Quarterly Estimates ─── */
        <Card padding>
          <p className="pnl-bar-chart__title">Estimated Quarterly Tax Payments (Form 1040-ES)</p>
          <div className="pnl-form__commission-calc" style={{ marginBottom: 16 }}>
            <div className="pnl-form__calc-row">
              <span>Net profit (Schedule C, Line 31)</span>
              <span>{fmt(netProfit)}</span>
            </div>
            <div className="pnl-form__calc-row">
              <span>Self-employment tax (15.3% × 92.35%)</span>
              <span>{fmt(seTax)}</span>
            </div>
            <div className="pnl-form__calc-row">
              <span>SE tax deduction (50%)</span>
              <span>-{fmt(seDeduction)}</span>
            </div>
            <div className="pnl-form__calc-row">
              <span>Adjusted gross income</span>
              <span>{fmt(agi)}</span>
            </div>
            <div className="pnl-form__calc-row">
              <span>Standard deduction (single)</span>
              <span>-{fmt(STANDARD_DEDUCTION)}</span>
            </div>
            <div className="pnl-form__calc-row">
              <span>Taxable income</span>
              <span>{fmt(taxableIncome)}</span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--brown-light)', margin: '4px 0' }} />
            <div className="pnl-form__calc-row">
              <span>Federal income tax</span>
              <span>{fmt(federalTax)}</span>
            </div>
            <div className="pnl-form__calc-row">
              <span>Self-employment tax</span>
              <span>{fmt(seTax)}</span>
            </div>
            <div className="pnl-form__calc-row">
              <span>Arizona state tax (2.5%)</span>
              <span>{fmt(stateTax)}</span>
            </div>
            <div className="pnl-form__calc-row pnl-form__calc-row--total">
              <span>Total estimated tax</span>
              <span style={{ color: 'var(--color-danger)' }}>{fmt(totalTax)}</span>
            </div>
          </div>

          <p className="pnl-bar-chart__title">Quarterly Payment Schedule</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {Q_DATES.map((date, i) => (
              <Card key={i} className="pnl-kpi">
                <p className="pnl-kpi__label">Q{i + 1} — {date}</p>
                <p className="pnl-kpi__value" style={{ fontSize: '1.2rem' }}>{fmt(quarterlyEst)}</p>
              </Card>
            ))}
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--brown-light)', marginTop: 16, textAlign: 'center' }}>
            Estimates based on current YTD data projected to year-end. Consult your CPA for accurate tax planning.
          </p>
        </Card>

      ) : (
        /* ─── Year-over-Year ─── */
        <Card padding>
          <p className="pnl-bar-chart__title">Year-over-Year Comparison</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--brown-light)', marginBottom: 16 }}>
            Comparing {year} YTD with prior year data. Prior year data will populate as you add historical entries.
          </p>
          {(() => {
            const priorExp = (expenses.data ?? []).filter(e => e.date?.startsWith(String(year - 1)))
            const priorInc = (income.data ?? []).filter(i => i.date?.startsWith(String(year - 1)))
            const priorIncome = priorInc.reduce((s, i) => s + Number(i.amount || 0), 0)
            const priorExpense = priorExp.reduce((s, e) => s + Number(e.amount || 0), 0)
            const priorNet = priorIncome - priorExpense

            const rows = [
              { label: 'Gross Income', current: totalIncome, prior: priorIncome },
              { label: 'Total Expenses', current: totalDeductions, prior: priorExpense },
              { label: 'Net Profit', current: netProfit, prior: priorNet },
            ]

            return (
              <table className="pnl-statement">
                <thead>
                  <tr>
                    <th></th>
                    <th>{year} YTD</th>
                    <th>{year - 1}</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const change = r.prior > 0 ? ((r.current - r.prior) / r.prior * 100).toFixed(1) : '—'
                    const isUp = r.current > r.prior
                    return (
                      <tr key={r.label}>
                        <td style={{ fontWeight: 500 }}>{r.label}</td>
                        <td>{fmt(r.current)}</td>
                        <td>{r.prior > 0 ? fmt(r.prior) : <span style={{ color: 'var(--brown-light)' }}>—</span>}</td>
                        <td>
                          {change !== '—' ? (
                            <span style={{ color: r.label === 'Total Expenses' ? (isUp ? 'var(--color-danger)' : 'var(--color-success)') : (isUp ? 'var(--color-success)' : 'var(--color-danger)') }}>
                              {isUp ? '↑' : '↓'} {Math.abs(Number(change))}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          })()}
        </Card>
      )}
    </>
  )
}
