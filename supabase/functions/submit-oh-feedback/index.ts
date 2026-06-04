// ─────────────────────────────────────────────────────────────────────────────
// submit-oh-feedback — public form submit handler. Updates the oh_feedback
// row, emails Dana with the response, appends a note to the seller-contact.
//
// Body: {
//   feedback_id,
//   buyer_count, buyer_interest_level, price_feedback, would_show_again,
//   overall_impression, liked, concerns, general_comments
// }
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'
const DANA_EMAIL = 'dana@danamassey.com'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// M17 from SECURITY_AUDIT_PUNCHLIST. The submitted feedback freetext
// (overall_impression / liked / concerns / general_comments) is attacker-
// controllable — anyone with a feedback_id (URL is in the request email,
// but could be enumerated) can submit arbitrary text. Without escaping,
// a feedback containing `<a href="https://phish.tld">click</a>` would land
// as a live anchor in Dana's inbox under DKIM-signed danamassey.com.
function escHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const INTEREST_LABEL: Record<string, string> = {
  high: 'High', medium: 'Medium', low: 'Low', none: 'None',
}
const PRICE_LABEL: Record<string, string> = {
  too_high: 'Too high', fair: 'Fair / about right', great_deal: 'Great deal',
}
const SHOW_LABEL: Record<string, string> = {
  yes: 'Yes', maybe: 'Maybe', no: 'No',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json()
    const feedback_id = body.feedback_id?.trim()
    if (!feedback_id) return json({ error: 'feedback_id is required' }, 400)

    // Load current feedback + OH context
    const { data: fb, error: fbErr } = await db
      .from('oh_feedback')
      .select('id, open_house_id, listing_id, contact_id, hosting_agent_name, hosting_agent_email, status')
      .eq('id', feedback_id)
      .single()
    if (fbErr || !fb) return json({ error: 'Feedback not found' }, 404)

    const update: Record<string, unknown> = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      buyer_count: body.buyer_count != null && body.buyer_count !== '' ? Number(body.buyer_count) : null,
      buyer_interest_level: body.buyer_interest_level || null,
      price_feedback: body.price_feedback || null,
      would_show_again: body.would_show_again || null,
      overall_impression: body.overall_impression?.trim() || null,
      liked: body.liked?.trim() || null,
      concerns: body.concerns?.trim() || null,
      general_comments: body.general_comments?.trim() || null,
    }

    const { error: updErr } = await db.from('oh_feedback').update(update).eq('id', feedback_id)
    if (updErr) return json({ error: 'Failed to save feedback', details: updErr }, 500)

    // Load OH + property for context emails / notes
    const { data: oh } = await db
      .from('open_houses')
      .select('id, date, start_time, end_time, agent_name, listing_id, property:properties(address, city)')
      .eq('id', fb.open_house_id)
      .single()

    const addr = (oh as any)?.property?.address || 'the open house'
    const dateLabel = oh?.date
      ? new Date(oh.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : ''

    // ─── Build Dana notification email ────────────────────────────────────
    const rows: Array<[string, string]> = []
    if (update.buyer_count != null) rows.push(['Buyers attended', String(update.buyer_count)])
    if (update.buyer_interest_level) rows.push(['Interest level', INTEREST_LABEL[update.buyer_interest_level as string] || update.buyer_interest_level as string])
    if (update.price_feedback) rows.push(['Price feedback', PRICE_LABEL[update.price_feedback as string] || update.price_feedback as string])
    if (update.would_show_again) rows.push(['Would show buyers again', SHOW_LABEL[update.would_show_again as string] || update.would_show_again as string])

    const textBlocks: Array<[string, string]> = []
    if (update.overall_impression) textBlocks.push(['Overall impression', update.overall_impression as string])
    if (update.liked) textBlocks.push(['What buyers liked', update.liked as string])
    if (update.concerns) textBlocks.push(['Concerns', update.concerns as string])
    if (update.general_comments) textBlocks.push(['Other comments', update.general_comments as string])

    const hostName = fb.hosting_agent_name || fb.hosting_agent_email || 'The hosting agent'

    // M17: row labels are constants but `v` comes from update fields (some
    // are validated enums via LABEL maps, buyer_count is a Number, but
    // defense-in-depth — wrap in escHtml).
    const rowsHtml = rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#8b7a68;font-size:13px;width:160px;">${escHtml(k)}</td><td style="padding:6px 0;color:#3A2A1E;font-size:14px;"><strong>${escHtml(v)}</strong></td></tr>`).join('')
    const blocksHtml = textBlocks.map(([k, v]) => `<div style="margin:14px 0;"><div style="color:#8b7a68;font-size:13px;margin-bottom:4px;">${escHtml(k)}</div><div style="color:#3A2A1E;font-size:14px;line-height:1.6;background:#F6F4EE;padding:10px 12px;border-radius:6px;">${escHtml(v).replace(/\n/g, '<br/>')}</div></div>`).join('')

    // Subject can't carry CRLF — strip just in case property address ever
    // gets weird data.
    const subjectAddr = String(addr).replace(/[\r\n]/g, ' ').slice(0, 200)

    const danaHtml = `
<div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #3A2A1E;">
  <h2 style="font-family:'Georgia',serif;font-weight:400;margin:0 0 6px;">Open House Feedback Received</h2>
  <p style="margin:0 0 16px;color:#5A4136;font-size:14px;">${escHtml(addr)}${dateLabel ? ` · ${escHtml(dateLabel)}` : ''}</p>
  <p style="margin:0 0 18px;color:#5A4136;font-size:14px;">From: <strong>${escHtml(hostName)}</strong>${fb.hosting_agent_email ? ` (${escHtml(fb.hosting_agent_email)})` : ''}</p>
  ${rowsHtml ? `<table style="border-collapse:collapse;margin-bottom:12px;">${rowsHtml}</table>` : ''}
  ${blocksHtml}
</div>`.trim()

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      // X5: pre-record-then-send. `feedback_id` is the OH feedback row this
      // submission resolves — a double-submit on the public form would
      // otherwise re-notify Dana. Resend's 24h Idempotency-Key dedupe stops
      // the second notification at the vendor.
      await fetch(RESEND_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `oh_feedback_response_${feedback_id}`,
        },
        body: JSON.stringify({
          from: 'Open House Feedback <dana@danamassey.com>',
          to: [DANA_EMAIL],
          subject: `OH Feedback: ${subjectAddr}`,
          html: danaHtml,
          tags: [
            { name: 'type', value: 'oh_feedback_response' },
            { name: 'feedback_id', value: feedback_id },
          ],
        }),
      }).catch(() => {})
    }

    // ─── Append a note to the seller contact ──────────────────────────────
    if (fb.contact_id) {
      const summaryParts: string[] = []
      if (update.buyer_interest_level) summaryParts.push(`Interest: ${INTEREST_LABEL[update.buyer_interest_level as string] || update.buyer_interest_level}`)
      if (update.price_feedback) summaryParts.push(`Price: ${PRICE_LABEL[update.price_feedback as string] || update.price_feedback}`)
      if (update.would_show_again) summaryParts.push(`Show again: ${SHOW_LABEL[update.would_show_again as string] || update.would_show_again}`)
      const oneLiner = summaryParts.length ? ` — ${summaryParts.join(' · ')}` : ''
      const extra = [update.liked && `Liked: ${update.liked}`, update.concerns && `Concerns: ${update.concerns}`]
        .filter(Boolean).join(' | ')

      await db.from('notes').insert({
        contact_id: fb.contact_id,
        content: `OH feedback from ${hostName} at ${addr}${dateLabel ? ` (${dateLabel})` : ''}${oneLiner}${extra ? ` — ${extra}` : ''}`,
        color: '#a89070',
      }).then(() => {}).catch(() => {})
    }

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message || 'Internal error' }, 500)
  }
})
