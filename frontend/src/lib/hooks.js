import { useState, useEffect, useCallback } from 'react'
import * as DB from './supabase.js'

// ─── Generic hook ─────────────────────────────────────────────────────────────
function useQuery(fetcher, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}

// ─── Table hooks ─────────────────────────────────────────────────────────────
export const useContacts      = () => useQuery(DB.getContacts)
export const useBuyers        = () => useQuery(DB.getBuyers)
export const useSellers       = () => useQuery(DB.getSellers)
export const useProperties    = () => useQuery(DB.getProperties)
export const useListings      = () => useQuery(DB.getListings)
export const useTransactions  = () => useQuery(DB.getTransactions)
export const useShowingSessions = () => useQuery(DB.getShowingSessions)
export const useOpenHouses    = () => useQuery(DB.getOpenHouses)
export const useLeads         = () => useQuery(DB.getLeads)
export const useProspects     = (source) => useQuery(() => DB.getProspects(source), [source])
export const useInvestors     = () => useQuery(DB.getInvestors)
export const useWeeklyStats   = () => useQuery(DB.getWeeklyStats)
export const useGoals         = () => useQuery(DB.getGoals)
export const useActivityLog   = () => useQuery(() => DB.getActivityLog(25))

export const useTasksForListing = (listingId) =>
  useQuery(() => DB.getTasksForListing(listingId), [listingId])

export const useAllChecklistTasks = () => useQuery(DB.getAllChecklistTasks)

export const useDeletedTasksForListing = (listingId) =>
  useQuery(() => DB.getDeletedTasksForListing(listingId), [listingId])

export const useDocumentsForListing = (listingId) =>
  useQuery(() => DB.getDocumentsForListing(listingId), [listingId])

export const useSellerShowings = ()      => useQuery(DB.getSellerShowings)
export const useOHOutreach     = ()      => useQuery(DB.getOHOutreach)
export const useHostReports    = ()      => useQuery(DB.getHostReports)
export const useOHTasksForOH   = (ohId)  => useQuery(() => DB.getOHTasksForOH(ohId), [ohId])

// ─── Tags hooks ─────────────────────────────────────────────────────────────
export const useTags             = ()    => useQuery(DB.getTags)
export const useContactTags      = (cid) => useQuery(() => DB.getContactTags(cid), [cid])
export const useAllContactTags   = ()    => useQuery(DB.getAllContactTags)
export const useContactsWithTags = ()    => useQuery(DB.getContactsWithTags)

// ─── Daily Tracker hooks ──────────────────────────────────────────────────────
export const useActivityTargets  = ()               => useQuery(DB.getActivityTargets)
export const useDailyActivity    = (from, to)       => useQuery(() => DB.getDailyActivity(from, to), [from, to])
export const useListingAppointments = ()            => useQuery(DB.getListingAppointments)
export const useApptChecklist    = (apptId)         => useQuery(() => DB.getApptChecklist(apptId), [apptId])
export const useShowingSessionsForContact = (cid)  => useQuery(() => DB.getShowingSessionsForContact(cid), [cid])

export const useAutoStats     = (date)  => useQuery(() => DB.getAutoStatsForDate(date), [date])
export const useGoalTargets   = ()      => useQuery(DB.getGoalTargets)
export const useMarketStats   = ()      => useQuery(DB.getMarketStats)

// ─── Content Calendar hooks ────────────────────────────────────────────────────
export const useClientAvatars   = ()             => useQuery(DB.getClientAvatars)
export const useAiPrompts       = ()             => useQuery(DB.getAiPrompts)
export const useInspoBank       = ()             => useQuery(DB.getInspoBank)
export const usePlannerSlots   = (from, to)     => useQuery(() => DB.getContentPlannerSlots(from, to), [from, to])
export const useHashtagGroups   = ()             => useQuery(DB.getHashtagGroups)
export const useHashtagPerf    = (platform)      => useQuery(() => DB.getHashtagPerformance(platform), [platform])
export const useSeoKeywords    = ()             => useQuery(DB.getSeoKeywords)
export const useContentPillars  = ()             => useQuery(DB.getContentPillars)
export const useContentPieces   = (from, to)     => useQuery(() => DB.getContentPieces(from, to), [from, to])
export const useContentSettings = ()             => useQuery(DB.getContentSettings)
export const usePublishQueue    = (status)       => useQuery(() => DB.getPublishQueue(status), [status])
export const useBlotatoConfig   = ()             => useQuery(DB.getBlotatoConfig)
export const useNotificationPreferences = ()     => useQuery(DB.getNotificationPreferences)
export const useNewsletters = ()                 => useQuery(DB.getNewsletters)
export const useSeoKeywordSets = ()             => useQuery(DB.getSeoKeywordSets)
export const useContentBank = ()                => useQuery(DB.getContentBank)

