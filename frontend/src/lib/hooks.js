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
export const useContentPillars  = ()             => useQuery(DB.getContentPillars)
export const useContentPieces   = (from, to)     => useQuery(() => DB.getContentPieces(from, to), [from, to])
export const useContentSettings = ()             => useQuery(DB.getContentSettings)

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
export const useVendors         = ()         => useQuery(DB.getVendors)
export const useVendorAssignments = ()       => useQuery(DB.getVendorAssignments)

// ─── Notes hooks ──────────────────────────────────────────────────────────────
export const useNotes               = ()    => useQuery(DB.getNotes)
export const useNotesForContact     = (cid) => useQuery(() => DB.getNotesForContact(cid), [cid])
export const useNotesForTransaction = (tid) => useQuery(() => DB.getNotesForTransaction(tid), [tid])
export const useAllNoteTags         = ()    => useQuery(DB.getAllNoteTags)
export const useFavorites           = ()    => useQuery(DB.getFavorites)

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

  const now = new Date()

  // ── P&L data ──
  const pe = (pnlExpenses.data ?? []).filter(e => e.date?.startsWith(String(now.getFullYear())))
  const pi = (pnlIncome.data ?? []).filter(i => i.date?.startsWith(String(now.getFullYear())))
  const pnlTotalIncome  = pi.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const pnlTotalExpense = pe.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const pnlNetProfit    = pnlTotalIncome - pnlTotalExpense

  // ── KPIs ──
  const kpis = {
    activeClients:       c.length,
    bbaSignedCount:      c.filter(x => x.bba_signed).length,
    openTransactions:    t.length,
    offerSubmitted:      t.filter(x => (x.status ?? '').toLowerCase().includes('offer')).length,
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
    kpis, conversionFunnel, interestLevels, topProperties,
    activityByType, topClients, expiringLeads, investorFeedback,
    latestWeek, listingValue, avgDOM,
    refetch: () => {
      contacts.refetch(); transactions.refetch(); listings.refetch()
      showingSessions.refetch(); openHouses.refetch(); leads.refetch()
      investors.refetch(); weeklyStats.refetch(); activity.refetch()
      pnlExpenses.refetch(); pnlIncome.refetch()
    },
  }
}
