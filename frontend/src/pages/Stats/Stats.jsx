import { useState, useMemo } from 'react'
import { Card, SectionHeader, TabBar, DataTable, InfoTip, Button, SlidePanel } from '../../components/ui/index.jsx'
import { useMarketStats } from '../../lib/hooks.js'
import { updateMarketStats } from '../../lib/supabase.js'
import './Stats.css'

// ─── Static market data — manually updated weekly ─────────────────────────────
const marketData = {
  weekly: {
    gilbert: [
      { metric: 'Active Listings',  value: '312',  change: '+1.8%',  dir: 'up' },
      { metric: 'Price Reductions', value: '41',   change: '+12.5%', dir: 'up' },
      { metric: 'Avg DOM',          value: '22d',  change: '+1 day', dir: 'up' },
      { metric: 'New Listings',     value: '74',   change: '+5.7%',  dir: 'up' },
    ],
    mesa: [
      { metric: 'Active Listings',  value: '528',  change: '+2.4%',  dir: 'up' },
      { metric: 'Price Reductions', value: '67',   change: '+9.3%',  dir: 'up' },
      { metric: 'Avg DOM',          value: '28d',  change: '-1 day', dir: 'down' },
      { metric: 'New Listings',     value: '121',  change: '+3.1%',  dir: 'up' },
    ],
    queencreek: [
      { metric: 'Active Listings',  value: '284',  change: '+4.2%',  dir: 'up' },
      { metric: 'Price Reductions', value: '38',   change: '+15.4%', dir: 'up' },
      { metric: 'Avg DOM',          value: '34d',  change: '+3 days',dir: 'up' },
      { metric: 'New Listings',     value: '62',   change: '+7.8%',  dir: 'up' },
    ],
    scottsdale: [
      { metric: 'Active Listings',  value: '891',  change: '+1.1%',  dir: 'up' },
      { metric: 'Price Reductions', value: '102',  change: '+6.3%',  dir: 'up' },
      { metric: 'Avg DOM',          value: '38d',  change: '+2 days',dir: 'up' },
      { metric: 'New Listings',     value: '174',  change: '-0.6%',  dir: 'down' },
    ],
    paradisevalley: [
      { metric: 'Active Listings',  value: '143',  change: '-2.1%',  dir: 'down' },
      { metric: 'Price Reductions', value: '19',   change: '+5.6%',  dir: 'up' },
      { metric: 'Avg DOM',          value: '52d',  change: '+4 days',dir: 'up' },
      { metric: 'New Listings',     value: '28',   change: '-3.4%',  dir: 'down' },
    ],
    santanvalley: [
      { metric: 'Active Listings',  value: '376',  change: '+5.3%',  dir: 'up' },
      { metric: 'Price Reductions', value: '52',   change: '+18.2%', dir: 'up' },
      { metric: 'Avg DOM',          value: '38d',  change: '+5 days',dir: 'up' },
      { metric: 'New Listings',     value: '88',   change: '+9.1%',  dir: 'up' },
    ],
    chandler: [
      { metric: 'Active Listings',  value: '419',  change: '+2.7%',  dir: 'up' },
      { metric: 'Price Reductions', value: '53',   change: '+10.4%', dir: 'up' },
      { metric: 'Avg DOM',          value: '25d',  change: '0 days', dir: 'flat' },
      { metric: 'New Listings',     value: '96',   change: '+1.9%',  dir: 'up' },
    ],
    tempe: [
      { metric: 'Active Listings',  value: '198',  change: '+0.5%',  dir: 'up' },
      { metric: 'Price Reductions', value: '24',   change: '+4.3%',  dir: 'up' },
      { metric: 'Avg DOM',          value: '21d',  change: '-1 day', dir: 'down' },
      { metric: 'New Listings',     value: '47',   change: '-2.1%',  dir: 'down' },
    ],
  },
  monthly: {
    gilbert: [
      { metric: 'Pending',         value: '98',    change: '+6.1%',  dir: 'up' },
      { metric: 'Closed',          value: '187',   change: '+3.7%',  dir: 'up' },
      { metric: 'Supply (months)', value: '1.2',   change: '0.0',    dir: 'flat' },
      { metric: 'Median Price',    value: '$448K', change: '+2.4%',  dir: 'up' },
    ],
    mesa: [
      { metric: 'Pending',         value: '164',   change: '+1.9%',  dir: 'up' },
      { metric: 'Closed',          value: '312',   change: '+0.6%',  dir: 'up' },
      { metric: 'Supply (months)', value: '1.4',   change: '+0.1',   dir: 'up' },
      { metric: 'Median Price',    value: '$389K', change: '+1.8%',  dir: 'up' },
    ],
    queencreek: [
      { metric: 'Pending',         value: '87',    change: '+8.8%',  dir: 'up' },
      { metric: 'Closed',          value: '158',   change: '+5.3%',  dir: 'up' },
      { metric: 'Supply (months)', value: '1.8',   change: '+0.3',   dir: 'up' },
      { metric: 'Median Price',    value: '$431K', change: '+3.1%',  dir: 'up' },
    ],
    scottsdale: [
      { metric: 'Pending',         value: '241',   change: '-2.8%',  dir: 'down' },
      { metric: 'Closed',          value: '447',   change: '-1.1%',  dir: 'down' },
      { metric: 'Supply (months)', value: '2.1',   change: '+0.2',   dir: 'up' },
      { metric: 'Median Price',    value: '$712K', change: '+2.9%',  dir: 'up' },
    ],
    paradisevalley: [
      { metric: 'Pending',         value: '31',    change: '-6.1%',  dir: 'down' },
      { metric: 'Closed',          value: '58',    change: '-3.3%',  dir: 'down' },
      { metric: 'Supply (months)', value: '2.8',   change: '+0.4',   dir: 'up' },
      { metric: 'Median Price',    value: '$3.1M', change: '+4.7%',  dir: 'up' },
    ],
    santanvalley: [
      { metric: 'Pending',         value: '118',   change: '+11.3%', dir: 'up' },
      { metric: 'Closed',          value: '209',   change: '+7.2%',  dir: 'up' },
      { metric: 'Supply (months)', value: '2.0',   change: '+0.4',   dir: 'up' },
      { metric: 'Median Price',    value: '$368K', change: '+1.4%',  dir: 'up' },
    ],
    chandler: [
      { metric: 'Pending',         value: '132',   change: '+3.1%',  dir: 'up' },
      { metric: 'Closed',          value: '248',   change: '+4.2%',  dir: 'up' },
      { metric: 'Supply (months)', value: '1.3',   change: '+0.1',   dir: 'up' },
      { metric: 'Median Price',    value: '$469K', change: '+2.2%',  dir: 'up' },
    ],
    tempe: [
      { metric: 'Pending',         value: '64',    change: '-1.5%',  dir: 'down' },
      { metric: 'Closed',          value: '119',   change: '+0.8%',  dir: 'up' },
      { metric: 'Supply (months)', value: '1.1',   change: '0.0',    dir: 'flat' },
      { metric: 'Median Price',    value: '$421K', change: '+3.6%',  dir: 'up' },
    ],
  },
}