// ─── Brand Profile hook ───────────────────────────────────────────────────────
export const useBrandProfile    = ()             => useQuery(DB.getBrandProfile)

// ─── P&L hooks ──────────────────────────────────────────────────────────────
export const useExpenseCategories = (type = 'expense') => useQuery(() => DB.getExpenseCategories(type), [type])
export const useExpenses         = (from, to) => useQuery(() => DB.getExpenses(from, to), [from, to])
export const useAllExpenses      = ()          => useQuery(DB.getAllExpenses)
export const useIncomeEntries    = (from, to) => useQuery(() => DB.getIncomeEntries(from, to), [from, to])
export const useAllIncomeEntries = ()          => useQuery(DB.getAllIncomeEntries)
export const useMileageLog       = (from, to) => useQuery(() => DB.getMileageLog(from, to), [from, to])

// ─── Daily Tasks hooks ──────────────────────────────────────────────────────
export const useDailyTasks      = (from, to) => useQuery(() => DB.getDailyTasks(from, to), [from, to])
export const useAllDailyTasks   = ()         => useQuery(DB.getAllDailyTasks)
export const useDailyStreaks    = ()         => useQuery(() => DB.getDailyStreaks(30))
// useVendors accepts optional { roleGroup, search } — both optional.
// Callers without args get all vendors (role/name sorted).
export const useVendors           = (opts = {}) =>
  useQuery(() => DB.getVendors(opts), [opts.roleGroup, opts.search])
export const useVendorAssignments = ()          => useQuery(DB.getVendorAssignments)
export const usePartiesForListing = (listingId) =>
  useQuery(() => DB.getPartiesForListing(listingId), [listingId])

// ─── Notes hooks ──────────────────────────────────────────────────────────────
export const useNotes               = ()    => useQuery(DB.getNotes)
export const useNotesForContact     = (cid) => useQuery(() => DB.getNotesForContact(cid), [cid])
export const useNotesForTransaction = (tid) => useQuery(() => DB.getNotesForTransaction(tid), [tid])
export const useAllNoteTags         = ()    => useQuery(DB.getAllNoteTags)
export const useFavorites           = ()    => useQuery(DB.getFavorites)

// ─── Cost Tracker localStorage helper ──────────────────────────────────────────
function loadCostTrackerItems() {
  try { return JSON.parse(localStorage.getItem('cost_tracker_items')) || [] }
  catch { return [] }
}

