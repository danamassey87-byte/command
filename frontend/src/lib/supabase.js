import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default supabase

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function query(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

// ─── Contacts ────────────────────────────────────────────────────────────────
// All "list" queries hide soft-deleted + archived rows by default. Use the
// safeguards.js helpers (getTrashRecords, restore) to access them.
export const getContacts  = ()     => query(supabase.from('contacts').select('*')
  .is('deleted_at', null).is('archived_at', null).order('name'))
export const getBuyers    = ()     => query(supabase.from('contacts').select('*')
  .in('type', ['buyer', 'both']).is('deleted_at', null).is('archived_at', null).order('name'))
export const getSellers   = ()     => query(supabase.from('contacts').select('*')
  .in('type', ['seller', 'both']).is('deleted_at', null).is('archived_at', null).order('name'))
export const createContact = (d)  => query(supabase.from('contacts').insert(d).select().single())
// updateContact runs through updateWithAudit so every change is field-diffed
export const updateContact = async (id, d) => {
  const { updateWithAudit } = await import('./safeguards')
  return updateWithAudit('contacts', id, d)
}
// deleteContact is now soft-delete (recoverable for 30 days)
export const deleteContact = async (id) => {
  const { softDelete } = await import('./safeguards')
  return softDelete('contacts', id)
}

// ─── Properties ──────────────────────────────────────────────────────────────
export const getProperties  = ()      => query(supabase.from('properties').select('*')
  .is('deleted_at', null).is('archived_at', null).order('address'))

/** Find existing property by google_place_id (preferred), MLS id, or normalized address.
 *  Creates a new row if no match. Returns the property id.
 *
 *  Accepts a `place` object from AddressAutocomplete (placeToProperty output) OR the
 *  legacy {address, city, zip} shape for manual entry / Airtable migration.
 */
export async function ensureProperty({
  google_place_id = null,
  formatted_address = null,
  latitude = null,
  longitude = null,
  address,
  city = null,
  zip = null,
  state = 'AZ',
  neighborhood = null,
  county = null,
  mls_id = null,
  price = null,
  dom = null,
  expired_date = null,
}) {
  if (!google_place_id && !address?.trim()) {
    throw new Error('Either google_place_id or address is required')
  }

  // 1. Google place_id exact match — preferred canonical key
  if (google_place_id) {
    const { data: byPlace } = await supabase.from('properties').select('id')
      .eq('google_place_id', google_place_id).is('deleted_at', null).limit(1)
    if (byPlace?.length > 0) return byPlace[0].id
  }

  // 2. MLS-id exact match
  if (mls_id?.trim()) {
    const { data: byMls } = await supabase.from('properties').select('id')
      .eq('mls_id', mls_id.trim()).is('deleted_at', null).limit(1)
    if (byMls?.length > 0) return byMls[0].id
  }

  // 3. Normalized-address match (fallback for legacy rows without place_id)
  if (address?.trim()) {
    const norm = address.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    let normQ = supabase.from('properties').select('id')
      .eq('normalized_address', norm).is('deleted_at', null).limit(1)
    if (zip) normQ = normQ.eq('zip', zip)
    const { data: byNorm } = await normQ
    if (byNorm?.length > 0) return byNorm[0].id
  }

  // 4. Create — store every Google field we have so future dedupe is easy
  const result = await createProperty({
    google_place_id,
    formatted_address,
    latitude,
    longitude,
    address: address?.trim() || formatted_address || '',
    city,
    state,
    zip,
    neighborhood,
    county,
    mls_id,
    price: price ? Number(price) : null,
    dom: dom ? Number(dom) : null,
    expired_date,
  })
  return result.id
}
export const createProperty  = (d)   => query(supabase.from('properties').insert(d).select().single())
export const updateProperty  = async (id, d) => {
  const { updateWithAudit } = await import('./safeguards')
  return updateWithAudit('properties', id, d)
}
export const deleteProperty = async (id) => {
  const { softDelete } = await import('./safeguards')
  return softDelete('properties', id)
}

/** Get properties with all detail fields for content/marketing use */
export const getPropertiesForContent = () =>
  query(supabase.from('properties').select('*')
    .is('deleted_at', null).is('archived_at', null).order('address'))

// ─── Listings ────────────────────────────────────────────────────────────────
export const getListings = () =>
  query(supabase.from('listings').select(`
    *, contact:contacts(id,name,email,phone), property:properties(*)
  `).is('deleted_at', null).is('archived_at', null).order('created_at', { ascending: false }))

export const getListingById = (id) =>
  query(supabase.from('listings').select(`
    *, contact:contacts(id,name,email,phone), property:properties(*)
  `).eq('id', id).maybeSingle())

export const createListing  = (d)      => query(supabase.from('listings').insert(d).select().single())
export const updateListing  = async (id, d) => {
  const { updateWithAudit } = await import('./safeguards')
  return updateWithAudit('listings', id, d)
}
export const deleteListing  = async (id) => {
  const { softDelete } = await import('./safeguards')
  return softDelete('listings', id)
}

// ─── Listing Appointments (seller consultations) ─────────────────────────────
export const getListingAppointments = () =>
  query(supabase.from('listing_appointments').select(`
    *, contact:contacts(id,name,email,phone), property:properties(id,address,city,zip)
  `).is('deleted_at', null).is('archived_at', null).order('scheduled_at', { ascending: false }))

export const createListingAppointment = (d) =>
  query(supabase.from('listing_appointments').insert(d).select(`
    *, contact:contacts(id,name), property:properties(id,address)
  `).single())

export const updateListingAppointment = async (id, d) => {
  const { updateWithAudit } = await import('./safeguards')
  return updateWithAudit('listing_appointments', id, d)
}

export const deleteListingAppointment = async (id) => {
  const { softDelete } = await import('./safeguards')
  return softDelete('listing_appointments', id)
}

// ─── Checklist Tasks ─────────────────────────────────────────────────────────
// Active tasks only — soft-deleted rows are hidden from the main listing view
// but recoverable via getDeletedTasksForListing + restoreTask.
export const getTasksForListing = (listingId) =>
  query(supabase.from('checklist_tasks').select('*')
    .eq('listing_id', listingId)
    .is('deleted_at', null)
    .order('sort_order'))

export const getDeletedTasksForListing = (listingId) =>
  query(supabase.from('checklist_tasks').select('*')
    .eq('listing_id', listingId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false }))