const neighborhoodStats = {
  gilbert: [
    { name: 'Agritopia',       active: 8,  pending: 3, closed: 11, medPrice: '$521K', dom: 18 },
    { name: 'Eastmark',        active: 24, pending: 9, closed: 31, medPrice: '$478K', dom: 24 },
    { name: 'Power Ranch',     active: 16, pending: 6, closed: 22, medPrice: '$441K', dom: 27 },
    { name: 'Val Vista Lakes', active: 11, pending: 4, closed: 15, medPrice: '$395K', dom: 33 },
    { name: 'Morrison Ranch',  active: 7,  pending: 2, closed: 9,  medPrice: '$562K', dom: 15 },
  ],
  mesa: [
    { name: 'Dobson Ranch',    active: 19, pending: 7, closed: 24, medPrice: '$372K', dom: 29 },
    { name: 'Las Sendas',      active: 14, pending: 5, closed: 18, medPrice: '$512K', dom: 22 },
    { name: 'Red Mountain',    active: 21, pending: 8, closed: 27, medPrice: '$398K', dom: 31 },
    { name: 'Eastmark Mesa',   active: 9,  pending: 3, closed: 11, medPrice: '$441K', dom: 26 },
  ],
  queencreek: [
    { name: 'Encanterra',      active: 12, pending: 4, closed: 14, medPrice: '$548K', dom: 28 },
    { name: 'Harvest',         active: 18, pending: 6, closed: 21, medPrice: '$421K', dom: 35 },
    { name: 'Ironwood Crossing',active: 15,pending: 5, closed: 19, medPrice: '$398K', dom: 38 },
    { name: 'Legado',          active: 8,  pending: 3, closed: 10, medPrice: '$461K', dom: 32 },
  ],
  scottsdale: [
    { name: 'DC Ranch',        active: 28, pending: 8, closed: 33, medPrice: '$1.2M', dom: 41 },
    { name: 'McCormick Ranch', active: 22, pending: 6, closed: 26, medPrice: '$682K', dom: 34 },
    { name: 'Gainey Ranch',    active: 11, pending: 3, closed: 13, medPrice: '$891K', dom: 44 },
    { name: 'Kierland',        active: 9,  pending: 2, closed: 10, medPrice: '$748K', dom: 38 },
    { name: 'Old Town Area',   active: 31, pending: 9, closed: 38, medPrice: '$574K', dom: 29 },
  ],
  paradisevalley: [
    { name: 'North PV',        active: 18, pending: 4, closed: 16, medPrice: '$3.4M', dom: 58 },
    { name: 'Central PV',      active: 22, pending: 6, closed: 21, medPrice: '$2.8M', dom: 49 },
    { name: 'Camelback Area',  active: 14, pending: 3, closed: 12, medPrice: '$3.9M', dom: 63 },
  ],
  santanvalley: [
    { name: 'Johnson Ranch',   active: 22, pending: 8, closed: 28, medPrice: '$351K', dom: 37 },
    { name: 'Ironwood',        active: 17, pending: 6, closed: 21, medPrice: '$374K', dom: 41 },
    { name: 'Skyline Ranch',   active: 13, pending: 4, closed: 16, medPrice: '$362K', dom: 39 },
    { name: 'Pecan Creek',     active: 9,  pending: 3, closed: 11, medPrice: '$338K', dom: 44 },
  ],
  chandler: [
    { name: 'Ocotillo',        active: 18, pending: 6, closed: 23, medPrice: '$521K', dom: 22 },
    { name: 'Sun Lakes',       active: 24, pending: 7, closed: 29, medPrice: '$412K', dom: 28 },
    { name: 'Fulton Ranch',    active: 11, pending: 4, closed: 14, medPrice: '$578K', dom: 19 },
    { name: 'Andersen Springs',active: 8,  pending: 2, closed: 9,  medPrice: '$488K', dom: 24 },
  ],
  tempe: [
    { name: 'Tempe Gardens',   active: 12, pending: 4, closed: 16, medPrice: '$398K', dom: 21 },
    { name: 'South Tempe',     active: 9,  pending: 3, closed: 12, medPrice: '$441K', dom: 18 },
    { name: 'Rural/Baseline',  active: 14, pending: 5, closed: 18, medPrice: '$372K', dom: 24 },
    { name: 'Kyrene Corridor', active: 7,  pending: 2, closed: 9,  medPrice: '$418K', dom: 22 },
  ],
}

