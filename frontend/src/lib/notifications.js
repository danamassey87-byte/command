import supabase from './supabase'

// ─── Notification types ──────────────────────────────────────────────────────
// Add new types here as features land. Keep labels short — they show as filter chips.
export const NOTIFICATION_TYPES = {
  form_returned:     { label: 'Form Returned',     icon: '📋', color: '#b79782' },
  lead_created:      { label: 'New Lead',          icon: '✨', color: '#7a9b76' },
  appointment_booked:{ label: 'Appointment',       icon: '📅', color: '#8a7a9b' },
  phase_change:      { label: 'Phase Change',      icon: '🔄', color: '#9b8a7a' },
  task_due:          { label: 'Task Due',          icon: '⏰', color: '#c8a05a' },
  message:           { label: 'Message',           icon: '💬', color: '#7a93b7' },
  system:            { label: 'System',            icon: '⚙️', color: '#999999' },
  listing_content:   { label: 'Content Reminder',  icon: '📣', color: '#c99a2e' },
  oh_followup_sent:  { label: 'OH Follow-Up Sent', icon: '🏡', color: '#7c6350' },
  oh_briefing_sent:  { label: 'OH Briefing Sent',  icon: '📨', color: '#7c6350' },
  oh_reminder_sent:  { label: 'OH Reminder Sent',  icon: '🔁', color: '#c8a05a' },
  oh_report_overdue: { label: 'OH Report Overdue', icon: '⚠️', color: '#b91c1c' },
  campaign_reply:    { label: 'Campaign Reply',   icon: '💌', color: '#7a93b7' },
  onhold_milestone:  { label: 'On-Hold Check-In', icon: '⏸️', color: '#c8a05a' },
}

export function typeMeta(type) {
  return NOTIFICATION_TYPES[type] || { label: type, icon: '🔔', color: '#999' }
}

// ─── Query helpers ───────────────────────────────────────────────────────────

async function q(p) {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data
}

/** Wake any snoozed notifications whose snooze_until has passed. */
export async function wakeSnoozed() {
  const nowIso = new Date().toISOString()
  await supabase
    .from('notifications')
    .update({ status: 'unread' })
    .eq('status', 'snoozed')
    .lte('snooze_until', nowIso)
}

/**
 * Re-arm recurring weekly follow-up reminders.
 *
 * Any task_due row with `metadata.kind = 'weekly_followup'` and
 * `metadata.next_fire_at <= now` (and NOT `metadata.closed = true`) gets flipped
 * back to `unread` with its `next_fire_at` bumped to the following Monday at
 * 9am. This makes the reminder fire every Monday regardless of whether Dana
 * previously read, kept, or dismissed it — only `resolveExpiredApptFollowup`
 * (called on Won/Lost) can stop the loop by setting `metadata.closed = true`.
 */
export async function rearmRecurringFollowups() {
  const nowIso = new Date().toISOString()
  // Grab candidates — Supabase/PostgREST can't filter on JSON timestamps
  // inside metadata from the client cleanly, so we pull the small universe of
  // weekly_followup rows and filter client-side.
  const { data, error } = await supabase
    .from('notifications')
    .select('id, status, metadata')
    .eq('type', 'task_due')
    .eq('source_table', 'expired_contact')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return

  const due = data.filter(row => {
    const m = row.metadata || {}
    if (m.kind !== 'weekly_followup') return false
    if (m.closed === true) return false
    const nextFire = m.next_fire_at
    if (!nextFire) return false
    return new Date(nextFire).toISOString() <= nowIso
  })

  for (const row of due) {
    const newMeta = { ...(row.metadata || {}), next_fire_at: nextMondayAfter(new Date().toISOString().split('T')[0]).toISOString() }
    await supabase
      .from('notifications')
      .update({ status: 'unread', snooze_until: null, metadata: newMeta })
      .eq('id', row.id)
  }
}

/** All "active" notifications (unread, read, kept) plus optional type filter. */
export async function listActive({ type = null } = {}) {
  await wakeSnoozed()
  // Fire-and-forget the recurring rearm so the bell never blocks on it.
  rearmRecurringFollowups().catch(err => console.error('rearmRecurringFollowups failed:', err))
  let query = supabase
    .from('notifications')
    .select('*')
    .in('status', ['unread', 'read', 'kept'])
    .order('created_at', { ascending: false })
  if (type) query = query.eq('type', type)
  return q(query)
}

