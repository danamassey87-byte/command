import supabase from './supabase'
import { normalizePhone } from './validators'

/* ──────────────────────────────────────────────────────────────────────────
 * Data-integrity service layer
 * ────────────────────────────────────────────────────────────────────────── */

async function q(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

/* ─── #1 Phone & email collision checks ────────────────────────────────── */
/** Find any contact already on file with this phone (normalized). */
export async function findContactByPhone(phone, { excludeId = null } = {}) {
  const norm = normalizePhone(phone)
  if (!norm || norm.length < 10) return null
  let qq = supabase.from('contacts').select('id,name,email,phone,type,lead_intent')
    .eq('phone_normalized', norm).is('deleted_at', null).limit(1)
  if (excludeId) qq = qq.neq('id', excludeId)
  const { data, error } = await qq
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

/** Find any contact already on file with this email (case-insensitive). */
export async function findContactByEmail(email, { excludeId = null } = {}) {
  if (!email?.trim()) return null
  const norm = email.trim().toLowerCase()
  let qq = supabase.from('contacts').select('id,name,email,phone,type,lead_intent')
    .eq('email_normalized', norm).is('deleted_at', null).limit(1)
  if (excludeId) qq = qq.neq('id', excludeId)
  const { data, error } = await qq
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

/* ─── #4  Calendar conflict check ──────────────────────────────────────── */
/** Returns any scheduled item within ±windowMinutes of the given timestamp.
 *  Looks across listing_appointments, showings, and open_houses. */
export async function findScheduleConflicts(scheduledAt, { windowMinutes = 30, excludeId = null } = {}) {
  if (!scheduledAt) return []
  const center = new Date(scheduledAt).getTime()
  if (isNaN(center)) return []
  const start = new Date(center - windowMinutes * 60_000).toISOString()
  const end   = new Date(center + windowMinutes * 60_000).toISOString()

  // Listing appointments
  const lap = supabase.from('listing_appointments')
    .select('id, scheduled_at, contact:contacts(name), property:properties(address)')
    .gte('scheduled_at', start).lte('scheduled_at', end)
    .eq('status', 'scheduled').is('deleted_at', null)
  // Showings
  const show = supabase.from('showings')
    .select('id, scheduled_at, contact:contacts(name), property:properties(address)')
    .gte('scheduled_at', start).lte('scheduled_at', end)
    .is('deleted_at', null)

  const [appts, showings] = await Promise.all([q(lap), q(show)])

  const all = [
    ...appts.map(a => ({
      id: a.id, kind: 'listing_appointment', when: a.scheduled_at,
      label: `${a.contact?.name ?? '—'} @ ${a.property?.address ?? '—'}`,
    })),
    ...showings.map(s => ({
      id: s.id, kind: 'showing', when: s.scheduled_at,
      label: `${s.contact?.name ?? '—'} @ ${s.property?.address ?? '—'}`,
    })),
  ]
  return excludeId ? all.filter(a => a.id !== excludeId) : all
}

/* ─── #5  "Already has an active appointment" check ────────────────────── */
export async function findActiveAppointmentsForContact(contactId) {
  if (!contactId) return []
  return q(supabase.from('listing_appointments')
    .select('id, scheduled_at, status, property:properties(address)')
    .eq('contact_id', contactId)
    .eq('status', 'scheduled')
    .is('deleted_at', null)
    .order('scheduled_at'))
}

/* ─── #7  MLS-id dedupe lookup ─────────────────────────────────────────── */
export async function findPropertyByMls(mlsId) {
  if (!mlsId?.trim()) return null
  const { data } = await supabase.from('properties')
    .select('*').eq('mls_id', mlsId.trim()).is('deleted_at', null).limit(1)
  return data?.[0] ?? null
}

/* ─── #11  Audit-diff helpers ──────────────────────────────────────────── */
const IGNORED_DIFF_KEYS = new Set([
  'updated_at', 'created_at', 'phone_normalized', 'email_normalized', 'normalized_address',
])

/** Compute a flat field-level diff between two row snapshots.
 *  Returns { field: { before, after } } only for fields that actually changed. */
export function computeDiff(before, after) {
  const diff = {}
  if (!before || !after) return diff
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    if (IGNORED_DIFF_KEYS.has(k)) continue
    const b = before[k] ?? null
    const a = after[k] ?? null
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diff[k] = { before: b, after: a }
    }
  }
  return diff
}

/** Wrap an update so it: fetches before-row, applies patch, computes diff,
 *  and writes one activity_log row with `changes`. Returns the after-row. */
export async function updateWithAudit(table, id, patch, { reason = null } = {}) {
  const before = await q(supabase.from(table).select('*').eq('id', id).single())
  const after  = await q(supabase.from(table).update(patch).eq('id', id).select().single())
  const changes = computeDiff(before, after)
  if (Object.keys(changes).length > 0) {
    const fields = Object.keys(changes)
    const desc = reason
      ? reason
      : `Updated ${table.replace(/s$/, '')}: ${fields.slice(0,3).join(', ')}${fields.length > 3 ? '…' : ''}`
    await q(supabase.from('activity_log').insert({
      type: `${table}_updated`,
      description: desc,
      table_name: table,
      record_id: id,
      changes,
      contact_id:  table === 'contacts'   ? id : null,
      property_id: table === 'properties' ? id : null,
    }))
  }
  return after
}

/* ─── #10  Soft delete / Archive / Restore ─────────────────────────────── */
const SOFT_DELETE_TABLES = new Set([
  'contacts', 'properties', 'listings', 'listing_appointments',
  'transactions', 'showings', 'open_houses',
])
function assertTable(t) {
  if (!SOFT_DELETE_TABLES.has(t)) throw new Error(`Soft delete not supported on table: ${t}`)
}

/** Soft delete: marks deleted_at = now(). 30-day purge happens via pg_cron. */
export async function softDelete(table, id) {
  assertTable(table)
  const after = await updateWithAudit(table, id,
    { deleted_at: new Date().toISOString(), archived_at: null },
    { reason: `Soft-deleted (recoverable for 30 days)` }
  )
  return after
}

/** Archive: separate from delete — record stays visible in archive views,
 *  excluded from normal listings, no purge. */
export async function archive(table, id) {
  assertTable(table)
  return updateWithAudit(table, id,
    { archived_at: new Date().toISOString() },
    { reason: 'Archived' }
  )
}

/** Restore: clears deleted_at and archived_at. */
export async function restore(table, id) {
  assertTable(table)
  return updateWithAudit(table, id,
    { deleted_at: null, archived_at: null },
    { reason: 'Restored from trash/archive' }
  )
}

/** Hard-delete a single row before its 30-day window expires (with confirm). */
export async function purgeNow(table, id) {
  assertTable(table)
  // Log the purge event itself (since the row is about to be gone)
  const before = await q(supabase.from(table).select('*').eq('id', id).single())
  await q(supabase.from('activity_log').insert({
    type: `${table}_purged`,
    description: `Permanently deleted from ${table}`,
    table_name: table,
    record_id: id,
    changes: { _purged_snapshot: { before, after: null } },
  }))
  await q(supabase.from(table).delete().eq('id', id))
  return true
}

/* ─── Recovery / archive views ─────────────────────────────────────────── */
export const getTrashRecords = () =>
  q(supabase.from('trash_records').select('*').order('deleted_at', { ascending: false }))

/* ─── #12  Stale records ───────────────────────────────────────────────── */
export const getStaleRecords = () =>
  q(supabase.from('stale_records').select('*').order('days_stale', { ascending: false }))

/* ─── Notifications integration (#12 routes through notifications table) ── */
/** Sync stale_records → notifications, deduping by source_table+source_id. */
export async function syncStaleNotifications() {
  const stale = await getStaleRecords()
  if (!stale?.length) return 0
  let inserted = 0
  for (const s of stale) {
    // Skip if there's already an unread/snoozed notification for this record
    const existing = await q(supabase.from('notifications')
      .select('id').eq('source_table', s.table_name).eq('source_id', s.record_id)
      .in('status', ['unread', 'snoozed']).limit(1))
    if (existing.length) continue
    await q(supabase.from('notifications').insert({
      type: s.kind,
      title: titleForStale(s),
      body: bodyForStale(s),
      source_table: s.table_name,
      source_id: s.record_id,
      link: linkForStale(s),
      metadata: { days_stale: s.days_stale },
    }))
    inserted++
  }
  return inserted
}
function titleForStale(s) {
  if (s.kind === 'stale_lead') return `Lead has gone cold: ${s.label}`
  if (s.kind === 'overdue_appointment') return `Overdue listing appointment`
  if (s.kind === 'overdue_closing') return `Closing date passed`
  return s.label
}
function bodyForStale(s) {
  return `${s.days_stale} day${s.days_stale === 1 ? '' : 's'} since last activity`
}
function linkForStale(s) {
  if (s.table_name === 'contacts')             return `/crm/contacts/${s.record_id}`
  if (s.table_name === 'listing_appointments') return `/calendar`
  if (s.table_name === 'transactions')         return `/pipeline`
  return null
}

/* ─── Listing-content reminder sync ────────────────────────────────────── */
/**
 * Find listings with NO generated content plan and emit/refresh a reminder.
 *
 *  - listings.status = 'active' (or 'pre_listing'/'pending') AND listing_plan_text IS NULL
 *  - Listing has existed for at least `minAgeDays` days (so we don't nag the
 *    moment a listing is created — that's covered by the inline emit on save)
 *  - Dedupes against active reminders for the same listing_id
 *  - Re-emits if the previous reminder was dismissed (lets the system nag again)
 *
 * Call this on app load (e.g., from Layout) and/or on a setInterval.
 */
export async function syncListingContentReminders({ minAgeDays = 1 } = {}) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - minAgeDays)
  const cutoffIso = cutoff.toISOString()

  // Find active-ish listings missing a content plan, older than the cutoff
  const stale = await q(supabase
    .from('listings')
    .select(`
      id,
      created_at,
      list_date,
      status,
      contact:contacts(name),
      property:properties(address)
    `)
    .is('listing_plan_text', null)
    .in('status', ['active', 'pre_listing', 'coming_soon', 'pending'])
    .lte('created_at', cutoffIso)
    .is('deleted_at', null)
  )

  if (!stale?.length) return 0

  let inserted = 0
  for (const listing of stale) {
    // Skip if active/snoozed/kept reminder already exists for this listing
    const existing = await q(supabase.from('notifications')
      .select('id').eq('type', 'listing_content').eq('source_id', listing.id)
      .in('status', ['unread', 'read', 'kept', 'snoozed']).limit(1))
    if (existing.length) continue

    const daysOld = Math.max(1, Math.floor((Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    const address = listing.property?.address || 'a listing'
    const clientName = listing.contact?.name || ''

    await q(supabase.from('notifications').insert({
      type: 'listing_content',
      title: `Generate content plan for ${address}`,
      body: `${clientName ? clientName + ' — ' : ''}This listing has been on your books for ${daysOld} day${daysOld === 1 ? '' : 's'} without a content plan. Run the Listing Plan prompt when you're ready.`,
      source_table: 'listings',
      source_id: listing.id,
      link: '/crm/listing-plan',
      metadata: { days_stale: daysOld, reason: 'listing_plan_not_run' },
    }))
    inserted++
  }
  return inserted
}
