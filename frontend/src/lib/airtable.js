// ─── Airtable REST API Service ───────────────────────────────────────────────
// Base: Client Tracker (app2Uzee1RzILwUQf)
// Token: set VITE_AIRTABLE_TOKEN in .env.local

const BASE_ID = 'app2Uzee1RzILwUQf'
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`

export const TABLES = {
  CLIENTS:      'tbllWOGVqlugNXvZc',
  SHOWINGS:     'tbliTUXkuWFthNnL7',
  PROPERTIES:   'tblwHREOoxk8YlACE',
  TRANSACTIONS: 'tblQVipUDDFNRrsJ8',
  OPPORTUNITIES:'tblzbkWf23RrVveN1',
  HISTORY:      'tblNEUko4VmlNkUba',
  GOALS:        'tblw1SoLAtQ7Yr97b',
  WEEKLY_STATS: 'tblQls1YlwuJdZO0W',
}

function headers() {
  const token = import.meta.env.VITE_AIRTABLE_TOKEN
  if (!token) throw new Error('VITE_AIRTABLE_TOKEN is not set in .env.local')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

// Recursively fetch all pages from a table
async function fetchAll(tableId, options = {}) {
  const records = []
  let offset = undefined

  do {
    const url = new URL(`${API_ROOT}/${tableId}`)
    if (options.sort) {
      options.sort.forEach((s, i) => {
        url.searchParams.set(`sort[${i}][field]`, s.field)
        if (s.direction) url.searchParams.set(`sort[${i}][direction]`, s.direction)
      })
    }
    if (options.fields) {
      options.fields.forEach((f, i) => url.searchParams.set(`fields[${i}]`, f))
    }
    if (options.filterByFormula) {
      url.searchParams.set('filterByFormula', options.filterByFormula)
    }
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message ?? `Airtable ${res.status}`)
    }
    const data = await res.json()
    records.push(...data.records.map(r => ({ id: r.id, createdTime: r.createdTime, ...r.fields })))
    offset = data.offset
  } while (offset)

  return records
}

async function createRecord(tableId, fields) {
  const res = await fetch(`${API_ROOT}/${tableId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Airtable ${res.status}`)
  }
  const data = await res.json()
  return { id: data.id, ...data.fields }
}

async function updateRecord(tableId, recordId, fields) {
  const res = await fetch(`${API_ROOT}/${tableId}/${recordId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Airtable ${res.status}`)
  }
  const data = await res.json()
  return { id: data.id, ...data.fields }
}

// ─── Table-specific fetchers ──────────────────────────────────────────────────

export const getClients = () =>
  fetchAll(TABLES.CLIENTS, { sort: [{ field: 'Name', direction: 'asc' }] })

export const getTransactions = () =>
  fetchAll(TABLES.TRANSACTIONS)

export const getShowings = () =>
  fetchAll(TABLES.SHOWINGS, { sort: [{ field: 'Date', direction: 'desc' }] })

export const getProperties = () =>
  fetchAll(TABLES.PROPERTIES)

export const getOpportunities = () =>
  fetchAll(TABLES.OPPORTUNITIES)

export const getHistory = () =>
  fetchAll(TABLES.HISTORY, { sort: [{ field: 'Date', direction: 'desc' }] })

export const getGoals = () =>
  fetchAll(TABLES.GOALS)

export const getWeeklyStats = () =>
  fetchAll(TABLES.WEEKLY_STATS, { sort: [{ field: 'Week ID', direction: 'desc' }] })

// ─── Writers ─────────────────────────────────────────────────────────────────

export const createClient = (fields) => createRecord(TABLES.CLIENTS, fields)
export const updateClient = (id, fields) => updateRecord(TABLES.CLIENTS, id, fields)

export const createTransaction = (fields) => createRecord(TABLES.TRANSACTIONS, fields)
export const updateTransaction = (id, fields) => updateRecord(TABLES.TRANSACTIONS, id, fields)

export const createWeeklyStats = (fields) => createRecord(TABLES.WEEKLY_STATS, fields)
export const updateWeeklyStats = (id, fields) => updateRecord(TABLES.WEEKLY_STATS, id, fields)

export const createShowing = (fields) => createRecord(TABLES.SHOWINGS, fields)
export const updateShowing = (id, fields) => updateRecord(TABLES.SHOWINGS, id, fields)

export const createOpportunity = (fields) => createRecord(TABLES.OPPORTUNITIES, fields)
export const updateOpportunity = (id, fields) => updateRecord(TABLES.OPPORTUNITIES, id, fields)