// ─── Dashboard aggregate hook ─────────────────────────────────────────────────
export function useDashboardData() {
  const contacts        = useContacts()
  const transactions    = useTransactions()
  const listings        = useListings()
  const showingSessions = useShowingSessions()
  const openHouses      = useOpenHouses()
  const leads           = useLeads()
  const investors       = useInvestors()
  const weeklyStats     = useWeeklyStats()
  const activity        = useActivityLog()
  const pnlExpenses     = useAllExpenses()
  const pnlIncome       = useAllIncomeEntries()
  const listingAppts    = useListingAppointments()

  const loading = contacts.loading || transactions.loading || listings.loading
  const error   = contacts.error   || transactions.error   || listings.error

  const c  = contacts.data        ?? []
  const t  = transactions.data    ?? []
  const l  = listings.data        ?? []
  const ss = showingSessions.data ?? []
  const oh = openHouses.data      ?? []
  const ld = leads.data           ?? []
  const iv = investors.data       ?? []
  const ws = weeklyStats.data     ?? []
  const ac = activity.data        ?? []
  const la = listingAppts.data    ?? []

  const now = new Date()
  const yearStr = String(now.getFullYear())

  // ── P&L data ──
  const pe = (pnlExpenses.data ?? []).filter(e => e.date?.startsWith(yearStr))
  const pi = (pnlIncome.data ?? []).filter(i => i.date?.startsWith(yearStr))
  const pnlTotalIncome  = pi.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const pnlTotalExpense = pe.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const pnlNetProfit    = pnlTotalIncome - pnlTotalExpense

  // ── Cost Tracker data ──
  const costItems = loadCostTrackerItems()
  const ytdCosts = costItems.filter(i => (i.date ?? '').startsWith(yearStr))
  const totalCostTrackerSpend = ytdCosts.reduce((s, i) => s + (Number(i.amount) || 0) * (Number(i.quantity) || 1), 0)
  const listingCosts = ytdCosts.filter(i => i.entity_type === 'listing')
  const ohCosts = ytdCosts.filter(i => i.entity_type === 'open_house')
  const leadGenCosts = ytdCosts.filter(i => i.entity_type === 'lead_gen')
  const uniqueListingsTracked = [...new Set(listingCosts.map(i => i.entity_id))].length
  const avgCostPerListing = uniqueListingsTracked > 0
    ? listingCosts.reduce((s, i) => s + (Number(i.amount) || 0) * (Number(i.quantity) || 1), 0) / uniqueListingsTracked
    : 0

  // ── Auto-computed production KPIs (YTD from real data) ──
  const ytdListingApptsSet = la.filter(a => a.scheduled_at?.startsWith(yearStr)).length
  const ytdListingApptsHeld = la.filter(a => {
    if (!a.scheduled_at?.startsWith(yearStr)) return false
    return a.outcome !== 'cancelled' && new Date(a.scheduled_at) <= now
  }).length
  const ytdListingsTaken = la.filter(a => a.outcome === 'won' && a.scheduled_at?.startsWith(yearStr)).length
  const ytdListingApptsLost = la.filter(a => a.outcome === 'lost' && a.scheduled_at?.startsWith(yearStr)).length
  const ytdListingWinRate = (ytdListingsTaken + ytdListingApptsLost) > 0
    ? (ytdListingsTaken / (ytdListingsTaken + ytdListingApptsLost)) * 100 : 0
  const closedDeals = t.filter(x => (x.status ?? '').toLowerCase().includes('closed'))
  const ytdClosedDeals = closedDeals.filter(d => d.closing_date?.startsWith(yearStr))
  const ytdListingsSold = ytdClosedDeals.filter(d => (d.deal_type ?? '').toLowerCase() === 'seller').length
  const ytdBuyerSales = ytdClosedDeals.filter(d => (d.deal_type ?? '').toLowerCase() === 'buyer').length
  const ytdSalesClosed = ytdClosedDeals.length
  const ytdOHEvents = oh.filter(x => x.date?.startsWith(yearStr)).length
  const ytdNewLeads = ld.filter(x => x.created_at?.startsWith(yearStr)).length
  const ytdBuyerRepsSigned = c.filter(x => x.bba_signed && x.bba_signed_date?.startsWith(yearStr)).length
  const ytdEarnedIncome = pnlTotalIncome
  const ytdPaidIncome = pi.filter(i => i.status === 'received' || i.status === 'deposited').reduce((s, i) => s + (Number(i.amount) || 0), 0)

  // OH conversion metrics
  const ohLeads = c.filter(x => (x.lead_source ?? '').toLowerCase().includes('open house'))
  const ohClosedDeals = closedDeals.filter(d => (d.lead_source ?? '').toLowerCase().includes('open house'))
  const ohConversionRate = oh.length > 0 ? (ohClosedDeals.length / oh.length) * 100 : 0

  // Letter conversion
  const letterConverted = ld.filter(x => (x.stage ?? '').toLowerCase() === 'converted').length
  const letterConversionRate = ld.length > 0 ? (letterConverted / ld.length) * 100 : 0

  // ── KPIs ──
  const kpis = {
    activeClients:       c.length,
    bbaSignedCount:      c.filter(x => x.bba_signed).length,
    openTransactions:    t.length,
    offerSubmitted:      t.filter(x => { const s = (x.status ?? '').toLowerCase(); return s.includes('offer') && !s.includes('declined') && !s.includes('pre') }).length,
    activeListings:      l.length,
    totalInvestors:      iv.length,
    totalLeads:          ld.length,
    pipelineValue:       t.reduce((s, x) => s + (Number(x.property?.price) || 0), 0),
    ytdIncome:           pnlTotalIncome > 0 ? pnlTotalIncome : ws.reduce((s, x) => s + (Number(x.earned_income) || 0), 0),
    ytdExpenses:         pnlTotalExpense,
    ytdNetProfit:        pnlNetProfit,
    openHousesThisMonth: oh.filter(x => {
      if (!x.date) return false
      const d = new Date(x.date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length,
    // Cost tracker KPIs
    totalCostTrackerSpend,
    avgCostPerListing,
    ohConversionRate,
    letterConversionRate,
    // Auto-computed production KPIs
    ytdListingApptsSet,
    ytdListingApptsHeld,
    ytdListingApptsLost,
    ytdListingWinRate,
    ytdListingsTaken,
    ytdListingsSold,
    ytdBuyerSales,
    ytdSalesClosed,
    ytdOHEvents,
    ytdNewLeads,
    ytdBuyerRepsSigned,
    ytdEarnedIncome,
    ytdPaidIncome,
  }

  // ── Conversion funnel ──
  const conversionFunnel = [
    { label: 'Leads',          count: ld.length },
    { label: 'Showings',       count: ss.length },
    { label: 'Under Contract', count: t.filter(x => !(x.status ?? '').toLowerCase().includes('clos')).length },
    { label: 'Closed',         count: t.filter(x => (x.status ?? '').toLowerCase().includes('clos')).length },
  ]

  // ── Showing interest breakdown ──
  const allShowings = ss.flatMap(s => s.showings ?? [])
  const interestLevels = {
    high:   allShowings.filter(s => (s.interest_level ?? '').toLowerCase() === 'high').length,
    medium: allShowings.filter(s => (s.interest_level ?? '').toLowerCase() === 'medium').length,
    low:    allShowings.filter(s => (s.interest_level ?? '').toLowerCase() === 'low').length,
  }

  // ── Top properties by showing count ──
  const propMap = {}
  allShowings.forEach(s => {
    const addr = s.property?.address ?? 'Unknown'
    propMap[addr] = (propMap[addr] || 0) + 1
  })
  const topProperties = Object.entries(propMap)
    .map(([address, count]) => ({ address, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Activity by type ──
  const activityByType = {}
  ac.forEach(a => { activityByType[a.type ?? 'other'] = (activityByType[a.type ?? 'other'] || 0) + 1 })

  // ── Top clients by activity count ──
  const clientMap = {}
  ac.forEach(a => {
    if (a.contact?.name) clientMap[a.contact.name] = (clientMap[a.contact.name] || 0) + 1
  })
  const topClients = Object.entries(clientMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Expiring leads (within 30 days) ──
  const in30 = new Date(now); in30.setDate(now.getDate() + 30)
  const expiringLeads = ld.filter(x => {
    if (!x.property?.expired_date) return false
    const d = new Date(x.property.expired_date)
    return d >= now && d <= in30
  }).length

  // ── Investor feedback breakdown ──
  const allFeedback = iv.flatMap(i => i.investor_feedback ?? [])
  const investorFeedback = {
    interested: allFeedback.filter(f => (f.status ?? '').toLowerCase() === 'interested').length,
    maybe:      allFeedback.filter(f => (f.status ?? '').toLowerCase() === 'maybe').length,
    pass:       allFeedback.filter(f => (f.status ?? '').toLowerCase() === 'pass').length,
  }

  // ── Listing value + avg DOM ──
  const listingValue = l.reduce((s, x) => s + (Number(x.property?.price) || 0), 0)
  const doms = l.map(x => Number(x.property?.dom)).filter(d => d > 0)
  const avgDOM = doms.length ? Math.round(doms.reduce((s, d) => s + d, 0) / doms.length) : 0

  // ── Latest logged week ──
  const latestWeek = ws[0] ?? null

  return {
    loading, error,
    contacts: c, transactions: t, listings: l, showingSessions: ss,
    openHouses: oh, leads: ld, investors: iv, weeklyStats: ws, activity: ac,
    listingAppts: la, costItems,
    kpis, conversionFunnel, interestLevels, topProperties,
    activityByType, topClients, expiringLeads, investorFeedback,
    latestWeek, listingValue, avgDOM,
    refetch: () => {
      contacts.refetch(); transactions.refetch(); listings.refetch()
      showingSessions.refetch(); openHouses.refetch(); leads.refetch()
      investors.refetch(); weeklyStats.refetch(); activity.refetch()
      pnlExpenses.refetch(); pnlIncome.refetch(); listingAppts.refetch()
    },
  }
}
