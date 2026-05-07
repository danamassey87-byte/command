// ─────────────────────────────────────────────────────────────────────────────
// lofty-webhook — receives webhook POSTs from Lofty CRM and persists them.
//
// Status (2026-05-07): SCAFFOLD. Dana is waiting on Lofty support to enable
// API access on her plan. The moment she has the webhook URL field in
// Lofty's settings, she pastes our public URL in and this function starts
// capturing real events.
//
// What it does today:
//   1. Accepts ANY POST (verify_jwt:false — Lofty isn't going to send a JWT).
//   2. Captures the raw body, headers we care about, and source IP into
//      lofty_inbound_events for inspection.
//   3. Returns 200 OK so Lofty doesn't retry endlessly during setup.
//   4. Best-effort sniffs `event_type` from common payload patterns.
//
// What it does NOT do yet:
//   - Verify signatures (we don't know Lofty's signing scheme yet — column is
//     captured but signature_valid stays NULL).
//   - Map to contacts. That's a separate function (lofty-process-events) we
//     ship after we see the actual payload shape.
//
// Public URL after deploy:
//   https://lfydlxhfctuiyykuyqnr.supabase.co/functions/v1/lofty-webhook
//
// Paste this in Lofty's webhook settings. Optionally add a query string token
// like ?secret=foo and we'll start checking it once we know Lofty supports it.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // GET — handy "is this thing on?" probe Dana can hit from a browser.
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      message: 'Lofty webhook receiver is live. POST your webhook payload here.',
      table: 'lofty_inbound_events',
      docs: 'See https://supabase.com/dashboard/project/lfydlxhfctuiyykuyqnr/database/tables for the captured rows.',
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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
      // Still return 200 — better to silently drop than have Lofty retry-storm
      // a malformed payload. The error is in the console for our own debugging.
    }

    return new Response(JSON.stringify({ ok: true, captured: true, event_type: eventType }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[lofty-webhook] error:', err)
    // Still 200 — see comment above.
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
