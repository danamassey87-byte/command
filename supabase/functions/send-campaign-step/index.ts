// ─────────────────────────────────────────────────────────────────────────────
// send-campaign-step — sends one email via Resend for a single enrollment step.
//
// Called by:
//   - dispatch-due-campaigns (cron, for auto_send_enabled campaigns)
//   - Frontend "Approve & Send" button (for manual_email steps)
//
// Expects JSON body: { enrollment_id: uuid }
//
// Flow:
//   1. Load enrollment + campaign + step + contact
//   2. Check suppressions
//   3. Resolve template variables ({first_name}, etc)
//   4. Render email_blocks to HTML (or use plain body)
//   5. Call Resend API
//   6. Write campaign_step_history row with resend_email_id
//   7. Advance enrollment (current_step + next_send_at)
//   8. Write audit log
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'

// Domain mapping — must match the frontend SEND_DOMAINS constant
const DOMAINS: Record<string, string> = {
  primary:   'danamassey.com',
  subdomain: 'mail.danamassey.com',
}

const FROM_NAME = 'Dana Massey'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return json({ error: 'RESEND_API_KEY not configured' }, 503)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  try {
    const { enrollment_id } = await req.json()
    if (!enrollment_id) return json({ error: 'enrollment_id required' }, 400)

    // ─── Load data ───────────────────────────────────────────────────────────
    const { data: enrollment, error: eErr } = await db
      .from('campaign_enrollments')
      .select('*')
      .eq('id', enrollment_id)
      .single()
    if (eErr || !enrollment) return json({ error: 'Enrollment not found' }, 404)
    if (enrollment.status !== 'active') return json({ error: 'Enrollment is not active', status: enrollment.status }, 400)

    const { data: campaign } = await db
      .from('campaigns')
      .select('*')
      .eq('id', enrollment.campaign_id)
      .single()
    if (!campaign) return json({ error: 'Campaign not found' }, 404)

    const { data: steps } = await db
      .from('campaign_steps')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('step_order', { ascending: true })

    const step = steps?.[enrollment.current_step]
    if (!step) return json({ error: `Step ${enrollment.current_step} not found` }, 404)

    // Task steps don't send — they just advance
    if (step.type === 'task') {
      return json({ error: 'Task steps do not send emails', step_type: step.type }, 400)
    }

    // Manual email steps must be explicitly approved (called via frontend, not cron)
    // We allow it here — the gate is in dispatch-due-campaigns which skips requires_approval

    const { data: contact } = await db
      .from('contacts')
      .select('*')
      .eq('id', enrollment.contact_id)
      .single()
    if (!contact) return json({ error: 'Contact not found' }, 404)

    // ─── Suppression check ───────────────────────────────────────────────────
    if (contact.email) {
      const norm = contact.email.trim().toLowerCase()
      const { data: sup } = await db
        .from('email_suppressions')
        .select('id')
        .eq('email', norm)
        .limit(1)
      if (sup && sup.length > 0) {
        // Mark step as suppressed, advance enrollment
        await advanceEnrollment(db, enrollment, steps!, 'suppressed')
        return json({ result: 'suppressed', email: norm })
      }
    }

    if (!contact.email?.trim()) {
      return json({ error: 'Contact has no email address' }, 400)
    }

    // ─── Resolve variables ───────────────────────────────────────────────────
    const firstName = (contact.name || '').split(' ')[0] || ''
    const vars: Record<string, string> = {
      '{first_name}':      firstName,
      '{last_name}':       (contact.name || '').split(' ').slice(1).join(' '),
      '{full_name}':       contact.name || '',
      '{email}':           contact.email || '',
      '{phone}':           contact.phone || '',
      '{property_address}': '', // TODO: resolve from listing if available
      '{agent_name}':      FROM_NAME,
      '{agent_first_name}': 'Dana',
      '{brokerage}':       'Antigravity Real Estate',
      '{agent_email}':     'dana@danamassey.com',
      '{agent_phone}':     '', // TODO: pull from brand settings
    }

    const resolve = (text: string | null): string => {
      if (!text) return ''
      let out = text
      for (const [k, v] of Object.entries(vars)) {
        out = out.replaceAll(k, v)
      }
      return out
    }

    // ─── Build email ─────────────────────────────────────────────────────────
    const domain = DOMAINS[campaign.send_via_domain] || DOMAINS.primary
    const fromEmail = `${FROM_NAME} <dana@${domain}>`
    const subject = resolve(step.subject || `Message from ${FROM_NAME}`)

    // For now: use plain body text wrapped in a basic HTML shell.
    // TODO: if step.email_blocks exists, render blocksToHtml server-side
    const bodyText = resolve(step.body || '')
    const htmlBody = bodyText
      ? `<div style="font-family: 'Poppins', Arial, sans-serif; color: #333; line-height: 1.65; max-width: 600px; margin: 0 auto; padding: 24px;">${bodyText.replace(/\n/g, '<br>')}</div>`
      : '<p>No content</p>'

    // ─── Send via Resend ─────────────────────────────────────────────────────
    const resendPayload = {
      from: fromEmail,
      to: [contact.email.trim()],
      subject,
      html: htmlBody,
      tags: [
        { name: 'campaign_id', value: campaign.id },
        { name: 'enrollment_id', value: enrollment.id },
        { name: 'step_index', value: String(enrollment.current_step) },
      ],
    }

    const resendRes = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      // Write a failed step_history row so Dana can see the error + retry
      await db.from('campaign_step_history').insert({
        enrollment_id: enrollment.id,
        step_index: enrollment.current_step,
        step_type: step.type,
        subject,
        sent_at: new Date().toISOString(),
        sent_via: 'resend',
        resend_email_id: null,
        delivery_status: 'failed',
        error_message: resendData?.message || JSON.stringify(resendData),
      })

      return json({
        error: 'Resend API error',
        status: resendRes.status,
        detail: resendData,
      }, 502)
    }

    const resendEmailId = resendData.id

    // ─── Write step_history ──────────────────────────────────────────────────
    await db.from('campaign_step_history').insert({
      enrollment_id: enrollment.id,
      step_index: enrollment.current_step,
      step_type: step.type,
      subject,
      sent_at: new Date().toISOString(),
      sent_via: 'resend',
      resend_email_id: resendEmailId,
      delivery_status: 'sent',
    })

    // ─── Advance enrollment ──────────────────────────────────────────────────
    await advanceEnrollment(db, enrollment, steps!, 'sent')

    // ─── Audit log ───────────────────────────────────────────────────────────
    await db.from('campaign_audit_log').insert({
      enrollment_id: enrollment.id,
      campaign_id: campaign.id,
      contact_id: contact.id,
      contact_name: contact.name || '',
      campaign_name: campaign.name || '',
      action: 'step_sent_resend',
      detail: `Email sent via Resend: "${subject}" → ${contact.email} (${resendEmailId})`,
    })

    return json({
      result: 'sent',
      resend_email_id: resendEmailId,
      to: contact.email,
      subject,
      from: fromEmail,
    })

  } catch (err: any) {
    console.error('send-campaign-step error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function advanceEnrollment(
  db: any,
  enrollment: any,
  steps: any[],
  reason: string,
) {
  const nextStepIdx = enrollment.current_step + 1
  const isComplete = nextStepIdx >= steps.length

  if (isComplete) {
    await db.from('campaign_enrollments').update({
      current_step: enrollment.current_step,
      status: 'completed',
      completed_at: new Date().toISOString(),
      next_send_at: null,
    }).eq('id', enrollment.id)
  } else {
    const nextStep = steps[nextStepIdx]
    const nextDelay = nextStep?.delay_days ?? 0
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + nextDelay)

    await db.from('campaign_enrollments').update({
      current_step: nextStepIdx,
      next_send_at: nextDate.toISOString(),
    }).eq('id', enrollment.id)
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