// ─── Apache Junction & Gold Canyon data ───────────────────────────────────────
const ajgcData = {
  weekly: {
    apachejunction: [
      { metric: 'Active Listings',  value: '178',  change: '+6.0%',  dir: 'up' },
      { metric: 'Price Reductions', value: '28',   change: '+16.7%', dir: 'up' },
      { metric: 'Avg DOM',          value: '42d',  change: '+4 days',dir: 'up' },
      { metric: 'New Listings',     value: '38',   change: '+8.6%',  dir: 'up' },
    ],
    goldcanyon: [
      { metric: 'Active Listings',  value: '84',   change: '+3.7%',  dir: 'up' },
      { metric: 'Price Reductions', value: '12',   change: '+9.1%',  dir: 'up' },
      { metric: 'Avg DOM',          value: '48d',  change: '+3 days',dir: 'up' },
      { metric: 'New Listings',     value: '18',   change: '+5.9%',  dir: 'up' },
    ],
  },
  monthly: {
    apachejunction: [
      { metric: 'Pending',         value: '48',    change: '+9.1%',  dir: 'up' },
      { metric: 'Closed',          value: '91',    change: '+6.4%',  dir: 'up' },
      { metric: 'Supply (months)', value: '2.1',   change: '+0.3',   dir: 'up' },
      { metric: 'Median Price',    value: '$325K', change: '+2.2%',  dir: 'up' },
    ],
    goldcanyon: [
      { metric: 'Pending',         value: '22',    change: '+4.8%',  dir: 'up' },
      { metric: 'Closed',          value: '40',    change: '+2.6%',  dir: 'up' },
      { metric: 'Supply (months)', value: '2.2',   change: '+0.2',   dir: 'up' },
      { metric: 'Median Price',    value: '$412K', change: '+3.0%',  dir: 'up' },
    ],
  },
}

