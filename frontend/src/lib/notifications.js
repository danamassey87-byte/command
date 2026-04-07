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

/** All "active" notifications (unread, read, kept) plus optional type filter. */
export async function listActive({ type = null } = {}) {
  await wakeSnoozed()
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
