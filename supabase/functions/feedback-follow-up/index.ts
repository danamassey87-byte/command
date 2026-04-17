// ─────────────────────────────────────────────────────────────────────────────
// feedback-follow-up — Sends polite nudge emails to showing agents who haven't
// left feedback 48+ hours after their showing. Max 2 nudges per showing.
//
// Cron: daily at 10:00 AM MST (17:00 UTC)
//
// Flow:
//   1. Query get_pending_feedback_follow_ups() for eligible showings
//   2. Check follow-up count per showing
//   3. Send via Resend (primary domain — agent-to-agent is warm)
//   4. Log follow-up in feedback_follow_ups table
//   5. Update showing request feedback_status
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return json({ error: 'RESEND_API_KEY not configured' }, 503)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const results = { followed_up: 0, marked_no_response: 0, errors: [] as string[] }

  try {
    // Get all showings needing follow-up
    const { data: pending, error } = await supabase.rpc('get_pending_feedback_follow_ups')

    if (error) {
      return json({ error: `RPC error: ${error.message}` }, 500)
    }

    for (const showing of pending || []) {
      try {
        // Check how many follow-ups already sent
        const { count } = await supabase
          .from('feedback_follow_ups')
          .select('id', { count: 'exact', head: true })
          .eq('showing_id', showing.showing_id)

        if ((count || 0) >= 2) {
          // Mark as no_response after 2 attempts
          await supabase
            .from('showing_requests')
            .update({ feedback_status: 'no_response', updated_at: new Date().toISOString() })
            .eq('id', showing.showing_id)
          results.marked_no_response++
          continue
        }

        const followUpNumber = (count || 0) + 1
        const agentFirstName = showing.agent_name?.split(' ')[0] || 'there'

        const showingDateFormatted = new Date(showing.requested_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })

        // Different messaging for 1st vs 2nd follow-up
        const subject =
          followUpNumber === 1
            ? `Quick question about your showing at ${showing.property_address}`
            : `Following up: ${showing.property_address} showing feedback`

        const body =
          followUpNumber === 1
            ? `<p>Hi ${agentFirstName},</p>
<p>Thank you for showing <strong>${showing.property_address}</strong> on ${showingDateFormatted}.</p>
<p>My sellers would love to hear how it went! If you have a moment, could you share any feedback from your buyers? Even a quick reply with their thoughts would be greatly appreciated.</p>
<p>Thank you!</p>
<p>Dana Massey<br/>REAL Broker</p>`
            : `<p>Hi ${agentFirstName},</p>
<p>Just a quick follow-up on the showing at <strong>${showing.property_address}</strong> on ${showingDateFormatted}. If your buyers had any feedback at all — positive or constructive — I'd really appreciate hearing it.</p>
<p>A simple reply works great. Thanks so much for your time!</p>
<p>Dana Massey<br/>REAL Broker</p>`

        // Send via Resend
        const emailResp = await fetch(RESEND_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'Dana Massey <dana@danamassey.com>',
            to: showing.agent_email,
            subject,
            html: `<div style="font-family: 'Poppins', Arial, sans-serif; color: #333; line-height: 1.65; max-width: 600px; margin: 0 auto; padding: 24px;">${body}</div>`,
          }),
        })

        const emailData = await emailResp.json()

        if (!emailResp.ok) {
          results.errors.push(
            `${showing.agent_email}: Resend error — ${emailData.message || JSON.stringify(emailData)}`,
          )
          continue
        }

        // Log follow-up
        await supabase.from('feedback_follow_ups').insert({
          showing_id: showing.showing_id,
          agent_email: showing.agent_email,
          follow_up_number: followUpNumber,
          resend_email_id: emailData.id,
          delivery_status: 'sent',
        })

        // Update showing status
        await supabase
          .from('showing_requests')
          .update({ feedback_status: 'follow_up_sent', updated_at: new Date().toISOString() })
          .eq('id', showing.showing_id)

        results.followed_up++
      } catch (err: any) {
        results.errors.push(`${showing.showing_id}: ${err.message}`)
      }
    }

    return json({ ok: true, pending_count: (pending || []).length, ...results })
  } catch (err: any) {
    console.error('feedback-follow-up error:', err)
    return json({ error: err.message || 'Internal error', ...results }, 500)
  }
})

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
