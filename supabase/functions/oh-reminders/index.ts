// oh-reminders — scans upcoming open houses and drops reminder notifications
// at three windows: 7 days out, 24 hours out, 2 hours out.
//
// Each OH row has a `reminders_sent text[]` column. When a window fires, its
// label ("7d" | "24h" | "2h") is appended so the next run won't re-fire.
//
// Triggered hourly via pg_cron (see schedule below). Idempotent — safe to
// re-run, won't double-notify.
//
// H4 from SECURITY_AUDIT_PUNCHLIST: the previous "check membership → insert
// notification → UPDATE array" pattern was racy. Now we (1) claim the window
// atomically via the SECURITY DEFINER `claim_oh_reminder_window` RPC (an
// array_append guarded by NOT ANY in a single UPDATE), (2) insert the
// notification only on win, and (3) likewise claim feedback_request_sent_at
// via `UPDATE … WHERE feedback_request_sent_at IS NULL` before invoking
// send-oh-feedback-request. A retry can no longer double-notify.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Window = '7d' | '24h' | '2h'

interface ReminderSpec {
  key: Window
  label: string
  // Earliest hours-from-now we'll fire this window (inclusive).
  // Latest hours-from-now we'll fire this window (exclusive).
  // Tuned with a 90-min buffer so a cron that runs hourly still catches it.
  minHoursOut: number
  maxHoursOut: number
}

const WINDOWS: ReminderSpec[] = [
  // 7-day reminder fires anywhere from 6.5 → 7.5 days out.
  { key: '7d',  label: '7 days', minHoursOut: 6.5 * 24, maxHoursOut: 7.5 * 24 },
  // 24-hour reminder fires anywhere from 22.5 → 25.5 hours out.
  { key: '24h', label: '24 hours', minHoursOut: 22.5, maxHoursOut: 25.5 },
  // 2-hour reminder fires anywhere from 1 → 3 hours out.
  { key: '2h',  label: '2 hours', minHoursOut: 1, maxHoursOut: 3 },
]

function combineDateTime(date: string, time: string | null): Date | null {
  if (!date) return null
  const t = time && /^\d{2}:\d{2}/.test(time) ? time : '11:00'
  // Treat the OH date+time as Phoenix-local (no DST). Fall back to local.
  // For correctness we'd inject the agent's timezone; for Dana that's MST/Phoenix.
  // ISO with -07:00 is good enough since Arizona doesn't observe DST.
  return new Date(`${date}T${t.length === 5 ? t + ':00' : t}-07:00`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Pull upcoming OHs in the next 8 days (covers all three windows + a buffer).
    const today = new Date()
    const horizon = new Date(today)
    horizon.setDate(horizon.getDate() + 8)
    const todayISO = today.toISOString().slice(0, 10)
    const horizonISO = horizon.toISOString().slice(0, 10)

    const { data: ohs, error } = await supabase
      .from('open_houses')
      .select('id, date, start_time, end_time, listing_id, property_id, reminders_sent, status, lockbox_code, agent_email, feedback_request_sent_at, property:properties(address, city)')
      .gte('date', todayISO)
      .lte('date', horizonISO)
      .neq('status', 'cancelled')

    if (error) throw new Error(`open_houses query failed: ${error.message}`)

    let firedCount = 0
    const fired: Array<{ oh_id: string; window: Window }> = []
    const feedbackFired: string[] = []

    for (const oh of ohs || []) {
      const eventAt = combineDateTime(oh.date, oh.start_time)
      if (!eventAt) continue
      const hoursOut = (eventAt.getTime() - Date.now()) / (1000 * 60 * 60)
      if (hoursOut <= 0) continue

      // ─── Feedback-request fire: ~1h before start, idempotent. ────────────
      // Fires anywhere from 0.25 → 1.75 hours out (catches the hourly cron).
      const ohAny = oh as any
      if (
        !ohAny.feedback_request_sent_at &&
        (ohAny.agent_email || '').trim() &&
        hoursOut >= 0.25 && hoursOut < 1.75
      ) {
        // H4: claim feedback_request_sent_at FIRST so a retry can't double-fire.
        const { data: claimed, error: claimErr } = await supabase
          .from('open_houses')
          .update({ feedback_request_sent_at: new Date().toISOString() })
          .eq('id', oh.id)
          .is('feedback_request_sent_at', null)
          .select('id')

        if (claimErr) {
          console.error(`feedback-request claim failed for ${oh.id}:`, claimErr.message)
        } else if (claimed && claimed.length > 0) {
          try {
            const res = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-oh-feedback-request`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ open_house_id: oh.id }),
              },
            )
            if (res.ok) feedbackFired.push(oh.id)
            else console.error(`feedback-request invoke failed for ${oh.id}:`, await res.text())
          } catch (e) {
            console.error(`feedback-request invoke errored for ${oh.id}:`, e)
            // Flag is already set — accept the missed call rather than retry-storm.
          }
        }
      }

      const already = new Set(oh.reminders_sent || [])

      for (const w of WINDOWS) {
        if (already.has(w.key)) continue
        if (hoursOut < w.minHoursOut || hoursOut >= w.maxHoursOut) continue

        // H4: claim the window via SECURITY DEFINER RPC. Returns true iff
        // this caller was the one to append the window key — concurrent
        // workers see false and skip.
        const { data: won, error: claimErr } = await supabase.rpc(
          'claim_oh_reminder_window',
          { p_oh_id: oh.id, p_window: w.key },
        )
        if (claimErr) {
          console.error(`Failed to claim window ${w.key} for ${oh.id}:`, claimErr.message)
          continue
        }
        if (!won) continue

        // Build notification body.
        const dateLabel = new Date(oh.date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'short', day: 'numeric',
        })
        const timeLabel = oh.start_time ? oh.start_time.slice(0, 5) : ''
        const prop = (oh as any).property
        const addressLabel = `${prop?.address || 'OH'}${prop?.city ? ', ' + prop.city : ''}`

        let title = ''
        let body = ''
        if (w.key === '7d') {
          title = `OH in 7 days: ${addressLabel}`
          body = `${dateLabel}${timeLabel ? ' at ' + timeLabel : ''}. Time to schedule the promo posts and email blast.`
        } else if (w.key === '24h') {
          title = `OH tomorrow: ${addressLabel}`
          body = `${dateLabel}${timeLabel ? ' at ' + timeLabel : ''}. Finalize prep — supplies, signage, briefing packet.`
        } else if (w.key === '2h') {
          title = `OH starts in 2h: ${addressLabel}`
          const lockboxBit = (oh as any).lockbox_code ? ` Lockbox: ${(oh as any).lockbox_code}.` : ''
          body = `${timeLabel ? 'Starts ' + timeLabel + '. ' : ''}Heading-out time.${lockboxBit} Snacks, sign-in tablet.`
        }

        const { error: notifErr } = await supabase
          .from('notifications')
          .insert({
            type: 'oh_reminder',
            title,
            body,
            link: `/open-houses/${oh.id}`,
            source_table: 'open_houses',
            source_id: oh.id,
            metadata: { window: w.key, oh_date: oh.date, oh_time: oh.start_time, listing_id: oh.listing_id },
          })

        if (notifErr) {
          // Window flag is already set — accept the missed bell ping rather
          // than retry-storm. Surfaces in the cron output for visibility.
          console.error(`Failed to insert oh_reminder for ${oh.id}/${w.key}:`, notifErr)
          continue
        }

        firedCount++
        fired.push({ oh_id: oh.id, window: w.key })
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: (ohs || []).length, fired: firedCount, details: fired, feedback_requests_fired: feedbackFired }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('oh-reminders error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error', code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
