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
//
// Security (C3 from SECURITY_AUDIT_PUNCHLIST):
//   • Verifies the Svix signature on every request. Without this, anyone on the
//     internet can POST `{"type":"email.complained","data":{"to":["sarah@..."]}}`
//     and permanently suppress Dana's hottest leads.
//   • Rejects timestamps outside a ±5 min window (replay defense).
//   • Dedupes by `svix-id` via webhook_events_seen so a redelivery doesn't
//     double-count opens/clicks or re-suppress.
//   • Required env: RESEND_WEBHOOK_SECRET (the `whsec_…` secret from Resend's
//     webhook settings — set with `supabase secrets set RESEND_WEBHOOK_SECRET=…`).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

const REPLAY_WINDOW_SEC = 300 // 5 min — matches Svix's default

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
    const rawBody = await req.text()

    // ── Signature verification ──────────────────────────────────────────────
    const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')
    if (!secret) {
      // Fail closed — don't accept events while unconfigured. The whole point
      // of this function is to be a trusted state-mutator.
      console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not set — rejecting')
      return json({ error: 'webhook not configured' }, 503)
    }
    const verified = await verifySvixSignature(rawBody, req.headers, secret)
    if (!verified.ok) {
      console.warn(`[resend-webhook] rejecting unsigned/invalid request: ${verified.reason}`)
      return json({ error: 'signature verification failed' }, 401)
    }

    // ── Replay dedupe ───────────────────────────────────────────────────────
    const svixId = req.headers.get('svix-id')!
    const { error: seenErr } = await db.from('webhook_events_seen').insert({
      provider: 'resend',
      event_id: svixId,
      metadata: { svix_timestamp: req.headers.get('svix-timestamp') },
    })
    // PK collision means we've already processed this event id — short-circuit
    // with 200 so Resend doesn't keep retrying.
    if (seenErr && /duplicate key|unique/i.test(seenErr.message)) {
      return json({ result: 'already_processed', svix_id: svixId })
    }
    if (seenErr) {
      // Don't drop the event — fail loud so Resend retries.
      console.error('[resend-webhook] dedupe insert failed:', seenErr.message)
      return json({ error: 'dedupe failed' }, 500)
    }

    // ── Parse + process ─────────────────────────────────────────────────────
    let payload: any
    try { payload = JSON.parse(rawBody) }
    catch { return json({ error: 'invalid JSON' }, 400) }

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

// ─── Svix signature verification ─────────────────────────────────────────────
// Resend uses Svix's signing scheme. Spec:
//   • signedPayload  = `${svix-id}.${svix-timestamp}.${rawBody}`
//   • secret         = `whsec_<base64>` — strip prefix, base64-decode → key bytes
//   • signature      = base64(HMAC-SHA256(key, signedPayload))
//   • svix-signature header = space-separated `v1,<sig>` tokens (multi for rotation)

async function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, reason: 'missing svix headers' }
  }

  const ts = Number(svixTimestamp)
  if (!Number.isFinite(ts)) return { ok: false, reason: 'invalid timestamp' }
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - ts)
  if (ageSec > REPLAY_WINDOW_SEC) {
    return { ok: false, reason: `timestamp ${ageSec}s outside ±${REPLAY_WINDOW_SEC}s window` }
  }

  const secretB64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let keyBytes: Uint8Array
  try { keyBytes = base64ToBytes(secretB64) }
  catch { return { ok: false, reason: 'malformed secret' } }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${svixId}.${svixTimestamp}.${rawBody}`),
  )
  const expectedB64 = bytesToBase64(new Uint8Array(sig))

  // svix-signature header is space-separated; each token is `<version>,<base64sig>`.
  const provided = svixSignature.split(' ').map((s) => s.trim()).filter(Boolean)
  for (const tok of provided) {
    const idx = tok.indexOf(',')
    if (idx < 0) continue
    const version = tok.slice(0, idx)
    const sigVal = tok.slice(idx + 1)
    if (version !== 'v1') continue
    if (timingSafeEqualStr(sigVal, expectedB64)) return { ok: true }
  }
  return { ok: false, reason: 'no matching signature' }
}

function base64ToBytes(b64: string): Uint8Array {
  // Handle URL-safe variants just in case.
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

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