export const createTask  = (d)      => query(supabase.from('checklist_tasks').insert(d).select().single())
export const updateTask  = (id, d)  => query(supabase.from('checklist_tasks').update(d).eq('id', id).select().single())
// Soft delete — sets deleted_at so the task can be restored later.
export const deleteTask  = (id)     =>
  query(supabase.from('checklist_tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id))
export const restoreTask = (id)     =>
  query(supabase.from('checklist_tasks').update({ deleted_at: null }).eq('id', id))
export const hardDeleteTask = (id)  => query(supabase.from('checklist_tasks').delete().eq('id', id))
export const bulkCreateTasks = (rows) => query(supabase.from('checklist_tasks').insert(rows).select())

// ─── Listing Parties (per-listing) ───────────────────────────────────────────
// Each listing can have many parties (co-signers, agents, TC, escrow, vendors).
// A party row can EITHER reference a vendors row OR store a one-off contact.
export const getPartiesForListing = (listingId) =>
  query(supabase.from('listing_parties').select(`
    *, vendor:vendors(id, name, company, role, email, phone, website, address_line_1, city, state, zip, preferred)
  `).eq('listing_id', listingId).is('deleted_at', null).order('sort_order'))

export const createListingParty = (d) =>
  query(supabase.from('listing_parties').insert(d).select().single())
export const updateListingParty = (id, d) =>
  query(supabase.from('listing_parties').update(d).eq('id', id).select().single())
export const deleteListingParty = (id) =>
  query(supabase.from('listing_parties').update({ deleted_at: new Date().toISOString() }).eq('id', id))

// ─── Listing Documents ───────────────────────────────────────────────────────
export const getDocumentsForListing = (listingId) =>
  query(supabase.from('listing_documents').select('*').eq('listing_id', listingId).order('created_at', { ascending: false }))

export const deleteDocument = async (id, filePath) => {
  await supabase.storage.from('listing-documents').remove([filePath])
  return query(supabase.from('listing_documents').delete().eq('id', id))
}

export async function uploadListingDocument(file, listingId) {
  const ext = file.name.split('.').pop()
  const path = `${listingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('listing-documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data: { publicUrl } } = supabase.storage.from('listing-documents').getPublicUrl(path)
  const doc = await query(supabase.from('listing_documents').insert({
    listing_id: listingId,
    name: file.name,
    file_url: publicUrl,
    file_path: path,
    file_type: file.type || ext,
    file_size: file.size,
  }).select().single())
  return doc
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export const getTransactions = () =>
  query(supabase.from('transactions').select(`
    *, contact:contacts(id,name,email,phone), property:properties(id,address,city,price)
  `).order('created_at', { ascending: false }))

export const createTransaction  = (d)      => query(supabase.from('transactions').insert(d).select().single())
export const updateTransaction  = (id, d)  => query(supabase.from('transactions').update(d).eq('id', id).select().single())

// ─── Showing Sessions ────────────────────────────────────────────────────────
export const getShowingSessions = () =>
  query(supabase.from('showing_sessions').select(`
    *, contact:contacts(id,name), showings(id,status,interest_level,property:properties(id,address,city,price))
  `).order('date', { ascending: false }))

export const createShowingSession  = (d)      => query(supabase.from('showing_sessions').insert(d).select().single())
export const updateShowingSession  = (id, d)  => query(supabase.from('showing_sessions').update(d).eq('id', id).select().single())
export const createShowing         = (d)      => query(supabase.from('showings').insert(d).select().single())
export const updateShowing         = (id, d)  => query(supabase.from('showings').update(d).eq('id', id).select().single())

// ─── Open Houses ─────────────────────────────────────────────────────────────
export const getOpenHouses = () =>
  query(supabase.from('open_houses').select(`
    *, property:properties(id,address,city)
  `).order('date', { ascending: false }))

export const createOpenHouse  = (d)      => query(supabase.from('open_houses').insert(d).select().single())
export const updateOpenHouse  = (id, d)  => query(supabase.from('open_houses').update(d).eq('id', id).select().single())
export const deleteOpenHouse  = (id)     => query(supabase.from('open_houses').delete().eq('id', id))

// ─── Seller Showings (other agents showing your listings) ─────────────────────
export const getSellerShowings  = async () => {
  try { return await query(supabase.from('seller_showings').select('*').order('showing_date', { ascending: false })) }
  catch { return [] }
}
export const createSellerShowing = (d)    => query(supabase.from('seller_showings').insert(d).select().single())
export const updateSellerShowing = (id,d) => query(supabase.from('seller_showings').update(d).eq('id', id).select().single())
export const deleteSellerShowing = (id)   => query(supabase.from('seller_showings').delete().eq('id', id))

// ─── OH Tasks ─────────────────────────────────────────────────────────────────
export const getOHTasksForOH   = (ohId)  => query(supabase.from('oh_tasks').select('*').eq('open_house_id', ohId).order('sort_order'))
export const createOHTask      = (d)     => query(supabase.from('oh_tasks').insert(d).select().single())
export const updateOHTask      = (id, d) => query(supabase.from('oh_tasks').update(d).eq('id', id).select().single())
export const deleteOHTask      = (id)    => query(supabase.from('oh_tasks').delete().eq('id', id))
export const bulkCreateOHTasks = (rows)  => query(supabase.from('oh_tasks').insert(rows).select())

// ─── OH Outreach ──────────────────────────────────────────────────────────────
export const getOHOutreach    = ()       => query(supabase.from('oh_outreach').select('*').order('outreach_date', { ascending: false }))
export const createOHOutreach = (d)      => query(supabase.from('oh_outreach').insert(d).select().single())
export const updateOHOutreach = (id, d)  => query(supabase.from('oh_outreach').update(d).eq('id', id).select().single())
export const deleteOHOutreach = (id)     => query(supabase.from('oh_outreach').delete().eq('id', id))

// ─── Host Reports ─────────────────────────────────────────────────────────────
export const getHostReports    = ()      => query(supabase.from('host_reports').select(`
    *, listing:listings(id, property:properties(id, address, city))
  `).order('oh_date', { ascending: false }))
export const createHostReport  = (d)      => query(supabase.from('host_reports').insert(d).select().single())
export const updateHostReport  = (id, d)  => query(supabase.from('host_reports').update(d).eq('id', id).select().single())
export const deleteHostReport  = (id)     => query(supabase.from('host_reports').delete().eq('id', id))

// ─── Leads ───────────────────────────────────────────────────────────────────
export const getLeads = () =>
  query(supabase.from('leads').select(`
    *, property:properties(id,address,city,zip,price,mls_id,dom,expired_date)
  `).order('created_at', { ascending: false }))

export const createLead  = (d)      => query(supabase.from('leads').insert(d).select().single())
export const updateLead  = (id, d)  => query(supabase.from('leads').update(d).eq('id', id).select().single())
export const deleteLead  = (id)     => query(supabase.from('leads').delete().eq('id', id))

// ─── Investors ───────────────────────────────────────────────────────────────
export const getInvestors = () =>
  query(supabase.from('investors').select(`
    *, contact:contacts(id,name,email,phone),
    investor_feedback(id,status,notes,property:properties(id,address,city,price))
  `).order('created_at', { ascending: false }))

export const createInvestor       = (d)      => query(supabase.from('investors').insert(d).select().single())
export const updateInvestor       = (id, d)  => query(supabase.from('investors').update(d).eq('id', id).select().single())
export const deleteInvestor       = (id)     => query(supabase.from('investors').delete().eq('id', id))
export const upsertFeedback       = (d)      => query(supabase.from('investor_feedback').upsert(d, { onConflict: 'investor_id,property_id' }).select().single())

// ─── Weekly Stats ─────────────────────────────────────────────────────────────
export const getWeeklyStats   = ()      => query(supabase.from('weekly_stats').select('*').order('week_id', { ascending: false }))
export const createWeeklyStats = (d)   => query(supabase.from('weekly_stats').insert(d).select().single())
export const updateWeeklyStats = (id, d) => query(supabase.from('weekly_stats').update(d).eq('id', id).select().single())

// ─── Goals ───────────────────────────────────────────────────────────────────
export const getGoals   = ()      => query(supabase.from('goals').select('*').order('year', { ascending: false }))
export const upsertGoal = (d)     => query(supabase.from('goals').upsert(d, { onConflict: 'year' }).select().single())

// ─── Activity Log ────────────────────────────────────────────────────────────
export const getActivityLog = (limit = 20) =>
  query(supabase.from('activity_log').select(`
    *, contact:contacts(id,name), property:properties(id,address)
  `).order('created_at', { ascending: false }).limit(limit))

export const logActivity = (type, description, opts = {}) =>
  query(supabase.from('activity_log').insert({
    type, description,
    contact_id:  opts.contactId  ?? null,
    property_id: opts.propertyId ?? null,
    metadata:    opts.metadata   ?? {},
  }))

// ─── Daily Activity ───────────────────────────────────────────────────────────
export const getDailyActivity = (fromDate, toDate) =>
  query(supabase.from('daily_activity').select('*')
    .gte('date', fromDate).lte('date', toDate).order('date', { ascending: false }))

export const upsertDailyActivity = (date, data) =>
  query(supabase.from('daily_activity').upsert({ date, ...data }, { onConflict: 'date' }).select().single())

export const getActivityTargets = () =>
  query(supabase.from('activity_targets').select('*').limit(1).single())

export const updateActivityTargets = (id, data) =>
  query(supabase.from('activity_targets').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single())

// ─── Listing Appointment Checklist ───────────────────────────────────────────
export const getApptChecklist = (apptId) =>
  query(supabase.from('listing_appt_checklist').select('*').eq('appointment_id', apptId).order('sort_order'))

export const updateApptChecklistItem = (id, d) =>
  query(supabase.from('listing_appt_checklist').update(d).eq('id', id).select().single())

export const bulkCreateApptChecklist = (rows) =>
  query(supabase.from('listing_appt_checklist').insert(rows).select())

// ─── Showing Sessions (by contact) ────────────────────────────────────────────
export const getShowingSessionsForContact = (contactId) =>
  query(supabase.from('showing_sessions')
    .select('*, showings(id,status,interest_level,prep_notes,buyer_feedback,feedback_price,feedback_condition,would_offer,follow_up_sent,property:properties(id,address,city,price))')
    .eq('contact_id', contactId)
    .order('date', { ascending: false }))

// ─── Content Pillars ──────────────────────────────────────────────────────────
export const getContentPillars = () =>
  query(supabase.from('content_pillars').select('*').order('sort_order'))
export const createContentPillar = (d) =>
  query(supabase.from('content_pillars').insert(d).select().single())
export const updateContentPillar = (id, d) =>
  query(supabase.from('content_pillars').update(d).eq('id', id).select().single())
export const deleteContentPillar = (id) =>
  query(supabase.from('content_pillars').delete().eq('id', id))

// ─── Content Pieces ───────────────────────────────────────────────────────────
export const getContentPieces = (fromDate, toDate) =>
  query(supabase.from('content_pieces')
    .select(`
      *,
      platform_posts:content_platform_posts(*),
      listing:listings(id, property:properties(id,address,city)),
      property:properties(id,address,city),
      open_house:open_houses(id,date,start_time,end_time,property:properties(id,address))
    `)
    .gte('content_date', fromDate)
    .lte('content_date', toDate)
    .order('content_date'))
export const createContentPiece = (d) =>
  query(supabase.from('content_pieces').insert(d).select().single())
export const updateContentPiece = (id, d) =>
  query(supabase.from('content_pieces').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())
export const deleteContentPiece = (id) =>
  query(supabase.from('content_pieces').delete().eq('id', id))
export const upsertContentPlatformPost = (d) =>
  query(supabase.from('content_platform_posts')
    .upsert(d, { onConflict: 'content_id,platform' }).select().single())

/** Update per-post stats (views, reach, likes, etc.) */
export const updateContentPostStats = (id, stats) =>
  query(supabase.from('content_platform_posts').update({
    ...stats,
    stats_updated_at: new Date().toISOString(),
  }).eq('id', id).select().single())

// ─── Auto-sync social stats (Apify) ──────────────────────────────────────────
/** Invokes the fetch-social-stats edge function for one platform.
 *  Returns { ok, platform, profile, posts } or throws. */
export async function fetchSocialStatsFromApify({ platform, handle, apifyKey, limit = 30 }) {
  const { data, error } = await supabase.functions.invoke('fetch-social-stats', {
    body: { platform, handle, apify_key: apifyKey, limit },
  })
  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error || 'Unknown sync error')
  return data
}

/** Given scraped posts, attempt to match them to existing content_platform_posts
 *  rows by post_url and update stats. Returns number of matches updated. */
export async function applyScrapedPostStats(platform, scrapedPosts) {
  if (!scrapedPosts?.length) return 0

  // Fetch existing platform posts for this platform with a non-null post_url
  const { data: existing, error } = await supabase
    .from('content_platform_posts')
    .select('id, content_id, post_url')
    .eq('platform', platform)
    .not('post_url', 'is', null)
  if (error) throw error

  const byUrl = new Map()
  for (const row of existing ?? []) {
    if (row.post_url) byUrl.set(normalizePostUrl(row.post_url), row)
  }

  let matched = 0
  for (const sp of scrapedPosts) {
    if (!sp.post_url) continue
    const key = normalizePostUrl(sp.post_url)
    const row = byUrl.get(key)
    if (!row) continue
    await updateContentPostStats(row.id, {
      views:       sp.views       || 0,
      reach:       sp.reach       || 0,
      impressions: sp.impressions || 0,
      likes:       sp.likes       || 0,
      comments:    sp.comments    || 0,
      shares:      sp.shares      || 0,
      saves:       sp.saves       || 0,
      clicks:      0,
      stats_source: 'apify',
    })
    matched++
  }
  return matched
}

function normalizePostUrl(url) {
  try {
    const u = new URL(url)
    // Strip trailing slashes, query string, fragment
    return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase()
  } catch {
    return String(url || '').trim().toLowerCase()
  }
}

/** Upsert a weekly social_metrics row from a scraped profile + post list. */
export async function upsertSocialMetricsFromScrape(platform, profile, posts, source = 'apify') {
  const sunday = getLastSunday()
  const agg = {
    likes:    0, comments: 0, shares: 0, saves: 0,
    reach:    0, impressions: 0,
  }
  for (const p of posts ?? []) {
    agg.likes    += p.likes    || 0
    agg.comments += p.comments || 0
    agg.shares   += p.shares   || 0
    agg.saves    += p.saves    || 0
    agg.reach    += p.reach    || 0
    agg.impressions += p.impressions || 0
  }
  const topPosts = (posts ?? [])
    .slice()
    .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
    .slice(0, 5)
    .map(p => ({
      type:     p.type,
      caption:  (p.caption || '').slice(0, 280),
      likes:    p.likes,
      comments: p.comments,
      shares:   p.shares,
      saves:    p.saves,
      views:    p.views,
      post_url: p.post_url,
    }))

  const row = {
    platform,
    week_of:         sunday,
    followers:       profile?.followers || 0,
    followers_change: 0,
    reach:           agg.reach,
    impressions:     agg.impressions,
    likes:           agg.likes,
    comments:        agg.comments,
    shares:          agg.shares,
    saves:           agg.saves,
    posts_count:     posts?.length || 0,
    top_posts:       topPosts,
    extra:           { profile },
    source,
    updated_at:      new Date().toISOString(),
  }

  return query(supabase.from('social_metrics')
    .upsert(row, { onConflict: 'platform,week_of' }).select().single())
}

function getLastSunday() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

/** Full one-shot sync: fetch → match posts → upsert weekly metrics.
 *  Returns { platform, matched, posts_count, profile }. */
export async function syncSocialPlatform({ platform, handle, apifyKey }) {
  const data = await fetchSocialStatsFromApify({ platform, handle, apifyKey })
  const matched = await applyScrapedPostStats(platform, data.posts)
  await upsertSocialMetricsFromScrape(platform, data.profile, data.posts)
  return {
    platform,
    matched,
    posts_count: data.posts?.length || 0,
    profile: data.profile,
  }
}

// ─── Auto Stats for Daily Tracker ────────────────────────────────────────────
export async function getAutoStatsForDate(date) {
  const [lettersRes, outreachRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .gte('letter_sent_at', `${date}T00:00:00`)
      .lte('letter_sent_at', `${date}T23:59:59`),
    supabase.from('oh_outreach').select('contact_method').eq('outreach_date', date),
  ])
  const methods = outreachRes.data ?? []
  return {
    letters_sent: lettersRes.count ?? 0,
    oh_emails:    methods.filter(r => (r.contact_method ?? 'email') === 'email').length,
    oh_texts:     methods.filter(r => r.contact_method === 'text').length,
  }
}
export const markLetterSent = (leadId) =>
  query(supabase.from('leads').update({ letter_sent_at: new Date().toISOString() }).eq('id', leadId).select().single())

// ─── Market Stats Settings ────────────────────────────────────────────────────
export const getMarketStats = () =>
  query(supabase.from('user_settings').select('*').eq('key', 'market_stats').single())
export const updateMarketStats = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'market_stats', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())

// ─── Annual Goals Settings ────────────────────────────────────────────────────
export const getGoalTargets = () =>
  query(supabase.from('user_settings').select('*').eq('key', 'annual_goals').single())
export const updateGoalTargets = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'annual_goals', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())

// ─── Notification Preferences ────────────────────────────────────────────────
export const getNotificationPreferences = () =>
  query(supabase.from('user_settings').select('*').eq('key', 'notification_preferences').maybeSingle())
export const updateNotificationPreferences = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'notification_preferences', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())

// ─── AI Content Generation ────────────────────────────────────────────────────
export async function generateContent(payload) {
  const { data, error } = await supabase.functions.invoke('generate-content', { body: payload })
  if (error) {
    // supabase.functions.invoke wraps non-2xx responses in a FunctionsHttpError.
    // The real structured body (with our `code` + `error` fields from the
    // edge function) lives on error.context (a Response). Unwrap it so
    // callers get a useful message like "AI is not configured yet" instead
    // of the opaque "Edge Function returned a non-2xx status code".
    let friendly = error.message
    let code = null
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) friendly = body.error
        if (body?.code) code = body.code
      }
    } catch { /* body wasn't JSON — fall back to error.message */ }
    const err = new Error(friendly)
    err.code = code
    throw err
  }
  return data
}

// ─── Marketing Pipeline (auto-triggered when listing goes active) ─────────────

/**
 * Comprehensive multi-channel launch template.
 * Each entry creates one content_pieces row.
 *  - day: offset from launch (0 = launch day, negative = pre-launch teaser)
 *  - channel: blog | gmb | instagram | facebook | tiktok | pinterest | email
 *  - format:  post | story | reel | pin | event | article
 *  - concept: short label that becomes part of the title
 *  - notes:   what to say / what to design
 */
const LAUNCH_TEMPLATE = [
  // ─── Pre-launch (Coming Soon) ───
  { day: -3, channel: 'instagram', format: 'story', concept: 'Coming Soon Teaser',         notes: 'Sneak peek of one signature room or exterior. Build anticipation.' },
  { day: -3, channel: 'facebook',  format: 'post',  concept: 'Coming Soon Announcement',   notes: 'Tag the seller (with permission). "Coming soon to the East Valley market…"' },
  { day: -2, channel: 'instagram', format: 'reel',  concept: 'Coming Soon Walk-Through',   notes: 'Quick teaser reel — exterior + 2-3 interior shots, no full reveal.' },
  { day: -1, channel: 'gmb',       format: 'post',  concept: 'Coming Soon GMB Update',     notes: 'Coming Soon post on Google Business Profile with property highlights.' },

  // ─── Day 1: LAUNCH (Just Listed) ───
  { day: 0,  channel: 'instagram', format: 'post',  concept: 'Just Listed Announcement',   notes: 'Hero photo + 2-line emotional headline. Address and price in caption.' },
  { day: 0,  channel: 'instagram', format: 'story', concept: 'Just Listed Story',          notes: 'Story version — large JUST LISTED text + swipe up to listing page.' },
  { day: 0,  channel: 'instagram', format: 'reel',  concept: 'Just Listed Property Tour',  notes: 'Quick walkthrough reel — 15-30 seconds. Music + key features.' },
  { day: 0,  channel: 'facebook',  format: 'post',  concept: 'Just Listed Facebook Post',  notes: 'Carousel of photos + emotional caption. Tag local groups.' },
  { day: 0,  channel: 'tiktok',    format: 'reel',  concept: 'Just Listed Property Tour',  notes: 'Property tour with trending audio. Hook in first 1.5 seconds.' },
  { day: 0,  channel: 'gmb',       format: 'post',  concept: 'Just Listed GMB Post',       notes: 'Just Listed post on Google Business Profile with link to listing.' },
  { day: 0,  channel: 'blog',      format: 'article', concept: 'Just Listed Blog Showcase', notes: 'Long-form blog: hero image, 5-7 photos, neighborhood story, agent bio.' },
  { day: 0,  channel: 'pinterest', format: 'pin',   concept: 'Hero Photo Pin',             notes: 'Vertical hero shot of front of home. Pin to "Homes for Sale" board.' },
  { day: 0,  channel: 'pinterest', format: 'pin',   concept: 'Lifestyle Pin',              notes: 'Interior lifestyle pin — kitchen or living room. Pin to "Home Inspo" board.' },
  { day: 0,  channel: 'email',     format: 'post',  concept: 'Just Listed Email Blast',    notes: 'Email blast to SOI / database with photos and price.' },

  // ─── Day 3: Lifestyle ───
  { day: 2,  channel: 'instagram', format: 'post',  concept: 'Lifestyle Walkthrough',      notes: '"What it\'s like to live here" — focus on daily-life moments and feel.' },
  { day: 2,  channel: 'instagram', format: 'story', concept: 'Behind the Scenes Story',    notes: 'Behind-the-scenes prep, staging details, or seller story.' },
  { day: 2,  channel: 'facebook',  format: 'post',  concept: 'Lifestyle Story',            notes: 'Narrative caption — what makes this house feel like home.' },
  { day: 2,  channel: 'pinterest', format: 'pin',   concept: 'Interior Detail Pin',        notes: 'Close-up detail — countertop, fireplace, built-ins, etc.' },

  // ─── Day 5: Area Spotlight ───
  { day: 4,  channel: 'instagram', format: 'reel',  concept: 'Area Spotlight Reel',        notes: 'Drone or walking footage of the neighborhood, parks, schools, dining.' },
  { day: 4,  channel: 'facebook',  format: 'post',  concept: 'Neighborhood Highlight',     notes: 'Why this area? Schools, commute, dining, community.' },
  { day: 4,  channel: 'tiktok',    format: 'reel',  concept: 'Neighborhood Walk',          notes: '"POV: you\'re moving to this neighborhood" walkthrough TikTok.' },
  { day: 4,  channel: 'gmb',       format: 'post',  concept: 'Local Highlight GMB',        notes: 'Highlight a nearby business or amenity tied to the listing.' },
  { day: 4,  channel: 'pinterest', format: 'pin',   concept: 'Neighborhood Pin',           notes: 'Aerial / map / community photo. Pin to "East Valley Living" board.' },

  // ─── Day 7: Open House ───
  { day: 6,  channel: 'instagram', format: 'post',  concept: 'Open House Announcement',    notes: 'Open house date, time, address. Encourage shares and saves.' },
  { day: 6,  channel: 'instagram', format: 'story', concept: 'Open House Countdown',       notes: 'Countdown sticker story — drives last-minute attendance.' },
  { day: 6,  channel: 'facebook',  format: 'event', concept: 'Open House Facebook Event',  notes: 'Create a Facebook Event so people can RSVP and get reminders.' },
  { day: 6,  channel: 'gmb',       format: 'event', concept: 'Open House GMB Event',       notes: 'Create event on Google Business Profile.' },
  { day: 6,  channel: 'blog',      format: 'article', concept: 'Open House Blog Post',     notes: 'Blog post promoting the open house with map, parking, what to expect.' },

  // ─── Day 10: Feature Highlight ───
  { day: 9,  channel: 'instagram', format: 'post',  concept: 'Feature Highlight',          notes: 'Spotlight a single best feature — pool, kitchen, view, primary suite.' },
  { day: 9,  channel: 'instagram', format: 'story', concept: 'Detail Spotlight Story',     notes: 'Behind-the-scenes detail story.' },
  { day: 9,  channel: 'facebook',  format: 'post',  concept: 'Feature Highlight FB',       notes: 'Highlight the same feature with longer-form caption.' },
  { day: 9,  channel: 'pinterest', format: 'pin',   concept: 'Feature Pin',                notes: 'Pin showing off the highlighted feature.' },

  // ─── Day 14: Social Proof / Showings ───
  { day: 13, channel: 'instagram', format: 'post',  concept: 'Showings Update',            notes: 'Showings update / "still available" / interest level.' },
  { day: 13, channel: 'facebook',  format: 'post',  concept: 'Showings Update FB',         notes: 'Same update, longer-form caption.' },
  { day: 13, channel: 'tiktok',    format: 'reel',  concept: 'Day in the Life',            notes: '"Day in the life of a listing agent" featuring this home.' },

  // ─── Day 21: Price Check / Status ───
  { day: 20, channel: 'instagram', format: 'post',  concept: 'Status Check',               notes: 'Still available reminder OR price reduction announcement.' },
  { day: 20, channel: 'facebook',  format: 'post',  concept: 'Status Update',              notes: 'Same as above, FB version.' },
  { day: 20, channel: 'gmb',       format: 'post',  concept: 'Status GMB Post',            notes: 'Status update on Google Business Profile.' },
]

/**
 * Build content_pieces rows for a property launch from the LAUNCH_TEMPLATE.
 * Each slot's day is relative to launchDate (Day 0 = launch day).
 * Pre-launch slots (day: -3, -2, -1) land before the launch date.
 */
function buildLaunchContentRows({ property, clientName, listingId, launchDate, extraNotes = '' }) {
  const addr = property?.address || 'Property'
  const client = clientName || 'Client'
  // launchDate is the Day 0 anchor; parse defensively
  const anchor = launchDate ? new Date(launchDate + 'T00:00:00') : new Date()

  const addDays = (days) => {
    const d = new Date(anchor)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  return LAUNCH_TEMPLATE.map(slot => ({
    title: `${client}_${addr}-${slot.concept} [${slot.channel.toUpperCase()} ${slot.format}]`,
    content_date: addDays(slot.day),
    status: 'idea',
    content_type: slot.concept.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40),
    channel: slot.channel,
    launch_day: slot.day,
    property_id: property?.id || null,
    listing_id: listingId || null,
    notes: extraNotes ? `${slot.notes}\n\nPlan adjustments: ${extraNotes}` : slot.notes,
  }))
}

/**
 * Push the launch plan to the content calendar.
 * @param {Object} opts
 * @param {string} opts.launchDate   YYYY-MM-DD of the actual listing launch (Day 0)
 * @param {boolean} opts.replace     If true, wipes existing entries for the listing first
 * @param {string} opts.extraNotes   Optional changes/adjustments to apply to every slot's notes
 */
export async function pushListingPlanToCalendar({ listingId, property, clientName, launchDate, replace = false, extraNotes = '' }) {
  if (replace && listingId) {
    await query(supabase.from('content_pieces').delete().eq('listing_id', listingId))
  }
  const rows = buildLaunchContentRows({ property, clientName, listingId, launchDate, extraNotes })
  await query(supabase.from('content_pieces').insert(rows))

  // Auto-resolve any outstanding content-reminder notification for this listing
  if (listingId) {
    try {
      const { resolveListingContentReminder } = await import('./notifications.js')
      await resolveListingContentReminder(listingId)
    } catch (e) {
      console.error('Failed to resolve listing content reminder:', e)
    }
  }

  return { count: rows.length }
}

/** Snooze a content piece by N days (or to a specific date if `toDate` provided). */
export async function snoozeContentPiece(id, { days = 1, toDate = null } = {}) {
  let newDate
  if (toDate) {
    newDate = toDate
  } else {
    const { data } = await supabase.from('content_pieces').select('content_date').eq('id', id).single()
    const d = new Date((data?.content_date || new Date().toISOString().slice(0, 10)) + 'T00:00:00')
    d.setDate(d.getDate() + days)
    newDate = d.toISOString().slice(0, 10)
  }
  return query(supabase.from('content_pieces').update({ content_date: newDate }).eq('id', id).select().single())
}

/** Reschedule a content piece to a specific date. */
export const rescheduleContentPiece = (id, newDate) =>
  query(supabase.from('content_pieces').update({ content_date: newDate }).eq('id', id).select().single())

/**
 * Trigger the full seller marketing pipeline for a listing.
 *  1. Marks marketing_pipeline_status = 'generating'
 *  2. Generates a launch plan via Claude → saved to listings.listing_plan_text
 *  3. Seeds the multi-channel content calendar (~37 entries across 21+ days)
 *  4. Marks marketing_pipeline_status = 'ready'
 *
 * Canva designs are generated separately via Content Studio (requires Canva OAuth).
 */
export async function triggerListingMarketing({ listingId, property, clientName, launchDate = null }) {
  await query(supabase.from('listings').update({
    marketing_pipeline_status: 'generating',
    marketing_pipeline_started_at: new Date().toISOString(),
  }).eq('id', listingId))

  // Generate launch plan via Claude
  let planText = null
  try {
    const result = await generateContent({
      type: 'listing_plan',
      plan_type: 'new',
      address: property?.address || '',
      property,
    })
    planText = result?.text || null
  } catch (e) {
    console.error('Listing plan generation failed:', e)
  }

  if (planText) {
    await query(supabase.from('listings').update({
      listing_plan_text: planText,
      listing_plan_generated_at: new Date().toISOString(),
    }).eq('id', listingId))
  }

  // Seed multi-channel content calendar
  let count = 0
  try {
    // Default launch date = 14 days from now if not explicitly provided
    const effectiveLaunchDate = launchDate || (() => {
      const d = new Date()
      d.setDate(d.getDate() + 14)
      return d.toISOString().slice(0, 10)
    })()
    const result = await pushListingPlanToCalendar({ listingId, property, clientName, launchDate: effectiveLaunchDate })
    count = result.count
  } catch (e) {
    console.error('Content calendar seeding failed:', e)
  }

  await query(supabase.from('listings').update({
    marketing_pipeline_status: 'ready',
    marketing_pipeline_completed_at: new Date().toISOString(),
  }).eq('id', listingId))

  return { planText, contentSlotsCount: count }
}

// ─── Client Avatars ─────────────────────────────────────────────────────────
export const getClientAvatars = () =>
  query(supabase.from('client_avatars').select('*').order('type').order('created_at'))
export const createClientAvatar = (d) =>
  query(supabase.from('client_avatars').insert(d).select().single())
export const updateClientAvatar = (id, d) =>
  query(supabase.from('client_avatars').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())
export const deleteClientAvatar = (id) =>
  query(supabase.from('client_avatars').delete().eq('id', id))

// ─── Expense Categories ──────────────────────────────────────────────────────
export const getExpenseCategories = (type) =>
  query(supabase.from('expense_categories').select('*')
    .eq('type', type).eq('is_active', true).order('sort_order'))

// ─── Expenses ────────────────────────────────────────────────────────────────
export const getExpenses = (from, to) =>
  query(supabase.from('expenses').select(`
    *, category:expense_categories(id,name,tax_line)
  `).gte('date', from).lte('date', to).order('date', { ascending: false }))

export const getAllExpenses = () =>
  query(supabase.from('expenses').select(`
    *, category:expense_categories(id,name,tax_line)
  `).order('date', { ascending: false }))

export const createExpense  = (d)      => query(supabase.from('expenses').insert(d).select().single())
export const updateExpense  = (id, d)  => query(supabase.from('expenses').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())
export const deleteExpense  = (id)     => query(supabase.from('expenses').delete().eq('id', id))

export const createExpenseBatch = (rows) => query(supabase.from('expenses').insert(rows).select())

// ─── Income Entries ──────────────────────────────────────────────────────────
export const getIncomeEntries = (from, to) =>
  query(supabase.from('income_entries').select(`
    *, category:expense_categories(id,name)
  `).gte('date', from).lte('date', to).order('date', { ascending: false }))

export const getAllIncomeEntries = () =>
  query(supabase.from('income_entries').select(`
    *, category:expense_categories(id,name)
  `).order('date', { ascending: false }))

export const createIncomeEntry  = (d)      => query(supabase.from('income_entries').insert(d).select().single())
export const updateIncomeEntry  = (id, d)  => query(supabase.from('income_entries').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())
export const deleteIncomeEntry  = (id)     => query(supabase.from('income_entries').delete().eq('id', id))

// ─── Mileage Log ─────────────────────────────────────────────────────────────
export const getMileageLog = (from, to) =>
  query(supabase.from('mileage_log').select(`
    *, property:properties(id,address,city)
  `).gte('date', from).lte('date', to).order('date', { ascending: false }))

export const createMileageEntry  = (d)      => query(supabase.from('mileage_log').insert(d).select().single())
export const updateMileageEntry  = (id, d)  => query(supabase.from('mileage_log').update(d).eq('id', id).select().single())
export const deleteMileageEntry  = (id)     => query(supabase.from('mileage_log').delete().eq('id', id))
export const createMileageBatch  = (rows)   => query(supabase.from('mileage_log').insert(rows).select())

/** Get showing sessions that don't already have mileage logged */
export async function getUnloggedShowings(from, to) {
  const { data: logged } = await supabase.from('mileage_log')
    .select('source_id').eq('source', 'showing').not('source_id', 'is', null)
  const loggedIds = new Set((logged ?? []).map(r => r.source_id))

  const sessions = await getShowingSessions()
  return (sessions ?? []).filter(s => {
    if (!s.date || s.date < from || s.date > to) return false
    if (loggedIds.has(s.id)) return false
    return (s.showings ?? []).some(sh => sh.property?.address)
  })
}

// ─── User / Content Settings ──────────────────────────────────────────────────
export const getContentSettings = () =>
  query(supabase.from('user_settings').select('*').eq('key', 'content_settings').single())
export const updateContentSettings = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'content_settings', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())

// ─── Brand Profile ───────────────────────────────────────────────────────────
export const getBrandProfile = () =>
  query(supabase.from('user_settings').select('*').eq('key', 'brand_profile').single())

export const updateBrandProfile = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'brand_profile', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())

// ─── USPS Address Validation ─────────────────────────────────────────────────
// Calls the validate-address edge function. Returns:
//   { valid, deliverable, dpvConfirmation, standardized: {...} }
// or { valid: false, reason } if USPS could not match the address.
export const validateAddress = async ({ address, city, state, zip }) => {
  const { data, error } = await supabase.functions.invoke('validate-address', {
    body: { address, city, state, zip },
  })
  if (error) throw new Error(error.message || 'Address validation failed')
  return data
}

// ─── Dropdown Lists (lookup values for sources, locations, etc.) ────────────
const DEFAULT_DROPDOWN_LISTS = {
  lead_sources: [
    'Open House', 'Zillow', 'Realtor.com', 'Referral', 'Sphere of Influence',
    'Door Knocking', 'Cold Call', 'Facebook', 'Instagram', 'Google',
    'Past Client', 'Expired Listing', 'FSBO', 'Sign Call', 'Walk-in',
  ],
  appointment_locations: [
    'On-site', 'Video call', 'Office', 'Coffee shop', 'Phone call',
  ],
  appointment_sources: [
    'Referral', 'Open House', 'Expired', 'FSBO', 'Past Client',
    'Sphere of Influence', 'Online lead', 'Sign call',
  ],
}

export const getDropdownLists = async () => {
  const { data, error } = await supabase
    .from('user_settings').select('value').eq('key', 'dropdown_lists').maybeSingle()
  if (error) throw new Error(error.message)
  const stored = data?.value ?? {}
  // Merge defaults so new list keys appear even if user has saved value
  const merged = { ...DEFAULT_DROPDOWN_LISTS }
  for (const k of Object.keys(stored)) merged[k] = stored[k]
  return merged
}

export const updateDropdownLists = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'dropdown_lists', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())

export const addDropdownItem = async (listKey, item) => {
  const v = (item ?? '').trim()
  if (!v) return null
  const lists = await getDropdownLists()
  const current = Array.isArray(lists[listKey]) ? lists[listKey] : []
  if (current.some(x => x.toLowerCase() === v.toLowerCase())) return lists
  const next = { ...lists, [listKey]: [...current, v] }
  await updateDropdownLists(next)
  return next
}

// ─── Social Dashboard Config ─────────────────────────────────────────────────
export const getSocialDashboardConfig = () =>
  query(supabase.from('user_settings').select('*').eq('key', 'social_dashboard').single())

export const updateSocialDashboardConfig = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'social_dashboard', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())

// ─── Social Metrics ──────────────────────────────────────────────────────────
export const getSocialMetrics = (platform, limit = 12) =>
  query(supabase.from('social_metrics').select('*')
    .eq('platform', platform).order('week_of', { ascending: false }).limit(limit))

export const getAllLatestMetrics = () =>
  query(supabase.rpc('get_latest_social_metrics').catch(() =>
    // Fallback: get the most recent week's data for each platform
    supabase.from('social_metrics').select('*').order('week_of', { ascending: false }).limit(50)
  ).then(r => r.data ?? []))

export const getLatestSocialMetrics = async () => {
  // Get the most recent entry per platform
  const { data, error } = await supabase
    .from('social_metrics')
    .select('*')
    .order('week_of', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  // Dedupe to latest per platform
  const seen = new Set()
  return (data ?? []).filter(r => {
    if (seen.has(r.platform)) return false
    seen.add(r.platform)
    return true
  })
}

export const upsertSocialMetric = (d) =>
  query(supabase.from('social_metrics')
    .upsert(d, { onConflict: 'platform,week_of' }).select().single())

export const getSocialMetricsHistory = (platform, weeks = 12) =>
  query(supabase.from('social_metrics').select('week_of,followers,reach,engagement_rate')
    .eq('platform', platform).order('week_of', { ascending: true }).limit(weeks))

// ─── Prospects ──────────────────────────────────────────────────────────────
export const getProspects = (source) => {
  let q = supabase.from('prospects').select('*, prospect_tags(tag:tags(id, name, color, category))').order('created_at', { ascending: false })
  if (source) q = q.eq('source', source)
  return query(q)
}
export const createProspect  = (d)      => query(supabase.from('prospects').insert(d).select().single())
export const updateProspect  = (id, d)  => query(supabase.from('prospects').update(d).eq('id', id).select().single())
export const deleteProspect  = (id)     => query(supabase.from('prospects').delete().eq('id', id))
export const bulkCreateProspects = (rows) => query(supabase.from('prospects').insert(rows).select())

// Prospect Tags
export const getProspectTags = (prospectId) =>
  query(supabase.from('prospect_tags').select('*, tag:tags(*)').eq('prospect_id', prospectId))
export const addProspectTag = (prospectId, tagId) =>
  query(supabase.from('prospect_tags').upsert({ prospect_id: prospectId, tag_id: tagId }, { onConflict: 'prospect_id,tag_id' }).select().single())
export const removeProspectTag = (prospectId, tagId) =>
  query(supabase.from('prospect_tags').delete().eq('prospect_id', prospectId).eq('tag_id', tagId))

// ─── Brand Asset Upload (Supabase Storage) ───────────────────────────────────
export async function uploadBrandAsset(file, folder = 'general') {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('brand-assets').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)
  return { path, publicUrl }
}

export async function deleteBrandAsset(path) {
  const { error } = await supabase.storage.from('brand-assets').remove([path])
  if (error) throw new Error(error.message)
}

// ─── Tags ────────────────────────────────────────────────────────────────────
export const getTags = () =>
  query(supabase.from('tags').select('*').order('category').order('name'))

export const createTag = (d) =>
  query(supabase.from('tags').insert(d).select().single())

export const updateTag = (id, d) =>
  query(supabase.from('tags').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())

export const deleteTag = (id) =>
  query(supabase.from('tags').delete().eq('id', id))

// ─── Contact Tags (junction) ─────────────────────────────────────────────────
export const getContactTags = (contactId) =>
  query(supabase.from('contact_tags').select('*, tag:tags(*)').eq('contact_id', contactId))

export const getAllContactTags = () =>
  query(supabase.from('contact_tags').select('contact_id, tag:tags(id, name, color, category)'))

export const addContactTag = (contactId, tagId) =>
  query(supabase.from('contact_tags').upsert({ contact_id: contactId, tag_id: tagId }, { onConflict: 'contact_id,tag_id' }).select().single())

export const removeContactTag = (contactId, tagId) =>
  query(supabase.from('contact_tags').delete().eq('contact_id', contactId).eq('tag_id', tagId))

export const bulkAddContactTags = (rows) =>
  query(supabase.from('contact_tags').upsert(rows, { onConflict: 'contact_id,tag_id' }).select())

// ─── Contacts with Tags (for Database page) ─────────────────────────────────
export const getContactsWithTags = () =>
  query(supabase.from('contacts').select('*, contact_tags(tag:tags(id, name, color, category))')
    .is('deleted_at', null).is('archived_at', null).order('name'))

// ─── Ensure Contact (deduplicated upsert) ───────────────────────────────────
// Matches by email → phone → name. Returns the contact id (existing or new).
// Fills blank fields on existing contacts. Used to auto-push prospects/expireds
// into the contacts Database without creating duplicates.
export async function ensureContact({
  name,
  email = null,
  phone = null,
  type = 'lead',
  source = null,
  lead_source = null,
  mls_status = null,
  notes = null,
  stage = null,
}) {
  const normEmail = email?.trim().toLowerCase() || null
  const normPhone = phone?.replace(/[^0-9]/g, '') || null
  const normName = name?.trim().toLowerCase() || null

  // 1. Match by email
  if (normEmail) {
    const { data } = await supabase.from('contacts').select('id')
      .eq('email_normalized', normEmail).is('deleted_at', null).limit(1)
    if (data?.length) {
      await fillContactBlanks(data[0].id, { phone, source, lead_source, mls_status, notes, stage })
      return data[0].id
    }
  }

  // 2. Match by phone
  if (normPhone) {
    const { data } = await supabase.from('contacts').select('id')
      .eq('phone_normalized', normPhone).is('deleted_at', null).limit(1)
    if (data?.length) {
      await fillContactBlanks(data[0].id, { email, source, lead_source, mls_status, notes, stage })
      return data[0].id
    }
  }

  // 3. Match by name
  if (normName) {
    const { data } = await supabase.from('contacts').select('id')
      .ilike('name', normName).is('deleted_at', null).limit(1)
    if (data?.length) {
      await fillContactBlanks(data[0].id, { email, phone, source, lead_source, mls_status, notes, stage })
      return data[0].id
    }
  }

  // 4. Create new
  const result = await createContact({
    name: name?.trim() || 'Unknown',
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    type, source, lead_source, mls_status, notes, stage,
  })
  return result.id
}

// Fill only null fields on an existing contact (never overwrite existing data)
async function fillContactBlanks(contactId, fields) {
  const updates = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && v !== '') updates[k] = v
  }
  if (Object.keys(updates).length === 0) return
  // Only set fields that are currently null
  const { data: existing } = await supabase.from('contacts').select('*').eq('id', contactId).single()
  if (!existing) return
  const onlyBlanks = {}
  for (const [k, v] of Object.entries(updates)) {
    if (existing[k] == null || existing[k] === '') onlyBlanks[k] = v
  }
  if (Object.keys(onlyBlanks).length > 0) {
    await supabase.from('contacts').update(onlyBlanks).eq('id', contactId)
  }
}

// ─── Daily Tasks ─────────────────────────────────────────────────────────────
export const getDailyTasks = (from, to) =>
  query(supabase.from('daily_tasks').select('*')
    .or(`due_date.gte.${from},due_date.lte.${to},due_date.is.null,rolled_from.is.not.null`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false }))

export const getAllDailyTasks = () =>
  query(supabase.from('daily_tasks').select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false }))

export const createDailyTask = (d) =>
  query(supabase.from('daily_tasks').insert(d).select().single())

export const updateDailyTask = (id, d) =>
  query(supabase.from('daily_tasks').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())

export const deleteDailyTask = (id) =>
  query(supabase.from('daily_tasks').delete().eq('id', id))

export const completeDailyTask = (id) =>
  query(supabase.from('daily_tasks').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single())

export const uncompleteDailyTask = (id) =>
  query(supabase.from('daily_tasks').update({
    status: 'pending',
    completed_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single())

// Roll over incomplete tasks from yesterday to today
export const rollOverTasks = async (fromDate, toDate) => {
  const { data } = await supabase.from('daily_tasks').select('*')
    .eq('due_date', fromDate)
    .in('status', ['pending', 'in_progress'])
    .eq('is_recurring', false)
  if (!data?.length) return []
  const updates = data.map(t =>
    supabase.from('daily_tasks').update({
      due_date: toDate,
      rolled_from: t.rolled_from || fromDate,
      updated_at: new Date().toISOString(),
    }).eq('id', t.id)
  )
  await Promise.all(updates)
  return data
}

// ─── Daily Streaks ──────────────────────────────────────────────────────────
export const getDailyStreaks = (limit = 30) =>
  query(supabase.from('daily_streaks').select('*')
    .order('date', { ascending: false }).limit(limit))

export const upsertDailyStreak = (d) =>
  query(supabase.from('daily_streaks').upsert(d, { onConflict: 'date' }).select().single())

// ─── Vendors (global rolodex) ────────────────────────────────────────────────
// Used by the Vendors page AND by the Parties picker on listing pages.
// Supports { roleGroup, search } filter args. Soft-deleted rows are excluded.
export const getVendors = (opts = {}) => {
  const { roleGroup, search } = opts
  let q = supabase.from('vendors').select('*').is('deleted_at', null)
  if (roleGroup) q = q.eq('role_group', roleGroup)
  if (search) {
    const s = search.toLowerCase().trim().replace(/[%,]/g, '')
    // Search across name, email, company, role.
    q = q.or(`name_normalized.ilike.%${s}%,email_normalized.ilike.%${s}%,company.ilike.%${s}%,role.ilike.%${s}%`)
  }
  return query(q.order('preferred', { ascending: false }).order('name'))
}

export const getVendorById = (id) =>
  query(supabase.from('vendors').select('*').eq('id', id).maybeSingle())

export const createVendor = (d) =>
  query(supabase.from('vendors').insert(d).select().single())

export const updateVendor = (id, d) =>
  query(supabase.from('vendors').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())

// Soft delete — recoverable via Settings → Trash.
export const deleteVendor = (id) =>
  query(supabase.from('vendors').update({ deleted_at: new Date().toISOString() }).eq('id', id))

export const restoreVendor = (id) =>
  query(supabase.from('vendors').update({ deleted_at: null }).eq('id', id))

export const hardDeleteVendor = (id) =>
  query(supabase.from('vendors').delete().eq('id', id))

export const toggleVendorPreferred = (id, preferred) =>
  query(supabase.from('vendors').update({ preferred }).eq('id', id).select().single())

// ─── Vendor Assignments ─────────────────────────────────────────────────────
export const getVendorAssignments = () =>
  query(supabase.from('vendor_assignments').select('*, vendor:vendors(*)').order('scheduled_date', { ascending: true }))

export const getVendorAssignmentsForDeal = (dealId) =>
  query(supabase.from('vendor_assignments').select('*, vendor:vendors(*)').eq('deal_id', dealId).order('scheduled_date'))

export const createVendorAssignment = (d) =>
  query(supabase.from('vendor_assignments').insert(d).select().single())

export const updateVendorAssignment = (id, d) =>
  query(supabase.from('vendor_assignments').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())

export const deleteVendorAssignment = (id) =>
  query(supabase.from('vendor_assignments').delete().eq('id', id))

// ─── Notes ──────────────────────────────────────────────────────────────────
export const getNotes = () =>
  query(supabase.from('notes').select(`
    *, contact:contacts(id,name)
  `).order('is_pinned', { ascending: false }).order('updated_at', { ascending: false }))

export const getNotesForContact = (contactId) =>
  query(supabase.from('notes').select('*').eq('contact_id', contactId).order('updated_at', { ascending: false }))

export const getNotesForTransaction = (txId) =>
  query(supabase.from('notes').select('*').eq('transaction_id', txId).order('updated_at', { ascending: false }))

export const createNote = (d) =>
  query(supabase.from('notes').insert(d).select().single())

export const updateNote = (id, d) =>
  query(supabase.from('notes').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())

export const deleteNote = (id) =>
  query(supabase.from('notes').delete().eq('id', id))

// ─── Note Tags ──────────────────────────────────────────────────────────────
export const getNoteTags = (noteId) =>
  query(supabase.from('note_tags').select('*, tag:tags(*)').eq('note_id', noteId))

export const getAllNoteTags = () =>
  query(supabase.from('note_tags').select('note_id, tag:tags(id, name, color, category)'))

export const addNoteTag = (noteId, tagId) =>
  query(supabase.from('note_tags').upsert({ note_id: noteId, tag_id: tagId }, { onConflict: 'note_id,tag_id' }).select().single())

export const removeNoteTag = (noteId, tagId) =>
  query(supabase.from('note_tags').delete().eq('note_id', noteId).eq('tag_id', tagId))

// ─── Favorites ──────────────────────────────────────────────────────────────
export const getFavorites = () =>
  query(supabase.from('user_settings').select('*').eq('key', 'favorites').maybeSingle())

export const updateFavorites = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'favorites', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())
