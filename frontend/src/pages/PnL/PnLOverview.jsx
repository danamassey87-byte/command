import { useState, useMemo } from 'react'
import { SectionHeader, Card, TabBar, Button, Badge } from '../../components/ui/index.jsx'
import { useAllExpenses, useAllIncomeEntries, useTransactions } from '../../lib/hooks.js'
import './PnL.css'

// ─── Cap Settings ────────────────────────────────────────────────────────────
const CAP_STORAGE = 'brokerage_cap_settings'
function loadCapSettings() {
  try {
    return JSON.parse(localStorage.getItem(CAP_STORAGE)) || { splitPct: 15, capAmount: 12000 }
  } catch { return { splitPct: 15, capAmount: 12000 } }
}
function saveCapSettings(s) { localStorage.setItem(CAP_STORAGE, JSON.stringify(s)) }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => v < 0
  ? `-$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtShort = (v) => v < 0
  ? `-$${Math.abs(v) >= 1000 ? (Math.abs(v)/1000).toFixed(1)+'k' : Math.abs(v).toFixed(0)}`
  : `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)}`
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getPresetRange(preset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (preset) {
    case 'mtd':   return [new Date(y, m, 1), now]
    case 'qtd': {
      const qStart = new Date(y, Math.floor(m / 3) * 3, 1)
      return [qStart, now]
    }
    case 'ytd':   return [new Date(y, 0, 1), now]
    case 'last-month': return [new Date(y, m - 1, 1), new Date(y, m, 0)]
    case 'last-quarter': {
      const q = Math.floor(m / 3)
      return [new Date(y, (q - 1) * 3, 1), new Date(y, q * 3, 0)]
    }
    case 'last-year': return [new Date(y - 1, 0, 1), new Date(y - 1, 11, 31)]
    default: return [new Date(y, 0, 1), now]
  }
}
function toDateStr(d) { return d.toISOString().split('T')[0] }

// ─── Component ────────────────────────────────────────────────────────────────
export default function PnLOverview() {
  const [preset, setPreset] = useState('ytd')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [view, setView] = useState('statement')
  const [capSettings, setCapSettings] = useState(loadCapSettings)
  const [editingCap, setEditingCap] = useState(false)

  const expenses     = useAllExpenses()
  const income       = useAllIncomeEntries()
  const transactions = useTransactions()

  const [rangeStart, rangeEnd] = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return [new Date(customFrom), new Date(customTo)]
    }
    return getPresetRange(preset)
  }, [preset, customFrom, customTo])

  const fromStr = toDateStr(rangeStart)
  const toStr   = toDateStr(rangeEnd)

  // Filter data by range
  const filteredExpenses = useMemo(() =>
    (expenses.data ?? []).filter(e => e.date >= fromStr && e.date <= toStr),
    [expenses.data, fromStr, toStr])

  const filteredIncome = useMemo(() =>
    (income.data ?? []).filter(i => i.date >= fromStr && i.date <= toStr),
    [income.data, fromStr, toStr])

  // Totals
  const totalIncome  = filteredIncome.reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalExpense = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const netProfit    = totalIncome - totalExpense
  const margin       = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0'

  // Group expenses by category
  const expByCategory = useMemo(() => {
    const map = {}
    filteredExpenses.forEach(e => {
      const cat = e.category?.name || 'Uncategorized'
      if (!map[cat]) map[cat] = { total: 0, count: 0, taxLine: e.category?.tax_line }
      map[cat].total += Number(e.amount || 0)
      map[cat].count++
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [filteredExpenses])

  // Group income by category
  const incByCategory = useMemo(() => {
    const map = {}
    filteredIncome.forEach(i => {
      const cat = i.category?.name || 'Uncategorized'
      if (!map[cat]) map[cat] = { total: 0, count: 0 }
      map[cat].total += Number(i.amount || 0)
      map[cat].count++
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [filteredIncome])

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const months = {}
    MONTHS.forEach((m, i) => { months[i] = { income: 0, expense: 0 } })
    filteredIncome.forEach(i => {
      const m = new Date(i.date).getMonth()
      months[m].income += Number(i.amount || 0)
    })
    filteredExpenses.forEach(e => {
      const m = new Date(e.date).getMonth()
      months[m].expense += Number(e.amount || 0)
    })
    return MONTHS.map((label, i) => ({
      label,
      income: months[i].income,
      expense: months[i].expense,
      net: months[i].income - months[i].expense,
    })).filter((_, i) => i <= new Date().getMonth())
  }, [filteredIncome, filteredExpenses])

  // Deductible total
  const deductibleTotal = filteredExpenses
    .filter(e => e.is_deductible !== false)
    .reduce((s, e) => s + Number(e.amount || 0), 0)

  // ─── Brokerage Cap Tracker ───
  const currentYear = new Date().getFullYear()
  const ytdFromStr = `${currentYear}-01-01`
  const ytdToStr = toDateStr(new Date())

  const ytdIncome = useMemo(() =>
    (income.data ?? []).filter(i => i.date >= ytdFromStr && i.date <= ytdToStr),
    [income.data, ytdFromStr, ytdToStr])

  const ytdBrokerPaid = useMemo(() =>
    ytdIncome.reduce((s, i) => s + Number(i.broker_split_amt || 0), 0),
    [ytdIncome])

  const capRemaining = Math.max(0, capSettings.capAmount - ytdBrokerPaid)
  const capPct = capSettings.capAmount > 0 ? Math.min(100, (ytdBrokerPaid / capSettings.capAmount) * 100) : 0
  const isCapped = ytdBrokerPaid >= capSettings.capAmount

  // Pipeline deals for projection
  const pendingDeals = useMemo(() => {
    const deals = transactions.data ?? []
    return deals
      .filter(d => d.status && d.status !== 'closed' && d.status !== 'cancelled')
      .map(d => {
        const gci = Number(d.expected_commission || d.offer_price * 0.025 || 0)
        const brokerSplit = gci * (capSettings.splitPct / 100)
        return {
          id: d.id,
          name: d.contact?.name || 'Unknown',
          property: d.property?.address || 'TBD',
          status: d.status,
          closingDate: d.closing_date,
          gci,
          brokerSplit,
        }
      })
      .filter(d => d.gci > 0)
      .sort((a, b) => (a.closingDate || '9999') < (b.closingDate || '9999') ? -1 : 1)
  }, [transactions.data, capSettings.splitPct])

  // Walk through pending deals to project cap hit
  const capProjection = useMemo(() => {
    let running = ytdBrokerPaid
    let capHitDeal = null
    const rows = []

    for (const deal of pendingDeals) {
      const wouldPay = Math.min(deal.brokerSplit, Math.max(0, capSettings.capAmount - running))
      const postCapSavings = deal.brokerSplit - wouldPay
      running += wouldPay
      const hitsCap = running >= capSettings.capAmount && !capHitDeal
      if (hitsCap) capHitDeal = deal
      rows.push({ ...deal, wouldPay, postCapSavings, runningTotal: running, hitsCap })
    }

    const totalProjectedSplits = pendingDeals.reduce((s, d) => s + d.brokerSplit, 0)
    const totalSavings = rows.reduce((s, r) => s + r.postCapSavings, 0)

    return { rows, capHitDeal, totalProjectedSplits, totalSavings }
  }, [pendingDeals, ytdBrokerPaid, capSettings.capAmount])

  // Deals closed this year (for cap progress)
  const ytdDealsCount = ytdIncome.filter(i => Number(i.broker_split_amt) > 0).length

  function updateCapSetting(key, val) {
    const next = { ...capSettings, [key]: Number(val) || 0 }
    setCapSettings(next)
    saveCapSettings(next)
  }

  const loading = expenses.loading || income.loading

  const PRESETS = [
    { value: 'mtd', label: 'MTD' },
    { value: 'qtd', label: 'QTD' },
    { value: 'ytd', label: 'YTD' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'last-quarter', label: 'Last Qtr' },
    { value: 'last-year', label: 'Last Year' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <>
      <SectionHeader
        title="Profit & Loss"
        subtitle="Real-time financial overview"
        actions={
          <div className="pnl-range">
            <div className="pnl-range__presets">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  className={`pnl-range__preset ${preset === p.value ? 'pnl-range__preset--active' : ''}`}
                  onClick={() => setPreset(p.value)}
                >{p.label}</button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="pnl-range__dates">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                <span className="pnl-range__sep">to</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            )}
          </div>
        }
      />

      {/* ─── KPIs ─── */}
      <div className="pnl-kpis">
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Gross Income</p>
          <p className={`pnl-kpi__value pnl-kpi__value--green`}>{fmt(totalIncome)}</p>
          <p className="pnl-kpi__sub">{filteredIncome.length} transaction{filteredIncome.length !== 1 ? 's' : ''}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Total Expenses</p>
          <p className={`pnl-kpi__value pnl-kpi__value--red`}>{fmt(totalExpense)}</p>
          <p className="pnl-kpi__sub">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Net Profit</p>
          <p className={`pnl-kpi__value ${netProfit >= 0 ? 'pnl-kpi__value--green' : 'pnl-kpi__value--red'}`}>{fmt(netProfit)}</p>
          <p className="pnl-kpi__sub">{margin}% margin</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Tax Deductions</p>
          <p className="pnl-kpi__value">{fmt(deductibleTotal)}</p>
          <p className="pnl-kpi__sub">deductible expenses</p>
        </Card>
      </div>

      {/* ─── Brokerage Cap Tracker ─── */}
      <Card className="cap-tracker">
        <div className="cap-tracker__header">
          <div>
            <h3 className="cap-tracker__title">Brokerage Cap Tracker</h3>
            <p className="cap-tracker__subtitle">
              {capSettings.splitPct}% split · {fmt(capSettings.capAmount)} annual cap
              {!editingCap && (
                <button className="cap-tracker__edit-btn" onClick={() => setEditingCap(true)}>Edit</button>
              )}
            </p>
          </div>
          {isCapped ? (
            <Badge variant="success" size="md">CAPPED</Badge>
          ) : (
            <Badge variant="warning" size="md">{capPct.toFixed(0)}% to Cap</Badge>
          )}
        </div>

        {editingCap && (
          <div className="cap-tracker__settings">
            <div className="cap-tracker__setting">
              <label>Broker Split %</label>
              <input type="number" value={capSettings.splitPct} onChange={e => updateCapSetting('splitPct', e.target.value)} />
            </div>
            <div className="cap-tracker__setting">
              <label>Annual Cap $</label>
              <input type="number" value={capSettings.capAmount} onChange={e => updateCapSetting('capAmount', e.target.value)} />
            </div>
            <button className="cap-tracker__done-btn" onClick={() => setEditingCap(false)}>Done</button>
          </div>
        )}

        {/* Progress bar */}
        <div className="cap-tracker__progress">
          <div className="cap-tracker__bar">
            <div
              className={`cap-tracker__fill ${isCapped ? 'cap-tracker__fill--capped' : ''}`}
              style={{ width: `${Math.min(capPct, 100)}%` }}
            />
            {capProjection.rows.length > 0 && !isCapped && (
              <div
                className="cap-tracker__fill-projected"
                style={{
                  left: `${capPct}%`,
                  width: `${Math.min(100 - capPct, (capProjection.totalProjectedSplits / capSettings.capAmount) * 100)}%`,
                }}
              />
            )}
          </div>
          <div className="cap-tracker__bar-labels">
            <span>{fmt(ytdBrokerPaid)} paid</span>
            <span>{isCapped ? 'Cap reached!' : `${fmt(capRemaining)} remaining`}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="cap-tracker__stats">
          <div className="cap-tracker__stat">
            <span className="cap-tracker__stat-value">{ytdDealsCount}</span>
            <span className="cap-tracker__stat-label">Deals YTD</span>
          </div>
          <div className="cap-tracker__stat">
            <span className="cap-tracker__stat-value">{fmt(ytdBrokerPaid)}</span>
            <span className="cap-tracker__stat-label">Paid to Brokerage</span>
          </div>
          <div className="cap-tracker__stat">
            <span className="cap-tracker__stat-value" style={{ color: isCapped ? 'var(--color-success)' : 'var(--brown-dark)' }}>
              {isCapped ? fmt(capRemaining) : fmt(capRemaining)}
            </span>
            <span className="cap-tracker__stat-label">{isCapped ? 'Over Cap (saved)' : 'Until 100%'}</span>
          </div>
          <div className="cap-tracker__stat">
            <span className="cap-tracker__stat-value" style={{ color: 'var(--color-success)' }}>
              {isCapped ? '100%' : `${(100 - capSettings.splitPct).toFixed(0)}%`}
            </span>
            <span className="cap-tracker__stat-label">{isCapped ? 'You Keep' : 'Current Take'}</span>
          </div>
        </div>

        {/* Pipeline projection */}
        {capProjection.rows.length > 0 && (
          <div className="cap-tracker__projection">
            <h4 className="cap-tracker__proj-title">
              Pipeline Projection
              {capProjection.capHitDeal && !isCapped && (
                <span className="cap-tracker__proj-note">
                  Cap hit on: {capProjection.capHitDeal.property}
                  {capProjection.capHitDeal.closingDate && ` (est. ${new Date(capProjection.capHitDeal.closingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                </span>
              )}
            </h4>
            <table className="cap-tracker__table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Close Date</th>
                  <th>GCI</th>
                  <th>Broker Split</th>
                  <th>You Keep</th>
                </tr>
              </thead>
              <tbody>
                {capProjection.rows.map(r => (
                  <tr key={r.id} className={r.hitsCap ? 'cap-tracker__cap-row' : ''}>
                    <td>
                      <span className="cap-tracker__deal-name">{r.name}</span>
                      <span className="cap-tracker__deal-prop">{r.property}</span>
                    </td>
                    <td>{r.closingDate ? new Date(r.closingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td>{fmt(r.gci)}</td>
                    <td>
                      {r.postCapSavings > 0 ? (
                        <span>
                          <s style={{ color: 'var(--brown-light)', fontSize: '0.75rem' }}>{fmt(r.brokerSplit)}</s>{' '}
                          <span style={{ color: 'var(--color-success)' }}>{fmt(r.wouldPay)}</span>
                        </span>
                      ) : (
                        fmt(r.wouldPay)
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      {fmt(r.gci - r.wouldPay)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {capProjection.totalSavings > 0 && (
              <div className="cap-tracker__savings">
                Post-cap savings on pipeline deals: <strong>{fmt(capProjection.totalSavings)}</strong>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ─── View Toggle ─── */}
      <TabBar
        tabs={[
          { value: 'statement', label: 'P&L Statement' },
          { value: 'trend',    label: 'Monthly Trend' },
          { value: 'charts',   label: 'Category Breakdown' },
        ]}
        active={view}
        onChange={setView}
      />

      {loading ? (
        <Card><p style={{ padding: 40, textAlign: 'center', color: 'var(--brown-light)' }}>Loading financial data...</p></Card>
      ) : view === 'statement' ? (
        /* ─── P&L Statement ─── */
        <Card>
          <table className="pnl-statement">
            <thead>
              <tr><th>Account</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {/* Income */}
              <tr className="pnl-statement__section-header"><td colSpan="2">Income</td></tr>
              {incByCategory.map(([cat, data]) => (
                <tr key={cat}>
                  <td className="pnl-statement__indent">{cat}</td>
                  <td>{fmt(data.total)}</td>
                </tr>
              ))}
              {incByCategory.length === 0 && (
                <tr><td className="pnl-statement__indent" style={{ color: 'var(--brown-light)' }}>No income recorded</td><td>$0.00</td></tr>
              )}
              <tr className="pnl-statement__total">
                <td>Total Income</td>
                <td>{fmt(totalIncome)}</td>
              </tr>

              {/* Expenses */}
              <tr className="pnl-statement__section-header"><td colSpan="2">Expenses</td></tr>
              {expByCategory.map(([cat, data]) => (
                <tr key={cat}>
                  <td className="pnl-statement__indent">{cat} {data.taxLine ? <span style={{ fontSize: '0.7rem', color: 'var(--brown-light)' }}>({data.taxLine})</span> : ''}</td>
                  <td>{fmt(data.total)}</td>
                </tr>
              ))}
              {expByCategory.length === 0 && (
                <tr><td className="pnl-statement__indent" style={{ color: 'var(--brown-light)' }}>No expenses recorded</td><td>$0.00</td></tr>
              )}
              <tr className="pnl-statement__total">
                <td>Total Expenses</td>
                <td>{fmt(totalExpense)}</td>
              </tr>

              {/* Net */}
              <tr className="pnl-statement__grand-total">
                <td>Net Profit / (Loss)</td>
                <td style={{ color: netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{fmt(netProfit)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

      ) : view === 'trend' ? (
        /* ─── Monthly Trend ─── */
        <Card padding>
          <div className="pnl-trend">
            {monthlyTrend.map(m => (
              <div key={m.label} className="pnl-trend__month">
                <span className="pnl-trend__label">{m.label}</span>
                <span className="pnl-trend__income">{fmtShort(m.income)}</span>
                <span className="pnl-trend__expense">-{fmtShort(m.expense)}</span>
                <span className="pnl-trend__net">{fmtShort(m.net)}</span>
              </div>
            ))}
          </div>
        </Card>

      ) : (
        /* ─── Category Breakdown ─── */
        <div className="pnl-chart-row">
          <Card className="pnl-bar-chart">
            <p className="pnl-bar-chart__title">Income by Category</p>
            <div className="pnl-bars">
              {incByCategory.map(([cat, data]) => {
                const maxVal = incByCategory[0]?.[1]?.total || 1
                return (
                  <div key={cat} className="pnl-bar">
                    <span className="pnl-bar__label">{cat}</span>
                    <div className="pnl-bar__track">
                      <div className="pnl-bar__fill pnl-bar__fill--income" style={{ width: `${(data.total / maxVal) * 100}%` }} />
                    </div>
                    <span className="pnl-bar__value">{fmt(data.total)}</span>
                  </div>
                )
              })}
              {incByCategory.length === 0 && <p style={{ color: 'var(--brown-light)', fontSize: '0.8rem' }}>No income data</p>}
            </div>
          </Card>
          <Card className="pnl-bar-chart">
            <p className="pnl-bar-chart__title">Expenses by Category</p>
            <div className="pnl-bars">
              {expByCategory.slice(0, 10).map(([cat, data]) => {
                const maxVal = expByCategory[0]?.[1]?.total || 1
                return (
                  <div key={cat} className="pnl-bar">
                    <span className="pnl-bar__label">{cat}</span>
                    <div className="pnl-bar__track">
                      <div className="pnl-bar__fill pnl-bar__fill--expense" style={{ width: `${(data.total / maxVal) * 100}%` }} />
                    </div>
                    <span className="pnl-bar__value">{fmt(data.total)}</span>
                  </div>
                )
              })}
              {expByCategory.length === 0 && <p style={{ color: 'var(--brown-light)', fontSize: '0.8rem' }}>No expense data</p>}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
