// ─────────────────────────────────────────────────────────────────────────────
// higgsfield-generate — cinematic AI image + video generation via Higgsfield.
//
// Two modes (selected via `kind` in the request body):
//   • image  → Flux Pro Kontext (text-to-image, vertical/square/landscape)
//   • video  → DoP (image-to-video, cinematic camera presets)
//
// Why one function for both: same auth, same poll loop, same error/notify
// plumbing. Splitting would duplicate everything and add a second deploy.
//
// API basics (from higgsfield-js SDK v2):
//   POST https://platform.higgsfield.ai/<endpoint-path>
//   Headers: Authorization: Key {KEY_ID}:{KEY_SECRET}
//   Body:    { input: { ... } }
//   Response: { request_id, ... }
//   Poll:    GET /requests/{request_id}/status  → status: queued|in_progress|completed|failed|nsfw
//   Result:  response.jobs[0].results.raw.url
//
// Credentials: stored as two Supabase secrets (HIGGSFIELD_KEY_ID + HIGGSFIELD_KEY_SECRET)
// rather than one combined value, so they can be rotated independently.
//
// Cost model: Higgsfield is credit-based, not per-call. We log rough USD
// estimates per kind/model based on Studio-plan credit math ($99/3000 credits
// ≈ $0.033/credit). Real cost would need a webhook or scraping the dashboard;
// for the AI Spend rollup these estimates are close enough.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { logAiGeneration } from '../_shared/replicate-notify.ts'
import { checkRateLimit, callerIpKey } from '../_shared/rate-limit.ts'

// H12 from SECURITY_AUDIT_PUNCHLIST: SSRF-by-proxy allowlist.
// `input_image_url` is fed to Higgsfield as the source frame for video.
// Without an allowlist any attacker can drive Higgsfield to fetch
// arbitrary URLs (decompression bombs, competitor content) and burn
// Dana's Studio credits. Restrict to this project's Supabase storage,
// Higgsfield's own result CDN, and Replicate's result CDN (so chained
// staging → video workflows still work).
function isAllowedSourceUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const supabaseRef = (Deno.env.get('SUPABASE_URL') || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (supabaseRef && u.host === supabaseRef && /^\/storage\/v1\/object\/(public|sign)\//.test(u.pathname)) {
      return true
    }
    if (u.host === 'replicate.delivery' || u.host.endsWith('.replicate.delivery')) return true
    if (u.host.endsWith('.higgsfield.ai') || u.host.endsWith('.higgsfield-delivery.com')) return true
    return false
  } catch {
    return false
  }
}
import {
  maybeNotifyHiggsfieldIssue,
  isHiggsfieldCreditError,
  isHiggsfieldAuthError,
  isHiggsfieldRateLimited,
} from '../_shared/higgsfield-notify.ts'
import { corsHeadersFor } from '../_shared/cors.ts'

const BASE_URL = 'https://platform.higgsfield.ai'

// ─── Style + motion libraries ────────────────────────────────────────────────
// Mirrors the generate-image / virtual-staging pattern: add a key here, no
// other code change required to expose a new style or camera move.

const IMAGE_STYLE_SUFFIXES: Record<string, string> = {
  photography:   'professional photography, sharp focus, natural lighting, magazine quality, photorealistic, 8k',
  lifestyle:     'aspirational lifestyle photography, warm natural light, candid feel, real estate marketing aesthetic, sharp focus',
  cinematic:     'cinematic still, anamorphic lens, shallow depth of field, golden hour, dramatic warm lighting, color graded, film grain',
  editorial:     'editorial magazine photography, bold composition, sophisticated styling, premium feel, sharp focus, high dynamic range',
  minimalist:    'minimalist composition, clean negative space, single focal subject, neutral palette, brand-friendly',
}

