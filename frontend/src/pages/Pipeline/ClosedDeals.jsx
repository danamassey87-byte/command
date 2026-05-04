import { useState, useMemo, useEffect } from 'react'
import { Badge, EmptyState } from '../../components/ui/index.jsx'
import { useTransactions, useAllExpenses, useMileageLog, useListings } from '../../lib/hooks.js'
import './ClosedDeals.css'

const IRS_RATE = 0.70 // 2026 IRS standard mileage rate

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDollar(v) {
  if (!v && v !== 0) return '—'
  return '$' + Number(v).toLocaleString()
}
function num(v) { return Number(v) || 0 }

function netCommission(deal) {
  return num(deal.actual_commission || deal.expected_commission)
    - num(deal.broker_fee)
    - num(deal.referral_fee)
    - num(deal.tc_fee)
    - num(deal.lead_source_fee)
}

export default function ClosedDeals() {
  const { data: transactions, loading } = useTransactions()
  const { data: allExpenses }  = useAllExpenses()
  const { data: allListings }  = useListings()
  const year = new Date().getFullYear()
  const { data: mileageEntries } = useMileageLog(`${year}-01-01`, `${year}-12-31`)
  const [expandedId, setExpandedId] = useState(null)

  const closedDeals = useMemo(() =>
    (transactions ?? []).filter(t => {
      const s = (t.status ?? '').toLowerCase()
      return s.includes('closed')
    }).sort((a, b) => (b.closing_date ?? '').localeCompare(a.closing_date ?? ''))
  , [transactions])

  // Per-deal: marketing spend + mileage cost (resolves expenses by transaction's listing/contact and mileage by transaction_id/contact_id)
  function computeDealCosts(deal) {
    const exps = allExpenses ?? []
    const miles = mileageEntries ?? []

    // Find the listing tied to this deal's property if any
    const listing = (allListings ?? []).find(l =>
      l.property_id === deal.property_id ||
      (l.contact_id === deal.contact_id && l.property_id === deal.property_id)
    )

    const matchingExpenses = exps.filter(e =>
      (listing && e.listing_id === listing.id) ||
      (deal.contact_id && e.contact_id === deal.contact_id)
    )
    const marketingSpend = matchingExpenses.reduce((s, e) => s + num(e.amount), 0)

    const matchingMileage = miles.filter(m =>
      m.transaction_id === deal.id ||
      (deal.contact_id && m.contact_id === deal.contact_id) ||
      (deal.property_id && m.property_id === deal.property_id)
    )
    const totalMiles = matchingMileage.reduce((s, m) => {
      const base = num(m.miles)
      return s + (m.round_trip ? base * 2 : base)
    }, 0)
    const mileageCost = totalMiles * IRS_RATE

    return { marketingSpend, totalMiles, mileageCost, expensesCount: matchingExpenses.length, mileageCount: matchingMileage.length }
  }

  const ytdStats = useMemo(() => {
    const ytd = closedDeals.filter(d => {
      if (!d.closing_date) return false
      return new Date(d.closing_date + 'T12:00:00').getFullYear() === year
    })
    const volume = ytd.reduce((s, d) => s + (Number(d.property?.price) || Number(d.offer_price) || 0), 0)
    const grossCommission = ytd.reduce((s, d) => s + num(d.actual_commission || d.expected_commission), 0)
    const totalFees = ytd.reduce((s, d) => s + num(d.broker_fee) + num(d.referral_fee) + num(d.tc_fee) + num(d.lead_source_fee), 0)
    const totalSpend = ytd.reduce((s, d) => s + computeDealCosts(d).marketingSpend, 0)
    const totalMileageCost = ytd.reduce((s, d) => s + computeDealCosts(d).mileageCost, 0)
    const net = grossCommission - totalFees - totalSpend - totalMileageCost
    return { count: ytd.length, volume, grossCommission, totalFees, totalSpend, totalMileageCost, net }
  }, [closedDeals, allExpenses, mileageEntries, allListings, year])

  // Lead source ROI rollup — groups closed deals by source so Dana can see
  // which channels actually pay out
  const sourceRollup = useMemo(() => {
    const ytd = closedDeals.filter(d => {
      if (!d.closing_date) return false
      return new Date(d.closing_date + 'T12:00:00').getFullYear() === year
    })
    const map = {}
    for (const deal of ytd) {
      const source = (deal.lead_source || 'Unknown').trim() || 'Unknown'
      if (!map[source]) map[source] = { source, count: 0, volume: 0, gross: 0, fees: 0, spend: 0, mileage: 0, net: 0 }
      const row = map[source]
      const costs = computeDealCosts(deal)
      const dealGross = num(deal.actual_commission || deal.expected_commission)
      const dealFees  = num(deal.broker_fee) + num(deal.referral_fee) + num(deal.tc_fee) + num(deal.lead_source_fee)
      row.count++
      row.volume  += Number(deal.property?.price) || Number(deal.offer_price) || 0
      row.gross   += dealGross
      row.fees    += dealFees
      row.spend   += costs.marketingSpend
      row.mileage += costs.mileageCost
      row.net     += dealGross - dealFees - costs.marketingSpend - costs.mileageCost
    }
    return Object.values(map).sort((a, b) => b.net - a.net)
  }, [closedDeals, allExpenses, mileageEntries, allListings, year])

  if (loading) return <div className="closed-loading">Loading closed deals...</div>

  return (
    <div className="closed">
      {/* YTD Summary */}
      <div className="closed__summary">
        <div className="closed__stat">
          <span className="closed__stat-num">{ytdStats.count}</span>
          <span className="closed__stat-label">Deals Closed YTD</span>
        </div>
        <div className="closed__stat">
          <span className="closed__stat-num">{fmtDollar(ytdStats.volume)}</span>
          <span className="closed__stat-label">Total Volume</span>
        </div>
        <div className="closed__stat">
          <span className="closed__stat-num">{fmtDollar(ytdStats.grossCommission)}</span>
          <span className="closed__stat-label">Gross Commission</span>
        </div>
        <div className="closed__stat">
          <span className="closed__stat-num closed__stat-num--deduct">{fmtDollar(ytdStats.totalFees)}</span>
          <span className="closed__stat-label">Total Fees</span>
        </div>
        <div className="closed__stat">
          <span className="closed__stat-num closed__stat-num--deduct">{fmtDollar(ytdStats.totalSpend + ytdStats.totalMileageCost)}</span>
          <span className="closed__stat-label">Marketing + Mileage</span>
        </div>
        <div className="closed__stat closed__stat--highlight">
          <span className="closed__stat-num">{fmtDollar(ytdStats.net)}</span>
          <span className="closed__stat-label">True Net</span>
        </div>
      </div>

      {/* Lead source ROI breakdown */}
      {sourceRollup.length > 0 && (
        <div style={{ marginTop: 16, marginBottom: 16, background: 'var(--white, #fff)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg, 12px)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border-light)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--brown-dark)', margin: 0 }}>
              Lead Source ROI · {year}
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Closed deals grouped by lead source. True net subtracts fees, marketing, and mileage.
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream-3, #F6F4EE)' }}>
                  <th style={{ textAlign: 'left',  padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Source</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Deals</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Volume</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Gross</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Costs</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>True Net</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Avg / Deal</th>
                </tr>
              </thead>
              <tbody>
                {sourceRollup.map(r => {
                  const costs = r.fees + r.spend + r.mileage
                  const avg = r.count > 0 ? r.net / r.count : 0
                  return (
                    <tr key={r.source} style={{ borderTop: '1px solid var(--color-border-light)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--brown-dark)' }}>{r.source}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{r.count}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{fmtDollar(r.volume)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{fmtDollar(r.gross)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--color-danger)' }}>({fmtDollar(costs)})</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: r.net > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{fmtDollar(r.net)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{fmtDollar(avg)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {closedDeals.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="No closed deals yet"
          description="Your closed deals will appear here. Keep pushing!"
        />
      ) : (
        <div className="closed__deals">
          {closedDeals.map(deal => {
            const gross = num(deal.actual_commission || deal.expected_commission)
            const broker = num(deal.broker_fee)
            const referral = num(deal.referral_fee)
            const tc = num(deal.tc_fee)
            const leadFee = num(deal.lead_source_fee)
            const costs = computeDealCosts(deal)
            const netAfterFees = gross - broker - referral - tc - leadFee
            const net = netAfterFees - costs.marketingSpend - costs.mileageCost
            const isExpanded = expandedId === deal.id

            return (
              <div key={deal.id} className="closed__deal">
                <button className="closed__deal-header" onClick={() => setExpandedId(isExpanded ? null : deal.id)}>
                  <div className="closed__deal-info">
                    <span className="closed__deal-name">{deal.contact?.name ?? '—'}</span>
                    <span className="closed__deal-addr">{deal.property?.address ?? '—'}, {deal.property?.city ?? ''}</span>
                  </div>
                  <div className="closed__deal-col">
                    <span className="closed__deal-price">{fmtDollar(deal.property?.price || deal.offer_price)}</span>
                    <Badge variant={deal.deal_type === 'buyer' ? 'info' : 'accent'} size="sm">{deal.deal_type ?? '—'}</Badge>
                  </div>
                  <div className="closed__deal-col">
                    <span className="closed__deal-date">{fmtDate(deal.closing_date)}</span>
                    {deal.lead_source && <span className="closed__deal-source">{deal.lead_source}</span>}
                  </div>
                  <div className="closed__deal-col closed__deal-col--commission">
                    <span className="closed__deal-net">{fmtDollar(net)}</span>
                    <span className="closed__deal-gross">of {fmtDollar(gross)} gross</span>
                  </div>
                  <svg className={`closed__chevron ${isExpanded ? 'closed__chevron--open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="closed__detail">
                    <div className="closed__detail-grid">
                      {/* Left column - deal info */}
                      <div className="closed__detail-col">
                        <div className="closed__detail-row"><span>Type</span><span>{deal.deal_type === 'buyer' ? 'Buyer Side' : deal.deal_type === 'seller' ? 'Seller Side' : 'Both Sides'}</span></div>
                        {deal.financing_type && <div className="closed__detail-row"><span>Financing</span><span>{deal.financing_type}</span></div>}
                        {deal.lender && <div className="closed__detail-row"><span>Lender</span><span>{deal.lender}</span></div>}
                        {deal.title_company && <div className="closed__detail-row"><span>Title Company</span><span>{deal.title_company}</span></div>}
                        {deal.lead_source && <div className="closed__detail-row"><span>Lead Source</span><span>{deal.lead_source}</span></div>}
                        {deal.contact?.phone && <div className="closed__detail-row"><span>Phone</span><a href={`tel:${deal.contact.phone}`}>{deal.contact.phone}</a></div>}
                        {deal.contact?.email && <div className="closed__detail-row"><span>Email</span><a href={`mailto:${deal.contact.email}`}>{deal.contact.email}</a></div>}
                      </div>

                      {/* Right column - commission breakdown */}
                      <div className="closed__detail-col">
                        <span className="closed__detail-section-title">Commission Breakdown</span>
                        <div className="closed__fee-row">
                          <span>Gross Commission</span>
                          <span className="closed__fee-val">{fmtDollar(gross)}</span>
                        </div>
                        {broker > 0 && (
                          <div className="closed__fee-row closed__fee-row--deduct">
                            <span>Broker Fee</span>
                            <span>({fmtDollar(broker)})</span>
                          </div>
                        )}
                        {referral > 0 && (
                          <div className="closed__fee-row closed__fee-row--deduct">
                            <span>Referral Fee{deal.referral_to ? ` → ${deal.referral_to}` : ''}</span>
                            <span>({fmtDollar(referral)})</span>
                          </div>
                        )}
                        {tc > 0 && (
                          <div className="closed__fee-row closed__fee-row--deduct">
                            <span>TC Fee</span>
                            <span>({fmtDollar(tc)})</span>
                          </div>
                        )}
                        {leadFee > 0 && (
                          <div className="closed__fee-row closed__fee-row--deduct">
                            <span>Lead Source Fee</span>
                            <span>({fmtDollar(leadFee)})</span>
                          </div>
                        )}
                        {costs.marketingSpend > 0 && (
                          <div className="closed__fee-row closed__fee-row--deduct">
                            <span>Marketing Spend ({costs.expensesCount} {costs.expensesCount === 1 ? 'expense' : 'expenses'})</span>
                            <span>({fmtDollar(costs.marketingSpend)})</span>
                          </div>
                        )}
                        {costs.mileageCost > 0 && (
                          <div className="closed__fee-row closed__fee-row--deduct">
                            <span>Mileage ({costs.totalMiles.toFixed(0)} mi @ {`$${IRS_RATE.toFixed(2)}/mi`})</span>
                            <span>({fmtDollar(costs.mileageCost)})</span>
                          </div>
                        )}
                        <div className="closed__fee-row closed__fee-row--total">
                          <span>True Net Profit</span>
                          <span>{fmtDollar(net)}</span>
                        </div>
                        {gross > 0 && (
                          <div className="closed__fee-row" style={{ borderTop: 'none', fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingTop: 4 }}>
                            <span>Profit margin</span>
                            <span>{((net / gross) * 100).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
