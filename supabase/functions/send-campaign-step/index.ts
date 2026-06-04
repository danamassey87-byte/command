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
//   1. Verify service-role bearer (C8 — was anonymous, so anyone with a
//      guessed enrollment_id could re-fire any step).
//   2. Load enrollment + campaign + step + contact
//   3. Check suppressions
//   4. Pre-write a 'sending' campaign_step_history row. The partial unique
//      index `campaign_step_history_inflight_uniq` on (enrollment_id,
//      step_index) WHERE delivery_status IN ('sending','sent','delivered')
//      blocks any concurrent / retry attempt — if the previous send already
//      succeeded but the post-send advance failed, this insert errors with a
//      unique violation and we advance the enrollment without re-sending.
//   5. Resolve template variables, render email
//   6. Call Resend (using the step_history row id as Idempotency-Key so
//      Resend itself rejects exact-duplicate retries within ~24h).
//   7. Update the pre-written row to 'sent' (or 'failed').
//   8. Advance enrollment with optimistic WHERE current_step = $expected and
//      clear locked_until. Audit log.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'

// Constant-time string compare for the service-role bearer check.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

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

  // ── Bearer auth (C8) ───────────────────────────────────────────────────────
  // Was anonymous before — anyone with a guessed enrollment_id could re-fire
  // any step (and the audit notes enrollment_id leaks via Resend webhook tags).
  // Require the service-role token; dispatch-due-campaigns already passes it,
  // and the frontend "Approve & Send" path should call via supabase.functions
  // .invoke() which will route through the future user-JWT verification
  // (still TODO).
  const authHeader = req.headers.get('authorization') || ''
  const providedToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : ''
  if (!providedToken || !timingSafeEqualStr(providedToken, serviceKey)) {
    return json({ error: 'forbidden' }, 403)
  }

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
      '{property_address}': '', // resolved below if listing exists
      '{agent_name}':      FROM_NAME,
      '{agent_first_name}': 'Dana',
      '{brokerage}':       'REAL Broker',
      '{agent_email}':     'dana@danamassey.com',
      '{agent_phone}':     '', // TODO: pull from brand settings
    }

    // ─── Showing data variables (for weekly seller reports) ─────────────────
    // If contact is a seller with an active listing, resolve showing stats
    if (contact.type === 'seller' || contact.type === 'both') {
      const { data: listing } = await db
        .from('listings')
        .select('id, property:properties(address)')
        .eq('contact_id', contact.id)
        .in('status', ['signed', 'coming_soon', 'active', 'pending', 'contingent'])
        .limit(1)
        .maybeSingle()

      if (listing) {
        vars['{property_address}'] = (listing as any)?.property?.address || ''

        // Fetch latest weekly report snapshot
        const { data: snapshot } = await db
          .from('weekly_report_snapshots')
          .select('*')
          .eq('listing_id', listing.id)
          .eq('email_sent', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (snapshot) {
          const showings = (snapshot.showings_data || []) as any[]
          const feedback = (snapshot.feedback_data || []) as any[]
          const stats = (snapshot.stats || {}) as any

          // Format showings list
          const showingsList = showings
            .map((s: any) => {
              const date = new Date(s.requested_date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
              const time = s.requested_time || ''
              const agent = s.agent_name ? ` (${s.agent_name}${s.agent_brokerage ? ', ' + s.agent_brokerage : ''})` : ''
              return `• ${date}${time ? ' at ' + time : ''}${agent}`
            })
            .join('\n') || 'No showings this week.'

          // Format feedback block
          const feedbackSummary = feedback
            .map((f: any) => {
              const rating = f.overall_rating ? `${f.overall_rating}/5` : ''
              const agent = f.agent_name || 'Anonymous agent'
              return `• ${agent} ${rating}: ${f.sentiment_summary || (f.feedback_text || '').substring(0, 150)}`
            })
            .join('\n\n') || 'No feedback received this week.'

          // Price sentiment
          const priceOpinions = feedback.filter((f: any) => f.price_opinion)
          const priceTotal = priceOpinions.length
          const priceSentiment = priceTotal > 0
            ? Object.entries(
                priceOpinions.reduce((acc: Record<string, number>, f: any) => {
                  acc[f.price_opinion] = (acc[f.price_opinion] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              )
                .map(([op, ct]) => `${ct} of ${priceTotal} said "${(op as string).replace('_', ' ')}"`)
                .join(', ')
            : ''

          const trendArrow = stats.showing_trend === 'up' ? '↑' : stats.showing_trend === 'down' ? '↓' : '→'

          vars['{showing_count}'] = String(stats.total_showings || 0)
          vars['{showing_dates_list}'] = showingsList
          vars['{feedback_count}'] = String(stats.feedback_count || 0)
          vars['{feedback_summary}'] = feedbackSummary
          vars['{avg_rating}'] = stats.avg_rating ? `${Number(stats.avg_rating).toFixed(1)}/5` : 'N/A'
          vars['{showing_trend}'] = `${trendArrow} ${stats.showing_trend === 'up' ? 'Up' : stats.showing_trend === 'down' ? 'Down' : 'Steady'} vs last week`
          vars['{lifetime_showings}'] = String(stats.lifetime_showings || 0)
          vars['{feedback_highlight}'] = feedback[0]?.sentiment_summary || ''
          vars['{price_sentiment}'] = priceSentiment

          // Mark snapshot as sent
          await db
            .from('weekly_report_snapshots')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', snapshot.id)
        } else {
          // No snapshot — set defaults so template vars don't show raw placeholders
          vars['{showing_count}'] = '0'
          vars['{showing_dates_list}'] = 'No showings this week.'
          vars['{feedback_count}'] = '0'
          vars['{feedback_summary}'] = 'No feedback received this week.'
          vars['{avg_rating}'] = 'N/A'
          vars['{showing_trend}'] = '→ Steady'
          vars['{lifetime_showings}'] = '0'
          vars['{feedback_highlight}'] = ''
          vars['{price_sentiment}'] = ''
        }
      }
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

    // ─── Pre-write attempt row (C8 idempotency) ──────────────────────────────
    // Partial unique on (enrollment_id, step_index) WHERE delivery_status IN
    // ('sending','sent','delivered'). If a previous attempt already succeeded
    // but its post-send advance failed, this INSERT errors with a unique
    // violation and we know the email already went out → advance the
    // enrollment without re-sending.
    const { data: attempt, error: attemptErr } = await db
      .from('campaign_step_history')
      .insert({
        enrollment_id: enrollment.id,
        step_index: enrollment.current_step,
        step_type: step.type,
        subject,
        sent_at: new Date().toISOString(),
        sent_via: 'resend',
        delivery_status: 'sending',
      })
      .select('id')
      .single()

    if (attemptErr) {
      if (/duplicate key|unique/i.test(attemptErr.message)) {
        // Another worker already sent (or is mid-flight). Don't re-send;
        // advance the enrollment so the next dispatcher run moves on.
        await advanceEnrollment(db, enrollment, steps!, 'already_sent')
        return json({ result: 'already_sent', reason: 'inflight_or_completed' })
      }
      return json({ error: 'Failed to pre-write step history', detail: attemptErr.message }, 500)
    }

    const attemptId = attempt.id

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
        { name: 'attempt_id', value: attemptId },
      ],
    }

    const resendRes = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        // Resend honors Idempotency-Key for ~24h — duplicate retries with the
        // same key return the original response and don't re-send.
        'Idempotency-Key': attemptId,
      },
      body: JSON.stringify(resendPayload),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      // Flip the pre-written row to 'failed' so the partial unique frees up
      // and a future retry can pre-write fresh.
      await db.from('campaign_step_history').update({
        delivery_status: 'failed',
        failed_at: new Date().toISOString(),
        error_message: resendData?.message || JSON.stringify(resendData),
      }).eq('id', attemptId)

      return json({
        error: 'Resend API error',
        status: resendRes.status,
        detail: resendData,
      }, 502)
    }

    const resendEmailId = resendData.id

    // Promote the pre-written row to 'sent' + record Resend's id.
    await db.from('campaign_step_history').update({
      delivery_status: 'sent',
      resend_email_id: resendEmailId,
      sent_at: new Date().toISOString(),
    }).eq('id', attemptId)

    // ─── Advance enrollment (optimistic) ─────────────────────────────────────
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

  // Optimistic: only advance if the enrollment is still on the step we think
  // it's on. If another worker already advanced (because of an idempotency
  // race), this UPDATE affects 0 rows and we just log + carry on.
  const update = isComplete
    ? {
        status: 'completed',
        completed_at: new Date().toISOString(),
        next_send_at: null,
        locked_until: null,
      }
    : (() => {
        const nextStep = steps[nextStepIdx]
        const nextDelay = nextStep?.delay_days ?? 0
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + nextDelay)
        return {
          current_step: nextStepIdx,
          next_send_at: nextDate.toISOString(),
          locked_until: null,
        }
      })()

  const { data: updated } = await db.from('campaign_enrollments')
    .update(update)
    .eq('id', enrollment.id)
    .eq('current_step', enrollment.current_step)
    .select('id')

  if (!updated || updated.length === 0) {
    console.warn(
      `[send-campaign-step] advance no-op for enrollment ${enrollment.id} ` +
      `(reason=${reason}, expected step ${enrollment.current_step}). ` +
      `Likely a concurrent advance — safe to ignore.`,
    )
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
