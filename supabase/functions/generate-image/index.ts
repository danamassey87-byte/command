// ─────────────────────────────────────────────────────────────────────────────
// generate-image — text-to-image generation via Replicate's FLUX models.
//
// Different shape from virtual-staging: no source photo, just a prompt.
// Used for fresh marketing visuals (Instagram graphics, flyer art, social
// post backgrounds, email hero images) — anywhere PostComposer needs a
// brand-new image instead of an existing photo.
//
// Default model: black-forest-labs/flux-schnell — fast (4 steps), cheap
// (~$0.003/image), high enough quality for social media. Use the
// `quality` flag to switch to flux-1.1-pro for hero / print-ready output
// (~$0.04/image).
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

// Style presets — appended to the user's prompt to nudge the model toward
// specific looks. Adding a new style = one entry here, no other changes.
const STYLE_SUFFIXES: Record<string, string> = {
  photography:   'professional photography, sharp focus, natural lighting, magazine quality, photorealistic, 8k',
  illustration:  'modern flat illustration, clean lines, vibrant but balanced color palette, minimalist composition',
  lifestyle:     'aspirational lifestyle photography, warm natural light, candid feel, real estate marketing aesthetic, sharp focus',
  minimalist:    'minimalist design, clean negative space, single focal subject, neutral palette, brand-friendly',
  bold_graphic:  'bold graphic design, high contrast, eye-catching composition, designed for social media scroll-stopping',
  three_d:       '3d rendered illustration, clean materials, soft global illumination, modern stylized look',
}

const NEGATIVE_DEFAULTS = 'blurry, low quality, watermark, text overlay, signature, distorted, deformed, ugly, bad anatomy, extra limbs, cartoon when realism wanted'

// Aspect ratio → flux-schnell's expected enum.
const ASPECT_MAP: Record<string, string> = {
  square:    '1:1',
  portrait:  '4:5',  // Instagram-friendly portrait
  vertical:  '9:16', // Story / Reel
  landscape: '16:9',
  wide:      '21:9',
}

const FAST_MODEL = 'black-forest-labs/flux-schnell'
const QUALITY_MODEL = 'black-forest-labs/flux-1.1-pro'

// Approximate costs per image based on Replicate pricing as of training cutoff.
// Tuned by actual `prediction.metrics.predict_time` when present in the response.
const COST_BY_MODEL: Record<string, number> = {
  [FAST_MODEL]: 0.003,
  [QUALITY_MODEL]: 0.04,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const apiToken = Deno.env.get('REPLICATE_API_TOKEN')
    if (!apiToken) return json({ error: 'REPLICATE_API_TOKEN not configured' }, 503)

    const body = await req.json().catch(() => ({}))
    const {
      prompt = '',
      style = 'photography',
      aspect = 'square',
      negative_prompt = '',
      quality = false, // false → flux-schnell (default), true → flux-1.1-pro
    } = body

    if (!prompt.trim()) return json({ error: 'prompt is required' }, 400)

    const stylePart = STYLE_SUFFIXES[style] || STYLE_SUFFIXES.photography
    const fullPrompt = `${prompt.trim()}. ${stylePart}.`
    const fullNegative = (negative_prompt || NEGATIVE_DEFAULTS).trim()
    const aspectRatio = ASPECT_MAP[aspect] || '1:1'

    const model = quality ? QUALITY_MODEL : FAST_MODEL
    const startedAt = Date.now()

    // FLUX schnell uses different inputs than 1.1-pro. Build per-model.
    const input: Record<string, unknown> = quality
      ? {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio,
          output_format: 'png',
          safety_tolerance: 2,
          prompt_upsampling: false,
        }
      : {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio,
          num_outputs: 1,
          output_format: 'webp',
          output_quality: 90,
          megapixels: '1',
        }

    const createResp = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=20',
        },
        body: JSON.stringify({ input }),
      }
    )

    if (!createResp.ok) {
      const errBody = await createResp.text().catch(() => '')
      return json({
        error: `Replicate predictions create failed (${createResp.status})`,
        detail: errBody.slice(0, 400),
        prompt_used: fullPrompt,
      }, 502)
    }

    let prediction = await createResp.json()
    const predictionId = prediction.id

    const TERMINAL = new Set(['succeeded', 'failed', 'canceled'])
    const POLL_INTERVAL_MS = 1200
    const MAX_POLLS = 30

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
        prompt_used: fullPrompt,
      }, 502)
    }

    // FLUX models return either a single URL or an array (depending on version).
    const output = prediction.output
    const imageUrl = Array.isArray(output) ? output[0] : output
    if (!imageUrl || typeof imageUrl !== 'string') {
      return json({
        error: 'Replicate succeeded but returned no image URL',
        prediction_id: predictionId,
        raw_output: output,
      }, 502)
    }

    // Cost: prefer the actual predict_time from Replicate, else fall back to the
    // per-image rate.
    let costUsd: number
    if (prediction.metrics?.predict_time && model === QUALITY_MODEL) {
      // Pro uses its own pricing — but this approximation is fine for our rollup.
      costUsd = COST_BY_MODEL[model]
    } else {
      costUsd = COST_BY_MODEL[model]
    }
    const costCents = Math.round(costUsd * 100 * 10) / 10 // tenths of a cent

    return json({
      ok: true,
      image_url: imageUrl,
      prompt_used: fullPrompt,
      model,
      cost_cents: costCents,
      cost_usd: Math.round(costUsd * 1000) / 1000,
      prediction_id: predictionId,
      duration_ms: durationMs,
      predict_time_sec: prediction.metrics?.predict_time || null,
    })
  } catch (err: any) {
    console.error('generate-image error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})