export async function listSnoozed() {
  return q(
    supabase
      .from('notifications')
      .select('*')
      .eq('status', 'snoozed')
      .order('snooze_until', { ascending: true })
  )
}

export async function listDismissed({ limit = 100 } = {}) {
  return q(
    supabase
      .from('notifications')
      .select('*')
      .eq('status', 'dismissed')
      .order('updated_at', { ascending: false })
      .limit(limit)
  )
}

export async function unreadCount() {
  await wakeSnoozed()
  rearmRecurringFollowups().catch(err => console.error('rearmRecurringFollowups failed:', err))
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread')
  if (error) throw new Error(error.message)
  return count || 0
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Create a new notification. Used by features (forms, leads, appts) to emit events. */
export async function emit({ type, title, body = null, link = null, source_table = null, source_id = null, metadata = {} }) {
  if (!type || !title) throw new Error('emit() requires type and title')
  return q(
    supabase
      .from('notifications')
      .insert({ type, title, body, link, source_table, source_id, metadata })
      .select()
      .single()
  )
}

export async function markRead(id) {
  return q(
    supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('id', id)
      .eq('status', 'unread')   // don't downgrade kept/snoozed
      .select()
  )
}

export async function markAllRead() {
  return q(
    supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('status', 'unread')
      .select()
  )
}

export async function keep(id) {
  return q(
    supabase.from('notifications').update({ status: 'kept' }).eq('id', id).select().single()
  )
}

export async function dismiss(id) {
  return q(
    supabase.from('notifications').update({ status: 'dismissed' }).eq('id', id).select().single()
  )
}

/** Snooze for a duration. duration is one of: '1h','3h','tomorrow','nextweek' or a Date. */
export async function snooze(id, duration) {
  const until = resolveSnoozeTime(duration)
  return q(
    supabase
      .from('notifications')
      .update({ status: 'snoozed', snooze_until: until.toISOString() })
      .eq('id', id)
      .select()
      .single()
  )
}

/** Restore a snoozed/dismissed item back to unread. */
export async function restore(id) {
  return q(
    supabase
      .from('notifications')
      .update({ status: 'unread', snooze_until: null })
      .eq('id', id)
      .select()
      .single()
  )
}

export function resolveSnoozeTime(duration) {
  if (duration instanceof Date) return duration
  const d = new Date()
  switch (duration) {
    case '1h':       d.setHours(d.getHours() + 1); break
    case '3h':       d.setHours(d.getHours() + 3); break
    case 'tomorrow': d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); break
    case 'nextweek': d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); break
    default:         d.setHours(d.getHours() + 1)
  }
  return d
}

// ─── Listing content reminder helpers ───────────────────────────────────────

/**
 * Emit a reminder that a listing still needs its content plan generated.
 * Deduped by source_id — won't create a second reminder for the same listing
 * unless the prior one is dismissed/resolved.
 */
export async function emitListingContentReminder({ listingId, address, clientName }) {
  // Dedupe: is there already an active (unread/read/kept/snoozed) reminder for this listing?
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'listing_content')
    .eq('source_id', listingId)
    .in('status', ['unread', 'read', 'kept', 'snoozed'])
    .limit(1)

  if (existing && existing.length > 0) return existing[0]

  return emit({
    type: 'listing_content',
    title: `Generate content plan for ${address}`,
    body: `${clientName ? clientName + ' — ' : ''}The 37-slot launch calendar hasn't been generated yet. Run the Listing Plan prompt when you're ready.`,
    link: '/crm/listing-plan',
    source_table: 'listings',
    source_id: listingId,
    metadata: { reason: 'listing_plan_not_run' },
  })
}

// ─── Listing-appointment follow-up reminders ────────────────────────────────

/** Compute the Monday on-or-after a given date (local time, 9am). */
export function nextMondayAfter(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  // Advance to the next Monday. If `d` IS a Monday, push to next week's Monday
  // so the reminder fires after the appointment, not the morning of.
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const daysUntilNextMon = day === 1 ? 7 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + daysUntilNextMon)
  d.setHours(9, 0, 0, 0)
  return d
}

