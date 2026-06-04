// ─────────────────────────────────────────────────────────────────────────────
// oh-followup — cron-triggered function that handles:
//   1. Post-OH follow-up (30 min after end time) → email host report form link
//   2. Host report reminder (next day if not completed)
//   3. 24h escalation → in-app notification to Dana if still not done
//   4. Day-before briefing email (morning before OH)
//
// Schedule: run every 15 minutes via pg_cron or external cron.
//
// Reliability fixes from SECURITY_AUDIT_PUNCHLIST.md:
//   • H3 — date math now appends `-07:00` (Arizona is no-DST). Without this,
//     `new Date('2026-06-04T16:00:00')` is parsed as UTC and the 4 PM Phoenix
//     OH appears to end at 9 AM local → follow-up fires before the OH even
//     starts.
//   • H4 — flag-then-send pattern. Each section claims the OH atomically
//     (UPDATE … SET flag=now() WHERE id=… AND flag IS NULL RETURNING id) and
//     only sends if the UPDATE returned 1 row. A retry after a transient
//     failure can no longer double-fire because the flag is already set.
//     Each per-OH iteration is wrapped in try/catch so one bad recipient
//     doesn't abort the batch (also addressed H10 from the audit).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { heartbeat } from '../_shared/heartbeat.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'
const FROM_EMAIL = 'Dana Massey <dana@danamassey.com>'
const DANA_EMAIL = 'dana@danamassey.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const db = createClient(supabaseUrl, serviceKey)

  const now = new Date()
  const results = {
    followups_sent: 0,
    reminders_sent: 0,
    escalations_sent: 0,
    briefings_sent: 0,
    errors: [] as Array<{ section: string; oh_id?: string; error: string }>,
  }

  // Arizona doesn't observe DST so the offset is constant year-round. (One day
  // this becomes a per-user setting; until then it's a constant.)
  const AZ_OFFSET = '-07:00'

  // Load notification preferences (defaults to all on)
  let notifPrefs: Record<string, boolean> = {
    oh_followup_sent: true,
    oh_briefing_sent: true,
    oh_reminder_sent: true,
    oh_report_overdue: true,
  }
  try {
    const { data: prefRow } = await db
      .from('user_settings')
      .select('value')
      .eq('key', 'notification_preferences')
      .maybeSingle()
    if (prefRow?.value) notifPrefs = { ...notifPrefs, ...prefRow.value }
  } catch { /* use defaults */ }

  // Helper: insert in-app notification if preference is on
  async function notify(type: string, title: string, body: string, link: string, sourceId: string) {
    if (notifPrefs[type] === false) return
    await db.from('notifications').insert({
      type, title, body, link,
      source_table: 'open_houses',
      source_id: sourceId,
    })
  }

  try {
    // ─── 1. Post-OH follow-up (30 min after end) ──────────────────────────
    // Find OHs that ended 30-60 min ago and haven't had a follow-up sent
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const sixtyMinAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const today = now.toISOString().slice(0, 10)

    const { data: recentOHs } = await db
      .from('open_houses')
      .select('*, property:properties(address, city)')
      .eq('date', today)
      .in('status', ['scheduled', 'confirmed'])
      .is('followup_sent_at', null)

    for (const oh of recentOHs ?? []) {
      if (!oh.end_time) continue
      // H3: explicit Phoenix offset — without this, Deno parses the bare
      // datetime as UTC and a 4 PM AZ OH appears to end at 9 AM local.
      const endDateTime = new Date(`${oh.date}T${oh.end_time}${AZ_OFFSET}`)
      const minutesSinceEnd = (now.getTime() - endDateTime.getTime()) / 60000

      if (minutesSinceEnd < 30 || minutesSinceEnd >= 120) continue

      // H4: claim the OH atomically. UPDATE … WHERE followup_sent_at IS NULL
      // returns 0 rows if another worker (or a previous retry that succeeded
      // mid-flight) already claimed it.
      const { data: claimed, error: claimErr } = await db
        .from('open_houses')
        .update({ followup_sent_at: now.toISOString(), status: 'completed' })
        .eq('id', oh.id)
        .is('followup_sent_at', null)
        .select('id')
      if (claimErr) {
        results.errors.push({ section: 'followup', oh_id: oh.id, error: claimErr.message })
        continue
      }
      if (!claimed || claimed.length === 0) continue

      try {
        const address = oh.property?.address ?? 'the property'
        const recipientEmail = oh.agent_email || DANA_EMAIL
        const recipientName = oh.agent_name || 'Dana'

        if (resendKey) {
          await fetch(RESEND_API, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [recipientEmail],
              subject: `Post Open House Report — ${address}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #524136;">Open House Follow-Up</h2>
                  <p>Hi ${recipientName},</p>
                  <p>Thank you for hosting the open house at <strong>${address}</strong> today!</p>
                  <p>Please take a few minutes to fill out the host report so we can track leads and feedback:</p>
                  <ul>
                    <li>How many groups came through?</li>
                    <li>Any positive or negative feedback?</li>
                    <li>Did anyone hint at submitting an offer?</li>
                    <li>Agent contact info from attendees</li>
                  </ul>
                  <p>You can submit your report directly in the app under <strong>Open Houses → Host Reports</strong>.</p>
                  <p style="color: #6b7280; font-size: 0.85rem;">— Dana Massey, REAL Broker</p>
                </div>
              `,
            }),
          })
        }

        if (oh.agent_email && oh.agent_email !== DANA_EMAIL && resendKey) {
          await fetch(RESEND_API, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [DANA_EMAIL],
              subject: `OH Completed — ${address} (hosted by ${oh.agent_name || 'agent'})`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px;">
                  <h2 style="color: #524136;">Open House Complete</h2>
                  <p>The open house at <strong>${address}</strong> just ended.</p>
                  <p>Hosted by: ${oh.agent_name || '—'} (${oh.agent_email || '—'})</p>
                  <p>A follow-up email has been sent requesting their host report.</p>
                </div>
              `,
            }),
          })
        }

        await notify(
          'oh_followup_sent',
          `Follow-up sent — ${address}`,
          `Post-OH follow-up email sent to ${recipientName} (${recipientEmail})`,
          '/open-houses',
          oh.id
        )

        results.followups_sent++
      } catch (err: any) {
        // Flag is already set — accept the loss rather than retry. A missed
        // notification is preferable to two emails to the host.
        console.error('[oh-followup] section 1 per-OH error:', err?.message || err)
        results.errors.push({ section: 'followup', oh_id: oh.id, error: err?.message || String(err) })
      }
    }

    // ─── 2. Host report reminder (next day) ───────────────────────────────
    // Find OHs completed yesterday with no host_report submitted
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: unreportedOHs } = await db
      .from('open_houses')
      .select('*, property:properties(address)')
      .eq('date', yesterday)
      .eq('status', 'completed')
      .not('agent_email', 'is', null)
      .is('reminder_sent_at', null)

    for (const oh of unreportedOHs ?? []) {
      try {
        const { data: reports } = await db
          .from('host_reports')
          .select('id')
          .eq('listing_id', oh.listing_id)
          .eq('oh_date', oh.date)
          .limit(1)

        if (reports?.length || !resendKey || !oh.agent_email) continue

        // H4: claim before send.
        const { data: claimed, error: claimErr } = await db
          .from('open_houses')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', oh.id)
          .is('reminder_sent_at', null)
          .select('id')
        if (claimErr) {
          results.errors.push({ section: 'reminder', oh_id: oh.id, error: claimErr.message })
          continue
        }
        if (!claimed || claimed.length === 0) continue

        const address = oh.property?.address ?? 'the property'
        await fetch(RESEND_API, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [oh.agent_email],
            subject: `Reminder: Host Report Needed — ${address}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px;">
                <h2 style="color: #524136;">Host Report Reminder</h2>
                <p>Hi ${oh.agent_name || 'there'},</p>
                <p>Just a friendly reminder — we haven't received your host report for the open house at <strong>${address}</strong> on ${oh.date}.</p>
                <p>Please submit it when you get a chance so we can follow up with the leads!</p>
                <p style="color: #6b7280; font-size: 0.85rem;">— Dana Massey, REAL Broker</p>
              </div>
            `,
          }),
        })

        await notify(
          'oh_reminder_sent',
          `Reminder sent — ${address}`,
          `Host report reminder sent to ${oh.agent_name || 'hosting agent'} (${oh.agent_email})`,
          '/open-houses',
          oh.id
        )

        results.reminders_sent++
      } catch (err: any) {
        console.error('[oh-followup] section 2 per-OH error:', err?.message || err)
        results.errors.push({ section: 'reminder', oh_id: oh.id, error: err?.message || String(err) })
      }
    }

    // ─── 3. 24h escalation → notify Dana ──────────────────────────────────
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: escalationOHs } = await db
      .from('open_houses')
      .select('*, property:properties(address)')
      .eq('status', 'completed')
      .not('reminder_sent_at', 'is', null)
      .is('escalation_sent_at', null)
      .lte('date', twoDaysAgo)
      .not('agent_name', 'is', null)

    for (const oh of escalationOHs ?? []) {
      try {
        const { data: reports } = await db
          .from('host_reports')
          .select('id')
          .eq('listing_id', oh.listing_id)
          .eq('oh_date', oh.date)
          .limit(1)

        if (reports?.length) continue

        // H4: claim before notifying.
        const { data: claimed, error: claimErr } = await db
          .from('open_houses')
          .update({ escalation_sent_at: now.toISOString() })
          .eq('id', oh.id)
          .is('escalation_sent_at', null)
          .select('id')
        if (claimErr) {
          results.errors.push({ section: 'escalation', oh_id: oh.id, error: claimErr.message })
          continue
        }
        if (!claimed || claimed.length === 0) continue

        await notify(
          'oh_report_overdue',
          `Host report overdue — ${oh.property?.address ?? 'OH'}`,
          `${oh.agent_name} hasn't submitted a host report for the ${oh.date} open house. Reminder was sent yesterday.`,
          '/open-houses',
          oh.id
        )

        results.escalations_sent++
      } catch (err: any) {
        console.error('[oh-followup] section 3 per-OH error:', err?.message || err)
        results.errors.push({ section: 'escalation', oh_id: oh.id, error: err?.message || String(err) })
      }
    }

    // ─── 4. Day-before briefing email ─────────────────────────────────────
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const isMorning = now.getHours() >= 7 && now.getHours() <= 10

    if (isMorning) {
      const { data: tomorrowOHs } = await db
        .from('open_houses')
        .select('*, property:properties(address, city)')
        .eq('date', tomorrow)
        .in('status', ['scheduled', 'confirmed'])
        .is('briefing_sent_at', null)

      for (const oh of tomorrowOHs ?? []) {
        if (!oh.agent_email) continue
        try {
          // H4: claim before send.
          const { data: claimed, error: claimErr } = await db
            .from('open_houses')
            .update({ briefing_sent_at: now.toISOString() })
            .eq('id', oh.id)
            .is('briefing_sent_at', null)
            .select('id')
          if (claimErr) {
            results.errors.push({ section: 'briefing', oh_id: oh.id, error: claimErr.message })
            continue
          }
          if (!claimed || claimed.length === 0) continue

          const address = oh.property?.address ?? 'the property'
          const city = oh.property?.city ?? ''

          if (resendKey) {
            await fetch(RESEND_API, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [oh.agent_email],
                subject: `Tomorrow's Open House Briefing — ${address}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px;">
                    <h2 style="color: #524136;">Open House Briefing</h2>
                    <p>Hi ${oh.agent_name || 'there'},</p>
                    <p>Here's your briefing for tomorrow's open house:</p>
                    <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 120px;">Address</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${address}${city ? `, ${city}` : ''}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Date</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${oh.date}</td></tr>
                      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Time</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${oh.start_time || '—'} – ${oh.end_time || '—'}</td></tr>
                      ${oh.listing_agent ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Listing Agent</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${oh.listing_agent}</td></tr>` : ''}
                      ${oh.community ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Community</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${oh.community}</td></tr>` : ''}
                    </table>
                    ${oh.notes ? `<p><strong>Notes:</strong> ${oh.notes}</p>` : ''}
                    <p>Please arrive at least 15 minutes early. After the open house, you'll receive a link to submit your host report.</p>
                    <p>Thanks for hosting!</p>
                    <p style="color: #6b7280; font-size: 0.85rem;">— Dana Massey, REAL Broker</p>
                  </div>
                `,
              }),
            })
          }

          await notify(
            'oh_briefing_sent',
            `Briefing sent — ${address}`,
            `Day-before briefing email sent to ${oh.agent_name || 'hosting agent'} for tomorrow's open house`,
            '/open-houses',
            oh.id
          )

          results.briefings_sent++
        } catch (err: any) {
          console.error('[oh-followup] section 4 per-OH error:', err?.message || err)
          results.errors.push({ section: 'briefing', oh_id: oh.id, error: err?.message || String(err) })
        }
      }
    }

    // H14: heartbeat at successful end-of-run. Cron runs every 15 min.
    await heartbeat(db, 'oh-followup', {
      followups_sent: results.followups_sent,
      reminders_sent: results.reminders_sent,
      escalations_sent: results.escalations_sent,
      briefings_sent: results.briefings_sent,
      error_count: results.errors.length,
    })

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('oh-followup error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