const ajgcNeighborhoods = {
  apachejunction: [
    { name: 'Goldfield Ranch',   active: 18, pending: 6, closed: 14, medPrice: '$338K', dom: 39 },
    { name: 'Desert Vista',      active: 22, pending: 7, closed: 18, medPrice: '$319K', dom: 44 },
    { name: 'Apache Wells',      active: 14, pending: 4, closed: 11, medPrice: '$298K', dom: 48 },
    { name: 'Lost Goldmine',     active: 9,  pending: 3, closed: 7,  medPrice: '$352K', dom: 42 },
  ],
  goldcanyon: [
    { name: 'Peralta Trails',          active: 14, pending: 5, closed: 12, medPrice: '$441K', dom: 44 },
    { name: 'Mountain Vista',          active: 11, pending: 3, closed: 9,  medPrice: '$398K', dom: 51 },
    { name: 'Superstition Mountain Club', active: 8, pending: 2, closed: 6, medPrice: '$612K', dom: 58 },
    { name: 'Whitestone',              active: 9,  pending: 2, closed: 7,  medPrice: '$378K', dom: 47 },
  ],
}

// ─── Combined East Valley & Phoenix Metro ─────────────────────────────────────
// East Valley = gilbert + mesa + queencreek + chandler + santanvalley + tempe + apachejunction + goldcanyon
const eastValleyData = {
  weekly: [
    { metric: 'Active Listings',  value: '2,379', change: '+3.1%', dir: 'up' },
    { metric: 'Price Reductions', value: '315',   change: '+12.0%',dir: 'up' },
    { metric: 'Avg DOM',          value: '32d',   change: '+2 days',dir: 'up' },
    { metric: 'New Listings',     value: '544',   change: '+5.3%', dir: 'up' },
  ],
  monthly: [
    { metric: 'Pending',          value: '733',   change: '+5.2%', dir: 'up' },
    { metric: 'Closed',           value: '1,366', change: '+3.1%', dir: 'up' },
    { metric: 'Supply (months)',  value: '1.6',   change: '+0.2',  dir: 'up' },
    { metric: 'Median Price',     value: '$415K', change: '+2.5%', dir: 'up' },
  ],
}
const eastValleyNeighborhoods = [
  { name: 'Gilbert — Eastmark',  active: 24, pending: 9,  closed: 31, medPrice: '$478K', dom: 24 },
  { name: 'Gilbert — Morrison Ranch', active: 7, pending: 2, closed: 9, medPrice: '$562K', dom: 15 },
  { name: 'Mesa — Dobson Ranch', active: 19, pending: 7,  closed: 24, medPrice: '$372K', dom: 29 },
  { name: 'Queen Creek — Encanterra', active: 12, pending: 4, closed: 14, medPrice: '$548K', dom: 28 },
  { name: 'Chandler — Ocotillo', active: 18, pending: 6,  closed: 23, medPrice: '$521K', dom: 22 },
  { name: 'San Tan — Johnson Ranch', active: 22, pending: 8, closed: 28, medPrice: '$351K', dom: 37 },
  { name: 'Gold Canyon — Peralta Trails', active: 14, pending: 5, closed: 12, medPrice: '$441K', dom: 44 },
  { name: 'Apache Junction — Desert Vista', active: 22, pending: 7, closed: 18, medPrice: '$319K', dom: 44 },
]

