// ─────────────────────────────────────────────────────────────────────────────
// virtual-staging — calls Replicate's adirik/interior-design model to stage
// an empty-room photo into a styled, furnished version.
//
// Inputs:  { photo_url, style, room_type, custom_prompt?, listing_id?, property_id? }
// Returns: { staged_url, prompt_used, model, cost_cents, prediction_id, duration_ms }
//
// Why polling (not webhooks): Supabase edge functions can wait up to 60s
// for a response. Interior-design predictions typically finish in 15-30s,
// well inside that window. No webhook plumbing needed for v1.
//
// Cost note: adirik/interior-design runs on an A100 (80GB) at ~$0.0014/sec.
// Typical run is 20-25 sec → ~3¢ per stage. We record this on the
// staged media_asset for True Net rollups.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { maybeNotifyLowReplicateCredit, isReplicate402, logAiGeneration } from '../_shared/replicate-notify.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// H12 from SECURITY_AUDIT_PUNCHLIST: SSRF-by-proxy allowlist.
// Previously `photo_url` was validated only as `.startsWith('http')` —
// anyone could drive Replicate to fetch arbitrary URLs (decompression
// bombs, copyrighted content, copies of competitor listings) and pay
// the inference cost. Now restrict to this project's own Supabase
// storage public URLs. Replicate's own outbound CDN URLs are also
// allowed because we re-upload Replicate results into staging-photos
// and then feed them into subsequent stagings (chained workflow).
function isAllowedSourceUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false

    // This project's Supabase storage. Hostname format:
    //   <project-ref>.supabase.co
    // Path must start with /storage/v1/object/(public|sign)/<bucket>/...
    const supabaseRef = (Deno.env.get('SUPABASE_URL') || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (supabaseRef && u.host === supabaseRef && /^\/storage\/v1\/object\/(public|sign)\//.test(u.pathname)) {
      return true
    }

    // Replicate's outbound result CDN (so chained stagings still work).
    if (u.host === 'replicate.delivery' || u.host.endsWith('.replicate.delivery')) return true
    if (u.host === 'pbxt.replicate.delivery') return true

    return false
  } catch {
    return false
  }
}

// ─── Style + room prompt library ─────────────────────────────────────────────
// Each style is a furniture/material palette. Each room is the major pieces
// + spatial cues. The final prompt is style + room phrasing + a quality
// suffix that nudges the model toward magazine-grade output.
//
// Tweak these here when output starts looking samey or when Dana wants
// new looks. Adding a new style = one entry in STYLE_PALETTES, no code
// changes elsewhere.

const STYLE_PALETTES: Record<string, string> = {
  modern:        'modern minimalist style, clean lines, neutral palette of white and warm grey, light oak floors, brass and matte black accents, large statement art',
  scandinavian:  'scandinavian style, light pine, white walls, soft wool textures, plenty of natural light, hygge cozy minimalism, indoor plants',
  luxury:        'luxury contemporary style, marble surfaces, velvet upholstery, brushed gold accents, layered lighting, neutral palette with deep accents, magazine-quality finishes',
  mid_century:   'mid-century modern style, walnut wood furniture, tapered legs, mustard and teal accents, brass lighting, geometric rugs, atomic-era feel',
  coastal:       'coastal style, white shiplap, weathered wood, soft blues and sandy neutrals, linen upholstery, woven jute rugs, beach-inspired but refined',
  farmhouse:     'modern farmhouse style, white shiplap walls, reclaimed wood beams, black metal accents, neutral linens, warm rustic charm without clutter',
}

const ROOM_DETAILS: Record<string, string> = {
  living:   'cozy living room with a sectional sofa, accent chair, large area rug, coffee table, floor lamp, framed art on the back wall, side table with greenery',
  bedroom:  'serene bedroom with a king-size bed, two matching nightstands with lamps, upholstered bench at the foot of the bed, dresser, layered bedding, large textured rug',
  kitchen:  'open kitchen with styled counters, decorative bowls, herbs in pots, a few cookbooks, fresh flowers, bar stools at the island if visible, no clutter',
  dining:   'dining room with a wooden table set for six, upholstered chairs, large pendant light overhead, sideboard with vases and art, layered textures',
  office:   'home office with a clean desk, ergonomic chair, bookshelf, framed art, desk lamp, indoor plants, organized cable-free workspace',
  outdoor:  'outdoor patio with comfortable seating, an outdoor rug, throw pillows, side tables with drinks, lanterns, lush potted plants, soft warm lighting',
}

const QUALITY_SUFFIX = 'professional interior photography, natural light, sharp focus, ultra-detailed, magazine-quality, photorealistic, 8k'

const NEGATIVE_PROMPT = 'blurry, low quality, distorted, watermark, text, signature, cluttered, messy, oversaturated, fake-looking, cartoon, illustration, sketch, painting, deformed, crooked walls, weird perspective, extra furniture, broken proportions'

const MODEL_OWNER = 'adirik'
const MODEL_NAME = 'interior-design'
// Approximate cost: A100 at $0.0014/sec; we record duration × this rate.
const COST_PER_SECOND_USD = 0.0014