// DoP camera presets — what makes Higgsfield distinctive. Each key maps to
// the camera-movement phrasing the model responds to. Default is "slow push
// in" which works well for real estate hero shots.
const VIDEO_MOTIONS: Record<string, string> = {
  push_in:       'slow cinematic push in toward the subject, smooth dolly forward, anamorphic feel',
  orbit:         'smooth cinematic orbit around the subject, gentle camera arc',
  pull_out:      'slow cinematic pull out reveal, smooth dolly backward, expansive scale',
  crane_up:      'cinematic crane up, rising aerial-style camera move, drone-like ascent',
  pan_right:     'smooth cinematic horizontal pan right, gentle parallax',
  static_living: 'static composition with subtle parallax and ambient micro-movements, like a living photograph',
}

const ASPECT_MAP: Record<string, string> = {
  square:    '1:1',
  portrait:  '4:5',
  vertical:  '9:16',
  landscape: '16:9',
  wide:      '21:9',
}

// Endpoints (per higgsfield-js SDK v2).
const IMAGE_ENDPOINT = '/flux-pro/kontext/max/text-to-image'
const VIDEO_ENDPOINT = '/v1/image2video/dop'

// Rough USD cost estimates — Higgsfield doesn't return a per-call cost, so
// these are derived from public credit pricing (Studio: $99/3000 credits).
// Adjust when Dana shares real burn data.
const COST_USD = {
  image_flux_kontext: 0.10,  // ~3 credits
  video_dop_turbo:    0.33,  // ~10 credits, fast model
  video_dop_standard: 1.00,  // ~30 credits, higher quality
} as const