// Phoenix Metro = East Valley + Scottsdale + Paradise Valley
const phoenixMetroData = {
  weekly: [
    { metric: 'Active Listings',  value: '3,413', change: '+2.2%', dir: 'up' },
    { metric: 'Price Reductions', value: '436',   change: '+10.6%',dir: 'up' },
    { metric: 'Avg DOM',          value: '34d',   change: '+2 days',dir: 'up' },
    { metric: 'New Listings',     value: '746',   change: '+4.1%', dir: 'up' },
  ],
  monthly: [
    { metric: 'Pending',          value: '1,005', change: '+3.1%', dir: 'up' },
    { metric: 'Closed',           value: '1,871', change: '+1.9%', dir: 'up' },
    { metric: 'Supply (months)',  value: '1.8',   change: '+0.2',  dir: 'up' },
    { metric: 'Median Price',     value: '$472K', change: '+2.8%', dir: 'up' },
  ],
}
const phoenixMetroNeighborhoods = [
  ...eastValleyNeighborhoods,
  { name: 'Scottsdale — DC Ranch', active: 28, pending: 8, closed: 33, medPrice: '$1.2M', dom: 41 },
  { name: 'Scottsdale — Old Town', active: 31, pending: 9, closed: 38, medPrice: '$574K', dom: 29 },
  { name: 'Paradise Valley — North PV', active: 18, pending: 4, closed: 16, medPrice: '$3.4M', dom: 58 },
]

const CITIES = [
  { label: 'Gilbert',         value: 'gilbert' },
  { label: 'Mesa',            value: 'mesa' },
  { label: 'Queen Creek',     value: 'queencreek' },
  { label: 'Chandler',        value: 'chandler' },
  { label: 'Tempe',           value: 'tempe' },
  { label: 'San Tan Valley',  value: 'santanvalley' },
  { label: 'Apache Junction', value: 'apachejunction' },
  { label: 'Gold Canyon',     value: 'goldcanyon' },
  { label: 'Scottsdale',      value: 'scottsdale' },
  { label: 'Paradise Valley', value: 'paradisevalley' },
]

const MARKET_VIEWS = [
  { label: 'Individual City', value: 'city' },
  { label: 'East Valley',     value: 'eastvalley' },
  { label: 'Phoenix Metro',   value: 'metro' },
]

const DATE_RANGES = [
  { label: 'Today',    value: '1d' },
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d',value: '30d' },
  { label: 'Last 90d',value: '90d' },
  { label: 'YTD',     value: 'ytd' },
  { label: 'Custom',  value: 'custom' },
]

const AJGC_CITIES = ['apachejunction', 'goldcanyon']

// All editable areas: cities + combined views
const EDIT_AREAS = [
  ...CITIES,
  { label: '── East Valley (combined)', value: '_eastvalley' },
  { label: '── Phoenix Metro (combined)', value: '_metro' },
]

// Get the default metrics for an area + time range from the hardcoded defaults
function getDefaults(area, timeRange) {
  if (area === '_eastvalley') return eastValleyData[timeRange]
  if (area === '_metro')      return phoenixMetroData[timeRange]
  if (AJGC_CITIES.includes(area)) return ajgcData[timeRange][area]
  return marketData[timeRange][area]
}

// Deep-merge saved DB data over hardcoded defaults
function mergeData(saved) {
  if (!saved) return { weekly: marketData.weekly, monthly: marketData.monthly }
  const weekly  = { ...marketData.weekly }
  const monthly = { ...marketData.monthly }
  if (saved.weekly)  Object.assign(weekly,  saved.weekly)
  if (saved.monthly) Object.assign(monthly, saved.monthly)
  return { weekly, monthly }
}
function mergeAjgc(saved) {
  const w = { ...ajgcData.weekly }
  const m = { ...ajgcData.monthly }
  if (saved?.ajgcWeekly)  Object.assign(w, saved.ajgcWeekly)
  if (saved?.ajgcMonthly) Object.assign(m, saved.ajgcMonthly)
  return { weekly: w, monthly: m }
}