function buildPrompt(style: string, roomType: string, custom?: string): string {
  const stylePart = STYLE_PALETTES[style] || STYLE_PALETTES.modern
  const roomPart = ROOM_DETAILS[roomType] || ROOM_DETAILS.living
  const customPart = custom?.trim() ? `, ${custom.trim()}` : ''
  return `${roomPart}, ${stylePart}${customPart}, ${QUALITY_SUFFIX}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const apiToken = Deno.env.get('REPLICATE_API_TOKEN')
    if (!apiToken) return json({ error: 'REPLICATE_API_TOKEN not configured', code: 'missing_token' }, 503)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const {
      photo_url,
      style = 'modern',
      room_type = 'living',
      custom_prompt = '',
      listing_id = null,
      property_id = null,
      staged_from_id = null,
      // ping=true is a connection test from Settings — verifies the token
      // works without spending a full prediction.
      ping = false,
    } = body

    if (ping) {
      // List the model to verify the token + reach Replicate.
      const r = await fetch(`https://api.replicate.com/v1/models/${MODEL_OWNER}/${MODEL_NAME}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      })
      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        return json({ error: `Replicate ping failed (${r.status}): ${txt.slice(0, 200)}` }, 502)
      }
      const m = await r.json()
      return json({ ok: true, model: `${MODEL_OWNER}/${MODEL_NAME}`, model_run_count: m.run_count || 0 })
    }

    if (!photo_url) return json({ error: 'photo_url is required' }, 400)
    if (typeof photo_url !== 'string' || !photo_url.startsWith('http')) {
      return json({ error: 'photo_url must be a public http(s) URL' }, 400)
    }
    // H12: only this project's Supabase storage or Replicate's own CDN.
    if (!isAllowedSourceUrl(photo_url)) {
      return json({
        error: 'photo_url must be a Supabase storage URL from this project or a replicate.delivery URL',
        code: 'url_not_allowed',
      }, 400)
    }

    const prompt = buildPrompt(style, room_type, custom_prompt)
    const startedAt = Date.now()

    // ─── Create the prediction ───────────────────────────────────────────────
    const createResp = await fetch(
      `https://api.replicate.com/v1/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=15', // ask Replicate to hold the response for up to 15s if it finishes that fast
        },
        body: JSON.stringify({
          input: {
            image: photo_url,
            prompt,
            negative_prompt: NEGATIVE_PROMPT,
            num_inference_steps: 50,
            guidance_scale: 15,
            prompt_strength: 0.8,
          },
        }),
      }
    )

    if (!createResp.ok) {
      const errBody = await createResp.text().catch(() => '')
      // 402 = insufficient credit → drop a notification so Dana sees the bell.
      if (isReplicate402(createResp.status, errBody)) {
        await maybeNotifyLowReplicateCredit(supabase, 'Virtual Staging', errBody)
        return json({
          error: 'Replicate is out of credit. Top up at replicate.com/account/billing to keep staging.',
          code: 'replicate_insufficient_credit',
          billing_url: 'https://replicate.com/account/billing',
        }, 402)
      }
      return json({
        error: `Replicate predictions create failed (${createResp.status})`,
        detail: errBody.slice(0, 400),
      }, 502)
    }

    let prediction = await createResp.json()
    const predictionId = prediction.id

    // ─── Poll until terminal ─────────────────────────────────────────────────
    // Statuses: starting | processing | succeeded | failed | canceled
    const TERMINAL = new Set(['succeeded', 'failed', 'canceled'])
    const POLL_INTERVAL_MS = 1500
    const MAX_POLLS = 35 // ~52s of polling (plus the initial 15s wait header) = fits inside Supabase's 60s wall

    let polls = 0
    while (!TERMINAL.has(prediction.status) && polls < MAX_POLLS) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      })
      if (!pollResp.ok) break
      prediction = await pollResp.json()
      polls++
    }

    const durationMs = Date.now() - startedAt

    if (prediction.status !== 'succeeded') {
      return json({
        error: `Replicate prediction ${prediction.status}`,
        prediction_id: predictionId,
        detail: prediction.error || prediction.logs?.slice(-400) || null,
        prompt_used: prompt,
      }, 502)
    }

    // adirik/interior-design returns an array of URLs (usually one).
    const output = prediction.output
    const stagedUrl = Array.isArray(output) ? output[0] : output
    if (!stagedUrl || typeof stagedUrl !== 'string') {
      return json({
        error: 'Replicate succeeded but returned no image URL',
        prediction_id: predictionId,
        raw_output: output,
      }, 502)
    }

    // Compute cost from prediction metrics if available, else estimate from wall time.
    const predictTimeSec = prediction.metrics?.predict_time
      ?? Math.max(0, Math.min(60, durationMs / 1000))
    const costUsd = predictTimeSec * COST_PER_SECOND_USD
    const costCents = Math.round(costUsd * 100)

    // Log to ai_generation_log for the AI Spend widget.
    await logAiGeneration(supabase, {
      service: 'replicate',
      model: `${MODEL_OWNER}/${MODEL_NAME}`,
      kind: 'virtual_staging',
      prompt,
      cost_cents: costCents,
      listing_id,
      property_id,
      prediction_id: predictionId,
      succeeded: true,
    })

    return json({
      ok: true,
      staged_url: stagedUrl,
      prompt_used: prompt,
      model: `${MODEL_OWNER}/${MODEL_NAME}`,
      cost_cents: costCents,
      cost_usd: Math.round(costUsd * 1000) / 1000,
      prediction_id: predictionId,
      duration_ms: durationMs,
      predict_time_sec: predictTimeSec,
    })
  } catch (err: any) {
    console.error('virtual-staging error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})
