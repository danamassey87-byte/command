// ─────────────────────────────────────────────────────────────────────────────
// resend-webhook — receives Resend delivery events and updates tracking.
//
// Resend sends POST requests here for: delivered, opened, clicked, bounced,
// complained, unsubscribed. We match by resend_email_id → campaign_step_history
// and update tracking columns.
//
// Hard bounces + complaints + unsubscribes → email_suppressions (auto-block).
//
// Setup in Resend:
//   Webhooks → Add Endpoint → URL: https://<project>.supabase.co/functions/v1/resend-webhook
//   Events: email.delivered, email.opened, email.clicked, email.bounced,
//           email.complained, email.delivery_delayed
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  // Resend sends JSON POST
  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  try {
    const payload = await req.json()
    const eventType = payload.type       // e.g. "email.delivered"
    const data = payload.data || {}
    const resendEmailId = data.email_id  // Resend's email ID
    const recipientEmail = data.to?.[0] || data.email || null
    const timestamp = data.created_at || new Date().toISOString()

    if (!resendEmailId) {
      return json({ result: 'ignored', reason: 'no email_id' })
    }

    // Find the step_history row by resend_email_id
    const { data: historyRow } = await db
      .from('campaign_step_history')
      .select('id, enrollment_id')
      .eq('resend_email_id', resendEmailId)
      .limit(1)
      .maybeSingle()

    // Map Resend event → our tracking column updates
    const updates: Record<string, any> = {}

    switch (eventType) {
      case 'email.delivered':
        updates.delivery_status = 'delivered'
        updates.delivered_at = timestamp
        break

      case 'email.delivery_delayed':
        updates.delivery_status = 'delayed'
        break

      case 'email.opened':
        updates.opened_at = updates.opened_at || timestamp
        updates.open_count = (historyRow as any)?.open_count
          ? (historyRow as any).open_count + 1
          : 1
        // Also fire a trigger event for campaign-trigger enrollment
        if (historyRow) {
          await emitEngagementEvent(db, historyRow.enrollment_id, 'email_opened', resendEmailId)
        }
        break

      case 'email.clicked':
        updates.clicked_at = updates.clicked_at || timestamp
        updates.click_count = (historyRow as any)?.click_count
          ? (historyRow as any).click_count + 1
          : 1
        if (data.link) {
          updates.last_clicked_url = data.link
        }
        if (historyRow) {
          await emitEngagementEvent(db, historyRow.enrollment_id, 'email_clicked', resendEmailId)
        }
        break

      case 'email.bounced':
        updates.delivery_status = 'bounced'
        updates.bounce_type = data.bounce?.type || 'unknown'  // hard | soft
        updates.error_message = data.bounce?.description || null
        // Hard bounce → suppress
        if (data.bounce?.type === 'hard' && recipientEmail) {
          await suppressEmail(db, recipientEmail, 'hard_bounce', `Bounced: ${data.bounce?.description}`)
        }
        break

      case 'email.complained':
        updates.delivery_status = 'complained'
        if (recipientEmail) {
          await suppressEmail(db, recipientEmail, 'complaint', 'Spam complaint via Resend')
        }
        break

      case 'email.unsubscribed':
        if (recipientEmail) {
          await suppressEmail(db, recipientEmail, 'unsubscribe', 'Unsubscribed via Resend')
        }
        break

      default:
        return json({ result: 'ignored', event: eventType })
    }

    // Update step_history row if we found one and have updates
    if (historyRow && Object.keys(updates).length > 0) {
      await db
        .from('campaign_step_history')
        .update(updates)
        .eq('id', historyRow.id)
    }

    return json({ result: 'processed', event: eventType, email_id: resendEmailId })

  } catch (err: any) {
    console.error('resend-webhook error:', err)
    return json({ error: err.message }, 500)
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function suppressEmail(
  db: any,
  email: string,
  reason: string,
  notes: string,
) {
  const normalized = email.trim().toLowerCase()
  await db.from('email_suppressions').upsert(
    {
      email: normalized,
      reason,
      source: 'resend_webhook',
      notes,
      suppressed_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  )
}

async function emitEngagementEvent(
  db: any,
  enrollmentId: string,
  eventType: string,
  resendEmailId: string,
) {
  // Look up the contact_id from the enrollment
  const { data: enrollment } = await db
    .from('campaign_enrollments')
    .select('contact_id')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (!enrollment?.contact_id) return

  // Write a trigger event (the campaign_triggers processor will pick it up
  // and auto-enroll into any campaign that watches for opens/clicks)
  await db.from('campaign_trigger_events').insert({
    event_type: eventType,
    contact_id: enrollment.contact_id,
    source_table: 'campaign_step_history',
    source_id: enrollmentId,
    event_data: { resend_email_id: resendEmailId },
  }).catch(() => { /* swallow — trigger tables may not exist yet */ })
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
