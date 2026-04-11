/**
 * Airtable → Supabase migration
 * Run once: node scripts/migrate.mjs
 *
 * Migrates: Clients, Transactions, Weekly Stats
 */

import { createClient } from '@supabase/supabase-js'

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_KEY

const AIRTABLE_TOKEN   = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

const AT_TABLES = {
  CLIENTS:      'tbllWOGVqlugNXvZc',
  TRANSACTIONS: 'tblQVipUDDFNRrsJ8',
  WEEKLY_STATS: 'tblQls1YlwuJdZO0W',
  PROPERTIES:   'tblwHREOoxk8YlACE',
  SHOWINGS:     'tbliTUXkuWFthNnL7',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fetchAirtable(tableId) {
  const records = []
  let offset
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`)
    if (offset) url.searchParams.set('offset', offset)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
    const json = await res.json()
    if (json.error) throw new Error(`Airtable: ${json.error.message}`)
    records.push(...json.records.map(r => ({ _id: r.id, ...r.fields })))
    offset = json.offset
  } while (offset)
  return records
}

async function insert(table, rows, label) {
  if (!rows.length) { console.log(`  ⏭  ${label}: nothing to insert`); return [] }
  const { data, error } = await supabase.from(table).insert(rows).select()
  if (error) throw new Error(`Supabase ${table}: ${error.message}`)
  console.log(`  ✓  ${label}: inserted ${data.length} rows`)
  return data
}

// ─── Migration ────────────────────────────────────────────────────────────────
console.log('\n🚀 Antigravity RE — Airtable → Supabase migration\n')

// 1. Clients → contacts
console.log('📋 Migrating clients...')
const atClients = await fetchAirtable(AT_TABLES.CLIENTS)
const contactRows = atClients.map(c => ({
  name:           c['Name']             ?? 'Unknown',
  email:          c['Email']            ?? null,
  phone:          c['Phone']            ?? null,
  type:           'buyer',
  notes:          c['Notes']            ?? null,
  budget_min:     c['Budget']           ?? null,
  bba_signed:     c['BBA Agreement Signed'] ?? false,
  bba_expiration_date: c['BBA Expiry Date'] ?? null,
}))
const insertedContacts = await insert('contacts', contactRows, 'Clients')

// Build name → supabase id map for linking transactions
const contactMap = {}
insertedContacts.forEach((c, i) => {
  contactMap[atClients[i]['Name']?.trim().toLowerCase()] = c.id
})

// 2. Transaction properties → properties table first
console.log('\n🏠 Migrating transaction properties...')
const atTransactions = await fetchAirtable(AT_TABLES.TRANSACTIONS)
const uniqueAddresses = [...new Set(
  atTransactions.map(t => t['Property Address']).filter(Boolean)
)]
const propertyRows = uniqueAddresses.map(addr => {
  // Parse "9603 E Theia Dr. Mesa AZ 85212" → city, zip
  const parts = addr.split(',').map(s => s.trim())
  const addressLine = parts[0] ?? addr
  const cityStateZip = parts[1] ?? ''
  const cityMatch = cityStateZip.match(/^([A-Za-z\s]+?)(?:\s+AZ\s+(\d{5}))?$/)
  return {
    address: addressLine,
    city:    cityMatch?.[1]?.trim() ?? null,
    state:   'AZ',
    zip:     cityMatch?.[2]     ?? null,
  }
})
const insertedProperties = await insert('properties', propertyRows, 'Properties')

// Build address → supabase id map
const propertyMap = {}
insertedProperties.forEach((p, i) => {
  propertyMap[uniqueAddresses[i]] = p.id
})

// 3. Transactions
console.log('\n💼 Migrating transactions...')
const transactionRows = atTransactions.map(t => {
  const nameKey   = t['Client Name']?.trim().replace(/\n/g, '').toLowerCase()
  const addrKey   = t['Property Address']?.trim()
  return {
    contact_id:           contactMap[nameKey]       ?? null,
    property_id:          propertyMap[addrKey]      ?? null,
    status:               t['Status']               ?? null,
    escrow_opened:        t['Escrow Opened']        ?? false,
    inspection_scheduled: t['Inspection Scheduled'] ?? false,
    binsr_submitted:      t['BINSR Submitted']      ?? null,
    closing_date:         t['Closing Date']         ?? null,
  }
})
await insert('transactions', transactionRows, 'Transactions')

// 4. Weekly Stats
console.log('\n📊 Migrating weekly stats...')
const atWeekly = await fetchAirtable(AT_TABLES.WEEKLY_STATS)
if (atWeekly.length === 0) {
  console.log('  ⏭  Weekly Stats: table is empty in Airtable — skipping')
} else {
  const weeklyRows = atWeekly.map(w => ({
    week_id:            w['Week ID'],
    productivity_days:  w['Productivity Days']  ?? null,
    hours_prospected:   w['Hours Prospected']   ?? null,
    hours_practiced:    w['Hours Practiced']    ?? null,
    live_contacts:      w['Live Contacts']      ?? null,
    added_to_pc:        w['Added to PC']        ?? null,
    new_leads:          w['New Leads']          ?? null,
    listing_appts_set:  w['Listing Appts Set']  ?? null,
    listing_appts_held: w['Listing Appts Held'] ?? null,
    listings_taken:     w['Listings Taken']     ?? null,
    listings_sold:      w['Listings Sold']      ?? null,
    buyer_reps_signed:  w['Buyer Reps Signed']  ?? null,
    buyer_sales:        w['Buyer Sales']        ?? null,
    open_house_events:  w['Open House Events']  ?? null,
    sales_closed:       w['Sales Closed']       ?? null,
    earned_income:      w['Earned Income']      ?? null,
    paid_income:        w['Paid Income']        ?? null,
  }))
  await insert('weekly_stats', weeklyRows, 'Weekly Stats')
}

console.log('\n✅ Migration complete!\n')