/**
 * Create (or refresh) a weekly follow-up reminder for an expired-listing
 * appointment. Scheduled to fire the Monday after the appointment date, then
 * snoozes itself forward week-by-week until the outcome is marked Won or Lost.
 *
 * Dedupes on (type='task_due', source_table='expired_contact', source_id=expiredId).
 */
export async function emitExpiredApptFollowup({ expiredId, name, address, apptDate }) {
  if (!expiredId) throw new Error('expiredId is required')
  const fireAt = nextMondayAfter(apptDate)

  // Look for an existing active reminder for this expired contact.
  const { data: existing } = await supabase
    .from('notifications')
    .select('id, status')
    .eq('type', 'task_due')
    .eq('source_table', 'expired_contact')
    .eq('source_id', String(expiredId))
    .in('status', ['unread', 'read', 'kept', 'snoozed'])
    .limit(1)

  const payload = {
    type: 'task_due',
    title: `Follow up: ${name || 'Expired lead'} — listing appt`,
    body: `Weekly check-in for ${address || 'listing appointment'}. Did they sign? Mark Won or Lost on the Expired tracker.`,
    link: '/prospecting/expired',
    source_table: 'expired_contact',
    source_id: String(expiredId),
    // `next_fire_at` drives the recurring rearm sweep — when the current moment
    // passes this value, the sweep flips the row back to unread and bumps it
    // to the following Monday. `closed: true` is set by
    // resolveExpiredApptFollowup() on Won/Lost to permanently stop the loop.
    metadata: { expiredId, apptDate, kind: 'weekly_followup', next_fire_at: fireAt.toISOString(), closed: false },
  }

  if (existing && existing.length > 0) {
    // Re-snooze the existing row to the next Monday so it doesn't fire late.
    return q(
      supabase
        .from('notifications')
        .update({
          ...payload,
          status: 'snoozed',
          snooze_until: fireAt.toISOString(),
        })
        .eq('id', existing[0].id)
        .select()
        .single()
    )
  }

  // New reminder — insert directly with snoozed status so it fires later.
  return q(
    supabase
      .from('notifications')
      .insert({
        ...payload,
        status: 'snoozed',
        snooze_until: fireAt.toISOString(),
      })
      .select()
      .single()
  )
}

/**
 * Permanently stop the weekly loop for a given expired contact once the
 * outcome is decided. Sets metadata.closed=true (so the rearm sweep will
 * skip it) and flips status to dismissed so it falls out of active views.
 */
export async function resolveExpiredApptFollowup(expiredId) {
  const { data } = await supabase
    .from('notifications')
    .select('id, metadata')
    .eq('type', 'task_due')
    .eq('source_table', 'expired_contact')
    .eq('source_id', String(expiredId))
  if (!data || data.length === 0) return []
  const out = []
  for (const row of data) {
    const newMeta = { ...(row.metadata || {}), closed: true, closed_at: new Date().toISOString() }
    const { data: updated } = await supabase
      .from('notifications')
      .update({ status: 'dismissed', metadata: newMeta })
      .eq('id', row.id)
      .select()
      .single()
    if (updated) out.push(updated)
  }
  return out
}

/**
 * Auto-resolve any content reminder for a listing once the plan has been pushed.
 * Called after pushListingPlanToCalendar succeeds.
 */
export async function resolveListingContentReminder(listingId) {
  return q(
    supabase
      .from('notifications')
      .update({ status: 'dismissed' })
      .eq('type', 'listing_content')
      .eq('source_id', listingId)
      .in('status', ['unread', 'read', 'kept', 'snoozed'])
      .select()
  )
}

// ─── Stale-record sweep ─────────────────────────────────────────────────────
//
// Reads from the `stale_records` SQL view (created by migration_safeguards.sql)
// and emits a `task_due` notification for each rotting item. Deduped by
// (kind, record_id) so re-running the sweep won't create duplicate alerts —
// instead, snoozed/dismissed items stay quiet until the user restores them.
//
// Call once per session via `runStaleSweepIfDue()` — it self-throttles to once
// per calendar day using localStorage.

const STALE_SWEEP_KEY = 'notif_stale_sweep_last_run'

