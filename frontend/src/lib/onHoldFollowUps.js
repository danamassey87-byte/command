import supabase from './supabase'

const MILESTONES = [30, 60, 90, 180] // days
const SOURCE_PREFIX = 'onhold-followup://'

function ymd(d) {
  return new Date(d).toISOString().slice(0, 10)
}

/**
 * Scan currently-paused contacts and create re-engagement tasks at the
 * 30/60/90/180-day marks, deduped by `source_link` so calling this repeatedly
 * is safe. Returns { created, scanned } counts.
 *
 * Source key shape: onhold-followup://<contactId>/<pauseEpoch>/<days>d
 * Including the pause epoch means a re-pause after reactivation still gets a
 * fresh task series.
 */
export async function generateOnHoldFollowUps() {
  const { data: contacts } = await supabase.from('contacts')
    .select('id, name, on_hold_at')
    .not('on_hold_at', 'is', null)
    .is('deleted_at', null)
    .is('archived_at', null)

  if (!contacts?.length) return { created: 0, scanned: 0 }

  const { data: existing } = await supabase.from('daily_tasks')
    .select('source_link')
    .like('source_link', `${SOURCE_PREFIX}%`)
  const existingKeys = new Set((existing ?? []).map(t => t.source_link))

  const now = Date.now()
  const toCreate = []

  for (const c of contacts) {
    if (!c.on_hold_at) continue
    const pausedAt = new Date(c.on_hold_at).getTime()
    const pauseEpoch = Math.floor(pausedAt / 1000)
    const daysElapsed = Math.floor((now - pausedAt) / 86400000)

    for (const m of MILESTONES) {
      if (daysElapsed < m) continue
      const key = `${SOURCE_PREFIX}${c.id}/${pauseEpoch}/${m}d`
      if (existingKeys.has(key)) continue

      const dueDate = new Date(pausedAt + m * 86400000)
      toCreate.push({
        title: `Check in: ${c.name || 'Unnamed contact'} — ${m} days on hold`,
        description: `Re-engagement check-in. Contact paused ${ymd(c.on_hold_at)}.`,
        category: 'follow_up',
        priority: m >= 90 ? 'high' : 'normal',
        due_date: ymd(dueDate),
        contact_id: c.id,
        source_link: key,
      })
    }
  }

  if (toCreate.length === 0) return { created: 0, scanned: contacts.length }

  const { error } = await supabase.from('daily_tasks').insert(toCreate)
  if (error) throw error
  return { created: toCreate.length, scanned: contacts.length }
}

/**
 * Run once per day per device (localStorage gate) so we don't hit the DB on
 * every page navigation. Safe to call from any page that wants to ensure the
 * follow-up queue is fresh.
 */
const DAILY_GATE_KEY = 'onhold_followups_last_run'
export async function ensureOnHoldFollowUpsToday() {
  try {
    const today = ymd(new Date())
    if (localStorage.getItem(DAILY_GATE_KEY) === today) return null
    const result = await generateOnHoldFollowUps()
    localStorage.setItem(DAILY_GATE_KEY, today)
    return result
  } catch (e) {
    console.warn('on-hold follow-up generation failed', e)
    return null
  }
}
