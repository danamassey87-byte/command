/**
 * Seed Supabase from Airtable data
 * Run: cd frontend && node scripts/seed-from-airtable.js
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env.local manually
const envFile = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) envVars[k.trim()] = v.join('=').trim()
})

const url = envVars.VITE_SUPABASE_URL
const key = envVars.VITE_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env'); process.exit(1) }

const supabase = createClient(url, key)

async function q(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

// ─── Clients from Airtable ───
const clients = [
  {
    name: 'Gary Biddlingmeier',
    email: 'gbiddling@yahoo.com',
    phone: '480-815-6770',
    type: 'buyer',
    stage: 'Active Search',
    bba_signed: false,
    notes: null,
  },
  {
    name: 'Sharon Erpestad',
    email: 'wilderwoman03@yahoo.com',
    phone: '507-822-0713',
    type: 'buyer',
    stage: 'Active Search',
    budget_max: 250000,
    bba_signed: true,
    bba_expiration_date: '2027-01-07',
    notes: "Looking for $250K or less\nOK for fixer upper if we can get her something in a nice neighborhood for a good price.\nShe likes smaller communities like the Wells 55+ mobile home community\nHas dog so looking for pet friendly.\nNo stairs - would prefer a condo if possible.",
  },
  {
    name: 'Carol and Darek Vankirk',
    email: 'carolvk@outlook.com',
    phone: '515-490-4655',
    type: 'buyer',
    stage: 'Showing',
    budget_max: 700000,
    bba_signed: false,
    notes: null,
  },
  {
    name: 'Jamie Turner',
    email: 'jamietjr@aol.com',
    phone: '480-298-7295',
    type: 'buyer',
    stage: 'Active Search',
    budget_min: 300000,
    budget_max: 500000,
    bba_signed: true,
    notes: "Setup search in MLS.\n3 bed/2bath // 2000sqft minimum // in ground pool // $300K-$500K budget\nGoing through divorce - possible cash buyer\n$350-$450K - San Tan/Queen Creek area - 2 twin teen boys go to Casteel so want to keep them in there.",
  },
  {
    name: 'Steve and Deb Ostertag',
    email: 'sostertag@gmail.com',
    phone: '585-233-1050',
    type: 'buyer',
    stage: 'New Lead',
    bba_signed: false,
    bba_expiration_date: '2026-02-04',
    notes: null,
  },
]

// ─── Showings from Airtable ───
const showings = [
  // Jamie Turner showings
  { client: 'Jamie Turner', address: '835 E Stirrup Ln.', city: 'San Tan Valley', date: '2025-12-14', time: '10:00', interest: 'high', feedback: 'Need to check on solar loan balance and payments. Really liked the layout. Large backyard and pool. Has possible chicken coop house in back. Needs some tile repairs, new paint, and new carpet. Had a really great flow to the home.' },
  { client: 'Jamie Turner', address: '29986 N Little Leaf Dr.', city: 'San Tan Valley', date: '2025-12-14', time: '10:01', interest: null, feedback: null },
  { client: 'Jamie Turner', address: '28232 N Abby Cir', city: 'San Tan Valley', date: '2025-12-14', time: '10:02', interest: 'low', feedback: 'Too small. Not a good layout.' },
  { client: 'Jamie Turner', address: '566 W Love Rd.', city: 'San Tan Valley', date: '2025-12-07', time: '10:04', interest: 'high', feedback: 'Tall ceilings. Not a good layout.' },
  { client: 'Jamie Turner', address: '4594 E Jadeite Dr.', city: 'San Tan Valley', date: '2026-01-18', time: '15:00', interest: 'medium', feedback: 'Liked the kitchen. Weird industrial light over the dining table area. Staircase in front opens to front door and to the livingroom so it has dual entry.' },
  { client: 'Jamie Turner', address: '433 E Lakeview Dr.', city: 'San Tan Valley', date: '2026-01-18', time: '15:40', interest: 'medium', feedback: null },
  { client: 'Jamie Turner', address: '2993 W Sunshine Butte Dr.', city: 'Queen Creek', date: '2026-01-18', time: '16:20', interest: 'medium', feedback: 'Weird vents above all doors. No pool. Barking dog next door. Block wall in back has warping. Boys liked this one. Very tall door and ceilings.' },
  { client: 'Jamie Turner', address: '4178 E Shapinsay Dr.', city: 'San Tan Valley', date: '2026-01-19', time: '17:14', interest: 'low', feedback: 'Possible new carpet. Kitchen right off front door. Very large rooms and closets. New paint. Did NOT like the kitchen at the front.' },

  // Sharon Erpestad showings
  { client: 'Sharon Erpestad', address: '201 S Greenfield Rd. #176', city: 'Mesa', date: '2026-01-11', time: '10:09', interest: 'low', feedback: null },
  { client: 'Sharon Erpestad', address: '110 S 72nd Way', city: 'Mesa', date: '2026-01-11', time: '10:09', interest: 'low', feedback: 'Newly remodeled - brand new appliances and floor throughout the home. Front irrigation ran on top of sidewalk. Fully fenced + shop with cooling unit and extra storage area.' },
  { client: 'Sharon Erpestad', address: '5735 E McDowell Rd #410', city: 'Mesa', date: '2026-01-11', time: '10:08', interest: 'low', feedback: null },
  { client: 'Sharon Erpestad', address: '5735 E McDowell Rd #453', city: 'Mesa', date: '2026-01-11', time: '10:08', interest: 'low', feedback: null },
  { client: 'Sharon Erpestad', address: '131 N Higley Rd #114', city: 'Mesa', date: '2026-01-11', time: '10:08', interest: 'low', feedback: 'AC Unit at front door. No dishwasher. Possible mold in dryer cabinet in guest closet. Nice patio with clubhouse view. Loves community.' },
  { client: 'Sharon Erpestad', address: '5455 E Baltimore St', city: 'Mesa', date: '2026-01-11', time: '10:09', interest: 'low', feedback: null },
  { client: 'Sharon Erpestad', address: '60 S 72nd St', city: 'Mesa', date: '2026-01-11', time: '10:10', interest: 'low', feedback: null },
  { client: 'Sharon Erpestad', address: '7250 E Arbor Ave', city: 'Mesa', date: '2026-01-11', time: '10:10', interest: 'low', feedback: 'Showers peeling. Warped wall in the hallway. Weird smell. Carpet needs replaced in master bedroom. Arched windows + lots of beautiful plants and landscaping. Screened AZ room. Basement**. Wood kitchen cabinets. Weird niche in the second livingroom.' },
  { client: 'Sharon Erpestad', address: '202 S 72nd Pl', city: 'Mesa', date: '2026-01-11', time: '10:11', interest: 'high', feedback: 'Different flooring throughout. Bay bar area. Fully fenced yard. Citrus trees out back. Clothes line. Back patio + drive area and full side patio. Nice workshop. Extra storage room. Cozy feel. Different medicine cabinets in master bath. Showers are old brown/yellow in color. Electric wiring run on the wall of the master bedroom.' },
  { client: 'Sharon Erpestad', address: '1342 W Emerald Ave #380', city: 'Mesa', date: '2026-01-11', time: '10:10', interest: null, feedback: null },
  { client: 'Sharon Erpestad', address: '7419 E Abilene Ave', city: 'Mesa', date: '2026-01-20', time: '10:07', interest: 'medium', feedback: null },
  { client: 'Sharon Erpestad', address: '7425 E Abilene Ave', city: 'Mesa', date: '2026-01-20', time: '10:07', interest: 'medium', feedback: null },
  { client: 'Sharon Erpestad', address: '5735 E McDowell Rd. #453', city: 'Mesa', date: '2026-01-20', time: '10:05', interest: null, feedback: null },
  { client: 'Sharon Erpestad', address: '131 N Higley Rd. #16', city: 'Mesa', date: '2026-01-20', time: '10:06', interest: 'high', feedback: 'Furniture can be purchased or included in sale. Really loved this community. Repaint red walls.' },
  { client: 'Sharon Erpestad', address: '145 N 74th St. #108', city: 'Mesa', date: '2026-01-20', time: '10:06', interest: 'medium', feedback: null },
  { client: 'Sharon Erpestad', address: '725 S Power Rd. #104', city: 'Mesa', date: '2026-01-20', time: '10:06', interest: 'low', feedback: null },

  // Carol Vankirk showings
  { client: 'Carol and Darek Vankirk', address: '2222 S Yellow Wood', city: 'Mesa', date: '2026-02-04', time: '10:30', interest: null, feedback: null },
  { client: 'Carol and Darek Vankirk', address: '2325 S Olivewood', city: 'Mesa', date: '2026-02-04', time: '10:00', interest: null, feedback: null },
  { client: 'Carol and Darek Vankirk', address: '2325 S Olivewood', city: 'Mesa', date: '2026-02-06', time: '14:30', interest: 'high', feedback: null },
  { client: 'Carol and Darek Vankirk', address: '2535 S Wattlewood', city: 'Mesa', date: '2026-02-06', time: '14:50', interest: null, feedback: null },
  { client: 'Carol and Darek Vankirk', address: '2635 S Wattlewood', city: 'Mesa', date: '2026-02-06', time: '15:10', interest: null, feedback: null },
  { client: 'Carol and Darek Vankirk', address: '2349 S Olivewood', city: 'Mesa', date: '2026-03-11', time: '14:30', interest: null, feedback: null },
  { client: 'Carol and Darek Vankirk', address: '2660 S Tambor', city: 'Mesa', date: '2026-03-11', time: '15:00', interest: null, feedback: null },
  { client: 'Carol and Darek Vankirk', address: '2325 S Olivewood', city: 'Mesa', date: '2026-03-11', time: '15:10', interest: 'high', feedback: null },
]

// ─── Main ───
async function main() {
  console.log('Seeding Supabase from Airtable data...\n')

  // 1. Insert contacts
  console.log(`Inserting ${clients.length} contacts...`)
  const contactMap = {}
  for (const c of clients) {
    // Check if contact already exists by name
    const existing = await q(supabase.from('contacts').select('id').eq('name', c.name).maybeSingle())
    if (existing) {
      console.log(`  ✓ ${c.name} (already exists)`)
      contactMap[c.name] = existing.id
      continue
    }
    const row = await q(supabase.from('contacts').insert(c).select().single())
    console.log(`  + ${c.name}`)
    contactMap[c.name] = row.id
  }

  // 2. Insert properties + showing sessions + showings
  console.log(`\nInserting ${showings.length} showings across properties and sessions...`)

  // Group showings by client + date to create sessions
  const sessionGroups = {}
  for (const s of showings) {
    const key = `${s.client}|${s.date}`
    if (!sessionGroups[key]) sessionGroups[key] = { client: s.client, date: s.date, showings: [] }
    sessionGroups[key].showings.push(s)
  }

  const propertyCache = {}

  for (const [, group] of Object.entries(sessionGroups)) {
    const contactId = contactMap[group.client]
    if (!contactId) { console.log(`  ! Skipping session for ${group.client} (no contact)`); continue }

    // Create showing session
    const session = await q(supabase.from('showing_sessions').insert({
      contact_id: contactId,
      date: group.date,
    }).select().single())

    console.log(`  Session: ${group.client} on ${group.date} (${group.showings.length} properties)`)

    for (const s of group.showings) {
      // Ensure property exists
      const addrKey = `${s.address}|${s.city}`
      if (!propertyCache[addrKey]) {
        const existing = await q(supabase.from('properties').select('id').eq('address', s.address).maybeSingle())
        if (existing) {
          propertyCache[addrKey] = existing.id
        } else {
          const prop = await q(supabase.from('properties').insert({
            address: s.address,
            city: s.city,
          }).select().single())
          propertyCache[addrKey] = prop.id
        }
      }

      // Map interest level
      let interest = null
      if (s.interest === 'high') interest = 'high'
      else if (s.interest === 'medium') interest = 'medium'
      else if (s.interest === 'low') interest = 'low'

      // Create showing
      await q(supabase.from('showings').insert({
        session_id: session.id,
        property_id: propertyCache[addrKey],
        status: 'toured',
        interest_level: interest,
        buyer_feedback: s.feedback,
      }).select().single())

      console.log(`    → ${s.address}, ${s.city}${interest ? ` [${interest}]` : ''}`)
    }
  }

  // 3. Insert transactions
  console.log('\nInserting transactions...')
  const transactions = [
    { client: 'Gary Biddlingmeier', address: '5085 North Granite Reef Road', city: 'Scottsdale' },
    { client: 'Carol and Darek Vankirk', address: '2325 S Olivewood Dr.', city: 'Mesa', status: 'Offer Submitted' },
    { client: 'Jamie Turner', address: null, city: null },
    { client: 'Sharon Erpestad', address: null, city: null },
  ]

  for (const t of transactions) {
    const contactId = contactMap[t.client]
    if (!contactId) continue

    let propertyId = null
    if (t.address) {
      const addrKey = `${t.address}|${t.city}`
      if (!propertyCache[addrKey]) {
        const existing = await q(supabase.from('properties').select('id').eq('address', t.address).maybeSingle())
        if (existing) {
          propertyCache[addrKey] = existing.id
        } else {
          const prop = await q(supabase.from('properties').insert({ address: t.address, city: t.city }).select().single())
          propertyCache[addrKey] = prop.id
        }
      }
      propertyId = propertyCache[addrKey]
    }

    // Check if transaction exists
    const existing = await q(supabase.from('transactions').select('id').eq('contact_id', contactId).maybeSingle())
    if (existing) {
      console.log(`  ✓ ${t.client} (already exists)`)
      continue
    }

    await q(supabase.from('transactions').insert({
      contact_id: contactId,
      property_id: propertyId,
      status: t.status || null,
    }).select().single())
    console.log(`  + ${t.client}${t.address ? ` — ${t.address}` : ''}`)
  }

  console.log('\nDone! All data seeded.')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