function staleKindMeta(kind) {
  switch (kind) {
    case 'stale_lead':         return { titleFn: l => `Lead going cold: ${l.label}`,        link: '/crm/buyers',          bodyFn: r => `${r.days_stale} days with no activity. Time to reach out.` }
    case 'overdue_appointment':return { titleFn: l => `Overdue appointment: ${l.label}`,    link: '/dashboard/appts',     bodyFn: r => `${r.days_stale} days past scheduled time. Mark held, cancelled, or no-show.` }
    case 'overdue_closing':    return { titleFn: l => `Overdue closing: ${l.label}`,        link: '/pipeline/escrow',     bodyFn: r => `Closing date passed ${r.days_stale} days ago. Update the transaction.` }
    default:                   return { titleFn: l => l.label, link: '/notifications',      bodyFn: r => `${r.days_stale} days stale.` }
  }
}

/**
 * Run the stale-record sweep. Reads the stale_records view, emits one
 * task_due notification per item that doesn't already have an active one.
 * Returns count of new notifications created.
 */
export async function runStaleSweep() {
  // 1. Read the view (created by migration_safeguards.sql #12)
  const { data: stale, error } = await supabase
    .from('stale_records')
    .select('*')
    .order('days_stale', { ascending: false })

  if (error) {
    // View doesn't exist yet (migration not run) — fail silently
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) return 0
    throw new Error(error.message)
  }
  if (!stale || stale.length === 0) return 0

  // 2. Look up which (kind, record_id) pairs already have an active task_due notification
  const recordIds = stale.map(s => s.record_id).filter(Boolean)
  const { data: existing } = await supabase
    .from('notifications')
    .select('source_id, metadata')
    .eq('type', 'task_due')
    .in('status', ['unread', 'read', 'kept', 'snoozed'])
    .in('source_id', recordIds)

  const existingKeys = new Set(
    (existing || []).map(n => `${n.metadata?.kind || ''}:${n.source_id}`)
  )

  // 3. Emit for any stale item that isn't already represented
  let created = 0
  for (const row of stale) {
    const key = `${row.kind}:${row.record_id}`
    if (existingKeys.has(key)) continue
    const meta = staleKindMeta(row.kind)
    try {
      await emit({
        type: 'task_due',
        title: meta.titleFn(row),
        body: meta.bodyFn(row),
        link: meta.link,
        source_table: row.table_name,
        source_id: row.record_id,
        metadata: { kind: row.kind, days_stale: row.days_stale },
      })
      created++
    } catch (e) { console.error('stale sweep emit failed', e) }
  }
  return created
}

/**
 * Throttled wrapper — only runs the sweep once per calendar day per browser.
 * Safe to call on every app/bell mount.
 */
export async function runStaleSweepIfDue() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const last = localStorage.getItem(STALE_SWEEP_KEY)
    if (last === today) return 0
    const n = await runStaleSweep()
    localStorage.setItem(STALE_SWEEP_KEY, today)
    return n
  } catch (e) {
    console.error('stale sweep error', e)
    return 0
  }
}

// ─── Demo helper ─────────────────────────────────────────────────────────────
/** Insert a sample notification — used by the "Test Notification" button while
 *  source features (forms, Lofty, etc) are still being built. */
export async function emitSample() {
  const samples = [
    { type: 'form_returned',     title: 'Buyer Intake completed',       body: 'Sarah Johnson submitted the Buyer Intake form.', link: '/crm/intake-forms' },
    { type: 'lead_created',      title: 'New lead from Open House',     body: 'Mike Reyes — buyer, ASAP timeline.',              link: '/crm/buyers' },
    { type: 'appointment_booked',title: 'Listing appt scheduled',       body: '4521 E Vineyard Rd · Tomorrow 10:00 AM',          link: '/dashboard/appts' },
    { type: 'phase_change',      title: 'Listing moved to Pending',     body: '2840 N Roosevelt St · contract accepted',         link: '/pipeline/board' },
    { type: 'task_due',          title: 'Follow-up call due',           body: 'Call the Garcias re: contract amendment',         link: '/tasks' },
  ]
  const pick = samples[Math.floor(Math.random() * samples.length)]
  return emit(pick)
}
