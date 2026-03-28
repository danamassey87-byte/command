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
export const getContacts  = ()     => query(supabase.from('contacts').select('*').order('name'))
export const getBuyers    = ()     => query(supabase.from('contacts').select('*').in('type', ['buyer', 'both']).order('name'))
export const getSellers   = ()     => query(supabase.from('contacts').select('*').in('type', ['seller', 'both']).order('name'))
export const createContact = (d)  => query(supabase.from('contacts').insert(d).select().single())
export const updateContact = (id, d) => query(supabase.from('contacts').update(d).eq('id', id).select().single())
export const deleteContact = (id) => query(supabase.from('contacts').delete().eq('id', id))

// ─── Properties ──────────────────────────────────────────────────────────────
export const getProperties  = ()      => query(supabase.from('properties').select('*').order('address'))

/** Find existing property by address (case-insensitive) or create a new one. Returns the property id. */
export async function ensureProperty({ address, city = null, zip = null, mls_id = null, price = null, dom = null, expired_date = null }) {
  if (!address?.trim()) throw new Error('Address is required')
  const { data } = await supabase.from('properties').select('id').ilike('address', address.trim()).limit(1)
  if (data?.length > 0) return data[0].id
  const result = await createProperty({ address: address.trim(), city, state: 'AZ', zip, mls_id, price: price ? Number(price) : null, dom: dom ? Number(dom) : null, expired_date })
  return result.id
}
export const createProperty  = (d)   => query(supabase.from('properties').insert(d).select().single())
export const updateProperty  = (id, d) => query(supabase.from('properties').update(d).eq('id', id).select().single())

// ─── Listings ────────────────────────────────────────────────────────────────
export const getListings = () =>
  query(supabase.from('listings').select(`
    *, contact:contacts(id,name,email,phone), property:properties(id,address,city,zip,price,mls_id,dom)
  `).order('created_at', { ascending: false }))

export const createListing  = (d)      => query(supabase.from('listings').insert(d).select().single())
export const updateListing  = (id, d)  => query(supabase.from('listings').update(d).eq('id', id).select().single())
export const deleteListing  = (id)     => query(supabase.from('listings').delete().eq('id', id))

// ─── Checklist Tasks ─────────────────────────────────────────────────────────
export const getTasksForListing = (listingId) =>
  query(supabase.from('checklist_tasks').select('*').eq('listing_id', listingId).order('sort_order'))

export const createTask  = (d)      => query(supabase.from('checklist_tasks').insert(d).select().single())
export const updateTask  = (id, d)  => query(supabase.from('checklist_tasks').update(d).eq('id', id).select().single())
export const deleteTask  = (id)     => query(supabase.from('checklist_tasks').delete().eq('id', id))
export const bulkCreateTasks = (rows) => query(supabase.from('checklist_tasks').insert(rows).select())

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

// ─── Listing Appointments ──────────────────────────────────────────────────────
export const getListingAppointments = () =>
  query(supabase.from('listing_appointments')
    .select('*, contact:contacts(id,name,phone,email)')
    .order('appointment_date', { ascending: true }))

export const createListingAppointment = (d) =>
  query(supabase.from('listing_appointments').insert(d).select().single())

export const updateListingAppointment = (id, d) =>
  query(supabase.from('listing_appointments').update(d).eq('id', id).select().single())

export const deleteListingAppointment = (id) =>
  query(supabase.from('listing_appointments').delete().eq('id', id))

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
    .select('*, platform_posts:content_platform_posts(*)')
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

// ─── AI Content Generation ────────────────────────────────────────────────────
export async function generateContent(payload) {
  const { data, error } = await supabase.functions.invoke('generate-content', { body: payload })
  if (error) throw new Error(error.message)
  return data
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

// ─── User / Content Settings ──────────────────────────────────────────────────
export const getContentSettings = () =>
  query(supabase.from('user_settings').select('*').eq('key', 'content_settings').single())
export const updateContentSettings = (value) =>
  query(supabase.from('user_settings')
    .upsert({ key: 'content_settings', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single())
