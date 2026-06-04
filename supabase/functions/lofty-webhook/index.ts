// ─────────────────────────────────────────────────────────────────────────────
// lofty-webhook — receives webhook POSTs from Lofty CRM and persists them.
//
// Security (C4 from SECURITY_AUDIT_PUNCHLIST):
//   • Requires `?secret=${LOFTY_WEBHOOK_SECRET}` query param (timing-safe
//     compare). Until Lofty publishes a signing scheme, this shared secret
//     is what stands between the public function URL and the CRM ingest path.
//   • Caps body at LOFTY_MAX_BODY_BYTES so an attacker can't drive Supabase
//     storage cost up with multi-MB payloads.
//   • Dedupes via webhook_events_seen (provider='lofty') using a SHA-256 of
//     the raw body. Once Lofty exposes an event id we switch to that.
//   • Returns 5xx on insert failure so Lofty retries (was silently dropping
//     before).
//
// Setup:
//   supabase secrets set LOFTY_WEBHOOK_SECRET=$(openssl rand -hex 24)
//   Lofty webhook URL: https://<project>.supabase.co/functions/v1/lofty-webhook?secret=<that-value>
//
// Status (2026-05-07): SCAFFOLD. Dana is waiting on Lofty support to enable
// API access on her plan. The moment she has the webhook URL field in
// Lofty's settings, she pastes the URL above (with ?secret=…) in and this
// function starts capturing real events.
//
// What it does NOT do yet:
//   - Verify HMAC signatures (we don't know Lofty's signing scheme yet — the
//     column is captured but signature_valid stays NULL).
//   - Map to contacts. That's a separate function (lofty-process-events) we
//     ship after we see the actual payload shape.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

const LOFTY_MAX_BODY_BYTES = 256 * 1024 // 256 KB — generous for any real CRM event

// Headers Lofty might use that are worth keeping for audit.
const HEADERS_OF_INTEREST = [
  'user-agent',
  'x-request-id',
  'x-webhook-id',
  'x-event-type',
  'x-event',
  'x-lofty-signature',
  'x-lofty-event',
  'x-signature',
  'x-hub-signature',
  'x-hub-signature-256',
  'content-type',
]

function sniffEventType(payload: any, headers: Record<string, string>): string | null {
  // Try header first (common pattern).
  for (const h of ['x-event-type', 'x-event', 'x-lofty-event']) {
    if (headers[h]) return headers[h]
  }
  // Then common body locations.
  if (payload?.event) return String(payload.event)
  if (payload?.event_type) return String(payload.event_type)
  if (payload?.type) return String(payload.type)
  if (payload?.action && payload?.resource) return `${payload.resource}.${payload.action}`
  if (payload?.data?.event) return String(payload.data.event)
  return null
}

function pickSignature(headers: Record<string, string>): string | null {
  for (const h of ['x-lofty-signature', 'x-signature', 'x-hub-signature-256', 'x-hub-signature']) {
    if (headers[h]) return headers[h]
  }
  return null
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // GET — handy "is this thing on?" probe Dana can hit from a browser.
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      message: 'Lofty webhook receiver is live. POST your webhook payload here with ?secret=<token>.',
      table: 'lofty_inbound_events',
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Shared-secret gate ──────────────────────────────────────────────────────
  const expectedSecret = Deno.env.get('LOFTY_WEBHOOK_SECRET')
  if (!expectedSecret) {
    console.error('[lofty-webhook] LOFTY_WEBHOOK_SECRET not configured — refusing all POSTs')
    return new Response(JSON.stringify({ error: 'webhook not configured' }), {
      status: 503,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  const url = new URL(req.url)
  const providedSecret = url.searchParams.get('secret')
    || req.headers.get('x-lofty-webhook-secret')
    || ''
  if (!providedSecret || !timingSafeEqualStr(providedSecret, expectedSecret)) {
    // 401 — no retry on Lofty's side, no hint about what was wrong.
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Body cap ────────────────────────────────────────────────────────────────
  // Check Content-Length first (cheap), then again after reading (covers chunked
  // / no-Content-Length requests).
  const contentLength = Number(req.headers.get('content-length') || '0')
  if (contentLength && contentLength > LOFTY_MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'payload too large' }), {
      status: 413,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Capture everything we can BEFORE parsing — if the body is malformed,
    // we still want to log the attempt.
    const rawText = await req.text()
    if (rawText.length > LOFTY_MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'payload too large' }), {
        status: 413,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    let payload: any = null
    try { payload = rawText ? JSON.parse(rawText) : null }
    catch { payload = { _raw_unparsed: rawText.slice(0, 4000) } }

    // Header capture (just the ones we care about).
    const capturedHeaders: Record<string, string> = {}
    for (const h of HEADERS_OF_INTEREST) {
      const v = req.headers.get(h)
      if (v) capturedHeaders[h] = v
    }

    // Best-effort source IP — Supabase preserves the client IP via these.
    const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || null

    const eventType = sniffEventType(payload, capturedHeaders)
    const signature = pickSignature(capturedHeaders)

    // ── Replay dedupe ─────────────────────────────────────────────────────────
    // Until Lofty exposes a stable event id, dedupe by content hash. Switch to
    // the real id (e.g. payload.webhook_id) the moment we see the live payload
    // shape.
    const eventId = (capturedHeaders['x-webhook-id'] || capturedHeaders['x-request-id'])
      ?? await sha256Hex(rawText)
    const { error: seenErr } = await supabase.from('webhook_events_seen').insert({
      provider: 'lofty',
      event_id: eventId,
      metadata: { event_type: eventType, source_ip: sourceIp },
    })
    if (seenErr && /duplicate key|unique/i.test(seenErr.message)) {
      // Already captured. Tell Lofty 200 so it stops retrying.
      return new Response(JSON.stringify({ ok: true, captured: false, reason: 'already_seen' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    if (seenErr) {
      console.error('[lofty-webhook] dedupe insert failed:', seenErr.message)
      return new Response(JSON.stringify({ error: 'dedupe failed' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── Persist the raw event ─────────────────────────────────────────────────
    const { error: insertErr } = await supabase
      .from('lofty_inbound_events')
      .insert({
        event_type: eventType,
        source_ip: sourceIp,
        headers: capturedHeaders,
        raw_payload: payload || {},
        signature,
        signature_valid: null, // we don't know Lofty's signing scheme yet
      })

    if (insertErr) {
      console.error('[lofty-webhook] insert failed:', insertErr.message)
      // Return 5xx — Lofty will retry. Much better than silently dropping.
      return new Response(JSON.stringify({ ok: false, error: 'insert failed' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, captured: true, event_type: eventType }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[lofty-webhook] error:', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