// ─── Metric edit row ──────────────────────────────────────────────────────────
function MetricRow({ metric, onChange }) {
  return (
    <div className="stats-edit-row">
      <span className="stats-edit-label">{metric.metric}</span>
      <input
        className="stats-edit-val"
        value={metric.value}
        onChange={e => onChange({ ...metric, value: e.target.value })}
        placeholder="e.g. 312 or $448K"
      />
      <input
        className="stats-edit-change"
        value={metric.change}
        onChange={e => onChange({ ...metric, change: e.target.value })}
        placeholder="+1.8%"
      />
      <div className="stats-edit-dir">
        {['up', 'flat', 'down'].map(d => (
          <button
            key={d}
            type="button"
            className={`stats-dir-btn${metric.dir === d ? ' stats-dir-btn--active' : ''}`}
            onClick={() => onChange({ ...metric, dir: d })}
          >
            {d === 'up' ? '↑' : d === 'flat' ? '—' : '↓'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Stats() {
  const [marketView, setMarketView] = useState('weekly')
  const [marketArea, setMarketArea] = useState('gilbert')
  const [scopeView,  setScopeView]  = useState('city')
  const [dateRange, setDateRange]   = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')

  const { data: savedStats, refetch: refetchStats } = useMarketStats()
  const saved = savedStats?.value ?? null

  // Merged data (DB overrides defaults)
  const merged     = useMemo(() => mergeData(saved),     [saved])
  const mergedAjgc = useMemo(() => mergeAjgc(saved),     [saved])
  const evWeekly   = saved?.evWeekly   ?? eastValleyData.weekly
  const evMonthly  = saved?.evMonthly  ?? eastValleyData.monthly
  const metWeekly  = saved?.metWeekly  ?? phoenixMetroData.weekly
  const metMonthly = saved?.metMonthly ?? phoenixMetroData.monthly

  const isAjgc = AJGC_CITIES.includes(marketArea)

  const marketStats = scopeView === 'eastvalley'
    ? (marketView === 'weekly' ? evWeekly : evMonthly)
    : scopeView === 'metro'
    ? (marketView === 'weekly' ? metWeekly : metMonthly)
    : (isAjgc ? mergedAjgc[marketView][marketArea] : merged[marketView][marketArea])

  const neighborhoods = scopeView === 'eastvalley'
    ? eastValleyNeighborhoods
    : scopeView === 'metro'
    ? phoenixMetroNeighborhoods
    : (isAjgc ? ajgcNeighborhoods[marketArea] : neighborhoodStats[marketArea])

  const areaLabel = scopeView === 'eastvalley' ? 'East Valley Combined'
    : scopeView === 'metro' ? 'Phoenix Metro Combined'
    : CITIES.find(c => c.value === marketArea)?.label ?? ''

  // ── Edit panel ──
  const [editOpen,    setEditOpen]    = useState(false)
  const [editArea,    setEditArea]    = useState('gilbert')
  const [editRange,   setEditRange]   = useState('weekly')
  const [editMetrics, setEditMetrics] = useState([])
  const [editWeekOf,  setEditWeekOf]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [statsView,   setStatsView]   = useState('cards')

  // Most recent Monday
  function thisMonday() {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().slice(0, 10)
  }

  const openEdit = () => {
    setEditArea('gilbert')
    setEditRange('weekly')
    setEditMetrics(getDefaults('gilbert', 'weekly').map(m => ({ ...m })))
    setEditWeekOf(saved?.weekOf ?? thisMonday())
    setEditOpen(true)
  }

  const handleEditAreaChange = (area) => {
    setEditArea(area)
    setEditMetrics(getEditCurrent(area, editRange))
  }
  const handleEditRangeChange = (range) => {
    setEditRange(range)
    setEditMetrics(getEditCurrent(editArea, range))
  }

  function getEditCurrent(area, range) {
    // Start from saved if exists, otherwise defaults
    let base
    if (area === '_eastvalley') {
      base = (range === 'weekly' ? saved?.evWeekly : saved?.evMonthly) ?? getDefaults(area, range)
    } else if (area === '_metro') {
      base = (range === 'weekly' ? saved?.metWeekly : saved?.metMonthly) ?? getDefaults(area, range)
    } else if (AJGC_CITIES.includes(area)) {
      base = saved?.[`ajgc${range.charAt(0).toUpperCase() + range.slice(1)}`]?.[area] ?? getDefaults(area, range)
    } else {
      base = saved?.[range]?.[area] ?? getDefaults(area, range)
    }
    return base.map(m => ({ ...m }))
  }

  const updateMetric = (i, updated) => {
    setEditMetrics(prev => prev.map((m, idx) => idx === i ? updated : m))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Build updated value object on top of existing saved
      const next = { ...(saved ?? {}), weekOf: editWeekOf }
      if (editArea === '_eastvalley') {
        if (editRange === 'weekly') next.evWeekly  = editMetrics
        else                        next.evMonthly = editMetrics
      } else if (editArea === '_metro') {
        if (editRange === 'weekly') next.metWeekly  = editMetrics
        else                        next.metMonthly = editMetrics
      } else if (AJGC_CITIES.includes(editArea)) {
        const key = `ajgc${editRange.charAt(0).toUpperCase() + editRange.slice(1)}`
        next[key] = { ...(next[key] ?? {}), [editArea]: editMetrics }
      } else {
        next[editRange] = { ...(next[editRange] ?? {}), [editArea]: editMetrics }
      }
      await updateMarketStats(next)
      await refetchStats()
      setEditOpen(false)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  return (
    <div className="stats-market-page">
      <SectionHeader
        title="Market Report"
        subtitle="East Valley & Metro — manually updated each week"
        actions={
          <Button variant="primary" size="sm" onClick={openEdit}>
            Update Numbers
          </Button>
        }
      />

      <Card className="stats-market-card">
        <div className="stats-market-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="stats-scope-tabs">
              {MARKET_VIEWS.map(v => (
                <button
                  key={v.value}
                  className={`stats-scope-tab${scopeView === v.value ? ' stats-scope-tab--active' : ''}`}
                  onClick={() => setScopeView(v.value)}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <InfoTip text="Individual City: drill into one city. East Valley: Gilbert, Mesa, Queen Creek, Chandler, Tempe, San Tan, Apache Junction & Gold Canyon combined. Phoenix Metro: East Valley + Scottsdale + Paradise Valley." position="bottom" />
          </div>

          <TabBar
            tabs={[{ label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }]}
            active={marketView}
            onChange={setMarketView}
          />

          {scopeView === 'city' && (
            <div className="stats-city-tabs">
              {CITIES.map(c => (
                <button
                  key={c.value}
                  className={`stats-city-tab${marketArea === c.value ? ' stats-city-tab--active' : ''}`}
                  onClick={() => setMarketArea(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="stats-date-strip">
          {DATE_RANGES.map(r => (
            <button
              key={r.value}
              className={`stats-date-btn${dateRange === r.value ? ' stats-date-btn--active' : ''}`}
              onClick={() => setDateRange(r.value)}
            >
              {r.label}
            </button>
          ))}
          {dateRange === 'custom' && (
            <div className="stats-date-custom">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <span className="stats-date-custom__sep">→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}
        </div>

        <div className="stats-week-row">
          <p className="stats-area-label">{areaLabel}</p>
          {saved?.weekOf ? (
            <span className="stats-week-badge">
              Week of {new Date(saved.weekOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ) : (
            <span className="stats-week-badge stats-week-badge--none">No week set — hit Update Numbers</span>
          )}
        </div>

        <div className="stats-view-toggle">
          <button
            className={`stats-view-btn${statsView === 'cards' ? ' stats-view-btn--active' : ''}`}
            onClick={() => setStatsView('cards')}
            title="Card view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            className={`stats-view-btn${statsView === 'chart' ? ' stats-view-btn--active' : ''}`}
            onClick={() => setStatsView('chart')}
            title="Chart view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>
        </div>

        {statsView === 'cards' ? (
          <div className="stats-market-grid">
            {marketStats.map(stat => (
              <div key={stat.metric} className="market-stat-item">
                <p className="market-stat-item__label">{stat.metric}</p>
                <p className="market-stat-item__value">{stat.value}</p>
                <p className={`market-stat-item__change market-stat-item__change--${stat.dir}`}>{stat.change}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="stats-bar-chart">
            {marketStats.map(stat => {
              const numVal = parseFloat(stat.value.replace(/[^0-9.]/g, '')) || 0
              const maxVal = Math.max(...marketStats.map(s => parseFloat(s.value.replace(/[^0-9.]/g, '')) || 0))
              const pct = maxVal > 0 ? (numVal / maxVal) * 100 : 0
              return (
                <div key={stat.metric} className="stats-bar-row">
                  <span className="stats-bar__label">{stat.metric}</span>
                  <div className="stats-bar__track">
                    <div
                      className={`stats-bar__fill stats-bar__fill--${stat.dir}`}
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    />
                  </div>
                  <span className="stats-bar__value">{stat.value}</span>
                  <span className={`stats-bar__change stats-bar__change--${stat.dir}`}>{stat.change}</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="stats-neighborhood-section">
          <h4 className="stats-neighborhood-title">
            {scopeView === 'city' ? 'Micro-Market: Neighborhoods' : 'Key Neighborhoods'}
            <InfoTip text="Neighborhood-level breakdown. Active = currently listed, Pending = under contract, Closed = sold in last 30 days, DOM = average days on market. Hot (green) = ≤20 days, Warm (yellow) = ≤30 days, Cool (red) = 30+ days." position="left" />
          </h4>
          <DataTable
            columns={[
              { key: 'name',     label: 'Neighborhood' },
              { key: 'active',   label: 'Active' },
              { key: 'pending',  label: 'Pending' },
              { key: 'closed',   label: 'Closed (30d)' },
              { key: 'medPrice', label: 'Med. Price' },
              {
                key: 'dom', label: 'Avg DOM',
                render: v => (
                  <span className={`dom-badge ${v <= 20 ? 'dom-badge--hot' : v <= 30 ? 'dom-badge--warm' : 'dom-badge--cool'}`}>
                    {v}d
                  </span>
                ),
              },
            ]}
            rows={neighborhoods}
          />
        </div>
      </Card>

      {/* ── Update Numbers Panel ── */}
      <SlidePanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update Market Numbers"
        subtitle="Pick an area, pick weekly or monthly, then enter the latest stats."
        width={500}
      >
        {/* Week of date */}
        <div className="stats-edit-section stats-edit-week-section">
          <label className="stats-edit-section-label">Week of</label>
          <input
            type="date"
            className="stats-edit-weekdate"
            value={editWeekOf}
            onChange={e => setEditWeekOf(e.target.value)}
          />
          <p className="stats-edit-hint">This tags the data so you know which week these numbers are from.</p>
        </div>

        {/* Area selector */}
        <div className="stats-edit-section">
          <label className="stats-edit-section-label">Area</label>
          <select
            className="stats-edit-select"
            value={editArea}
            onChange={e => handleEditAreaChange(e.target.value)}
          >
            {EDIT_AREAS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* Weekly / Monthly toggle */}
        <div className="stats-edit-section">
          <label className="stats-edit-section-label">Data Type</label>
          <div className="stats-edit-toggle">
            {['weekly', 'monthly'].map(r => (
              <button
                key={r}
                type="button"
                className={`stats-edit-toggle-btn${editRange === r ? ' stats-edit-toggle-btn--active' : ''}`}
                onClick={() => handleEditRangeChange(r)}
              >
                {r === 'weekly' ? 'Weekly Snapshot' : 'Monthly Summary'}
              </button>
            ))}
          </div>
          <p className="stats-edit-hint">
            {editRange === 'weekly'
              ? 'Active listings · Price reductions · Avg DOM · New listings'
              : 'Pending · Closed · Months of supply · Median price'}
          </p>
        </div>

        {/* Metric rows */}
        <div className="stats-edit-section">
          <div className="stats-edit-col-headers">
            <span>Metric</span>
            <span>Value</span>
            <span>Change</span>
            <span>Dir</span>
          </div>
          {editMetrics.map((m, i) => (
            <MetricRow key={m.metric} metric={m} onChange={updated => updateMetric(i, updated)} />
          ))}
        </div>

        <div className="panel-footer">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Numbers'}
          </Button>
        </div>
      </SlidePanel>
    </div>
  )
}
