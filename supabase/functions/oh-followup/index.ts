// ─────────────────────────────────────────────────────────────────────────────
// oh-followup — cron-triggered function that handles:
//   1. Post-OH follow-up (30 min after end time) → email host report form link
//   2. Host report reminder (next day if not completed)
//   3. 24h escalation → in-app notification to Dana if still not done
//   4. Day-before briefing email (morning before OH)
//
// Schedule: run every 15 minutes via pg_cron or external cron.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
      const endDateTime = new Date(`${oh.date}T${oh.end_time}`)
      const minutesSinceEnd = (now.getTime() - endDateTime.getTime()) / 60000

      if (minutesSinceEnd >= 30 && minutesSinceEnd < 120) {
        // Send post-OH follow-up email
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

        // Also send to Dana if someone else hosted
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

        // Mark follow-up as sent + update status
        await db.from('open_houses').update({
          followup_sent_at: now.toISOString(),
          status: 'completed',
        }).eq('id', oh.id)

        results.followups_sent++
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

    // Check which OHs have host reports
    for (const oh of unreportedOHs ?? []) {
      const { data: reports } = await db
        .from('host_reports')
        .select('id')
        .eq('listing_id', oh.listing_id)
        .eq('oh_date', oh.date)
        .limit(1)

      if (!reports?.length && resendKey && oh.agent_email) {
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

        await db.from('open_houses').update({
          reminder_sent_at: now.toISOString(),
        }).eq('id', oh.id)

        results.reminders_sent++
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
      // Check if report still missing
      const { data: reports } = await db
        .from('host_reports')
        .select('id')
        .eq('listing_id', oh.listing_id)
        .eq('oh_date', oh.date)
        .limit(1)

      if (!reports?.length) {
        // Create in-app notification for Dana
        await db.from('notifications').insert({
          type: 'oh_report_overdue',
          title: `Host report overdue — ${oh.property?.address ?? 'OH'}`,
          body: `${oh.agent_name} hasn't submitted a host report for the ${oh.date} open house. Reminder was sent yesterday.`,
          link: '/open-houses',
          source_table: 'open_houses',
          source_id: oh.id,
        })

        await db.from('open_houses').update({
          escalation_sent_at: now.toISOString(),
        }).eq('id', oh.id)

        results.escalations_sent++
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
        // Only send if there's a hosting agent (briefing for them)
        if (!oh.agent_email) continue

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

        await db.from('open_houses').update({
          briefing_sent_at: now.toISOString(),
        }).eq('id', oh.id)

        results.briefings_sent++
      }
    }

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
