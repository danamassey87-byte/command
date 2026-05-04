import { useState, useMemo } from 'react'
import { SectionHeader, Card, TabBar, Badge } from '../../components/ui/index.jsx'
import { useContacts, useTransactions, useOpenHouses, useOHSignIns, useLeads, useAllIncomeEntries, useAllExpenses, useListingAppointments, useShowingSessions, usePriceAnalytics, useListings } from '../../lib/hooks.js'
import './PnL.css'

const fmt = (v) => v < 0
  ? `-$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v) => `${v.toFixed(1)}%`
const num = (v) => Number(v) || 0

// ─── LocalStorage cost data ──────────────────────────────────────────────────
const ITEMS_KEY = 'cost_tracker_items'
function loadCostItems() {
  try { return JSON.parse(localStorage.getItem(ITEMS_KEY)) || [] }
  catch { return [] }
}

// ─── Cap Settings ────────────────────────────────────────────────────────────
function loadCapSettings() {
  try { return JSON.parse(localStorage.getItem('brokerage_cap_settings')) || { splitPct: 15, capAmount: 12000 } }
  catch { return { splitPct: 15, capAmount: 12000 } }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Price point brackets ────────────────────────────────────────────────────
const PRICE_BRACKETS = [
  { label: 'Under $300K',     min: 0,       max: 300000 },
  { label: '$300K–$500K',     min: 300000,  max: 500000 },
  { label: '$500K–$750K',     min: 500000,  max: 750000 },
  { label: '$750K–$1M',       min: 750000,  max: 1000000 },
  { label: '$1M–$1.25M',      min: 1000000, max: 1250000 },
  { label: '$1.25M–$1.5M',    min: 1250000, max: 1500000 },
  { label: '$1.5M+',          min: 1500000, max: Infinity },
]

function bracketFor(price) {
  const p = num(price)
  return PRICE_BRACKETS.find(b => p >= b.min && p < b.max) ?? PRICE_BRACKETS[0]
}

export default function ROIAnalytics() {
  const [tab, setTab] = useState('profit')
  const [showAfterTax, setShowAfterTax] = useState(false)
  const TAX_RATE = 0.30

  const contacts     = useContacts()
  const transactions = useTransactions()
  const openHouses   = useOpenHouses()
  const ohSignInsHook = useOHSignIns()
  const leads        = useLeads()
  const income       = useAllIncomeEntries()
  const expenses     = useAllExpenses()
  const listingAppts = useListingAppointments()
  const showingSessions = useShowingSessions()

  const costItems  = useMemo(() => loadCostItems(), [])
  const capSettings = useMemo(() => loadCapSettings(), [])

  const allContacts = contacts.data ?? []
  const allDeals    = transactions.data ?? []
  const allOH       = openHouses.data ?? []
  const allOHSignIns = ohSignInsHook.data ?? []
  const allLeads    = leads.data ?? []
  const allIncome   = income.data ?? []
  const allAppts    = listingAppts.data ?? []

  const allSessions = showingSessions.data ?? []
  const priceAnalytics = usePriceAnalytics()
  const listingsHook   = useListings()
  const allPriceData = priceAnalytics.data ?? []
  const allListings  = listingsHook.data ?? []
  const loading = contacts.loading || transactions.loading || openHouses.loading || leads.loading || income.loading

  // ─── Price Reduction Analytics ──────────────────────────────────────────
  const priceReductionStats = useMemo(() => {
    if (!allPriceData.length) return null

    const withReductions = allPriceData.filter(l => l.reduction_count > 0)
    const closedListings = allPriceData.filter(l => l.status === 'closed')
    const closedWithReductions = closedListings.filter(l => l.reduction_count > 0)
    const closedWithSaleToList = closedListings.filter(l => l.sale_to_list_pct != null)

    // Distribution of reduction counts
    const reductionDistribution = {}
    allPriceData.forEach(l => {
      const key = l.reduction_count
      reductionDistribution[key] = (reductionDistribution[key] || 0) + 1
    })

    // Avg reduction stats
    const avgReductions = withReductions.length > 0
      ? (withReductions.reduce((s, l) => s + l.reduction_count, 0) / withReductions.length)
      : 0

    const avgTotalReductionPct = withReductions.length > 0
      ? (withReductions.reduce((s, l) => s + (l.total_reduction_pct || 0), 0) / withReductions.length)
      : 0

    const avgSaleToList = closedWithSaleToList.length > 0
      ? (closedWithSaleToList.reduce((s, l) => s + l.sale_to_list_pct, 0) / closedWithSaleToList.length)
      : 0

    const pctSoldAtListPrice = closedListings.length > 0
      ? ((closedListings.filter(l => l.reduction_count === 0).length / closedListings.length) * 100)
      : 0

    const avgDomNoReduction = closedListings.filter(l => l.reduction_count === 0 && l.dom != null).length > 0
      ? (closedListings.filter(l => l.reduction_count === 0 && l.dom != null).reduce((s, l) => s + l.dom, 0)
         / closedListings.filter(l => l.reduction_count === 0 && l.dom != null).length)
      : 0

    const avgDomWithReductions = closedWithReductions.filter(l => l.dom != null).length > 0
      ? (closedWithReductions.filter(l => l.dom != null).reduce((s, l) => s + l.dom, 0)
         / closedWithReductions.filter(l => l.dom != null).length)
      : 0

    const avgDaysBetweenReductions = withReductions.filter(l => l.avg_days_between_reductions != null).length > 0
      ? (withReductions.filter(l => l.avg_days_between_reductions != null)
          .reduce((s, l) => s + Number(l.avg_days_between_reductions), 0)
         / withReductions.filter(l => l.avg_days_between_reductions != null).length)
      : 0

    // Total dollars reduced across portfolio
    const totalDollarsReduced = withReductions.reduce((s, l) => s + (l.total_reduction_amount || 0), 0)

    // Per-listing detail rows for the table
    const listingRows = allPriceData
      .filter(l => l.reduction_count > 0 || l.status === 'closed')
      .sort((a, b) => (b.reduction_count || 0) - (a.reduction_count || 0))

    return {
      totalListings: allPriceData.length,
      withReductions: withReductions.length,
      closedCount: closedListings.length,
      closedWithReductions: closedWithReductions.length,
      avgReductions: avgReductions.toFixed(1),
      avgTotalReductionPct: avgTotalReductionPct.toFixed(1),
      avgSaleToList: avgSaleToList.toFixed(1),
      pctSoldAtListPrice: pctSoldAtListPrice.toFixed(0),
      avgDomNoReduction: Math.round(avgDomNoReduction),
      avgDomWithReductions: Math.round(avgDomWithReductions),
      avgDaysBetweenReductions: avgDaysBetweenReductions.toFixed(0),
      totalDollarsReduced,
      reductionDistribution,
      listingRows,
    }
  }, [allPriceData])

  // ─── Profit Per Client ──────────────────────────────────────────────────
  const clientProfits = useMemo(() => {
    const map = {} // contact_id → { name, type, deals, grossCommission, fees, costTrackerTotal, netProfit }

    // Build from transactions (deals)
    allDeals.forEach(deal => {
      const cid = deal.contact_id || deal.contact?.id
      if (!cid) return
      const name = deal.contact?.name || 'Unknown'
      const type = deal.deal_type || 'unknown'

      if (!map[cid]) map[cid] = {
        id: cid, name, type,
        deals: [],
        grossCommission: 0,
        brokerFee: 0,
        referralFee: 0,
        tcFee: 0,
        leadSourceFee: 0,
        costTrackerTotal: 0,
        saleVolume: 0,
        closingDate: null,
        leadSource: null,
        status: null,
      }

      const gross = num(deal.actual_commission || deal.expected_commission)
      map[cid].grossCommission += gross
      map[cid].brokerFee += num(deal.broker_fee)
      map[cid].referralFee += num(deal.referral_fee)
      map[cid].tcFee += num(deal.tc_fee)
      map[cid].leadSourceFee += num(deal.lead_source_fee)
      map[cid].saleVolume += num(deal.property?.price || deal.offer_price)
      map[cid].deals.push(deal)
      if (deal.closing_date) map[cid].closingDate = deal.closing_date
      if (deal.lead_source) map[cid].leadSource = deal.lead_source
      map[cid].status = deal.status
      if (!map[cid].type || map[cid].type === 'unknown') map[cid].type = type
    })

    // Add cost tracker items
    costItems.forEach(item => {
      // Match costs to contacts by entity_id
      if (item.entity_type === 'buyer' || item.entity_type === 'seller') {
        const cid = item.entity_id
        if (map[cid]) {
          map[cid].costTrackerTotal += num(item.amount) * num(item.quantity || 1)
        }
      }
      // Match listing/transaction costs to the contact on that deal
      if (item.entity_type === 'listing' || item.entity_type === 'transaction') {
        // Find deal with this entity_id
        const deal = allDeals.find(d => d.id === item.entity_id || d.listing_id === item.entity_id)
        if (deal) {
          const cid = deal.contact_id || deal.contact?.id
          if (cid && map[cid]) {
            map[cid].costTrackerTotal += num(item.amount) * num(item.quantity || 1)
          }
        }
      }
    })

    return Object.values(map)
      .map(c => {
        const totalFees = c.brokerFee + c.referralFee + c.tcFee + c.leadSourceFee
        const netProfit = c.grossCommission - totalFees - c.costTrackerTotal
        const isClosed = (c.status ?? '').toLowerCase().includes('closed')
        return { ...c, totalFees, netProfit, isClosed }
      })
      .sort((a, b) => b.netProfit - a.netProfit)
  }, [allDeals, costItems])

  const closedClients = clientProfits.filter(c => c.isClosed)
  const totalNetProfit = closedClients.reduce((s, c) => s + c.netProfit, 0)
  const totalVolume = closedClients.reduce((s, c) => s + c.saleVolume, 0)
  const avgProfitPerDeal = closedClients.length > 0 ? totalNetProfit / closedClients.length : 0

  // ─── Open House Analytics ───────────────────────────────────────────────
  const ohAnalytics = useMemo(() => {
    const totalOH = allOH.length
    // Count unique attendees from OH sign-ins that became contacts
    // Look at contacts whose lead_source mentions "open house"
    const ohLeadContacts = allContacts.filter(c =>
      (c.lead_source ?? '').toLowerCase().includes('open house') ||
      (c.lead_source ?? '').toLowerCase().includes('oh')
    )
    const ohClients = allDeals.filter(d =>
      (d.lead_source ?? '').toLowerCase().includes('open house') ||
      (d.lead_source ?? '').toLowerCase().includes('oh')
    )
    const ohClosed = ohClients.filter(d => (d.status ?? '').toLowerCase().includes('closed'))

    // OH costs from cost tracker
    const ohCosts = costItems
      .filter(i => i.entity_type === 'open_house')
      .reduce((s, i) => s + num(i.amount) * num(i.quantity || 1), 0)

    const ohCommission = ohClosed.reduce((s, d) => s + num(d.actual_commission || d.expected_commission), 0)

    // Average time from lead to close for OH leads
    const ohCloseTimes = ohClosed.map(d => {
      if (!d.created_at || !d.closing_date) return null
      const created = new Date(d.created_at)
      const closed = new Date(d.closing_date)
      return Math.round((closed - created) / (1000 * 60 * 60 * 24))
    }).filter(Boolean)
    const avgCloseTime = ohCloseTimes.length > 0
      ? Math.round(ohCloseTimes.reduce((s, d) => s + d, 0) / ohCloseTimes.length)
      : 0

    return {
      totalOH,
      totalLeads: ohLeadContacts.length,
      totalClients: ohClients.length,
      totalClosed: ohClosed.length,
      totalCosts: ohCosts,
      totalCommission: ohCommission,
      roi: ohCosts > 0 ? ((ohCommission - ohCosts) / ohCosts) * 100 : 0,
      costPerOH: totalOH > 0 ? ohCosts / totalOH : 0,
      costPerClient: ohClosed.length > 0 ? ohCosts / ohClosed.length : 0,
      conversionRate: totalOH > 0 ? (ohClosed.length / totalOH) * 100 : 0,
      leadToClientRate: ohLeadContacts.length > 0 ? (ohClients.length / ohLeadContacts.length) * 100 : 0,
      clientToCloseRate: ohClients.length > 0 ? (ohClosed.length / ohClients.length) * 100 : 0,
      avgCloseTimeDays: avgCloseTime,
      ohPerClient: ohClosed.length > 0 ? totalOH / ohClosed.length : 0,
    }
  }, [allOH, allContacts, allDeals, costItems])

  // ─── OH Kiosk Feedback Signals ──────────────────────────────────────────
  const ohFeedback = useMemo(() => {
    const total = allOHSignIns.length
    const withFeedback = allOHSignIns.filter(si =>
      si.would_offer || si.interest_level || si.price_perception || si.liked || si.concerns || si.comments
    )
    const tally = (key) => allOHSignIns.reduce((acc, si) => {
      const v = si[key]
      if (!v) return acc
      acc[v] = (acc[v] || 0) + 1
      return acc
    }, {})
    const wouldOffer = tally('would_offer')         // yes/maybe/no
    const pricePerception = tally('price_perception') // under/right/over (or similar)
    const interestLevel = tally('interest_level')   // hot/warm/cold (or similar)

    const yesCount = wouldOffer.yes || 0
    const offerSignalRate = total > 0 ? (yesCount / total) * 100 : 0
    const feedbackCaptureRate = total > 0 ? (withFeedback.length / total) * 100 : 0
    const signInsPerOH = allOH.length > 0 ? total / allOH.length : 0

    return {
      totalSignIns: total,
      withFeedback: withFeedback.length,
      feedbackCaptureRate,
      signInsPerOH,
      wouldOffer,
      pricePerception,
      interestLevel,
      offerSignalRate,
      yesCount,
    }
  }, [allOHSignIns, allOH])

  // ─── Lead Gen / Letter Analytics ────────────────────────────────────────
  const letterAnalytics = useMemo(() => {
    const totalLeads = allLeads.length
    const converted = allLeads.filter(l => (l.stage ?? '').toLowerCase() === 'converted')
    const dead = allLeads.filter(l => (l.stage ?? '').toLowerCase() === 'dead')
    const active = totalLeads - converted.length - dead.length

    // Letter costs from cost tracker
    const regularLetterCosts = costItems
      .filter(i => i.entity_type === 'lead_gen' && (i.service_id === 'letter_printing' || i.service_id === 'letter_postage'))
      .reduce((s, i) => s + num(i.amount) * num(i.quantity || 1), 0)

    const cannonballCosts = costItems
      .filter(i => i.entity_type === 'lead_gen' && (i.service_id === 'cb_printing' || i.service_id === 'cb_postage' || i.service_id === 'cb_envelope'))
      .reduce((s, i) => s + num(i.amount) * num(i.quantity || 1), 0)

    const totalLetterCosts = costItems
      .filter(i => i.entity_type === 'lead_gen')
      .reduce((s, i) => s + num(i.amount) * num(i.quantity || 1), 0)

    // Count letters (from lead stages)
    const lettersSent = allLeads.filter(l => l.letter_sent_at).length

    // Deals from expired/lead gen source
    const leadGenDeals = allDeals.filter(d =>
      (d.lead_source ?? '').toLowerCase().includes('letter') ||
      (d.lead_source ?? '').toLowerCase().includes('expired') ||
      (d.lead_source ?? '').toLowerCase().includes('cannonball') ||
      (d.lead_source ?? '').toLowerCase().includes('mail')
    )
    const leadGenClosed = leadGenDeals.filter(d => (d.status ?? '').toLowerCase().includes('closed'))
    const leadGenCommission = leadGenClosed.reduce((s, d) => s + num(d.actual_commission || d.expected_commission), 0)

    // Avg time to close
    const closeTimes = leadGenClosed.map(d => {
      if (!d.created_at || !d.closing_date) return null
      return Math.round((new Date(d.closing_date) - new Date(d.created_at)) / (1000 * 60 * 60 * 24))
    }).filter(Boolean)
    const avgCloseTime = closeTimes.length > 0
      ? Math.round(closeTimes.reduce((s, d) => s + d, 0) / closeTimes.length)
      : 0

    return {
      totalLeads,
      active,
      converted: converted.length,
      dead: dead.length,
      lettersSent,
      totalLetterCosts,
      regularLetterCosts,
      cannonballCosts,
      costPerLetter: lettersSent > 0 ? totalLetterCosts / lettersSent : 0,
      conversionRate: totalLeads > 0 ? (converted.length / totalLeads) * 100 : 0,
      closedDeals: leadGenClosed.length,
      totalCommission: leadGenCommission,
      roi: totalLetterCosts > 0 ? ((leadGenCommission - totalLetterCosts) / totalLetterCosts) * 100 : 0,
      costPerClient: leadGenClosed.length > 0 ? totalLetterCosts / leadGenClosed.length : 0,
      avgCloseTimeDays: avgCloseTime,
    }
  }, [allLeads, allDeals, costItems])

  // ─── Lead Source Comparison ─────────────────────────────────────────────
  const leadSourceBreakdown = useMemo(() => {
    const sources = {}
    allDeals.forEach(deal => {
      const src = deal.lead_source || 'Unknown'
      if (!sources[src]) sources[src] = { deals: 0, closed: 0, volume: 0, commission: 0, costs: 0 }
      sources[src].deals++
      if ((deal.status ?? '').toLowerCase().includes('closed')) {
        sources[src].closed++
        sources[src].volume += num(deal.property?.price || deal.offer_price)
        sources[src].commission += num(deal.actual_commission || deal.expected_commission)
          - num(deal.broker_fee) - num(deal.referral_fee) - num(deal.tc_fee) - num(deal.lead_source_fee)
      }
    })

    // Add costs from cost tracker by lead source (heuristic: entity_label matching)
    costItems.forEach(item => {
      const entityLabel = (item.entity_label ?? '').toLowerCase()
      Object.keys(sources).forEach(src => {
        if (entityLabel.includes(src.toLowerCase())) {
          sources[src].costs += num(item.amount) * num(item.quantity || 1)
        }
      })
    })

    return Object.entries(sources)
      .map(([source, data]) => ({
        source,
        ...data,
        netProfit: data.commission - data.costs,
        closeRate: data.deals > 0 ? (data.closed / data.deals) * 100 : 0,
        roi: data.costs > 0 ? ((data.commission - data.costs) / data.costs) * 100 : 0,
      }))
      .sort((a, b) => b.commission - a.commission)
  }, [allDeals, costItems])

  // ─── Listing Cost Analysis ──────────────────────────────────────────────
  const listingCosts = useMemo(() => {
    const items = costItems.filter(i => i.entity_type === 'listing')
    const total = items.reduce((s, i) => s + num(i.amount) * num(i.quantity || 1), 0)
    const entities = [...new Set(items.map(i => i.entity_id))]
    const avgPerListing = entities.length > 0 ? total / entities.length : 0
    return { total, count: entities.length, avgPerListing }
  }, [costItems])

  // ─── Listing Appts Won/Lost ───────────────────────────────────────────
  const apptAnalytics = useMemo(() => {
    const won = allAppts.filter(a => a.outcome === 'won')
    const lost = allAppts.filter(a => a.outcome === 'lost')
    const total = allAppts.filter(a => a.outcome === 'won' || a.outcome === 'lost').length
    const winRate = total > 0 ? (won.length / total) * 100 : 0
    const lostReasons = {}
    lost.forEach(a => {
      const reason = a.lost_reason?.trim() || 'No reason given'
      lostReasons[reason] = (lostReasons[reason] || 0) + 1
    })
    const lostReasonsSorted = Object.entries(lostReasons).sort((a, b) => b[1] - a[1])
    return { won: won.length, lost: lost.length, total: allAppts.length, winRate, lostReasonsSorted }
  }, [allAppts])

  // ─── Database Growth (contacts by source + type) ──────────────────────
  const dbGrowth = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const yearStr = String(now.getFullYear())

    const bySource = {}
    const byType = { buyer: 0, seller: 0, both: 0, other: 0 }
    const todayAdds = { total: 0, bySource: {} }
    const weekAdds = { total: 0, bySource: {} }
    const monthAdds = { total: 0, bySource: {} }
    const ytdAdds = { total: 0, bySource: {} }

    allContacts.forEach(c => {
      const src = c.source || c.lead_source || 'Unknown'
      const type = c.type || 'other'
      const created = (c.created_at ?? '').slice(0, 10)

      bySource[src] = (bySource[src] || 0) + 1
      if (byType[type] !== undefined) byType[type]++
      else byType.other++

      if (created >= todayStr) { todayAdds.total++; todayAdds.bySource[src] = (todayAdds.bySource[src] || 0) + 1 }
      if (created >= weekStartStr) { weekAdds.total++; weekAdds.bySource[src] = (weekAdds.bySource[src] || 0) + 1 }
      if (created >= monthStartStr) { monthAdds.total++; monthAdds.bySource[src] = (monthAdds.bySource[src] || 0) + 1 }
      if (created.startsWith(yearStr)) { ytdAdds.total++; ytdAdds.bySource[src] = (ytdAdds.bySource[src] || 0) + 1 }
    })

    // Also count expired leads as database additions
    allLeads.forEach(l => {
      const created = (l.created_at ?? '').slice(0, 10)
      const src = 'Expired Listing'
      if (created >= todayStr) { todayAdds.bySource[src] = (todayAdds.bySource[src] || 0) + 1; todayAdds.total++ }
      if (created >= weekStartStr) { weekAdds.bySource[src] = (weekAdds.bySource[src] || 0) + 1; weekAdds.total++ }
      if (created >= monthStartStr) { monthAdds.bySource[src] = (monthAdds.bySource[src] || 0) + 1; monthAdds.total++ }
      if (created.startsWith(yearStr)) { ytdAdds.bySource[src] = (ytdAdds.bySource[src] || 0) + 1; ytdAdds.total++ }
    })

    return { bySource, byType, todayAdds, weekAdds, monthAdds, ytdAdds, totalContacts: allContacts.length }
  }, [allContacts, allLeads])

  // ─── Take-Home % + Cost by Price Point ────────────────────────────────
  const takeHomeAnalytics = useMemo(() => {
    const closed = clientProfits.filter(c => c.isClosed && c.grossCommission > 0)
    const totalGross = closed.reduce((s, c) => s + c.grossCommission, 0)
    const totalCosts = closed.reduce((s, c) => s + c.totalFees + c.costTrackerTotal, 0)
    const totalNet = totalGross - totalCosts
    const takeHomePct = totalGross > 0 ? (totalNet / totalGross) * 100 : 0
    const afterTax = totalNet * (1 - TAX_RATE)
    const afterTaxPct = totalGross > 0 ? (afterTax / totalGross) * 100 : 0

    // Cost by price point
    const bracketData = {}
    PRICE_BRACKETS.forEach(b => {
      bracketData[b.label] = { deals: 0, totalCosts: 0, totalGross: 0, totalNet: 0, avgCost: 0 }
    })

    closed.forEach(c => {
      const bracket = bracketFor(c.saleVolume)
      const bd = bracketData[bracket.label]
      bd.deals++
      bd.totalCosts += c.totalFees + c.costTrackerTotal
      bd.totalGross += c.grossCommission
      bd.totalNet += c.netProfit
    })

    Object.values(bracketData).forEach(bd => {
      bd.avgCost = bd.deals > 0 ? bd.totalCosts / bd.deals : 0
      bd.avgNet = bd.deals > 0 ? bd.totalNet / bd.deals : 0
      bd.takeHomePct = bd.totalGross > 0 ? (bd.totalNet / bd.totalGross) * 100 : 0
    })

    const activeBrackets = Object.entries(bracketData).filter(([, d]) => d.deals > 0)

    return { totalGross, totalCosts, totalNet, takeHomePct, afterTax, afterTaxPct, activeBrackets }
  }, [clientProfits])

  // ─── Contact Lead Source Breakdown (Buyer + Seller) ─────────────────
  function buildSourceBreakdown(contactType, dealType) {
    const filtered = allContacts.filter(c =>
      contactType === 'buyer'
        ? (c.type === 'buyer' || c.type === 'both')
        : (c.type === 'seller' || c.type === 'both')
    )
    const map = {}
    filtered.forEach(c => {
      const src = c.source || c.lead_source || 'Unknown'
      if (!map[src]) map[src] = { total: 0, bba: 0, closed: 0, commission: 0 }
      map[src].total++
      if (c.bba_signed) map[src].bba++
    })
    allDeals.filter(d => (d.deal_type ?? '').toLowerCase() === dealType && (d.status ?? '').toLowerCase().includes('closed')).forEach(d => {
      const contact = allContacts.find(c => c.id === d.contact_id || c.id === d.contact?.id)
      if (contact) {
        const src = contact.source || contact.lead_source || 'Unknown'
        if (map[src]) {
          map[src].closed++
          map[src].commission += num(d.actual_commission || d.expected_commission)
        }
      }
    })
    return Object.entries(map)
      .map(([source, data]) => ({
        source, ...data,
        bbaRate: data.total > 0 ? (data.bba / data.total) * 100 : 0,
        closeRate: data.total > 0 ? (data.closed / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }

  const buyerBySource = useMemo(() => buildSourceBreakdown('buyer', 'buyer'), [allContacts, allDeals])
  const sellerBySource = useMemo(() => buildSourceBreakdown('seller', 'seller'), [allContacts, allDeals])

  // ─── Buyer Pipeline Analytics ─────────────────────────────────────────
  const buyerPipeline = useMemo(() => {
    const buyers = allContacts.filter(c => c.type === 'buyer' || c.type === 'both')
    const buyerDeals = allDeals.filter(d => (d.deal_type ?? '').toLowerCase() === 'buyer')
    const closedBuyerDeals = buyerDeals.filter(d => (d.status ?? '').toLowerCase().includes('closed'))
    const cancelledDeals = buyerDeals.filter(d =>
      (d.status ?? '').toLowerCase().includes('cancel') ||
      (d.status ?? '').toLowerCase().includes('fell') ||
      (d.status ?? '').toLowerCase().includes('withdrawn') ||
      (d.status ?? '').toLowerCase().includes('terminated')
    )
    const onHold = buyers.filter(c =>
      (c.stage ?? '').toLowerCase().includes('hold') ||
      (c.stage ?? '').toLowerCase().includes('inactive') ||
      (c.stage ?? '').toLowerCase().includes('pause')
    )

    // Showings per buyer
    const showingsByBuyer = {}
    allSessions.forEach(s => {
      const cid = s.contact_id || s.contact?.id
      if (cid) {
        showingsByBuyer[cid] = (showingsByBuyer[cid] || 0) + (s.showings?.length || 0)
      }
    })
    const totalHomesShown = Object.values(showingsByBuyer).reduce((s, v) => s + v, 0)
    const avgShowingsPerBuyer = buyers.length > 0 ? totalHomesShown / buyers.length : 0

    // Time to close (days from contact created → deal closed)
    const closeTimes = closedBuyerDeals.map(d => {
      const contact = allContacts.find(c => c.id === d.contact_id || c.id === d.contact?.id)
      if (!contact?.created_at || !d.closing_date) return null
      return Math.round((new Date(d.closing_date) - new Date(contact.created_at)) / (1000 * 60 * 60 * 24))
    }).filter(d => d != null && d > 0)
    const avgDaysToClose = closeTimes.length > 0 ? Math.round(closeTimes.reduce((s, d) => s + d, 0) / closeTimes.length) : 0

    // Per-buyer detail rows
    const buyerRows = buyers.map(c => {
      const deals = buyerDeals.filter(d => d.contact_id === c.id || d.contact?.id === c.id)
      const closed = deals.filter(d => (d.status ?? '').toLowerCase().includes('closed'))
      const fell = deals.filter(d =>
        (d.status ?? '').toLowerCase().includes('cancel') ||
        (d.status ?? '').toLowerCase().includes('fell') ||
        (d.status ?? '').toLowerCase().includes('withdrawn') ||
        (d.status ?? '').toLowerCase().includes('terminated')
      )
      const showings = showingsByBuyer[c.id] || 0
      const isOnHold = (c.stage ?? '').toLowerCase().includes('hold') ||
                       (c.stage ?? '').toLowerCase().includes('inactive') ||
                       (c.stage ?? '').toLowerCase().includes('pause')
      return {
        id: c.id, name: c.name, source: c.source || 'Unknown',
        stage: c.stage || '—', bba: c.bba_signed,
        showings, offers: deals.length, fellThrough: fell.length,
        closed: closed.length, isOnHold,
        daysActive: c.created_at ? Math.round((new Date() - new Date(c.created_at)) / (1000 * 60 * 60 * 24)) : 0,
      }
    }).sort((a, b) => b.showings - a.showings)

    return {
      totalBuyers: buyers.length,
      totalHomesShown,
      avgShowingsPerBuyer,
      totalOffers: buyerDeals.length,
      totalFellThrough: cancelledDeals.length,
      totalClosed: closedBuyerDeals.length,
      onHoldCount: onHold.length,
      avgDaysToClose,
      buyerRows,
    }
  }, [allContacts, allDeals, allSessions])

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <SectionHeader
        title="ROI Analytics"
        subtitle="Track your return on every dollar spent"
      />

      {/* ─── Top-Level KPIs ─── */}
      <div className="pnl-kpis">
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Take-Home %</p>
          <p className="pnl-kpi__value" style={{ color: 'var(--color-success)' }}>
            {showAfterTax ? fmtPct(takeHomeAnalytics.afterTaxPct) : fmtPct(takeHomeAnalytics.takeHomePct)}
          </p>
          <p className="pnl-kpi__sub">
            {showAfterTax ? fmt(takeHomeAnalytics.afterTax) : fmt(takeHomeAnalytics.totalNet)} of {fmt(takeHomeAnalytics.totalGross)}
          </p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Avg Profit / Deal</p>
          <p className="pnl-kpi__value">{fmt(showAfterTax ? avgProfitPerDeal * (1 - TAX_RATE) : avgProfitPerDeal)}</p>
          <p className="pnl-kpi__sub">after all fees & costs</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Listing Win Rate</p>
          <p className="pnl-kpi__value">{fmtPct(apptAnalytics.winRate)}</p>
          <p className="pnl-kpi__sub">{apptAnalytics.won} won / {apptAnalytics.lost} lost</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">DB Growth (This Week)</p>
          <p className="pnl-kpi__value">{dbGrowth.weekAdds.total}</p>
          <p className="pnl-kpi__sub">{dbGrowth.todayAdds.total} today · {dbGrowth.ytdAdds.total} YTD</p>
        </Card>
      </div>

      {/* Tax toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--brown-mid)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAfterTax} onChange={e => setShowAfterTax(e.target.checked)} style={{ accentColor: 'var(--brown-mid)' }} />
          Show after 30% tax
        </label>
      </div>

      <TabBar
        tabs={[
          { value: 'profit',    label: 'Profit Per Client' },
          { value: 'takehome',  label: 'Take-Home & Price Points' },
          { value: 'dbgrowth',  label: 'Database Growth' },
          { value: 'pipeline',  label: 'Buyer Pipeline' },
          { value: 'buyers',    label: 'Buyer & Seller Sources' },
          { value: 'appts',     label: 'Listing Appts' },
          { value: 'oh',        label: 'Open House ROI' },
          { value: 'letters',   label: 'Letter ROI' },
          { value: 'sources',   label: 'Lead Sources' },
          { value: 'pricing',   label: 'Price Reductions' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <Card><p style={{ padding: 40, textAlign: 'center', color: 'var(--brown-light)' }}>Loading analytics...</p></Card>
      ) : (
        <>
          {/* ═══ Profit Per Client ═══ */}
          {tab === 'profit' && (
            <>
              {clientProfits.length === 0 ? (
                <Card>
                  <div className="pnl-empty">
                    <div className="pnl-empty__icon">$</div>
                    <p className="pnl-empty__title">No deal data yet</p>
                    <p className="pnl-empty__sub">Once you have transactions in your pipeline, you'll see profit analysis per client here.</p>
                  </div>
                </Card>
              ) : (
                <Card padding={false}>
                  <table className="pnl-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Volume</th>
                        <th>Gross Comm.</th>
                        <th>Fees</th>
                        <th>Costs</th>
                        <th>Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientProfits.map(c => (
                        <tr key={c.id} style={{ cursor: 'default' }}>
                          <td>
                            <span className="pnl-table__vendor">{c.name}</span>
                            <br /><span style={{ fontSize: '0.72rem', color: 'var(--brown-light)' }}>
                              {c.type} {c.leadSource ? `· ${c.leadSource}` : ''}
                            </span>
                          </td>
                          <td>
                            <span className={`pnl-table__status pnl-table__status--${c.isClosed ? 'received' : 'pending'}`}>
                              {c.isClosed ? 'Closed' : c.status || 'Active'}
                            </span>
                          </td>
                          <td className="pnl-table__amount">{fmt(c.saleVolume)}</td>
                          <td className="pnl-table__amount" style={{ color: 'var(--color-success)' }}>{fmt(c.grossCommission)}</td>
                          <td className="pnl-table__amount" style={{ color: 'var(--color-danger)' }}>({fmt(c.totalFees)})</td>
                          <td className="pnl-table__amount" style={{ color: 'var(--color-danger)' }}>
                            {c.costTrackerTotal > 0 ? `(${fmt(c.costTrackerTotal)})` : '—'}
                          </td>
                          <td className="pnl-table__amount" style={{ fontWeight: 700, color: c.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {fmt(c.netProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 700 }}>
                        <td colSpan="2" style={{ textAlign: 'right' }}>Totals</td>
                        <td className="pnl-table__amount">{fmt(clientProfits.reduce((s, c) => s + c.saleVolume, 0))}</td>
                        <td className="pnl-table__amount" style={{ color: 'var(--color-success)' }}>{fmt(clientProfits.reduce((s, c) => s + c.grossCommission, 0))}</td>
                        <td className="pnl-table__amount" style={{ color: 'var(--color-danger)' }}>({fmt(clientProfits.reduce((s, c) => s + c.totalFees, 0))})</td>
                        <td className="pnl-table__amount" style={{ color: 'var(--color-danger)' }}>({fmt(clientProfits.reduce((s, c) => s + c.costTrackerTotal, 0))})</td>
                        <td className="pnl-table__amount" style={{ color: totalNetProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {fmt(clientProfits.reduce((s, c) => s + c.netProfit, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </Card>
              )}

              {/* Listing Cost Summary */}
              {listingCosts.count > 0 && (
                <Card className="cap-tracker" style={{ marginTop: 12 }}>
                  <h3 className="cap-tracker__title">Listing Marketing Costs</h3>
                  <div className="cap-tracker__stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
                    <div className="cap-tracker__stat">
                      <span className="cap-tracker__stat-value">{fmt(listingCosts.total)}</span>
                      <span className="cap-tracker__stat-label">Total Listing Costs</span>
                    </div>
                    <div className="cap-tracker__stat">
                      <span className="cap-tracker__stat-value">{listingCosts.count}</span>
                      <span className="cap-tracker__stat-label">Listings Tracked</span>
                    </div>
                    <div className="cap-tracker__stat">
                      <span className="cap-tracker__stat-value">{fmt(listingCosts.avgPerListing)}</span>
                      <span className="cap-tracker__stat-label">Avg Cost / Listing</span>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ═══ Open House ROI ═══ */}
          {tab === 'oh' && (
            <>
              <Card className="cap-tracker">
                <h3 className="cap-tracker__title">Open House Conversion Funnel</h3>
                <div className="roi-funnel">
                  <div className="roi-funnel__step">
                    <span className="roi-funnel__count">{ohAnalytics.totalOH}</span>
                    <span className="roi-funnel__label">Open Houses Held</span>
                  </div>
                  <div className="roi-funnel__arrow">→</div>
                  <div className="roi-funnel__step">
                    <span className="roi-funnel__count">{ohFeedback.totalSignIns}</span>
                    <span className="roi-funnel__label">Kiosk Sign-Ins</span>
                  </div>
                  <div className="roi-funnel__arrow">→</div>
                  <div className="roi-funnel__step">
                    <span className="roi-funnel__count">{ohAnalytics.totalLeads}</span>
                    <span className="roi-funnel__label">Leads Generated</span>
                  </div>
                  <div className="roi-funnel__arrow">→</div>
                  <div className="roi-funnel__step">
                    <span className="roi-funnel__count">{ohAnalytics.totalClients}</span>
                    <span className="roi-funnel__label">Became Clients</span>
                  </div>
                  <div className="roi-funnel__arrow">→</div>
                  <div className="roi-funnel__step roi-funnel__step--highlight">
                    <span className="roi-funnel__count">{ohAnalytics.totalClosed}</span>
                    <span className="roi-funnel__label">Closed Deals</span>
                  </div>
                </div>
              </Card>

              <div className="pnl-chart-row" style={{ marginTop: 12 }}>
                <Card padding>
                  <p className="pnl-bar-chart__title">Conversion Metrics</p>
                  <div className="roi-metric-list">
                    <div className="roi-metric">
                      <span className="roi-metric__label">OHs per Closed Client</span>
                      <span className="roi-metric__value">{ohAnalytics.ohPerClient > 0 ? ohAnalytics.ohPerClient.toFixed(1) : '—'}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Lead → Client Rate</span>
                      <span className="roi-metric__value">{fmtPct(ohAnalytics.leadToClientRate)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Client → Close Rate</span>
                      <span className="roi-metric__value">{fmtPct(ohAnalytics.clientToCloseRate)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Avg Days to Close</span>
                      <span className="roi-metric__value">{ohAnalytics.avgCloseTimeDays > 0 ? `${ohAnalytics.avgCloseTimeDays} days` : '—'}</span>
                    </div>
                  </div>
                </Card>

                <Card padding>
                  <p className="pnl-bar-chart__title">Financial Summary</p>
                  <div className="roi-metric-list">
                    <div className="roi-metric">
                      <span className="roi-metric__label">Total OH Costs</span>
                      <span className="roi-metric__value" style={{ color: 'var(--color-danger)' }}>{fmt(ohAnalytics.totalCosts)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Cost per Open House</span>
                      <span className="roi-metric__value">{fmt(ohAnalytics.costPerOH)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Cost per Closed Client</span>
                      <span className="roi-metric__value">{fmt(ohAnalytics.costPerClient)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Commission Earned</span>
                      <span className="roi-metric__value" style={{ color: 'var(--color-success)' }}>{fmt(ohAnalytics.totalCommission)}</span>
                    </div>
                    <div className="roi-metric roi-metric--highlight">
                      <span className="roi-metric__label">Return on Investment</span>
                      <span className="roi-metric__value" style={{ color: ohAnalytics.roi >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {ohAnalytics.totalCosts > 0 ? fmtPct(ohAnalytics.roi) : '—'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Buyer Feedback Signals from kiosk */}
              <Card padding style={{ marginTop: 12 }}>
                <p className="pnl-bar-chart__title">Buyer Feedback Signals (Kiosk)</p>
                {ohFeedback.totalSignIns === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '8px 0 0' }}>
                    No kiosk sign-ins yet. Once buyers sign in at an open house, their feedback signals will roll up here.
                  </p>
                ) : (
                  <>
                    <div className="roi-metric-list">
                      <div className="roi-metric">
                        <span className="roi-metric__label">Sign-Ins per Open House</span>
                        <span className="roi-metric__value">{ohFeedback.signInsPerOH.toFixed(1)}</span>
                      </div>
                      <div className="roi-metric">
                        <span className="roi-metric__label">Feedback Capture Rate</span>
                        <span className="roi-metric__value">{fmtPct(ohFeedback.feedbackCaptureRate)}</span>
                      </div>
                      <div className="roi-metric roi-metric--highlight">
                        <span className="roi-metric__label">"Would Offer: Yes" Rate</span>
                        <span className="roi-metric__value" style={{ color: ohFeedback.offerSignalRate >= 10 ? 'var(--color-success)' : 'var(--brown-dark)' }}>
                          {ohFeedback.yesCount} ({fmtPct(ohFeedback.offerSignalRate)})
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
                      <FeedbackBreakdown title="Would Offer" data={ohFeedback.wouldOffer} order={['yes','maybe','no']} />
                      <FeedbackBreakdown title="Price Perception" data={ohFeedback.pricePerception} />
                      <FeedbackBreakdown title="Interest Level" data={ohFeedback.interestLevel} />
                    </div>
                  </>
                )}
              </Card>
            </>
          )}

          {/* ═══ Letter / Mailing ROI ═══ */}
          {tab === 'letters' && (
            <>
              <div className="pnl-chart-row">
                <Card padding>
                  <p className="pnl-bar-chart__title">Lead Pipeline</p>
                  <div className="roi-metric-list">
                    <div className="roi-metric">
                      <span className="roi-metric__label">Total Leads</span>
                      <span className="roi-metric__value">{letterAnalytics.totalLeads}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Active</span>
                      <span className="roi-metric__value" style={{ color: 'var(--color-info)' }}>{letterAnalytics.active}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Converted</span>
                      <span className="roi-metric__value" style={{ color: 'var(--color-success)' }}>{letterAnalytics.converted}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Dead</span>
                      <span className="roi-metric__value" style={{ color: 'var(--brown-light)' }}>{letterAnalytics.dead}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Conversion Rate</span>
                      <span className="roi-metric__value">{fmtPct(letterAnalytics.conversionRate)}</span>
                    </div>
                  </div>
                </Card>

                <Card padding>
                  <p className="pnl-bar-chart__title">Mailing Costs</p>
                  <div className="roi-metric-list">
                    <div className="roi-metric">
                      <span className="roi-metric__label">Letters Sent</span>
                      <span className="roi-metric__value">{letterAnalytics.lettersSent}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Regular Letter Costs</span>
                      <span className="roi-metric__value">{fmt(letterAnalytics.regularLetterCosts)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Cannonball Costs</span>
                      <span className="roi-metric__value" style={{ color: '#b5703b' }}>{fmt(letterAnalytics.cannonballCosts)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Cost per Letter</span>
                      <span className="roi-metric__value">{fmt(letterAnalytics.costPerLetter)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Total Mailing Spend</span>
                      <span className="roi-metric__value" style={{ color: 'var(--color-danger)' }}>{fmt(letterAnalytics.totalLetterCosts)}</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="cap-tracker" style={{ marginTop: 12 }}>
                <h3 className="cap-tracker__title">Letter Campaign ROI</h3>
                <div className="cap-tracker__stats" style={{ marginBottom: 0 }}>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value">{letterAnalytics.closedDeals}</span>
                    <span className="cap-tracker__stat-label">Closed from Letters</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value" style={{ color: 'var(--color-success)' }}>{fmt(letterAnalytics.totalCommission)}</span>
                    <span className="cap-tracker__stat-label">Commission Earned</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value">{fmt(letterAnalytics.costPerClient)}</span>
                    <span className="cap-tracker__stat-label">Cost per Client</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value" style={{ color: letterAnalytics.roi >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {letterAnalytics.totalLetterCosts > 0 ? fmtPct(letterAnalytics.roi) : '—'}
                    </span>
                    <span className="cap-tracker__stat-label">ROI</span>
                  </div>
                </div>
                {letterAnalytics.avgCloseTimeDays > 0 && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--brown-mid)', marginTop: 12 }}>
                    Average {letterAnalytics.avgCloseTimeDays} days from lead to close
                  </p>
                )}
              </Card>

              {/* Regular vs Cannonball comparison */}
              {(letterAnalytics.regularLetterCosts > 0 || letterAnalytics.cannonballCosts > 0) && (
                <Card padding style={{ marginTop: 12 }}>
                  <p className="pnl-bar-chart__title">Regular vs Cannonball Comparison</p>
                  <div className="pnl-bars">
                    <div className="pnl-bar">
                      <span className="pnl-bar__label">Regular Letters</span>
                      <div className="pnl-bar__track">
                        <div className="pnl-bar__fill" style={{
                          width: `${letterAnalytics.totalLetterCosts > 0 ? (letterAnalytics.regularLetterCosts / letterAnalytics.totalLetterCosts) * 100 : 0}%`,
                          background: 'var(--brown-mid)',
                        }} />
                      </div>
                      <span className="pnl-bar__value">{fmt(letterAnalytics.regularLetterCosts)}</span>
                    </div>
                    <div className="pnl-bar">
                      <span className="pnl-bar__label">Cannonball</span>
                      <div className="pnl-bar__track">
                        <div className="pnl-bar__fill" style={{
                          width: `${letterAnalytics.totalLetterCosts > 0 ? (letterAnalytics.cannonballCosts / letterAnalytics.totalLetterCosts) * 100 : 0}%`,
                          background: '#b5703b',
                        }} />
                      </div>
                      <span className="pnl-bar__value">{fmt(letterAnalytics.cannonballCosts)}</span>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ═══ Lead Source Comparison ═══ */}
          {tab === 'sources' && (
            leadSourceBreakdown.length === 0 ? (
              <Card>
                <div className="pnl-empty">
                  <div className="pnl-empty__icon">📊</div>
                  <p className="pnl-empty__title">No lead source data yet</p>
                  <p className="pnl-empty__sub">Set lead sources on your transactions to compare which channels bring the best return.</p>
                </div>
              </Card>
            ) : (
              <Card padding={false}>
                <table className="pnl-table">
                  <thead>
                    <tr>
                      <th>Lead Source</th>
                      <th>Deals</th>
                      <th>Closed</th>
                      <th>Close Rate</th>
                      <th>Volume</th>
                      <th>Net Comm.</th>
                      <th>Costs</th>
                      <th>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadSourceBreakdown.map(s => (
                      <tr key={s.source} style={{ cursor: 'default' }}>
                        <td><span className="pnl-table__vendor">{s.source}</span></td>
                        <td>{s.deals}</td>
                        <td>{s.closed}</td>
                        <td>{fmtPct(s.closeRate)}</td>
                        <td className="pnl-table__amount">{fmt(s.volume)}</td>
                        <td className="pnl-table__amount" style={{ color: 'var(--color-success)' }}>{fmt(s.commission)}</td>
                        <td className="pnl-table__amount" style={{ color: s.costs > 0 ? 'var(--color-danger)' : 'var(--brown-light)' }}>
                          {s.costs > 0 ? fmt(s.costs) : '—'}
                        </td>
                        <td className="pnl-table__amount" style={{ fontWeight: 600, color: s.roi >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {s.costs > 0 ? fmtPct(s.roi) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          )}

          {/* ═══ Take-Home & Price Points ═══ */}
          {tab === 'takehome' && (
            <>
              <Card className="cap-tracker">
                <h3 className="cap-tracker__title">Average Take-Home After Costs</h3>
                <div className="cap-tracker__stats">
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value" style={{ color: 'var(--color-success)' }}>{fmt(takeHomeAnalytics.totalGross)}</span>
                    <span className="cap-tracker__stat-label">Gross Commission</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value" style={{ color: 'var(--color-danger)' }}>{fmt(takeHomeAnalytics.totalCosts)}</span>
                    <span className="cap-tracker__stat-label">Total Costs & Fees</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value">{fmtPct(takeHomeAnalytics.takeHomePct)}</span>
                    <span className="cap-tracker__stat-label">Take-Home %</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value" style={{ color: showAfterTax ? 'var(--color-warning)' : 'var(--brown-dark)' }}>
                      {showAfterTax ? fmtPct(takeHomeAnalytics.afterTaxPct) : fmtPct(takeHomeAnalytics.takeHomePct)}
                    </span>
                    <span className="cap-tracker__stat-label">{showAfterTax ? 'After 30% Tax' : 'Before Tax'}</span>
                  </div>
                </div>
                {showAfterTax && (
                  <div className="cap-tracker__savings" style={{ marginTop: 12 }}>
                    After 30% tax reserve: <strong>{fmt(takeHomeAnalytics.afterTax)}</strong> net take-home from {fmt(takeHomeAnalytics.totalGross)} gross
                  </div>
                )}
              </Card>

              <Card padding={false} style={{ marginTop: 12 }}>
                <div style={{ padding: '16px 16px 8px' }}>
                  <p className="pnl-bar-chart__title">Cost by Price Point</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--brown-mid)', margin: '-8px 0 12px' }}>
                    Are you spending more on higher-priced listings? Compare average costs and take-home across price brackets.
                  </p>
                </div>
                {takeHomeAnalytics.activeBrackets.length === 0 ? (
                  <div className="pnl-empty">
                    <p className="pnl-empty__title">No closed deals with price data yet</p>
                  </div>
                ) : (
                  <table className="pnl-table">
                    <thead>
                      <tr>
                        <th>Price Range</th>
                        <th>Deals</th>
                        <th>Avg Cost</th>
                        <th>Avg Net Profit</th>
                        <th>Take-Home %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {takeHomeAnalytics.activeBrackets.map(([label, data]) => (
                        <tr key={label} style={{ cursor: 'default' }}>
                          <td><span className="pnl-table__vendor">{label}</span></td>
                          <td>{data.deals}</td>
                          <td className="pnl-table__amount" style={{ color: 'var(--color-danger)' }}>{fmt(data.avgCost)}</td>
                          <td className="pnl-table__amount" style={{ color: 'var(--color-success)' }}>
                            {fmt(showAfterTax ? data.avgNet * (1 - TAX_RATE) : data.avgNet)}
                          </td>
                          <td className="pnl-table__amount" style={{ fontWeight: 600 }}>
                            {fmtPct(showAfterTax ? data.takeHomePct * (1 - TAX_RATE) : data.takeHomePct)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </>
          )}

          {/* ═══ Database Growth ═══ */}
          {tab === 'dbgrowth' && (
            <>
              <div className="pnl-kpis" style={{ marginBottom: 12 }}>
                <Card className="pnl-kpi">
                  <p className="pnl-kpi__label">Today</p>
                  <p className="pnl-kpi__value">{dbGrowth.todayAdds.total}</p>
                  <p className="pnl-kpi__sub">contacts added</p>
                </Card>
                <Card className="pnl-kpi">
                  <p className="pnl-kpi__label">This Week</p>
                  <p className="pnl-kpi__value">{dbGrowth.weekAdds.total}</p>
                  <p className="pnl-kpi__sub">contacts added</p>
                </Card>
                <Card className="pnl-kpi">
                  <p className="pnl-kpi__label">This Month</p>
                  <p className="pnl-kpi__value">{dbGrowth.monthAdds.total}</p>
                  <p className="pnl-kpi__sub">contacts added</p>
                </Card>
                <Card className="pnl-kpi">
                  <p className="pnl-kpi__label">Total Database</p>
                  <p className="pnl-kpi__value">{dbGrowth.totalContacts}</p>
                  <p className="pnl-kpi__sub">{dbGrowth.byType.buyer} buyers · {dbGrowth.byType.seller} sellers</p>
                </Card>
              </div>

              <div className="pnl-chart-row">
                <Card padding>
                  <p className="pnl-bar-chart__title">This Week — Adds by Source</p>
                  {Object.keys(dbGrowth.weekAdds.bySource).length === 0 ? (
                    <p style={{ color: 'var(--brown-light)', fontSize: '0.8rem', padding: 20, textAlign: 'center' }}>No additions this week yet</p>
                  ) : (
                    <div className="pnl-bars">
                      {Object.entries(dbGrowth.weekAdds.bySource).sort((a, b) => b[1] - a[1]).map(([src, count]) => {
                        const max = Math.max(...Object.values(dbGrowth.weekAdds.bySource), 1)
                        return (
                          <div key={src} className="pnl-bar">
                            <span className="pnl-bar__label">{src}</span>
                            <div className="pnl-bar__track">
                              <div className="pnl-bar__fill" style={{ width: `${(count / max) * 100}%`, background: 'var(--brown-mid)' }} />
                            </div>
                            <span className="pnl-bar__value">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>

                <Card padding>
                  <p className="pnl-bar-chart__title">YTD — Adds by Source</p>
                  {Object.keys(dbGrowth.ytdAdds.bySource).length === 0 ? (
                    <p style={{ color: 'var(--brown-light)', fontSize: '0.8rem', padding: 20, textAlign: 'center' }}>No additions yet</p>
                  ) : (
                    <div className="pnl-bars">
                      {Object.entries(dbGrowth.ytdAdds.bySource).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([src, count]) => {
                        const max = Math.max(...Object.values(dbGrowth.ytdAdds.bySource), 1)
                        return (
                          <div key={src} className="pnl-bar">
                            <span className="pnl-bar__label">{src}</span>
                            <div className="pnl-bar__track">
                              <div className="pnl-bar__fill" style={{ width: `${(count / max) * 100}%`, background: 'var(--brown-mid)' }} />
                            </div>
                            <span className="pnl-bar__value">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* By type breakdown */}
              <Card padding style={{ marginTop: 12 }}>
                <p className="pnl-bar-chart__title">Database by Type</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, textAlign: 'center', padding: '12px 0' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--brown-mid)', margin: '0 0 2px' }}>{dbGrowth.byType.buyer}</p>
                    <p style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown-mid)', margin: 0 }}>Buyers</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: '#b79782', margin: '0 0 2px' }}>{dbGrowth.byType.seller}</p>
                    <p style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown-mid)', margin: 0 }}>Sellers</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: '#6a9e72', margin: '0 0 2px' }}>{dbGrowth.byType.both}</p>
                    <p style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown-mid)', margin: 0 }}>Both</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--brown-light)', margin: '0 0 2px' }}>{dbGrowth.byType.other}</p>
                    <p style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown-mid)', margin: 0 }}>Other</p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ═══ Buyer Pipeline ═══ */}
          {tab === 'pipeline' && (
            <>
              <Card className="cap-tracker">
                <h3 className="cap-tracker__title">Buyer Pipeline Overview</h3>
                <p className="cap-tracker__subtitle" style={{ display: 'block', marginBottom: 16 }}>
                  <Badge variant="info" size="sm">AUTO</Badge> Auto-populated from showings, transactions, and contacts
                </p>
                <div className="roi-funnel">
                  <div className="roi-funnel__step">
                    <span className="roi-funnel__count">{buyerPipeline.totalBuyers}</span>
                    <span className="roi-funnel__label">Total Buyers</span>
                  </div>
                  <div className="roi-funnel__arrow">→</div>
                  <div className="roi-funnel__step">
                    <span className="roi-funnel__count">{buyerPipeline.totalHomesShown}</span>
                    <span className="roi-funnel__label">Homes Shown</span>
                  </div>
                  <div className="roi-funnel__arrow">→</div>
                  <div className="roi-funnel__step">
                    <span className="roi-funnel__count">{buyerPipeline.totalOffers}</span>
                    <span className="roi-funnel__label">Offers Made</span>
                  </div>
                  <div className="roi-funnel__arrow">→</div>
                  <div className="roi-funnel__step roi-funnel__step--highlight">
                    <span className="roi-funnel__count">{buyerPipeline.totalClosed}</span>
                    <span className="roi-funnel__label">Closed</span>
                  </div>
                </div>
              </Card>

              <div className="pnl-chart-row" style={{ marginTop: 12 }}>
                <Card padding>
                  <p className="pnl-bar-chart__title">Key Metrics</p>
                  <div className="roi-metric-list">
                    <div className="roi-metric">
                      <span className="roi-metric__label">Avg Showings per Buyer</span>
                      <span className="roi-metric__value">{buyerPipeline.avgShowingsPerBuyer.toFixed(1)}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Offers Fell Through</span>
                      <span className="roi-metric__value" style={{ color: buyerPipeline.totalFellThrough > 0 ? 'var(--color-danger)' : 'var(--brown-dark)' }}>
                        {buyerPipeline.totalFellThrough}
                      </span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Avg Days to Close</span>
                      <span className="roi-metric__value">{buyerPipeline.avgDaysToClose > 0 ? `${buyerPipeline.avgDaysToClose} days` : '—'}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">On Hold / Paused</span>
                      <span className="roi-metric__value" style={{ color: buyerPipeline.onHoldCount > 0 ? 'var(--color-warning)' : 'var(--brown-light)' }}>
                        {buyerPipeline.onHoldCount}
                      </span>
                    </div>
                    <div className="roi-metric roi-metric--highlight">
                      <span className="roi-metric__label">Close Rate (Offer → Close)</span>
                      <span className="roi-metric__value">
                        {buyerPipeline.totalOffers > 0
                          ? fmtPct((buyerPipeline.totalClosed / buyerPipeline.totalOffers) * 100)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card padding>
                  <p className="pnl-bar-chart__title">Fallout Analysis</p>
                  <div className="roi-metric-list">
                    <div className="roi-metric">
                      <span className="roi-metric__label">Buyer → Showing Rate</span>
                      <span className="roi-metric__value">
                        {buyerPipeline.totalBuyers > 0
                          ? fmtPct((buyerPipeline.buyerRows.filter(b => b.showings > 0).length / buyerPipeline.totalBuyers) * 100)
                          : '—'}
                      </span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Showing → Offer Rate</span>
                      <span className="roi-metric__value">
                        {buyerPipeline.buyerRows.filter(b => b.showings > 0).length > 0
                          ? fmtPct((buyerPipeline.buyerRows.filter(b => b.offers > 0).length / buyerPipeline.buyerRows.filter(b => b.showings > 0).length) * 100)
                          : '—'}
                      </span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Never Shown (no showings)</span>
                      <span className="roi-metric__value">{buyerPipeline.buyerRows.filter(b => b.showings === 0).length}</span>
                    </div>
                    <div className="roi-metric">
                      <span className="roi-metric__label">Didn't Close (inactive/hold)</span>
                      <span className="roi-metric__value">{buyerPipeline.onHoldCount}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Per-buyer table */}
              <Card padding={false} style={{ marginTop: 12 }}>
                <table className="pnl-table">
                  <thead>
                    <tr>
                      <th>Buyer</th>
                      <th>Source</th>
                      <th>Showings</th>
                      <th>Offers</th>
                      <th>Fell Through</th>
                      <th>Closed</th>
                      <th>Days Active</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyerPipeline.buyerRows.slice(0, 30).map(b => (
                      <tr key={b.id} style={{ cursor: 'default' }}>
                        <td>
                          <span className="pnl-table__vendor">{b.name}</span>
                          {b.bba && <span className="pnl-table__split-badge" style={{ background: 'var(--color-success)' }}>BBA</span>}
                        </td>
                        <td><span className="pnl-table__cat">{b.source}</span></td>
                        <td>{b.showings || '—'}</td>
                        <td>{b.offers || '—'}</td>
                        <td style={{ color: b.fellThrough > 0 ? 'var(--color-danger)' : 'var(--brown-light)' }}>
                          {b.fellThrough || '—'}
                        </td>
                        <td style={{ color: b.closed > 0 ? 'var(--color-success)' : 'var(--brown-light)', fontWeight: b.closed > 0 ? 600 : 400 }}>
                          {b.closed || '—'}
                        </td>
                        <td>{b.daysActive}d</td>
                        <td>
                          {b.isOnHold ? (
                            <span className="pnl-table__status pnl-table__status--pending">On Hold</span>
                          ) : b.closed > 0 ? (
                            <span className="pnl-table__status pnl-table__status--received">Closed</span>
                          ) : (
                            <span className="pnl-table__status pnl-table__status--deposited">{b.stage}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {/* ═══ Buyer & Seller Lead Sources ═══ */}
          {tab === 'buyers' && (
            <>
              {/* Buyer Sources */}
              <Card padding={false} style={{ marginBottom: 12 }}>
                <div style={{ padding: '14px 16px 0' }}>
                  <p className="pnl-bar-chart__title">Buyer Lead Sources</p>
                </div>
                {buyerBySource.length === 0 ? (
                  <div className="pnl-empty">
                    <p className="pnl-empty__sub">Add buyers with a source to see performance by channel.</p>
                  </div>
                ) : (
                  <table className="pnl-table">
                    <thead>
                      <tr>
                        <th>Lead Source</th>
                        <th>Total</th>
                        <th>BBA Signed</th>
                        <th>BBA Rate</th>
                        <th>Closed</th>
                        <th>Close Rate</th>
                        <th>Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyerBySource.map(s => (
                        <tr key={s.source} style={{ cursor: 'default' }}>
                          <td><span className="pnl-table__vendor">{s.source}</span></td>
                          <td>{s.total}</td>
                          <td>{s.bba}</td>
                          <td>{fmtPct(s.bbaRate)}</td>
                          <td style={{ fontWeight: s.closed > 0 ? 600 : 400 }}>{s.closed}</td>
                          <td>{fmtPct(s.closeRate)}</td>
                          <td className="pnl-table__amount" style={{ color: s.commission > 0 ? 'var(--color-success)' : 'var(--brown-light)' }}>
                            {s.commission > 0 ? fmt(s.commission) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 700 }}>
                        <td>Totals</td>
                        <td>{buyerBySource.reduce((s, b) => s + b.total, 0)}</td>
                        <td>{buyerBySource.reduce((s, b) => s + b.bba, 0)}</td>
                        <td></td>
                        <td>{buyerBySource.reduce((s, b) => s + b.closed, 0)}</td>
                        <td></td>
                        <td className="pnl-table__amount" style={{ color: 'var(--color-success)' }}>
                          {fmt(buyerBySource.reduce((s, b) => s + b.commission, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </Card>

              {/* Seller Sources */}
              <Card padding={false}>
                <div style={{ padding: '14px 16px 0' }}>
                  <p className="pnl-bar-chart__title">Seller Lead Sources</p>
                </div>
                {sellerBySource.length === 0 ? (
                  <div className="pnl-empty">
                    <p className="pnl-empty__sub">Add sellers with a source to see performance by channel.</p>
                  </div>
                ) : (
                  <table className="pnl-table">
                    <thead>
                      <tr>
                        <th>Lead Source</th>
                        <th>Total</th>
                        <th>Listing Taken</th>
                        <th>Take Rate</th>
                        <th>Closed</th>
                        <th>Close Rate</th>
                        <th>Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerBySource.map(s => (
                        <tr key={s.source} style={{ cursor: 'default' }}>
                          <td><span className="pnl-table__vendor">{s.source}</span></td>
                          <td>{s.total}</td>
                          <td>{s.bba}</td>
                          <td>{fmtPct(s.bbaRate)}</td>
                          <td style={{ fontWeight: s.closed > 0 ? 600 : 400 }}>{s.closed}</td>
                          <td>{fmtPct(s.closeRate)}</td>
                          <td className="pnl-table__amount" style={{ color: s.commission > 0 ? 'var(--color-success)' : 'var(--brown-light)' }}>
                            {s.commission > 0 ? fmt(s.commission) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 700 }}>
                        <td>Totals</td>
                        <td>{sellerBySource.reduce((s, b) => s + b.total, 0)}</td>
                        <td>{sellerBySource.reduce((s, b) => s + b.bba, 0)}</td>
                        <td></td>
                        <td>{sellerBySource.reduce((s, b) => s + b.closed, 0)}</td>
                        <td></td>
                        <td className="pnl-table__amount" style={{ color: 'var(--color-success)' }}>
                          {fmt(sellerBySource.reduce((s, b) => s + b.commission, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </Card>
            </>
          )}

          {/* ═══ Listing Appointments Won/Lost ═══ */}
          {tab === 'appts' && (
            <>
              <Card className="cap-tracker">
                <h3 className="cap-tracker__title">Listing Appointment Performance</h3>
                <p className="cap-tracker__subtitle" style={{ marginBottom: 16, display: 'block' }}>
                  <Badge variant="info" size="sm">AUTO</Badge> Auto-populated from your Listing Appointments page
                </p>
                <div className="cap-tracker__stats">
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value">{apptAnalytics.total}</span>
                    <span className="cap-tracker__stat-label">Total Appts</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value" style={{ color: 'var(--color-success)' }}>{apptAnalytics.won}</span>
                    <span className="cap-tracker__stat-label">Won</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value" style={{ color: 'var(--color-danger)' }}>{apptAnalytics.lost}</span>
                    <span className="cap-tracker__stat-label">Lost</span>
                  </div>
                  <div className="cap-tracker__stat">
                    <span className="cap-tracker__stat-value" style={{ color: apptAnalytics.winRate >= 50 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {fmtPct(apptAnalytics.winRate)}
                    </span>
                    <span className="cap-tracker__stat-label">Win Rate</span>
                  </div>
                </div>
              </Card>

              {apptAnalytics.lostReasonsSorted.length > 0 && (
                <Card padding style={{ marginTop: 12 }}>
                  <p className="pnl-bar-chart__title">Lost Reasons</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--brown-mid)', margin: '-8px 0 12px' }}>
                    Why you didn't win the listing. Use this to improve your pitch.
                  </p>
                  <div className="pnl-bars">
                    {apptAnalytics.lostReasonsSorted.map(([reason, count]) => {
                      const max = apptAnalytics.lostReasonsSorted[0]?.[1] || 1
                      return (
                        <div key={reason} className="pnl-bar">
                          <span className="pnl-bar__label" style={{ minWidth: 160 }}>{reason}</span>
                          <div className="pnl-bar__track">
                            <div className="pnl-bar__fill pnl-bar__fill--expense" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="pnl-bar__value">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ═══ Price Reductions ═══ */}
          {tab === 'pricing' && (
            !priceReductionStats ? (
              <Card>
                <div className="pnl-empty">
                  <div className="pnl-empty__icon">📉</div>
                  <p className="pnl-empty__title">No price history data yet</p>
                  <p className="pnl-empty__sub">Price reductions will be tracked automatically when you update listing prices. Run the migration_price_history.sql migration to enable this feature.</p>
                </div>
              </Card>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="pnl-kpis" style={{ marginBottom: 12 }}>
                  <Card className="pnl-kpi">
                    <p className="pnl-kpi__label">Listings with Reductions</p>
                    <p className="pnl-kpi__value">{priceReductionStats.withReductions}</p>
                    <p className="pnl-kpi__sub">of {priceReductionStats.totalListings} total</p>
                  </Card>
                  <Card className="pnl-kpi">
                    <p className="pnl-kpi__label">Avg Reductions Before Sale</p>
                    <p className="pnl-kpi__value">{priceReductionStats.avgReductions}</p>
                    <p className="pnl-kpi__sub">price changes per listing</p>
                  </Card>
                  <Card className="pnl-kpi">
                    <p className="pnl-kpi__label">Avg Sale-to-List Ratio</p>
                    <p className="pnl-kpi__value">{priceReductionStats.avgSaleToList}%</p>
                    <p className="pnl-kpi__sub">of original list price</p>
                  </Card>
                  <Card className="pnl-kpi">
                    <p className="pnl-kpi__label">Sold at List Price</p>
                    <p className="pnl-kpi__value">{priceReductionStats.pctSoldAtListPrice}%</p>
                    <p className="pnl-kpi__sub">no reductions needed</p>
                  </Card>
                </div>

                <div className="pnl-kpis" style={{ marginBottom: 12 }}>
                  <Card className="pnl-kpi">
                    <p className="pnl-kpi__label">Avg Reduction (Total)</p>
                    <p className="pnl-kpi__value">{priceReductionStats.avgTotalReductionPct}%</p>
                    <p className="pnl-kpi__sub">from original list price</p>
                  </Card>
                  <Card className="pnl-kpi">
                    <p className="pnl-kpi__label">Total $ Reduced (Portfolio)</p>
                    <p className="pnl-kpi__value">{fmt(priceReductionStats.totalDollarsReduced)}</p>
                    <p className="pnl-kpi__sub">across all listings</p>
                  </Card>
                  <Card className="pnl-kpi">
                    <p className="pnl-kpi__label">Avg DOM (No Reduction)</p>
                    <p className="pnl-kpi__value">{priceReductionStats.avgDomNoReduction}d</p>
                    <p className="pnl-kpi__sub">sold at original price</p>
                  </Card>
                  <Card className="pnl-kpi">
                    <p className="pnl-kpi__label">Avg DOM (With Reductions)</p>
                    <p className="pnl-kpi__value">{priceReductionStats.avgDomWithReductions}d</p>
                    <p className="pnl-kpi__sub">needed price adjustments</p>
                  </Card>
                </div>

                {priceReductionStats.avgDaysBetweenReductions > 0 && (
                  <Card style={{ marginBottom: 12, padding: 16 }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--brown-dark)' }}>
                      Average <strong>{priceReductionStats.avgDaysBetweenReductions} days</strong> between price reductions.
                      {Number(priceReductionStats.avgDomWithReductions) > Number(priceReductionStats.avgDomNoReduction) * 1.5 &&
                        ' Listings with reductions take significantly longer to sell.'}
                    </p>
                  </Card>
                )}

                {/* Distribution bar chart */}
                <Card padding style={{ marginBottom: 12 }}>
                  <p className="pnl-bar-chart__title">Reduction Count Distribution</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--brown-mid)', margin: '-8px 0 12px' }}>
                    How many price reductions do your listings typically need?
                  </p>
                  <div className="pnl-bars">
                    {Object.entries(priceReductionStats.reductionDistribution)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([count, listings]) => {
                        const max = Math.max(...Object.values(priceReductionStats.reductionDistribution), 1)
                        return (
                          <div key={count} className="pnl-bar">
                            <span className="pnl-bar__label">{count === '0' ? 'No reductions' : `${count} reduction${count !== '1' ? 's' : ''}`}</span>
                            <div className="pnl-bar__track">
                              <div
                                className="pnl-bar__fill"
                                style={{
                                  width: `${(listings / max) * 100}%`,
                                  background: count === '0' ? '#6a9e72' : count === '1' ? '#c99a2e' : '#c25040',
                                }}
                              />
                            </div>
                            <span className="pnl-bar__value">{listings}</span>
                          </div>
                        )
                      })}
                  </div>
                </Card>

                {/* Per-listing detail table */}
                {priceReductionStats.listingRows.length > 0 && (
                  <Card padding={false}>
                    <div style={{ padding: '16px 16px 8px' }}>
                      <p className="pnl-bar-chart__title">Listing Price History Detail</p>
                    </div>
                    <table className="pnl-table">
                      <thead>
                        <tr>
                          <th>Property</th>
                          <th>Status</th>
                          <th>Original Price</th>
                          <th>Current Price</th>
                          <th>Reductions</th>
                          <th>Total Drop</th>
                          <th>Sale-to-List</th>
                          <th>DOM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceReductionStats.listingRows.map(row => (
                          <tr key={row.listing_id} style={{ cursor: 'default' }}>
                            <td>
                              <span className="pnl-table__vendor">{row.address || '—'}</span>
                              {row.city && <span style={{ fontSize: '0.68rem', color: 'var(--brown-light)', display: 'block' }}>{row.city}</span>}
                            </td>
                            <td>
                              <Badge
                                variant={row.status === 'closed' ? 'default' : row.status === 'active' ? 'success' : 'info'}
                                size="sm"
                              >{row.status || '—'}</Badge>
                            </td>
                            <td className="pnl-table__amount">{row.original_list_price ? fmt(num(row.original_list_price)) : '—'}</td>
                            <td className="pnl-table__amount" style={{ color: row.reduction_count > 0 ? '#c25040' : 'inherit' }}>
                              {row.current_price ? fmt(num(row.current_price)) : '—'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {row.reduction_count > 0 ? (
                                <Badge variant="warning" size="sm">{row.reduction_count}</Badge>
                              ) : '—'}
                            </td>
                            <td className="pnl-table__amount" style={{ color: '#c25040' }}>
                              {row.total_reduction_pct > 0 ? `-${row.total_reduction_pct}%` : '—'}
                            </td>
                            <td className="pnl-table__amount" style={{ fontWeight: 600 }}>
                              {row.sale_to_list_pct ? `${row.sale_to_list_pct}%` : '—'}
                            </td>
                            <td>{row.dom != null ? `${row.dom}d` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}
              </>
            )
          )}
        </>
      )}
    </>
  )
}

// ─── Feedback Breakdown Bar List ────────────────────────────────────────────
function FeedbackBreakdown({ title, data, order }) {
  const entries = Object.entries(data || {})
  if (entries.length === 0) {
    return (
      <div style={{ background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 10 }}>
        <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-muted)', margin: '0 0 6px' }}>{title}</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>—</p>
      </div>
    )
  }
  const total = entries.reduce((s, [, n]) => s + n, 0)
  const sorted = order
    ? [...entries].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    : [...entries].sort((a, b) => b[1] - a[1])
  return (
    <div style={{ background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 10 }}>
      <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.map(([key, n]) => {
          const pct = total > 0 ? Math.round((n / total) * 100) : 0
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem' }}>
              <span style={{ flex: 1, textTransform: 'capitalize', color: 'var(--brown-dark)' }}>{key.replace(/_/g, ' ')}</span>
              <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{n} ({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
