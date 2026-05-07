// ─────────────────────────────────────────────────────────────────────────────
// transaction-deadline-check — Daily sweep over `transaction_deadlines`.
// For every Pending deadline, fires Notification Center alerts at the
// 7-day / 3-day / 1-day marks and on the missed-deadline boundary.
//
// Schedule: once per day (recommended 7:00 AM MST = 14:00 UTC) via pg_cron.
// The schema's per-row `notified_7d / 3d / 1d / missed` boolean flags dedupe
// alerts so multiple firings in a single day don't spam — and so a deadline
// missed yesterday + un-flagged still gets its missed alert today.
//
// Returns:
//   { checked: <number>, alerts: { 7d, 3d, 1d, missed }, errors: [] }
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Deadline {
  id: string
  parent_kind: string
  parent_id: string
  description: string
  calendar_date: string | null
  responsible_party: string | null
  status: string
  notified_7d: boolean
  notified_3d: boolean
  notified_1d: boolean
  notified_missed: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const results = {
    checked: 0,
    alerts: { '7d': 0, '3d': 0, '1d': 0, missed: 0 },
    errors: [] as string[],
  }

  try {
    // Pull every Pending deadline that has a date and at least one un-fired flag.
    const { data: deadlines, error } = await supabase
      .from('transaction_deadlines')
      .select('id, parent_kind, parent_id, description, calendar_date, responsible_party, status, notified_7d, notified_3d, notified_1d, notified_missed')
      .eq('status', 'Pending')
      .not('calendar_date', 'is', null)

    if (error) throw error
    if (!deadlines || deadlines.length === 0) {
      return json({ ok: true, ...results })
    }

    results.checked = deadlines.length

    // Resolve human-readable parent labels in one shot per kind, to keep the
    // notifications useful ("Smith Buyer — Inspection Objection deadline" reads
    // better than just the deadline description).
    const contactIds = [...new Set(deadlines.filter(d => d.parent_kind === 'contact').map(d => d.parent_id))]
    const listingIds = [...new Set(deadlines.filter(d => d.parent_kind === 'listing').map(d => d.parent_id))]

    const labels: Record<string, string> = {}

    if (contactIds.length) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, first_name, last_name')
        .in('id', contactIds)
      for (const c of (contacts || [])) {
        labels[`contact:${c.id}`] = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Buyer'
      }
    }

    if (listingIds.length) {
      const { data: listings } = await supabase
        .from('listings')
        .select('id, address, property:properties(address)')
        .in('id', listingIds)
      for (const l of (listings || [])) {
        labels[`listing:${l.id}`] = l.address || (l.property as any)?.address || 'Listing'
      }
    }

    for (const d of (deadlines as Deadline[])) {
      try {
        const dl = new Date(d.calendar_date! + 'T00:00:00Z')
        dl.setUTCHours(0, 0, 0, 0)
        const daysUntil = Math.round((dl.getTime() - today.getTime()) / 86400000)

        // Decide which alert (if any) to fire. Each row gets at most one
        // notification per sweep — preference order: missed > 1d > 3d > 7d.
        let kind: '7d' | '3d' | '1d' | 'missed' | null = null
        const flagCol: keyof Deadline | null =
          (daysUntil < 0 && !d.notified_missed) ? 'notified_missed' :
          (daysUntil <= 1 && daysUntil >= 0 && !d.notified_1d) ? 'notified_1d' :
          (daysUntil <= 3 && daysUntil >= 2 && !d.notified_3d) ? 'notified_3d' :
          (daysUntil <= 7 && daysUntil >= 4 && !d.notified_7d) ? 'notified_7d' :
          null

        if (flagCol === 'notified_missed') kind = 'missed'
        else if (flagCol === 'notified_1d') kind = '1d'
        else if (flagCol === 'notified_3d') kind = '3d'
        else if (flagCol === 'notified_7d') kind = '7d'

        if (!kind || !flagCol) continue

        const label = labels[`${d.parent_kind}:${d.parent_id}`] || (d.parent_kind === 'listing' ? 'Listing' : 'Buyer')
        const link  = d.parent_kind === 'listing' ? '/sellers' : '/buyers'

        const titleByKind = {
          missed: `❌ MISSED: ${d.description}`,
          '1d':   `🚨 Tomorrow: ${d.description}`,
          '3d':   `⏰ 3 days: ${d.description}`,
          '7d':   `🗓️ 1 week: ${d.description}`,
        } as const

        const bodyByKind = {
          missed: `${label} — deadline was ${d.calendar_date}. Status still Pending. Take action.`,
          '1d':   `${label} — deadline ${d.calendar_date}.${d.responsible_party ? ' Owner: ' + d.responsible_party + '.' : ''}`,
          '3d':   `${label} — deadline ${d.calendar_date}.${d.responsible_party ? ' Owner: ' + d.responsible_party + '.' : ''}`,
          '7d':   `${label} — deadline ${d.calendar_date}.${d.responsible_party ? ' Owner: ' + d.responsible_party + '.' : ''}`,
        }

        // Insert the notification.
        const { error: notifErr } = await supabase
          .from('notifications')
          .insert({
            type: `deadline_${kind}`,
            title: titleByKind[kind],
            body: bodyByKind[kind],
            link,
            source_table: 'transaction_deadlines',
            source_id: d.id,
            metadata: {
              parent_kind: d.parent_kind,
              parent_id:   d.parent_id,
              deadline_id: d.id,
              days_until:  daysUntil,
              calendar_date: d.calendar_date,
              responsible_party: d.responsible_party,
            },
          })

        if (notifErr) {
          results.errors.push(`${d.id}: notify → ${notifErr.message}`)
          continue
        }

        // Mark the dedup flag so this alert never fires twice.
        const patch: Record<string, boolean> = {}
        patch[flagCol as string] = true
        const { error: updErr } = await supabase
          .from('transaction_deadlines')
          .update(patch)
          .eq('id', d.id)

        if (updErr) {
          results.errors.push(`${d.id}: flag → ${updErr.message}`)
          continue
        }

        results.alerts[kind]++
      } catch (rowErr: any) {
        results.errors.push(`${d.id}: ${rowErr.message || String(rowErr)}`)
      }
    }

    return json({ ok: true, ...results })
  } catch (e: any) {
    return json({ ok: false, error: e.message || String(e), ...results }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