serve(async (req) => {
  // M1: lock CORS to known frontend origins.
  const CORS = corsHeadersFor(req.headers.get('origin'))
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const keyId = Deno.env.get('HIGGSFIELD_KEY_ID')
    const keySecret = Deno.env.get('HIGGSFIELD_KEY_SECRET')
    if (!keyId || !keySecret) {
      return json({
        error: 'Higgsfield credentials not configured. Set HIGGSFIELD_KEY_ID and HIGGSFIELD_KEY_SECRET in Supabase secrets.',
        code: 'missing_credentials',
      }, 503)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // M18: per-IP throttle. Higgsfield credits are the most expensive of the
    // image/video generators (~$0.10-$1.00 per call). 10/hr caps runaway burn.
    const rl = await checkRateLimit(supabase, {
      scope: 'higgsfield-generate',
      key: callerIpKey(req),
      periodSeconds: 3600,
      max: 10,
    })
    if (!rl.allowed) {
      return new Response(JSON.stringify({
        error: 'Too many requests',
        retry_after_seconds: rl.retryAfterSeconds,
      }), {
        status: 429,
        headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSeconds) },
      })
    }

    const body = await req.json().catch(() => ({}))
    const {
      kind = 'image',                 // 'image' | 'video'
      prompt = '',
      style = 'photography',          // image only
      motion = 'push_in',             // video only
      aspect = 'vertical',
      input_image_url = null,         // video only — source photo
      video_model = 'turbo',          // 'turbo' | 'standard' — video only
      listing_id = null,
      property_id = null,
      seed = null,
      ping = false,                   // settings connection test
    } = body

    // ─── Ping path: cheap auth verification, no spend ────────────────────────
    if (ping) {
      // No public "whoami" endpoint documented — POST a tiny status check that
      // is guaranteed to 404 (vs 401 for bad auth) and use the status code as
      // the signal.
      const r = await fetch(`${BASE_URL}/requests/__ping_${Date.now()}/status`, {
        headers: { Authorization: `Key ${keyId}:${keySecret}` },
      })
      const txt = await r.text().catch(() => '')
      if (isHiggsfieldAuthError(r.status)) {
        return json({ error: `Higgsfield auth failed (${r.status})`, detail: txt.slice(0, 200) }, 401)
      }
      // 404 / 400 are both "auth worked, request id doesn't exist" — that's success.
      return json({ ok: true, status: r.status })
    }

    if (!prompt.trim()) return json({ error: 'prompt is required' }, 400)
    if (kind !== 'image' && kind !== 'video') {
      return json({ error: 'kind must be "image" or "video"' }, 400)
    }
    if (kind === 'video' && !input_image_url) {
      return json({ error: 'input_image_url is required for video generation' }, 400)
    }
    if (input_image_url && (typeof input_image_url !== 'string' || !input_image_url.startsWith('http'))) {
      return json({ error: 'input_image_url must be a public http(s) URL' }, 400)
    }
    if (input_image_url && !isAllowedSourceUrl(input_image_url)) {
      return json({
        error: 'input_image_url must be a Supabase storage URL from this project or a Replicate/Higgsfield CDN URL',
        code: 'url_not_allowed',
      }, 400)
    }

    // ─── Build the request body per kind ─────────────────────────────────────
    let endpoint: string
    let modelLabel: string
    let costUsd: number
    let input: Record<string, unknown>

    if (kind === 'image') {
      const stylePart = IMAGE_STYLE_SUFFIXES[style] || IMAGE_STYLE_SUFFIXES.photography
      const fullPrompt = `${prompt.trim()}. ${stylePart}.`
      endpoint = IMAGE_ENDPOINT
      modelLabel = 'higgsfield/flux-pro-kontext-max'
      costUsd = COST_USD.image_flux_kontext
      input = {
        prompt: fullPrompt,
        aspect_ratio: ASPECT_MAP[aspect] || '9:16',
        safety_tolerance: 2,
        ...(seed != null ? { seed } : {}),
      }
    } else {
      const motionPart = VIDEO_MOTIONS[motion] || VIDEO_MOTIONS.push_in
      const fullPrompt = `${prompt.trim()}. ${motionPart}.`
      endpoint = VIDEO_ENDPOINT
      const dopModel = video_model === 'standard' ? 'dop-standard' : 'dop-turbo'
      modelLabel = `higgsfield/${dopModel}`
      costUsd = video_model === 'standard' ? COST_USD.video_dop_standard : COST_USD.video_dop_turbo
      input = {
        model: dopModel,
        prompt: fullPrompt,
        input_images: [{ type: 'image_url', image_url: input_image_url }],
        ...(seed != null ? { seed } : {}),
      }
    }

    const startedAt = Date.now()
    const promptForLog = (input.prompt as string) || prompt

    // ─── Submit the job ──────────────────────────────────────────────────────
    const createResp = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${keyId}:${keySecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    })

    if (!createResp.ok) {
      const errBody = await createResp.text().catch(() => '')
      if (isHiggsfieldAuthError(createResp.status)) {
        await maybeNotifyHiggsfieldIssue(supabase, kind === 'video' ? 'Cinematic Video' : 'Cinematic Image', 'auth', errBody)
        return json({
          error: 'Higgsfield authentication failed. Re-check the API key.',
          code: 'higgsfield_auth',
          detail: errBody.slice(0, 300),
        }, 401)
      }
      if (isHiggsfieldRateLimited(createResp.status)) {
        await maybeNotifyHiggsfieldIssue(supabase, kind === 'video' ? 'Cinematic Video' : 'Cinematic Image', 'rate_limited', errBody)
        return json({
          error: 'Higgsfield is rate-limiting requests. Wait a moment and try again.',
          code: 'higgsfield_rate_limited',
        }, 429)
      }
      if (isHiggsfieldCreditError(createResp.status, errBody)) {
        await maybeNotifyHiggsfieldIssue(supabase, kind === 'video' ? 'Cinematic Video' : 'Cinematic Image', 'low_credit', errBody)
        return json({
          error: 'Higgsfield credits exhausted. Top up your plan at higgsfield.ai/pricing.',
          code: 'higgsfield_insufficient_credit',
          billing_url: 'https://higgsfield.ai/pricing',
        }, 402)
      }
      return json({
        error: `Higgsfield submit failed (${createResp.status})`,
        detail: errBody.slice(0, 400),
        prompt_used: promptForLog,
      }, 502)
    }

    const submitJson = await createResp.json().catch(() => ({}))
    const requestId: string | undefined = submitJson.request_id || submitJson.id
    if (!requestId) {
      return json({ error: 'Higgsfield response missing request_id', raw: submitJson }, 502)
    }

    // ─── Poll until terminal ─────────────────────────────────────────────────
    // Video generations can take 30-90s. Image is usually 5-15s. We poll up
    // to ~55s total to stay inside the edge function 60s wall clock; if not
    // done by then we hand the request_id back and the client can re-poll
    // via a future /higgsfield-status endpoint (queued for later — for now
    // the client just shows a timeout message).
    const TERMINAL_OK = 'completed'
    const TERMINAL_BAD = new Set(['failed', 'nsfw', 'canceled'])
    const POLL_INTERVAL_MS = 1500
    const MAX_POLLS = 36 // ~54s

    let polls = 0
    let last: any = null
    while (polls < MAX_POLLS) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      const pollResp = await fetch(`${BASE_URL}/requests/${requestId}/status`, {
        headers: { Authorization: `Key ${keyId}:${keySecret}` },
      })
      if (!pollResp.ok) {
        // Transient — keep polling unless auth blew up.
        if (isHiggsfieldAuthError(pollResp.status)) break
        polls++
        continue
      }
      last = await pollResp.json().catch(() => ({}))
      const s = (last?.status || '').toLowerCase()
      if (s === TERMINAL_OK || TERMINAL_BAD.has(s)) break
      polls++
    }

    const durationMs = Date.now() - startedAt
    const status = (last?.status || '').toLowerCase()

    if (status !== TERMINAL_OK) {
      // Timeout — hand the request_id back so the client can poll later, or
      // surface the failure reason if we have one.
      if (!status || status === 'queued' || status === 'in_progress') {
        // C15: persist the pending request so the new higgsfield-status
        // endpoint can pick it up. Without this row, a retry would lose
        // the original request_id entirely and submit a fresh (paid) job.
        await supabase.from('ai_generation_log').insert({
          service: 'higgsfield',
          model: modelLabel,
          kind,
          prompt: promptForLog,
          cost_cents: Math.round(costUsd * 100),
          listing_id: listing_id || null,
          property_id: property_id || null,
          prediction_id: requestId,
          succeeded: null,  // pending — higgsfield-status flips it
        })
        return json({
          ok: false,
          pending: true,
          request_id: requestId,
          status,
          duration_ms: durationMs,
          message: 'Generation is still running. Poll /higgsfield-status with this request_id, or refresh the page in 30–60 seconds.',
        }, 202)
      }
      await logAiGeneration(supabase, {
        service: 'higgsfield',
        model: modelLabel,
        kind: kind === 'video' ? 'cinematic_video' : 'cinematic_image',
        prompt: promptForLog,
        cost_cents: 0,
        listing_id,
        property_id,
        prediction_id: requestId,
        succeeded: false,
      })
      return json({
        error: `Higgsfield job ${status}`,
        status,
        request_id: requestId,
        detail: last?.error || last?.message || null,
        prompt_used: promptForLog,
      }, 502)
    }

    // Result extraction: SDK normalizes to jobs[0].results.raw.url. Older
    // responses may put the URL at jobs[0].result.url or just url — fall back.
    const job0 = last?.jobs?.[0] || {}
    const resultUrl: string | undefined =
      job0?.results?.raw?.url ||
      job0?.result?.url ||
      job0?.url ||
      last?.url
    if (!resultUrl) {
      return json({
        error: 'Higgsfield completed but returned no media URL',
        request_id: requestId,
        raw: last,
      }, 502)
    }

    const costCents = Math.round(costUsd * 100 * 10) / 10 // tenths of a cent

    await logAiGeneration(supabase, {
      service: 'higgsfield',
      model: modelLabel,
      kind: kind === 'video' ? 'cinematic_video' : 'cinematic_image',
      prompt: promptForLog,
      cost_cents: costCents,
      listing_id,
      property_id,
      prediction_id: requestId,
      succeeded: true,
    })

    return json({
      ok: true,
      kind,
      media_url: resultUrl,
      // Aliases so callers can grab the field they expect without branching.
      image_url: kind === 'image' ? resultUrl : null,
      video_url: kind === 'video' ? resultUrl : null,
      prompt_used: promptForLog,
      model: modelLabel,
      cost_cents: costCents,
      cost_usd: Math.round(costUsd * 1000) / 1000,
      request_id: requestId,
      duration_ms: durationMs,
    })
  } catch (err: any) {
    console.error('higgsfield-generate error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})
