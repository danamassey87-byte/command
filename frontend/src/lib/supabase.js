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

/** Get properties with all detail fields for content/marketing use */
export const getPropertiesForContent = () =>
  query(supabase.from('properties').select('*').order('address'))

// ─── Listings ────────────────────────────────────────────────────────────────
export const getListings = () =>
  query(supabase.from('listings').select(`
    *, contact:contacts(id,name,email,phone), property:properties(*)
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
  query(supabase.from('contacts').select('*, contact_tags(tag:tags(id, name, color, category))').order('name'))

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

// ─── Vendors ────────────────────────────────────────────────────────────────
export const getVendors = () =>
  query(supabase.from('vendors').select('*').order('role').order('name'))

export const createVendor = (d) =>
  query(supabase.from('vendors').insert(d).select().single())

export const updateVendor = (id, d) =>
  query(supabase.from('vendors').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single())

export const deleteVendor = (id) =>
  query(supabase.from('vendors').delete().eq('id', id))

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
