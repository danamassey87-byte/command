// ─────────────────────────────────────────────────────────────────────────────
// higgsfield-status — poll a Higgsfield request_id, complete the
// ai_generation_log row, and write the result URL to properties.hero_video_url
// (for video) so the listing detail page picks it up.
//
// C15 from SECURITY_AUDIT_PUNCHLIST closes the "ghost job" failure mode:
// higgsfield-generate polled for ~55s and if Higgsfield wasn't done by
// then the function returned `{pending:true}` with no follow-up path. Dana
// would refresh, see nothing, click Generate again → another paid job
// for the same video.
//
// Now higgsfield-generate persists pending jobs to ai_generation_log with
// succeeded=null + the request_id. The frontend polls this endpoint with
// the request_id every ~10 seconds until either:
//   • { ok: true, output_url } — job completed, log row flipped, properties
//     updated
//   • { ok: false, status: 'failed'|'nsfw' } — Higgsfield gave up
//   • { ok: false, pending: true } — still running, poll again
//
// Body: { request_id: string }
//
// Auth: requires the service-role bearer because the frontend invokes via
// supabase.functions.invoke which sends the anon key — but this endpoint
// is safe to leave open since the request_id is needed to look up
// anything, and request_ids are returned only from the original submit.
// Treating like a status read (anonymous OK) for now; tighten later if
// abuse surfaces.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeadersFor } from '../_shared/cors.ts'

const BASE_URL = 'https://platform.higgsfield.ai'
const TERMINAL_OK = 'completed'
const TERMINAL_BAD = new Set(['failed', 'nsfw', 'canceled'])

serve(async (req) => {
  const CORS = corsHeadersFor(req.headers.get('origin'))
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const keyId = Deno.env.get('HIGGSFIELD_KEY_ID')
  const keySecret = Deno.env.get('HIGGSFIELD_KEY_SECRET')
  if (!keyId || !keySecret) return json({ error: 'Higgsfield not configured' }, 503)

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: any
  try { body = await req.json() } catch { return json({ error: 'invalid JSON' }, 400) }
  const requestId = String(body.request_id || '').trim()
  if (!requestId) return json({ error: 'request_id is required' }, 400)

  // Look up the pending log row (if any). We don't error if missing — the
  // status check still works, just no downstream writes happen.
  const { data: logRow } = await db
    .from('ai_generation_log')
    .select('id, listing_id, property_id, kind, succeeded, output_url')
    .eq('service', 'higgsfield')
    .eq('prediction_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Already-terminal log row — return what we have, don't re-poll Higgsfield.
  if (logRow && logRow.succeeded !== null) {
    return json({
      ok: logRow.succeeded === true,
      pending: false,
      status: logRow.succeeded ? 'completed' : 'failed',
      output_url: logRow.output_url || null,
      request_id: requestId,
      cached: true,
    })
  }

  // Poll Higgsfield. AbortSignal.timeout per M2.
  const pollResp = await fetch(`${BASE_URL}/requests/${requestId}/status`, {
    headers: { Authorization: `Key ${keyId}:${keySecret}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!pollResp.ok) {
    if (pollResp.status === 401 || pollResp.status === 403) {
      return json({ error: 'Higgsfield auth failed', code: 'higgsfield_auth' }, 401)
    }
    return json({ error: `Higgsfield status fetch failed (${pollResp.status})` }, 502)
  }
  const last = await pollResp.json().catch(() => ({}))
  const status = String(last?.status || '').toLowerCase()

  if (status === TERMINAL_OK) {
    const outputUrl: string | null =
      last?.response?.jobs?.[0]?.results?.raw?.url
      || last?.jobs?.[0]?.results?.raw?.url
      || last?.output_url
      || null

    // Complete the log row.
    if (logRow) {
      await db.from('ai_generation_log')
        .update({ succeeded: true, output_url: outputUrl })
        .eq('id', logRow.id)

      // For videos, also write to properties.hero_video_url so the
      // listing detail page picks it up.
      if (outputUrl && logRow.kind === 'video' && logRow.property_id) {
        await db.from('properties')
          .update({ hero_video_url: outputUrl })
          .eq('id', logRow.property_id)
      }
    }

    return json({
      ok: true,
      pending: false,
      status: 'completed',
      output_url: outputUrl,
      request_id: requestId,
    })
  }

  if (TERMINAL_BAD.has(status)) {
    if (logRow) {
      await db.from('ai_generation_log')
        .update({ succeeded: false })
        .eq('id', logRow.id)
    }
    return json({
      ok: false,
      pending: false,
      status,
      request_id: requestId,
      message: `Higgsfield returned status=${status}`,
    })
  }

  // Still in flight.
  return json({
    ok: false,
    pending: true,
    status: status || 'unknown',
    request_id: requestId,
  })
})
