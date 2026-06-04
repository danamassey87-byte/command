// ─────────────────────────────────────────────────────────────────────────────
// elevenlabs-tts — generate Dana-voiced narration from text via ElevenLabs.
//
// Reads the API key from service_secrets (service-role-only) and voice_id
// from user_settings.elevenlabs.
//
// Body: {
//   text: string                       (required)
//   voice_id?: string                  (override; default = user_settings.elevenlabs.voice_id)
//   model_id?: string                  (default 'eleven_multilingual_v2')
//   stability?: number                 (0–1, default 0.5)
//   similarity_boost?: number          (0–1, default 0.85)
//   style?: number                     (0–1, default 0)
//   listing_id?, property_id?, contact_id?  (optional context for spend log)
//   save_to_storage?: boolean          (default true; false = return base64 only)
// }
//
// Response: { audio_url, audio_base64?, storage_path, character_count, cost_cents }
//
// Pricing: ElevenLabs Creator plan ≈ $0.18 / 1k chars (cloned voice).
// We log per-call cost_cents to ai_generation_log so it surfaces in AI Spend.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COST_PER_1K_CHARS_CENTS = 18 // ~$0.18 / 1k chars on Creator plan

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json()
    const text = (body.text ?? '').toString().trim()
    if (!text) return json({ error: 'text is required' }, 400)
    if (text.length > 5000) return json({ error: 'text too long (max 5000 chars per call)' }, 400)

    // ─── Load credentials ────────────────────────────────────────────────────
    const { data: secretRow } = await db.from('service_secrets')
      .select('value').eq('key', 'elevenlabs_api_key').maybeSingle()
    const apiKey: string | undefined = (secretRow?.value as any)?.api_key
    if (!apiKey) return json({ error: 'ElevenLabs API key not configured. Set it in Settings.' }, 503)

    const { data: cfgRow } = await db.from('user_settings')
      .select('value').eq('key', 'elevenlabs').maybeSingle()
    const defaultVoice: string | undefined = (cfgRow?.value as any)?.voice_id
    const voiceId = body.voice_id || defaultVoice
    if (!voiceId) return json({ error: 'No voice_id configured or provided' }, 400)

    // ─── Pull saved defaults / preset, then layer body overrides on top ──────
    const savedDefaults = (cfgRow?.value as any)?.voice_settings || {}
    const presets = (cfgRow?.value as any)?.presets || {}
    const preset = body.preset && presets[body.preset] ? presets[body.preset] : null

    const modelId = body.model_id || (cfgRow?.value as any)?.model_id || 'eleven_multilingual_v2'
    const voiceSettings: Record<string, unknown> = {
      stability:        body.stability        ?? preset?.stability        ?? savedDefaults.stability        ?? 0.5,
      similarity_boost: body.similarity_boost ?? preset?.similarity_boost ?? savedDefaults.similarity_boost ?? 0.85,
      style:            body.style            ?? preset?.style            ?? savedDefaults.style            ?? 0,
      use_speaker_boost: true,
    }
    const speed = body.speed ?? preset?.speed ?? savedDefaults.speed
    if (speed != null) voiceSettings.speed = speed

    // ─── Call ElevenLabs ────────────────────────────────────────────────────
    // M2: bound the wall clock. TTS audio gen typically lands inside 30s
    // for paragraph-sized text; longer renders are rare. 45s ceiling
    // leaves a small buffer inside the 60s edge fn budget for the post-
    // call upload to storage.
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({ text, model_id: modelId, voice_settings: voiceSettings }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!ttsRes.ok) {
      const errText = await ttsRes.text()
      // Log failed call
      await db.from('ai_generation_log').insert({
        service: 'elevenlabs',
        model: modelId,
        kind: 'tts',
        prompt: text.slice(0, 500),
        cost_cents: 0,
        listing_id: body.listing_id || null,
        property_id: body.property_id || null,
        contact_id: body.contact_id || null,
        succeeded: false,
      })
      return json({ error: 'ElevenLabs API error', status: ttsRes.status, details: errText.slice(0, 500) }, ttsRes.status)
    }

    const audioBuf = new Uint8Array(await ttsRes.arrayBuffer())
    const characterCount = text.length
    const costCents = Math.round((characterCount / 1000) * COST_PER_1K_CHARS_CENTS * 100) / 100

    let audioUrl: string | null = null
    let storagePath: string | null = null
    let audioBase64: string | null = null

    if (body.save_to_storage !== false) {
      // Path: voice-clips/{yyyy-mm}/{uuid}.mp3
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const filename = `${crypto.randomUUID()}.mp3`
      storagePath = `${ym}/${filename}`

      const { error: upErr } = await db.storage.from('voice-clips').upload(storagePath, audioBuf, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
        upsert: false,
      })
      if (upErr) {
        return json({ error: 'Failed to store audio', details: upErr.message }, 500)
      }
      const { data: urlData } = db.storage.from('voice-clips').getPublicUrl(storagePath)
      audioUrl = urlData.publicUrl
    } else {
      // Return inline base64 (caller wants to play immediately, not save)
      const chunkSize = 0x8000
      let bin = ''
      for (let i = 0; i < audioBuf.length; i += chunkSize) {
        bin += String.fromCharCode(...audioBuf.subarray(i, i + chunkSize))
      }
      audioBase64 = btoa(bin)
    }

    // ─── Log spend ──────────────────────────────────────────────────────────
    await db.from('ai_generation_log').insert({
      service: 'elevenlabs',
      model: modelId,
      kind: 'tts',
      prompt: text.slice(0, 500),
      cost_cents: costCents,
      listing_id: body.listing_id || null,
      property_id: body.property_id || null,
      contact_id: body.contact_id || null,
      succeeded: true,
    })

    return json({
      success: true,
      audio_url: audioUrl,
      audio_base64: audioBase64,
      storage_path: storagePath,
      character_count: characterCount,
      cost_cents: costCents,
      voice_id: voiceId,
      model_id: modelId,
    })
  } catch (err: any) {
    return json({ error: err.message || 'Internal error' }, 500)
  }
})
