// ─────────────────────────────────────────────────────────────────────────────
// send-oh-feedback-request — emails a hosting agent a request to fill out the
// feedback form, ~1 hour before an open house starts.
//
// Called by:
//   • oh-reminders cron (auto, 1h before)
//   • OH detail page "Send feedback request now" button (manual)
//
// Body: { open_house_id, force?: boolean }
//   force=true skips the feedback_request_sent_at idempotency guard (used for
//   manual re-sends from the OH detail page).
//
// Flow:
//   1. Load OH + property + listing (for address, agent_email, contact_id)
//   2. Skip if agent_email missing
//   3. If not force, skip if feedback_request_sent_at already set
//   4. Upsert an oh_feedback row (status='requested')
//   5. Send email via Resend with link to /oh-feedback/{feedbackId}
//   6. Mark open_houses.feedback_request_sent_at = now()
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'
const FROM_NAME = 'Dana Massey'
const FROM_DOMAIN = 'danamassey.com'
const APP_BASE = Deno.env.get('APP_BASE_URL') || 'https://app.danamassey.com'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function fmtTime(t?: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  const ampm = hr >= 12 ? 'pm' : 'am'
  const h12 = hr % 12 === 0 ? 12 : hr % 12
  return `${h12}:${m}${ampm}`
}

function fmtDate(d?: string | null): string {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

// Constant-time string compare for the service-role bearer check.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json({ error: 'RESEND_API_KEY not configured' }, 503)

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // C6 Phase A: previously anonymous — anyone with a guessed open_house_id
  // could POST {force:true} and re-send the feedback request to the OH's
  // hosting agent, spamming them from a DKIM-signed danamassey.com address.
  // Now requires the service-role bearer. The cron path (oh-reminders)
  // already passes this. The frontend "Send Now" button on OpenHouses gets
  // a 403 — clear alert shown on the client side.
  const authHeader = req.headers.get('authorization') || ''
  const providedToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : ''
  if (!providedToken || !timingSafeEqualStr(providedToken, serviceRoleKey)) {
    return json({ error: 'forbidden' }, 403)
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
  )

  try {
    const { open_house_id, force } = await req.json()
    if (!open_house_id) return json({ error: 'open_house_id is required' }, 400)

    const { data: oh, error: ohErr } = await db
      .from('open_houses')
      .select('id, date, start_time, end_time, agent_name, agent_email, listing_id, property_id, feedback_request_sent_at, property:properties(address, city, state, zip), listing:listings(id, contact_id, contact:contacts(id, name, email))')
      .eq('id', open_house_id)
      .single()

    if (ohErr || !oh) return json({ error: 'OH not found' }, 404)

    const agentEmail = (oh.agent_email || '').trim().toLowerCase()
    if (!agentEmail) {
      return json({ error: 'No hosting agent email on this OH', skipped: 'no_agent_email' }, 200)
    }

    if (!force && oh.feedback_request_sent_at) {
      return json({ skipped: 'already_sent', sent_at: oh.feedback_request_sent_at }, 200)
    }

    // Find existing feedback row (idempotency) or create new
    const { data: existing } = await db
      .from('oh_feedback')
      .select('id, status')
      .eq('open_house_id', open_house_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let feedbackId: string
    const listingId = (oh as any).listing_id || null
    const contactId = (oh as any).listing?.contact_id || null

    if (existing?.id && existing.status === 'requested') {
      feedbackId = existing.id
      await db.from('oh_feedback').update({
        request_sent_at: new Date().toISOString(),
        request_sent_to: agentEmail,
        hosting_agent_name: oh.agent_name || null,
        hosting_agent_email: agentEmail,
        listing_id: listingId,
        contact_id: contactId,
      }).eq('id', feedbackId)
    } else {
      const { data: inserted, error: insErr } = await db
        .from('oh_feedback')
        .insert({
          open_house_id,
          listing_id: listingId,
          contact_id: contactId,
          hosting_agent_name: oh.agent_name || null,
          hosting_agent_email: agentEmail,
          status: 'requested',
          request_sent_at: new Date().toISOString(),
          request_sent_to: agentEmail,
        })
        .select('id')
        .single()
      if (insErr || !inserted?.id) {
        return json({ error: 'Failed to create oh_feedback row', details: insErr }, 500)
      }
      feedbackId = inserted.id
    }

    // Build email
    const prop = (oh as any).property
    const addr = prop?.address || 'the open house'
    const dateLabel = fmtDate(oh.date)
    const startStr = fmtTime(oh.start_time)
    const endStr = fmtTime(oh.end_time)
    const timeRange = startStr && endStr ? `${startStr}–${endStr}` : startStr
    const formUrl = `${APP_BASE.replace(/\/$/, '')}/oh-feedback/${feedbackId}`
    const greeting = oh.agent_name ? `Hi ${oh.agent_name.split(' ')[0]},` : 'Hi,'

    const html = `
<div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #3A2A1E; line-height: 1.6;">
  <p style="margin: 0 0 16px;">${greeting}</p>

  <p style="margin: 0 0 16px;">
    Thanks so much for hosting an open house at <strong>${addr}</strong> today${timeRange ? ` from <strong>${timeRange}</strong>` : ''}.
  </p>

  <p style="margin: 0 0 20px;">
    I'd really appreciate any feedback to pass along to our sellers — if you could take a few minutes to fill out this quick form, it makes a huge difference.
  </p>

  <p style="text-align: center; margin: 28px 0;">
    <a href="${formUrl}" style="display: inline-block; background: #5A4136; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500;">
      Share Feedback →
    </a>
  </p>

  <p style="margin: 0 0 16px; font-size: 13px; color: #5A4136;">
    Or paste this link into your browser:<br/>
    <a href="${formUrl}" style="color: #5A4136;">${formUrl}</a>
  </p>

  <p style="margin: 24px 0 4px;">Thanks again,</p>
  <p style="margin: 0 0 4px;"><strong>Dana Massey</strong></p>
  <p style="margin: 0; font-size: 13px; color: #8b7a68;">REAL Brokerage · East Valley, Arizona</p>
</div>`.trim()

    const subject = `Quick feedback on today's open house at ${addr}?`

    const resendRes = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <dana@${FROM_DOMAIN}>`,
        to: [agentEmail],
        bcc: agentEmail === 'dana@danamassey.com' ? undefined : ['dana@danamassey.com'],
        subject,
        html,
        tags: [
          { name: 'type', value: 'oh_feedback_request' },
          { name: 'oh_id', value: open_house_id },
          { name: 'feedback_id', value: feedbackId },
        ],
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) {
      return json({ error: 'Resend API error', details: resendData }, resendRes.status)
    }

    await db.from('open_houses')
      .update({ feedback_request_sent_at: new Date().toISOString() })
      .eq('id', open_house_id)

    return json({
      success: true,
      feedback_id: feedbackId,
      sent_to: agentEmail,
      resend_id: resendData.id,
      form_url: formUrl,
    })
  } catch (err: any) {
    return json({ error: err.message || 'Internal error' }, 500)
  }
})
